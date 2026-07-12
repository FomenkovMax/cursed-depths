import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { findPet } from '@/lib/economy/pets';

/** Брошено внутри транзакции, если Осколков не хватило В МОМЕНТ фактического списания (тот
 * же паттерн идемпотентности, что и в shop/buy, quests/claim — updateMany с условием). */
class InsufficientShardsError extends Error {
  constructor() { super('INSUFFICIENT_SHARDS'); }
}

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { petId } = await req.json();
    const pet = petId ? findPet(petId) : null;
    if (!pet) return NextResponse.json({ error: 'Питомец не найден' }, { status: 404 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { pets: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.pets.some(p => p.petId === pet.id)) {
      return NextResponse.json({ error: 'Этот питомец уже у вас есть' }, { status: 400 });
    }
    if (player.crownShards < pet.costShards) {
      return NextResponse.json({ error: `Недостаточно Осколков Короны (нужно ${pet.costShards})` }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      const result = await tx.player.updateMany({
        where: { telegramId: auth.telegramId, crownShards: { gte: pet.costShards } },
        data: { crownShards: { decrement: pet.costShards } },
      });
      if (result.count === 0) throw new InsufficientShardsError();
      await tx.playerPet.create({ data: { playerId: player.id, petId: pet.id } });
    });

    const final = await db.player.findUnique({
      where: { telegramId: auth.telegramId },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({ message: `Куплен питомец: ${pet.nameRu}`, player: final });
  } catch (error) {
    if (error instanceof InsufficientShardsError) {
      return NextResponse.json({ error: 'Недостаточно Осколков Короны' }, { status: 400 });
    }
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

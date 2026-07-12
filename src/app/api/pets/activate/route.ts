import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { findPet } from '@/lib/economy/pets';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { petId } = await req.json(); // petId === null снимает активного питомца

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { pets: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    if (petId !== null) {
      const pet = findPet(petId);
      if (!pet) return NextResponse.json({ error: 'Питомец не найден' }, { status: 404 });
      if (!player.pets.some(p => p.petId === petId)) {
        return NextResponse.json({ error: 'У вас нет этого питомца' }, { status: 400 });
      }
    }

    const updated = await db.player.update({
      where: { telegramId: auth.telegramId },
      data: { activePetId: petId },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({
      message: petId ? `Активный питомец: ${findPet(petId)?.nameRu}` : 'Питомец снят',
      player: updated,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

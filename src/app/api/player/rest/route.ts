import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { computeEquipmentBonuses } from '@/lib/combat/equipment-stats';
import { isInActivePartyCombat } from '@/lib/combat/party-guards';
import { restMessage } from '@/lib/combat/exploration-flavor';
import { findPet } from '@/lib/economy/pets';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const player = await db.player.findUnique({ where: { telegramId }, include: { inventory: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.locationId !== 'town') return NextResponse.json({ error: 'Нужно быть в городе для отдыха' }, { status: 400 });
    if (player.inCombat) return NextResponse.json({ error: 'Нельзя отдыхать во время боя' }, { status: 400 });
    if (await isInActivePartyCombat(player.id)) {
      return NextResponse.json({ error: 'Нельзя отдыхать во время боя пати' }, { status: 400 });
    }

    const activePet = player.activePetId ? findPet(player.activePetId) : null;
    const bonuses = computeEquipmentBonuses(player.inventory, activePet);
    const updated = await db.player.update({
      where: { telegramId },
      data: { hp: player.maxHp + bonuses.hp, mp: player.maxMp + bonuses.mp },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({ message: restMessage(), player: updated });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

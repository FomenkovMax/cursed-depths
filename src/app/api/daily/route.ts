import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rollDice } from '@/lib/dice';
import { validateTelegramRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  const player = await db.player.findUnique({ where: { telegramId } });
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const today = new Date().toISOString().split('T')[0];
  if (player.lastDailyReward === today) {
    return NextResponse.json({ error: 'Вы уже получили ежедневную награду сегодня' }, { status: 400 });
  }

  const goldReward = rollDice('2d6') * player.level;
  const xpReward = 10 * player.level;

  const updated = await db.player.update({
    where: { telegramId },
    data: {
      gold: { increment: goldReward },
      xp: { increment: xpReward },
      lastDailyReward: today,
    },
  });

  // Give a health potion
  await db.inventory.create({
    data: {
      playerId: player.id,
      itemId: 'health_potion',
      name: 'Зелье здоровья',
      type: 'consumable',
      rarity: 'common',
      stats: '{"healHp":15}',
      icon: '🧪',
      quantity: 1,
    },
  });

  return NextResponse.json({
    message: `Ежедневная награда! +${goldReward} золота, +${xpReward} XP, Зелье здоровья!`,
    goldReward,
    xpReward,
    player: updated,
  });
}

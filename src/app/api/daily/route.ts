import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rollDice } from '@/lib/dice';
import { validateTelegramRequest } from '@/lib/auth';
import { addItemToInventory } from '@/lib/inventory-utils';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const player = await db.player.findUnique({ where: { telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const today = new Date().toISOString().split('T')[0];
    if (player.lastDailyReward === today) {
      return NextResponse.json({ error: 'Вы уже получили ежедневную награду сегодня' }, { status: 400 });
    }

    const goldReward = rollDice('2d6') * player.level;
    const xpReward = 10 * player.level;

    // Wrap gold/XP giving + potion giving in a transaction
    const updated = await db.$transaction(async (tx) => {
      const result = await tx.player.update({
        where: { telegramId },
        data: {
          gold: { increment: goldReward },
          xp: { increment: xpReward },
          lastDailyReward: today,
        },
      });

      // Give a health potion (stacks with existing)
      await addItemToInventory({
        playerId: player.id,
        itemId: 'health_potion',
        name: 'Зелье здоровья',
        type: 'consumable',
        rarity: 'common',
        stats: '{"healHp":15}',
        icon: '🧪',
        quantity: 1,
      }, tx);

      return result;
    });

    return NextResponse.json({
      message: `Ежедневная награда! +${goldReward} золота, +${xpReward} XP, Зелье здоровья!`,
      goldReward,
      xpReward,
      player: updated,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

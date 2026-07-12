import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { ENEMIES } from '@/lib/game-data';
import { pickRandomBountyEnemyId, BOUNTY_DC, BOUNTY_STAT, BOUNTY_BONUS_GOLD } from '@/lib/economy/bounty-board';
import { isPremiumActive } from '@/lib/premium/premium-shop';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const premiumActive = isPremiumActive(player.premiumUntil);
    if (!premiumActive) {
      return NextResponse.json({ premiumActive: false, target: null, attempted: false, dc: BOUNTY_DC, stat: BOUNTY_STAT, bonusGold: BOUNTY_BONUS_GOLD });
    }

    const today = new Date().toISOString().split('T')[0];
    let enemyId = player.bountyEnemyId;
    let attempted = player.bountyAttempted;
    if (player.bountyDate !== today || !enemyId) {
      enemyId = pickRandomBountyEnemyId();
      attempted = false;
      await db.player.update({ where: { telegramId: auth.telegramId }, data: { bountyEnemyId: enemyId, bountyDate: today, bountyAttempted: false } });
    }

    const enemy = ENEMIES.find(e => e.id === enemyId);
    return NextResponse.json({
      premiumActive: true,
      target: enemy ? { enemyId: enemy.id, nameRu: enemy.nameRu, icon: enemy.icon } : null,
      attempted,
      dc: BOUNTY_DC,
      stat: BOUNTY_STAT,
      bonusGold: BOUNTY_BONUS_GOLD,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

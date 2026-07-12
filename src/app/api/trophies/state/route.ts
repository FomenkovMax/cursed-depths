import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { LOCATIONS } from '@/lib/game-data';
import { bossEnemies, TROPHY_REWARD_GOLD, TROPHY_REWARD_SHARDS } from '@/lib/boss-trophies';
import { isPremiumActive } from '@/lib/premium-shop';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({
      where: { telegramId: auth.telegramId },
      include: { bossTrophies: true },
    });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const byEnemyId = new Map(player.bossTrophies.map(t => [t.enemyId, t.defeatedAt]));

    const trophies = bossEnemies().map(e => {
      const location = LOCATIONS.find(l => l.id === e.locationId);
      const defeatedAt = byEnemyId.get(e.id) ?? null;
      return {
        enemyId: e.id,
        nameRu: e.nameRu,
        icon: e.icon,
        locationNameRu: location?.nameRu ?? '',
        defeated: !!defeatedAt,
        defeatedAt: defeatedAt ? defeatedAt.toISOString() : null,
      };
    });

    return NextResponse.json({
      premiumActive: isPremiumActive(player.premiumUntil),
      trophies,
      collectedCount: trophies.filter(t => t.defeated).length,
      totalCount: trophies.length,
      rewardGold: TROPHY_REWARD_GOLD,
      rewardShards: TROPHY_REWARD_SHARDS,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

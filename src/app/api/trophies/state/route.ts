import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { LOCATIONS } from '@/lib/game-data';
import { bossEnemies, trophyLoreFor } from '@/lib/boss-trophies';
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

    const premiumActive = isPremiumActive(player.premiumUntil);
    const totalCount = bossEnemies().length;

    if (!premiumActive) {
      return NextResponse.json({ premiumActive: false, trophies: [], collectedCount: 0, totalCount });
    }

    const byEnemyId = new Map(player.bossTrophies.map(t => [t.enemyId, t]));

    const trophies = bossEnemies().map(e => {
      const location = LOCATIONS.find(l => l.id === e.locationId);
      const trophy = byEnemyId.get(e.id) ?? null;
      const defeated = !!trophy && trophy.killCount > 0;
      return {
        enemyId: e.id,
        nameRu: e.nameRu,
        icon: e.icon,
        locationNameRu: location?.nameRu ?? '',
        defeated,
        killCount: trophy?.killCount ?? 0,
        firstDefeatedAt: trophy ? trophy.firstDefeatedAt.toISOString() : null,
        lastDefeatedAt: trophy ? trophy.lastDefeatedAt.toISOString() : null,
        loreRu: defeated ? trophyLoreFor(e.id) : null,
      };
    });

    return NextResponse.json({
      premiumActive: true,
      trophies,
      collectedCount: trophies.filter(t => t.defeated).length,
      totalCount,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

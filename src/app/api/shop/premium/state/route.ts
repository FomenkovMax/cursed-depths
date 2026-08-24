import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { SHARD_PACKS, PREMIUM_CATALOG, isPremiumActive, RACE_CHANGE_COST_SHARDS } from '@/lib/premium/premium-shop';
import { freeSpinsPerDayFor, PAID_SPIN_COST_SHARDS, FORTUNE_WHEEL, TOTAL_WEIGHT } from '@/lib/economy/fortune-wheel';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const premiumActive = isPremiumActive(player.premiumUntil);
    const today = new Date().toISOString().split('T')[0];
    const spinsToday = player.fortuneSpinDate === today ? player.fortuneSpinsToday : 0;
    const freeSpins = freeSpinsPerDayFor(premiumActive);
    const races = await db.race.findMany({ include: { classes: true }, orderBy: { name: 'asc' } });

    return NextResponse.json({
      crownShards: player.crownShards,
      premiumUntil: player.premiumUntil,
      premiumActive,
      shardPacks: SHARD_PACKS,
      catalog: PREMIUM_CATALOG,
      fortuneWheel: {
        freeSpinsLeftToday: Math.max(0, freeSpins - spinsToday),
        freeSpinsPerDay: freeSpins,
        paidSpinCost: PAID_SPIN_COST_SHARDS,
        // Сегменты для отрисовки колеса на фронте — id должен совпадать с id, который вернёт
        // POST /api/fortune/spin, чтобы фронт мог довернуть колесо до нужного сектора.
        segments: FORTUNE_WHEEL.map(s => ({
          id: s.id,
          nameRu: s.nameRu,
          icon: s.icon,
          kind: s.reward.kind,
          rarity: s.reward.kind === 'item' ? s.reward.rarity : null,
          chancePercent: Math.round((s.weight / TOTAL_WEIGHT) * 1000) / 10,
        })),
      },
      raceChange: {
        costShards: RACE_CHANGE_COST_SHARDS,
        races,
      },
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

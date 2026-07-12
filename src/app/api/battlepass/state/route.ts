import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { BATTLE_PASS_TIERS, effectiveBattlePassXp } from '@/lib/battle-pass';
import { currentSeasonId } from '@/lib/seasons';
import { isPremiumActive } from '@/lib/premium-shop';
import { ITEMS } from '@/lib/game-data';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const premiumActive = isPremiumActive(player.premiumUntil);
    const season = currentSeasonId();
    if (!premiumActive) {
      return NextResponse.json({ premiumActive: false, seasonId: season, xp: 0, tiers: [] });
    }

    const xp = effectiveBattlePassXp(player.battlePassSeasonId, player.battlePassXp, season);
    const claims = await db.playerBattlePassClaim.findMany({ where: { playerId: player.id, seasonId: season } });
    const claimedTiers = new Set(claims.map(c => c.tier));

    const tiers = BATTLE_PASS_TIERS.map(t => ({
      tier: t.tier,
      xpRequired: t.xpRequired,
      reward: {
        gold: t.reward.gold,
        crownShards: t.reward.crownShards,
        items: t.reward.items?.map(entry => {
          const item = ITEMS.find(i => i.id === entry.itemId);
          return { itemId: entry.itemId, quantity: entry.quantity, nameRu: item?.nameRu ?? entry.itemId, icon: item?.icon ?? '📦' };
        }),
      },
      unlocked: xp >= t.xpRequired,
      claimed: claimedTiers.has(t.tier),
    }));

    return NextResponse.json({ premiumActive: true, seasonId: season, xp, tiers });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

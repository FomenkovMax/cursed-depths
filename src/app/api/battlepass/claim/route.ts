import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { BATTLE_PASS_TIERS, effectiveBattlePassXp } from '@/lib/battle-pass';
import { currentSeasonId } from '@/lib/seasons';
import { isPremiumActive } from '@/lib/premium-shop';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { tier } = await req.json();
    const tierNum = Number(tier);

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!isPremiumActive(player.premiumUntil)) {
      return NextResponse.json({ error: 'Боевой пропуск доступен только с активным премиум-статусом' }, { status: 403 });
    }

    const tierDef = BATTLE_PASS_TIERS.find(t => t.tier === tierNum);
    if (!tierDef) return NextResponse.json({ error: 'Тир не найден' }, { status: 404 });

    const season = currentSeasonId();
    const xp = effectiveBattlePassXp(player.battlePassSeasonId, player.battlePassXp, season);
    if (xp < tierDef.xpRequired) {
      return NextResponse.json({ error: 'Недостаточно очков Боевого пропуска для этого тира' }, { status: 400 });
    }

    try {
      await db.$transaction(async (tx) => {
        await tx.playerBattlePassClaim.create({ data: { playerId: player.id, seasonId: season, tier: tierNum } });
        await tx.player.update({
          where: { id: player.id },
          data: {
            ...(tierDef.reward.gold ? { gold: { increment: tierDef.reward.gold } } : {}),
            ...(tierDef.reward.crownShards ? { crownShards: { increment: tierDef.reward.crownShards } } : {}),
          },
        });
      });
    } catch {
      return NextResponse.json({ error: 'Награда за этот тир уже забрана' }, { status: 409 });
    }

    return NextResponse.json({ message: `Тир ${tierNum} получен`, reward: tierDef.reward });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

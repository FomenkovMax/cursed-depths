import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { EXPEDITION_TIERS, findExpeditionTier, F2P_EXPEDITION_TIER_ID } from '@/lib/premium/expeditions';
import { isPremiumActive } from '@/lib/premium/premium-shop';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const active = player.expeditionTierId && player.expeditionEndsAt
      ? {
          tier: findExpeditionTier(player.expeditionTierId),
          endsAt: player.expeditionEndsAt,
          ready: player.expeditionEndsAt.getTime() <= Date.now(),
        }
      : null;

    const today = new Date().toISOString().split('T')[0];

    return NextResponse.json({
      premiumActive: isPremiumActive(player.premiumUntil),
      tiers: EXPEDITION_TIERS,
      active,
      // F2P: доступен только этот тир, раз в день — см. api/expedition/start.
      f2pTierId: F2P_EXPEDITION_TIER_ID,
      f2pUsedToday: player.expeditionFreeUsedDate === today,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { EXPEDITION_TIERS, findExpeditionTier } from '@/lib/premium/expeditions';
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

    return NextResponse.json({
      premiumActive: isPremiumActive(player.premiumUntil),
      tiers: EXPEDITION_TIERS,
      active,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

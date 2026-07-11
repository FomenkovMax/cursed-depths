import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { SHARD_PACKS, PREMIUM_CATALOG, isPremiumActive } from '@/lib/premium-shop';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    return NextResponse.json({
      crownShards: player.crownShards,
      premiumUntil: player.premiumUntil,
      premiumActive: isPremiumActive(player.premiumUntil),
      shardPacks: SHARD_PACKS,
      catalog: PREMIUM_CATALOG,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

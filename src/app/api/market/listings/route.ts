import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const listings = await db.marketListing.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { seller: { select: { name: true } } },
    });

    return NextResponse.json({
      listings: listings.map(l => ({
        id: l.id,
        itemId: l.itemId,
        name: l.name,
        type: l.type,
        rarity: l.rarity,
        stats: l.stats,
        icon: l.icon,
        itemLevel: l.itemLevel,
        affixTier: l.affixTier,
        affixes: l.affixes,
        enhancementLevel: l.enhancementLevel,
        quantity: l.quantity,
        price: l.price,
        createdAt: l.createdAt,
        sellerName: l.seller.name,
        isOwn: l.sellerId === player.id,
      })),
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

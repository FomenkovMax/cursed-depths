import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { addItemToInventory } from '@/lib/economy/inventory-utils';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { listingId } = await req.json();
    if (!listingId) return NextResponse.json({ error: 'Укажите listingId' }, { status: 400 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const listing = await db.marketListing.findUnique({ where: { id: listingId } });
    if (!listing) return NextResponse.json({ error: 'Лот не найден' }, { status: 404 });
    if (listing.sellerId !== player.id) return NextResponse.json({ error: 'Это не ваш лот' }, { status: 403 });

    await db.$transaction(async (tx) => {
      const deleted = await tx.marketListing.deleteMany({ where: { id: listingId } });
      if (deleted.count === 0) throw new Error('LISTING_ALREADY_GONE');

      await addItemToInventory({
        playerId: player.id,
        itemId: listing.itemId,
        name: listing.name,
        type: listing.type,
        rarity: listing.rarity,
        stats: listing.stats,
        icon: listing.icon,
        quantity: listing.quantity,
        itemLevel: listing.itemLevel,
        affixTier: listing.affixTier,
        affixes: listing.affixes,
        enhancementLevel: listing.enhancementLevel,
      }, tx);
    });

    return NextResponse.json({ message: `${listing.name} снят с аукциона и возвращён в инвентарь` });
  } catch (error) {
    if (error instanceof Error && error.message === 'LISTING_ALREADY_GONE') {
      return NextResponse.json({ error: 'Лот уже был куплен или снят' }, { status: 409 });
    }
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

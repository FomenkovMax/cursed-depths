import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { addItemToInventory } from '@/lib/inventory-utils';

// Комиссия при продаже — чистый sink золота, не откладывается никуда (см. schema.prisma
// MarketListing). Продавец получает price - комиссия.
const MARKET_FEE_PERCENT = 0.1;

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { listingId } = await req.json();
    if (!listingId) return NextResponse.json({ error: 'Укажите listingId' }, { status: 400 });

    const buyer = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!buyer) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const listing = await db.marketListing.findUnique({ where: { id: listingId } });
    if (!listing) return NextResponse.json({ error: 'Лот уже продан или снят с аукциона' }, { status: 404 });
    if (listing.sellerId === buyer.id) return NextResponse.json({ error: 'Нельзя купить собственный лот' }, { status: 400 });
    if (buyer.gold < listing.price) return NextResponse.json({ error: 'Недостаточно золота' }, { status: 400 });

    const sellerPayout = Math.round(listing.price * (1 - MARKET_FEE_PERCENT));

    await db.$transaction(async (tx) => {
      // Лот мог быть куплен параллельным запросом между findUnique выше и этой транзакцией —
      // deleteMany с условием на id атомарно защищает от двойной продажи одного лота.
      const deleted = await tx.marketListing.deleteMany({ where: { id: listingId } });
      if (deleted.count === 0) {
        throw new Error('LISTING_ALREADY_SOLD');
      }

      await tx.player.update({ where: { id: buyer.id }, data: { gold: { decrement: listing.price } } });
      await tx.player.update({ where: { id: listing.sellerId }, data: { gold: { increment: sellerPayout } } });

      await addItemToInventory({
        playerId: buyer.id,
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

    return NextResponse.json({ message: `Вы купили ${listing.name} за ${listing.price} золота` });
  } catch (error) {
    if (error instanceof Error && error.message === 'LISTING_ALREADY_SOLD') {
      return NextResponse.json({ error: 'Лот уже продан или снят с аукциона' }, { status: 409 });
    }
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

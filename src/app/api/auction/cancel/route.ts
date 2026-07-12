import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { addItemToInventory } from '@/lib/inventory-utils';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { auctionId } = await req.json();
    if (!auctionId) return NextResponse.json({ error: 'Укажите auctionId' }, { status: 400 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const auction = await db.auction.findUnique({ where: { id: auctionId } });
    if (!auction) return NextResponse.json({ error: 'Лот не найден или уже закрыт' }, { status: 404 });
    if (auction.sellerId !== player.id) return NextResponse.json({ error: 'Это не ваш лот' }, { status: 403 });
    if (auction.currentBidderId) return NextResponse.json({ error: 'Нельзя снять лот, на который уже сделана ставка' }, { status: 400 });

    await db.$transaction(async (tx) => {
      // Лот мог закрыться по времени между findUnique выше и этой транзакцией — deleteMany с
      // условием на id атомарно защищает от повторной отмены/гонки с ленивым резолвом.
      const deleted = await tx.auction.deleteMany({ where: { id: auctionId, currentBidderId: null } });
      if (deleted.count === 0) {
        throw new Error('AUCTION_ALREADY_GONE');
      }

      await addItemToInventory({
        playerId: player.id,
        itemId: auction.itemId,
        name: auction.name,
        type: auction.type,
        rarity: auction.rarity,
        stats: auction.stats,
        icon: auction.icon,
        quantity: auction.quantity,
        itemLevel: auction.itemLevel,
        affixTier: auction.affixTier,
        affixes: auction.affixes,
        enhancementLevel: auction.enhancementLevel,
      }, tx);
    });

    return NextResponse.json({ message: `${auction.name} снят с аукциона` });
  } catch (error) {
    if (error instanceof Error && error.message === 'AUCTION_ALREADY_GONE') {
      return NextResponse.json({ error: 'Лот уже закрыт или на него сделали ставку' }, { status: 409 });
    }
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { resolveExpiredAuctionsIfNeeded, minNextBid } from '@/lib/auction-house';
import { isPremiumActive } from '@/lib/premium-shop';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { auctionId, amount } = await req.json();
    if (!auctionId) return NextResponse.json({ error: 'Укажите auctionId' }, { status: 400 });
    const amountNum = Math.round(Number(amount));
    if (!Number.isFinite(amountNum) || amountNum < 1) {
      return NextResponse.json({ error: 'Некорректная сумма ставки' }, { status: 400 });
    }

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!isPremiumActive(player.premiumUntil)) {
      return NextResponse.json({ error: 'Аукционный дом доступен только с активным премиум-статусом' }, { status: 403 });
    }

    await resolveExpiredAuctionsIfNeeded(db);

    const auction = await db.auction.findUnique({ where: { id: auctionId } });
    if (!auction) return NextResponse.json({ error: 'Лот не найден или уже закрыт' }, { status: 404 });
    if (auction.sellerId === player.id) return NextResponse.json({ error: 'Нельзя делать ставку на собственный лот' }, { status: 400 });
    if (auction.currentBidderId === player.id) return NextResponse.json({ error: 'Вы уже лидируете в этом аукционе' }, { status: 400 });

    const minBid = minNextBid(auction);
    if (amountNum < minBid) return NextResponse.json({ error: `Минимальная ставка — ${minBid} золота` }, { status: 400 });
    if (player.gold < amountNum) return NextResponse.json({ error: 'Недостаточно золота' }, { status: 400 });

    await db.$transaction(async (tx) => {
      // Лот мог перебиться параллельным запросом между findUnique выше и этой транзакцией —
      // updateMany с условием на прежний currentBid атомарно защищает от гонки двух одновременных ставок.
      const updated = await tx.auction.updateMany({
        where: { id: auctionId, currentBid: auction.currentBid },
        data: { currentBid: amountNum, currentBidderId: player.id },
      });
      if (updated.count === 0) {
        throw new Error('AUCTION_OUTBID_RACE');
      }

      if (auction.currentBidderId && auction.currentBid !== null) {
        await tx.player.update({ where: { id: auction.currentBidderId }, data: { gold: { increment: auction.currentBid } } });
      }
      await tx.player.update({ where: { id: player.id }, data: { gold: { decrement: amountNum } } });
    });

    return NextResponse.json({ message: `Ставка ${amountNum} золота принята`, amount: amountNum });
  } catch (error) {
    if (error instanceof Error && error.message === 'AUCTION_OUTBID_RACE') {
      return NextResponse.json({ error: 'Кто-то только что перебил вашу ставку — попробуйте снова' }, { status: 409 });
    }
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

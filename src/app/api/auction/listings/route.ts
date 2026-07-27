import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { resolveExpiredAuctionsIfNeeded, minNextBid, MAX_ACTIVE_AUCTIONS, AUCTION_FEE_PERCENT, AUCTION_DURATIONS } from '@/lib/economy/auction-house';
import { isPremiumActive } from '@/lib/premium/premium-shop';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const premiumActive = isPremiumActive(player.premiumUntil);
    if (!premiumActive) {
      return NextResponse.json({ premiumActive: false, auctions: [], maxActiveAuctions: MAX_ACTIVE_AUCTIONS, feePercent: AUCTION_FEE_PERCENT, durations: AUCTION_DURATIONS });
    }

    await resolveExpiredAuctionsIfNeeded(db);

    const rows = await db.auction.findMany({
      orderBy: { expiresAt: 'asc' },
      include: {
        seller: { select: { id: true, name: true } },
        currentBidder: { select: { id: true, name: true } },
      },
    });

    const auctions = rows.map(a => ({
      id: a.id,
      itemId: a.itemId,
      name: a.name,
      type: a.type,
      rarity: a.rarity,
      stats: a.stats,
      icon: a.icon,
      itemLevel: a.itemLevel,
      affixTier: a.affixTier,
      affixes: a.affixes,
      enhancementLevel: a.enhancementLevel,
      quantity: a.quantity,
      startingPrice: a.startingPrice,
      currentBid: a.currentBid,
      currentBidderName: a.currentBidder?.name ?? null,
      minNextBid: minNextBid(a),
      expiresAt: a.expiresAt.toISOString(),
      sellerId: a.sellerId,
      sellerName: a.seller.name,
      isOwn: a.sellerId === player.id,
      isMyBid: a.currentBidderId === player.id,
    }));

    return NextResponse.json({ premiumActive: true, auctions, maxActiveAuctions: MAX_ACTIVE_AUCTIONS, feePercent: AUCTION_FEE_PERCENT, durations: AUCTION_DURATIONS });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

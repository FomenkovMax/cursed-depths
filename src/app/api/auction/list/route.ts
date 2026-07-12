import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { MAX_ACTIVE_AUCTIONS, AUCTION_DURATIONS } from '@/lib/auction-house';
import { isPremiumActive } from '@/lib/premium-shop';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { inventoryId, startingPrice, durationHours } = await req.json();
    if (!inventoryId) return NextResponse.json({ error: 'Укажите inventoryId' }, { status: 400 });
    const priceNum = Math.round(Number(startingPrice));
    if (!Number.isFinite(priceNum) || priceNum < 1) {
      return NextResponse.json({ error: 'Укажите стартовую цену не менее 1 золота' }, { status: 400 });
    }
    const duration = AUCTION_DURATIONS.find(d => d.hours === durationHours);
    if (!duration) return NextResponse.json({ error: 'Некорректная длительность аукциона' }, { status: 400 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { inventory: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!isPremiumActive(player.premiumUntil)) {
      return NextResponse.json({ error: 'Аукционный дом доступен только с активным премиум-статусом' }, { status: 403 });
    }

    const item = player.inventory.find(i => i.id === inventoryId);
    if (!item) return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
    if (item.type === 'quest') return NextResponse.json({ error: 'Квестовые предметы нельзя выставить на аукцион' }, { status: 400 });
    if (item.equipped) return NextResponse.json({ error: 'Сначала снимите предмет' }, { status: 400 });

    const activeAuctionsCount = await db.auction.count({ where: { sellerId: player.id } });
    if (activeAuctionsCount >= MAX_ACTIVE_AUCTIONS) {
      return NextResponse.json({ error: `Максимум ${MAX_ACTIVE_AUCTIONS} активных лотов на аукционе одновременно` }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + duration.hours * 60 * 60 * 1000);

    const auction = await db.$transaction(async (tx) => {
      await tx.inventory.delete({ where: { id: item.id } });
      return tx.auction.create({
        data: {
          sellerId: player.id,
          itemId: item.itemId,
          name: item.name,
          type: item.type,
          rarity: item.rarity,
          stats: item.stats,
          icon: item.icon,
          itemLevel: item.itemLevel,
          affixTier: item.affixTier,
          affixes: item.affixes,
          enhancementLevel: item.enhancementLevel,
          quantity: item.quantity,
          startingPrice: priceNum,
          expiresAt,
        },
      });
    });

    return NextResponse.json({ message: `${item.name} выставлен на аукцион (${duration.labelRu})`, auction });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

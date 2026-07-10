import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';

const MAX_ACTIVE_LISTINGS = 10;

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { inventoryId, price } = await req.json();
    if (!inventoryId) return NextResponse.json({ error: 'Укажите inventoryId' }, { status: 400 });
    const priceNum = Math.round(Number(price));
    if (!Number.isFinite(priceNum) || priceNum < 1) {
      return NextResponse.json({ error: 'Укажите цену не менее 1 золота' }, { status: 400 });
    }

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { inventory: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const item = player.inventory.find(i => i.id === inventoryId);
    if (!item) return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
    if (item.type === 'quest') return NextResponse.json({ error: 'Квестовые предметы нельзя выставить на аукцион' }, { status: 400 });
    if (item.equipped) return NextResponse.json({ error: 'Сначала снимите предмет' }, { status: 400 });

    const activeListingsCount = await db.marketListing.count({ where: { sellerId: player.id } });
    if (activeListingsCount >= MAX_ACTIVE_LISTINGS) {
      return NextResponse.json({ error: `Максимум ${MAX_ACTIVE_LISTINGS} активных лотов одновременно` }, { status: 400 });
    }

    const listing = await db.$transaction(async (tx) => {
      await tx.inventory.delete({ where: { id: item.id } });
      return tx.marketListing.create({
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
          price: priceNum,
        },
      });
    });

    return NextResponse.json({ message: `${item.name} выставлен на аукцион за ${priceNum} золота`, listing });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

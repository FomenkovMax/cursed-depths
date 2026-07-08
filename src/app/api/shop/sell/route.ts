import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { isSellableItem, getSellPrice } from '@/lib/shop';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const { inventoryId } = await req.json();
    if (!inventoryId) return NextResponse.json({ error: 'Укажите inventoryId' }, { status: 400 });

    const player = await db.player.findUnique({ where: { telegramId }, include: { inventory: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.locationId !== 'market') {
      return NextResponse.json({ error: 'Магазин доступен только в Торговом дворе' }, { status: 400 });
    }

    const item = player.inventory.find(i => i.id === inventoryId);
    if (!item) return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
    if (item.equipped) return NextResponse.json({ error: 'Сначала снимите предмет' }, { status: 400 });
    if (!isSellableItem(item.itemId)) return NextResponse.json({ error: 'Этот предмет нельзя продать' }, { status: 400 });

    const sellPrice = getSellPrice(item.itemId);

    const updated = await db.$transaction(async (tx) => {
      await tx.player.update({ where: { telegramId }, data: { gold: { increment: sellPrice } } });

      if (item.quantity > 1) {
        await tx.inventory.update({ where: { id: inventoryId }, data: { quantity: { decrement: 1 } } });
      } else {
        await tx.inventory.delete({ where: { id: inventoryId } });
      }

      return tx.player.update({
        where: { telegramId },
        data: {},
        include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
      });
    });

    return NextResponse.json({ message: `Продано: ${item.name} за ${sellPrice} золота`, player: updated });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

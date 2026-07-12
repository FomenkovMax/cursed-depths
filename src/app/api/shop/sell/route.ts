import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { isSellableItem, getSellPrice } from '@/lib/economy/shop';

/** Брошено внутри транзакции, когда к моменту записи стака уже не осталось (см. комментарий
 * у updateMany ниже) — напр. параллельный дубликат того же запроса. Откатывает транзакцию. */
class ItemAlreadySoldError extends Error {
  constructor() { super('ITEM_ALREADY_SOLD'); }
}

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

    // item.quantity выше — снимок ДО транзакции; параллельный дубликат того же запроса
    // (двойной тап, повтор на нестабильной сети) прочёл бы тот же снимок и тоже начислил бы
    // sellPrice — золото задвоилось бы, даже если суммарное количество предмета в итоге
    // корректно уйдёт в 0. Поэтому списание стака — само условие (quantity >= 1), проверяемое
    // атомарно в момент записи через updateMany, а не по устаревшему снимку; золото начисляется
    // только если списание реально прошло.
    const updated = await db.$transaction(async (tx) => {
      const result = await tx.inventory.updateMany({
        where: { id: inventoryId, quantity: { gte: 1 } },
        data: { quantity: { decrement: 1 } },
      });
      if (result.count === 0) throw new ItemAlreadySoldError();
      await tx.inventory.deleteMany({ where: { id: inventoryId, quantity: { lte: 0 } } });

      await tx.player.update({ where: { telegramId }, data: { gold: { increment: sellPrice } } });

      return tx.player.update({
        where: { telegramId },
        data: {},
        include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
      });
    });

    return NextResponse.json({ message: `Продано: ${item.name} за ${sellPrice} золота`, player: updated });
  } catch (error) {
    if (error instanceof ItemAlreadySoldError) {
      return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
    }
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

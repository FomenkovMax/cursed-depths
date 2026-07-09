import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { addItemToInventory } from '@/lib/inventory-utils';
import { getShopBuyableItems } from '@/lib/shop';

/** Брошено внутри транзакции, когда золота не хватило В МОМЕНТ фактического списания (см.
 * комментарий у updateMany ниже). Откатывает транзакцию целиком. */
class InsufficientGoldError extends Error {
  constructor() { super('INSUFFICIENT_GOLD'); }
}

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const { itemId } = await req.json();
    if (!itemId) return NextResponse.json({ error: 'Укажите itemId' }, { status: 400 });

    const player = await db.player.findUnique({ where: { telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.locationId !== 'market') {
      return NextResponse.json({ error: 'Магазин доступен только в Торговом дворе' }, { status: 400 });
    }

    const itemData = getShopBuyableItems().find(i => i.id === itemId);
    if (!itemData) return NextResponse.json({ error: 'Этот предмет не продаётся' }, { status: 400 });
    if (player.gold < itemData.value) return NextResponse.json({ error: 'Недостаточно золота' }, { status: 400 });

    // player.gold выше — снимок ДО транзакции; два параллельных запроса оба прочли бы "золота
    // хватает" и оба списали бы decrement, уводя баланс в минус, но оба получили бы предмет —
    // дублирование за цену одной покупки. Поэтому списание — само условие (gold >= value),
    // проверяемое атомарно в момент записи через updateMany, а не по устаревшему снимку.
    const updated = await db.$transaction(async (tx) => {
      const result = await tx.player.updateMany({
        where: { telegramId, gold: { gte: itemData.value } },
        data: { gold: { decrement: itemData.value } },
      });
      if (result.count === 0) throw new InsufficientGoldError();

      await addItemToInventory({
        playerId: player.id,
        itemId: itemData.id,
        name: itemData.nameRu,
        type: itemData.type,
        rarity: itemData.rarity,
        stats: JSON.stringify(itemData.stats),
        icon: itemData.icon,
        quantity: 1,
      }, tx);

      return tx.player.update({
        where: { telegramId },
        data: {},
        include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
      });
    });

    return NextResponse.json({ message: `Куплено: ${itemData.nameRu} за ${itemData.value} золота`, player: updated });
  } catch (error) {
    if (error instanceof InsufficientGoldError) {
      return NextResponse.json({ error: 'Недостаточно золота' }, { status: 400 });
    }
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CRAFTING_RECIPES, ITEMS } from '@/lib/game-data';
import { validateTelegramRequest } from '@/lib/auth';
import { addItemToInventory } from '@/lib/economy/inventory-utils';
import { incrementQuestProgress } from '@/lib/economy/quests';

/** Брошено внутри транзакции, когда материала не хватило В МОМЕНТ фактического списания —
 * либо изначально, либо потому что параллельный запрос успел израсходовать его первым (см.
 * заголовок ниже). Откатывает транзакцию целиком, наружу всплывает как понятное 400. */
class InsufficientMaterialError extends Error {
  constructor(public itemName: string) { super('INSUFFICIENT_MATERIAL'); }
}

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const { recipeId } = await req.json();
    if (!recipeId) return NextResponse.json({ error: 'Укажите recipeId' }, { status: 400 });

    const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return NextResponse.json({ error: 'Рецепт не найден' }, { status: 404 });

    const player = await db.player.findUnique({
      where: { telegramId },
      include: { inventory: true },
    });

    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    if (player.level < recipe.minLevel) {
      return NextResponse.json({ error: `Рецепт доступен с ${recipe.minLevel} уровня` }, { status: 400 });
    }

    if (recipe.requiresBlueprintId) {
      const learned = await db.playerRecipe.findUnique({
        where: { playerId_recipeId: { playerId: player.id, recipeId: recipe.id } },
      });
      if (!learned) return NextResponse.json({ error: 'Сначала изучите чертёж этого рецепта' }, { status: 400 });
    }

    // Check materials
    for (const mat of recipe.materials) {
      const inventoryItem = player.inventory.find(i => i.itemId === mat.itemId);
      if (!inventoryItem || inventoryItem.quantity < mat.quantity) {
        const itemData = ITEMS.find(i => i.id === mat.itemId);
        return NextResponse.json({ error: `Недостаточно ${itemData?.nameRu || mat.itemId}` }, { status: 400 });
      }
    }

    // Add result item
    const resultItem = ITEMS.find(i => i.id === recipe.result.itemId);
    if (!resultItem) return NextResponse.json({ error: 'Результат крафта не найден' }, { status: 500 });

    // Шанс бонусного результата растёт с тиром рецепта — тир 1 никогда не даёт бонус,
    // тир 2/3 иногда удваивают выход крафта.
    const bonusChance = recipe.tier === 3 ? 0.25 : recipe.tier === 2 ? 0.15 : 0;
    const isBonus = Math.random() < bonusChance;
    const resultQuantity = isBonus ? recipe.result.quantity * 2 : recipe.result.quantity;

    // Wrap material removal + item creation in a transaction. Список материалов игрока выше —
    // снимок ДО транзакции, использовать его как единственную проверку небезопасно: два
    // параллельных запроса на один и тот же рецепт оба прочли бы "материалов хватает" и оба
    // списали бы полное количество, уводя остаток в минус, но при этом оба получили бы
    // результат крафта — дублирование предмета за цену одного набора материалов. Поэтому
    // списание ниже — САМО условие достаточности (updateMany с quantity >= mat.quantity),
    // проверяемое атомарно в момент фактической записи, а не по устаревшему снимку.
    await db.$transaction(async (tx) => {
      for (const mat of recipe.materials) {
        const inventoryItem = player.inventory.find(i => i.itemId === mat.itemId)!;
        const result = await tx.inventory.updateMany({
          where: { id: inventoryItem.id, quantity: { gte: mat.quantity } },
          data: { quantity: { decrement: mat.quantity } },
        });
        if (result.count === 0) {
          const itemData = ITEMS.find(i => i.id === mat.itemId);
          throw new InsufficientMaterialError(itemData?.nameRu || mat.itemId);
        }
        // Убираем опустевший стак — decrement мог увести именно эту запись в 0.
        await tx.inventory.deleteMany({ where: { id: inventoryItem.id, quantity: { lte: 0 } } });
      }

      // Add result item (stacks with existing if stackable)
      await addItemToInventory({
        playerId: player.id,
        itemId: resultItem.id,
        name: resultItem.nameRu,
        type: resultItem.type,
        rarity: resultItem.rarity,
        stats: JSON.stringify(resultItem.stats),
        icon: resultItem.icon,
        quantity: resultQuantity,
      }, tx);

      await incrementQuestProgress(tx, player.id, 'craft');
      await tx.player.update({ where: { telegramId }, data: { totalCrafts: { increment: 1 } } });
    });

    return NextResponse.json({
      message: isBonus
        ? `Удача! Вы скрафтили ${resultQuantity}x ${resultItem.nameRu} вместо обычного количества!`
        : `Вы скрафтили ${resultItem.nameRu}!`,
      item: resultItem,
      quantity: resultQuantity,
      isBonus,
    });
  } catch (error) {
    if (error instanceof InsufficientMaterialError) {
      return NextResponse.json({ error: `Недостаточно ${error.itemName}` }, { status: 400 });
    }
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

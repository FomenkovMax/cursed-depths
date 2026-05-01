import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CRAFTING_RECIPES, ITEMS } from '@/lib/game-data';
import { validateTelegramRequest } from '@/lib/auth';

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

    // Check materials
    for (const mat of recipe.materials) {
      const inventoryItem = player.inventory.find(i => i.itemId === mat.itemId);
      if (!inventoryItem || inventoryItem.quantity < mat.quantity) {
        const itemData = ITEMS.find(i => i.id === mat.itemId);
        return NextResponse.json({ error: `Недостаточно ${itemData?.nameRu || mat.itemId}` }, { status: 400 });
      }
    }

    // Remove materials
    for (const mat of recipe.materials) {
      const inventoryItem = player.inventory.find(i => i.itemId === mat.itemId)!;
      if (inventoryItem.quantity > mat.quantity) {
        await db.inventory.update({
          where: { id: inventoryItem.id },
          data: { quantity: { decrement: mat.quantity } },
        });
      } else {
        await db.inventory.delete({ where: { id: inventoryItem.id } });
      }
    }

    // Add result item
    const resultItem = ITEMS.find(i => i.id === recipe.result.itemId);
    if (!resultItem) return NextResponse.json({ error: 'Результат крафта не найден' }, { status: 500 });

    await db.inventory.create({
      data: {
        playerId: player.id,
        itemId: resultItem.id,
        name: resultItem.nameRu,
        type: resultItem.type,
        rarity: resultItem.rarity,
        stats: JSON.stringify(resultItem.stats),
        icon: resultItem.icon,
        quantity: recipe.result.quantity,
      },
    });

    return NextResponse.json({
      message: `Вы скрафтили ${resultItem.nameRu}!`,
      item: resultItem,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

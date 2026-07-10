import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CRAFTING_RECIPES } from '@/lib/game-data';
import { validateTelegramRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { inventoryId } = await req.json();
    if (!inventoryId) return NextResponse.json({ error: 'Укажите inventoryId' }, { status: 400 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { inventory: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const item = player.inventory.find(i => i.id === inventoryId);
    if (!item) return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
    if (item.type !== 'blueprint') return NextResponse.json({ error: 'Это не чертёж' }, { status: 400 });

    const recipe = CRAFTING_RECIPES.find(r => r.requiresBlueprintId === item.itemId);
    if (!recipe) return NextResponse.json({ error: 'Для этого чертежа нет рецепта' }, { status: 500 });

    const existing = await db.playerRecipe.findUnique({
      where: { playerId_recipeId: { playerId: player.id, recipeId: recipe.id } },
    });
    if (existing) return NextResponse.json({ error: 'Рецепт уже изучен' }, { status: 400 });

    const updatedPlayer = await db.$transaction(async (tx) => {
      await tx.playerRecipe.create({ data: { playerId: player.id, recipeId: recipe.id } });
      if (item.quantity > 1) {
        await tx.inventory.update({ where: { id: inventoryId }, data: { quantity: { decrement: 1 } } });
      } else {
        await tx.inventory.delete({ where: { id: inventoryId } });
      }
      return tx.player.update({
        where: { telegramId: auth.telegramId },
        data: {},
        include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
      });
    });

    return NextResponse.json({ message: `Рецепт «${recipe.nameRu}» изучен навсегда!`, recipeId: recipe.id, player: updatedPlayer });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

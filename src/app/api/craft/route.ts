import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CRAFTING_RECIPES, ITEMS } from '@/lib/game-data';

export async function POST(req: NextRequest) {
  const telegramId = req.headers.get('x-telegram-id');
  if (!telegramId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { recipeId } = await req.json();
  if (!recipeId) return NextResponse.json({ error: 'Missing recipeId' }, { status: 400 });

  const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });

  const player = await db.player.findUnique({
    where: { telegramId },
    include: { inventory: true },
  });

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

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
  if (!resultItem) return NextResponse.json({ error: 'Result item not found' }, { status: 500 });

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
}

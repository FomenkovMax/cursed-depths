import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const telegramId = req.headers.get('x-telegram-id');
  if (!telegramId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { inventoryId } = await req.json();
  if (!inventoryId) return NextResponse.json({ error: 'Missing inventoryId' }, { status: 400 });

  const player = await db.player.findUnique({
    where: { telegramId },
    include: { inventory: true },
  });

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const item = player.inventory.find(i => i.id === inventoryId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (item.type !== 'consumable') return NextResponse.json({ error: 'Not a consumable' }, { status: 400 });

  const stats = item.stats ? JSON.parse(item.stats) : {};
  const updateData: Record<string, unknown> = {};

  if (stats.healHp) {
    updateData.hp = Math.min(player.maxHp, player.hp + stats.healHp);
  }
  if (stats.healMp) {
    updateData.mp = Math.min(player.maxMp, player.mp + stats.healMp);
  }

  if (Object.keys(updateData).length > 0) {
    await db.player.update({ where: { telegramId }, data: updateData });
  }

  // Remove or reduce item
  if (item.quantity > 1) {
    await db.inventory.update({ where: { id: inventoryId }, data: { quantity: { decrement: 1 } } });
  } else {
    await db.inventory.delete({ where: { id: inventoryId } });
  }

  return NextResponse.json({ message: `Вы использовали ${item.name}`, effect: stats });
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  const { inventoryId } = await req.json();
  if (!inventoryId) return NextResponse.json({ error: 'Missing inventoryId' }, { status: 400 });

  const player = await db.player.findUnique({
    where: { telegramId },
    include: { inventory: true },
  });

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const item = player.inventory.find(i => i.id === inventoryId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  if (item.type === 'consumable' || item.type === 'material' || item.type === 'quest') {
    return NextResponse.json({ error: 'Cannot equip this item type' }, { status: 400 });
  }

  // Toggle equip
  if (item.equipped) {
    await db.inventory.update({ where: { id: inventoryId }, data: { equipped: false, slot: null } });
    return NextResponse.json({ message: `${item.name} снят`, equipped: false });
  }

  // Unequip any item in same slot
  const slot = item.type === 'weapon' ? 'weapon' : item.type === 'armor' ? 'chest' : 'accessory1';
  const currentEquipped = player.inventory.find(i => i.equipped && i.slot === slot);
  if (currentEquipped) {
    await db.inventory.update({ where: { id: currentEquipped.id }, data: { equipped: false, slot: null } });
  }

  await db.inventory.update({ where: { id: inventoryId }, data: { equipped: true, slot } });
  return NextResponse.json({ message: `${item.name} экипирован`, equipped: true });
}

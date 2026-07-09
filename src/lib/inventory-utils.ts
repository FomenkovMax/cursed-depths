/**
 * Inventory utility: adds an item to a player's inventory with proper stacking.
 *
 * If the player already has an identical item (same itemId, same type, same rarity,
 * same stats), the quantity is incremented. Otherwise, a new inventory row is created.
 *
 * Supports an optional transaction client for use inside prisma.$transaction() callbacks.
 */

import { db } from '@/lib/db';
import { incrementQuestProgress, collectQuestType } from '@/lib/quests';

type PrismaClientLike = { inventory: typeof db.inventory; playerQuest: typeof db.playerQuest };

interface AddItemParams {
  playerId: string;
  itemId: string;
  name: string;
  type: string;
  rarity: string;
  stats?: string | null;
  icon?: string | null;
  quantity: number;
  equipped?: boolean;
  slot?: string | null;
}

export async function addItemToInventory(params: AddItemParams, client?: PrismaClientLike) {
  const prisma = client ?? db;
  const { playerId, itemId, name, type, rarity, stats, icon, quantity, equipped, slot } = params;

  // For equippable items (weapons, armor), always create a new row — they can have different stats
  // For stackable items (consumables, materials), stack with existing
  const isStackable = type === 'consumable' || type === 'material';

  if (isStackable) {
    // Find existing item with same itemId to stack
    const existing = await prisma.inventory.findFirst({
      where: {
        playerId,
        itemId,
        equipped: false,
      },
    });

    if (existing) {
      return prisma.inventory.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity } },
      });
    }
  }

  // Create new inventory entry
  const created = await prisma.inventory.create({
    data: {
      playerId,
      itemId,
      name,
      type,
      rarity,
      stats: stats || null,
      icon: icon || null,
      quantity,
      equipped: equipped || false,
      slot: slot || null,
    },
  });

  // Quest items ("принеси предмет") advance their matching quest the moment they land
  // in the inventory — see lib/quests.ts collectQuestType(). Cheap no-op if no such quest is active.
  if (type === 'quest') {
    await incrementQuestProgress(prisma, playerId, collectQuestType(itemId), quantity);
  }

  return created;
}

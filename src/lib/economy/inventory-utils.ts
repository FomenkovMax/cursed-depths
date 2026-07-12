/**
 * Inventory utility: adds an item to a player's inventory with proper stacking.
 *
 * If the player already has an identical item (same itemId, same type, same rarity,
 * same stats), the quantity is incremented. Otherwise, a new inventory row is created.
 *
 * Supports an optional transaction client for use inside prisma.$transaction() callbacks.
 */

import { db } from '@/lib/db';
import { incrementQuestProgress, collectQuestType } from '@/lib/economy/quests';

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
  /** Только для снаряжения, прошедшего через lib/item-affixes.ts rollGearInstance(). */
  itemLevel?: number | null;
  affixTier?: string | null;
  affixes?: string | null;
  /** Уровень заточки (lib/item-enhancement.ts) — переносится, например, при покупке
   * закалённого предмета с аукциона (POST /api/market/buy). */
  enhancementLevel?: number;
}

export async function addItemToInventory(params: AddItemParams, client?: PrismaClientLike) {
  const prisma = client ?? db;
  const { playerId, itemId, name, type, rarity, stats, icon, quantity, equipped, slot, itemLevel, affixTier, affixes, enhancementLevel } = params;

  // For equippable items (weapons, armor), always create a new row — they can have different stats
  // For stackable items (consumables, materials, craft currency), stack with existing
  const isStackable = type === 'consumable' || type === 'material' || type === 'currency';

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
      itemLevel: itemLevel ?? null,
      affixTier: affixTier ?? null,
      affixes: affixes ?? null,
      enhancementLevel: enhancementLevel ?? 0,
    },
  });

  // Quest items ("принеси предмет") advance their matching quest the moment they land
  // in the inventory — see lib/quests.ts collectQuestType(). Cheap no-op if no such quest is active.
  if (type === 'quest') {
    await incrementQuestProgress(prisma, playerId, collectQuestType(itemId), quantity);
  }

  return created;
}

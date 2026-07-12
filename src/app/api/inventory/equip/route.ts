import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { computeEquipmentBonuses } from '@/lib/combat/equipment-stats';
import { ITEMS } from '@/lib/game-data';
import { minLevelForRarity } from '@/lib/economy/item-affixes';
import { findPet } from '@/lib/economy/pets';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const { inventoryId } = await req.json();
    if (!inventoryId) return NextResponse.json({ error: 'Укажите inventoryId' }, { status: 400 });

    const player = await db.player.findUnique({
      where: { telegramId },
      include: { inventory: true },
    });

    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const item = player.inventory.find(i => i.id === inventoryId);
    if (!item) return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });

    if (item.type !== 'weapon' && item.type !== 'armor' && item.type !== 'accessory') {
      return NextResponse.json({ error: 'Нельзя экипировать предмет этого типа' }, { status: 400 });
    }

    // Toggle equip
    if (item.equipped) {
      const newInventoryState = player.inventory.map(i => i.id === inventoryId ? { ...i, equipped: false } : i);
      const clamp = clampHpMpTo(player, newInventoryState);

      await db.$transaction(async (tx) => {
        await tx.inventory.update({ where: { id: inventoryId }, data: { equipped: false, slot: null } });
        if (clamp) await tx.player.update({ where: { id: player.id }, data: clamp });
      });
      return NextResponse.json({ message: `${item.name} снят`, equipped: false });
    }

    // Хардкорный левел-гейт: нельзя экипировать вещь выше своего уровня, каким бы удачным ни
    // был дроп — иначе редкая находка (см. рескейл шансов в game-data.ts) тривиализует
    // прохождение вместо того, чтобы быть наградой за прогресс.
    const requiredLevel = minLevelForRarity(item.rarity);
    if (player.level < requiredLevel) {
      return NextResponse.json({ error: `Этот предмет требует ${requiredLevel} уровень (у вас ${player.level})` }, { status: 400 });
    }

    // Физический слот берётся из статического шаблона предмета (ITEMS.gearSlot) — 7 частей
    // тела (см. GearSlotId в game-data.ts), а не старые 3 (weapon/chest/accessory).
    const template = ITEMS.find(i => i.id === item.itemId);
    let slot: string;
    let currentEquipped: typeof player.inventory[number] | undefined;

    if (item.type === 'weapon') {
      slot = 'weapon';
      currentEquipped = player.inventory.find(i => i.equipped && i.slot === slot);
    } else if (item.type === 'armor') {
      slot = template?.gearSlot ?? 'body';
      currentEquipped = player.inventory.find(i => i.equipped && i.slot === slot);
    } else if (template?.gearSlot === 'amulet') {
      slot = 'amulet';
      currentEquipped = player.inventory.find(i => i.equipped && i.slot === slot);
    } else {
      // Кольца — два слота (ring1/ring2): занимаем свободный, если оба заняты — заменяем ring1.
      const ring1Taken = player.inventory.find(i => i.equipped && i.slot === 'ring1');
      const ring2Taken = player.inventory.find(i => i.equipped && i.slot === 'ring2');
      if (!ring1Taken) {
        slot = 'ring1';
        currentEquipped = undefined;
      } else if (!ring2Taken) {
        slot = 'ring2';
        currentEquipped = undefined;
      } else {
        slot = 'ring1';
        currentEquipped = ring1Taken;
      }
    }

    const newInventoryState = player.inventory.map(i => {
      if (i.id === inventoryId) return { ...i, equipped: true };
      if (currentEquipped && i.id === currentEquipped.id) return { ...i, equipped: false };
      return i;
    });
    const clamp = clampHpMpTo(player, newInventoryState);

    // Wrap unequip old + equip new in a transaction
    await db.$transaction(async (tx) => {
      if (currentEquipped) {
        await tx.inventory.update({ where: { id: currentEquipped.id }, data: { equipped: false, slot: null } });
      }
      await tx.inventory.update({ where: { id: inventoryId }, data: { equipped: true, slot } });
      if (clamp) await tx.player.update({ where: { id: player.id }, data: clamp });
    });
    return NextResponse.json({ message: `${item.name} экипирован`, equipped: true });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

/**
 * Экипировка/снятие предмета с hp/mp-бонусом может задним числом опустить эффективный
 * максимум ниже текущего hp/mp (например, сняли амулет +40 HP на полном здоровье) —
 * без клампа игрок временно ходил бы с hp выше отображаемого максимума до следующего
 * лечения. Возвращает только изменившиеся поля (или null, если клампить нечего).
 */
function clampHpMpTo(
  player: { hp: number; mp: number; maxHp: number; maxMp: number; activePetId: string | null },
  inventoryAfterChange: { equipped: boolean; stats: string | null }[]
): { hp?: number; mp?: number } | null {
  const activePet = player.activePetId ? findPet(player.activePetId) : null;
  const bonuses = computeEquipmentBonuses(inventoryAfterChange, activePet);
  const effectiveMaxHp = player.maxHp + bonuses.hp;
  const effectiveMaxMp = player.maxMp + bonuses.mp;

  const result: { hp?: number; mp?: number } = {};
  if (player.hp > effectiveMaxHp) result.hp = effectiveMaxHp;
  if (player.mp > effectiveMaxMp) result.mp = effectiveMaxMp;
  return Object.keys(result).length > 0 ? result : null;
}

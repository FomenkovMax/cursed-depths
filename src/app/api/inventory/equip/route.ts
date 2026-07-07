import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { computeEquipmentBonuses } from '@/lib/equipment-stats';

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

    if (item.type === 'consumable' || item.type === 'material' || item.type === 'quest') {
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

    // Оружие и броня — по одному слоту. У аксессуаров два слота (accessory1/accessory2):
    // занимаем свободный, а если оба заняты — заменяем accessory1 (прежнее поведение).
    let slot: string;
    let currentEquipped: typeof player.inventory[number] | undefined;
    if (item.type === 'weapon') {
      slot = 'weapon';
      currentEquipped = player.inventory.find(i => i.equipped && i.slot === slot);
    } else if (item.type === 'armor') {
      slot = 'chest';
      currentEquipped = player.inventory.find(i => i.equipped && i.slot === slot);
    } else {
      const accessory1Taken = player.inventory.find(i => i.equipped && i.slot === 'accessory1');
      const accessory2Taken = player.inventory.find(i => i.equipped && i.slot === 'accessory2');
      if (!accessory1Taken) {
        slot = 'accessory1';
        currentEquipped = undefined;
      } else if (!accessory2Taken) {
        slot = 'accessory2';
        currentEquipped = undefined;
      } else {
        slot = 'accessory1';
        currentEquipped = accessory1Taken;
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
  player: { hp: number; mp: number; maxHp: number; maxMp: number },
  inventoryAfterChange: { equipped: boolean; stats: string | null }[]
): { hp?: number; mp?: number } | null {
  const bonuses = computeEquipmentBonuses(inventoryAfterChange);
  const effectiveMaxHp = player.maxHp + bonuses.hp;
  const effectiveMaxMp = player.maxMp + bonuses.mp;

  const result: { hp?: number; mp?: number } = {};
  if (player.hp > effectiveMaxHp) result.hp = effectiveMaxHp;
  if (player.mp > effectiveMaxMp) result.mp = effectiveMaxMp;
  return Object.keys(result).length > 0 ? result : null;
}

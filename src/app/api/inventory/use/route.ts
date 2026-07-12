import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { computeEquipmentBonuses } from '@/lib/combat/equipment-stats';
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
    if (item.type !== 'consumable') return NextResponse.json({ error: 'Это не расходуемый предмет' }, { status: 400 });

    const stats = item.stats ? JSON.parse(item.stats) : {};

    // Боевые предметы (наносят урон/лечат отравление) вне боя не имеют цели — раньше они тихо
    // тратились без всякого эффекта с ложным сообщением об успехе. Честно отклоняем каст здесь;
    // combat/action/route.ts обрабатывает их отдельно через action: 'use_item' во время боя.
    if (stats.damage || stats.curePoison) {
      return NextResponse.json({ error: `${item.name} можно использовать только в бою` }, { status: 400 });
    }

    const updateData: Prisma.PlayerUpdateInput = {};
    const activePet = player.activePetId ? findPet(player.activePetId) : null;
    const bonuses = computeEquipmentBonuses(player.inventory, activePet);
    let applied = false;

    if (stats.healHp) {
      updateData.hp = Math.min(player.maxHp + bonuses.hp, player.hp + stats.healHp);
      applied = true;
    }
    if (stats.healMp) {
      updateData.mp = Math.min(player.maxMp + bonuses.mp, player.mp + stats.healMp);
      applied = true;
    }
    if (stats.attack && stats.duration) {
      // Эликсир Мощи и аналоги: временный бонус к атаке на N будущих боёв (не складывается —
      // повторное использование просто обновляет счётчик боёв до заявленного значения).
      updateData.consumableAttackBonus = stats.attack;
      updateData.consumableFightsLeft = stats.duration;
      applied = true;
    }

    if (!applied) {
      return NextResponse.json({ error: `${item.name} не имеет эффекта вне боя` }, { status: 400 });
    }

    // Wrap HP/MP restoration + item consumption in a transaction
    await db.$transaction(async (tx) => {
      await tx.player.update({ where: { telegramId }, data: updateData });

      // Remove or reduce item
      if (item.quantity > 1) {
        await tx.inventory.update({ where: { id: inventoryId }, data: { quantity: { decrement: 1 } } });
      } else {
        await tx.inventory.delete({ where: { id: inventoryId } });
      }
    });

    return NextResponse.json({ message: `Вы использовали ${item.name}`, effect: stats });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { effectiveStashCapacity } from '@/lib/stash';

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
    if (item.equipped) return NextResponse.json({ error: 'Сначала снимите предмет' }, { status: 400 });

    const capacity = effectiveStashCapacity(player.stashCapacityBonus);
    const stashCount = await db.stashItem.count({ where: { playerId: player.id } });
    if (stashCount >= capacity) {
      return NextResponse.json({ error: `Хранилище заполнено (${capacity} слотов)` }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      await tx.inventory.delete({ where: { id: item.id } });
      await tx.stashItem.create({
        data: {
          playerId: player.id,
          itemId: item.itemId,
          name: item.name,
          type: item.type,
          rarity: item.rarity,
          stats: item.stats,
          icon: item.icon,
          itemLevel: item.itemLevel,
          affixTier: item.affixTier,
          affixes: item.affixes,
          enhancementLevel: item.enhancementLevel,
          quantity: item.quantity,
        },
      });
    });

    return NextResponse.json({ message: `${item.name} убран в хранилище` });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

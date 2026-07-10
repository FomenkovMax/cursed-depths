import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ITEMS } from '@/lib/game-data';
import { validateTelegramRequest } from '@/lib/auth';
import { applyCurrency, isGearType, type AffixTierName, type CurrencyId, type RolledAffix, CURRENCY_IDS } from '@/lib/item-affixes';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const { inventoryId, currencyItemId } = await req.json();
    if (!inventoryId || !currencyItemId) {
      return NextResponse.json({ error: 'Укажите inventoryId и currencyItemId' }, { status: 400 });
    }
    if (!CURRENCY_IDS.includes(currencyItemId as CurrencyId)) {
      return NextResponse.json({ error: 'Неизвестная крафт-валюта' }, { status: 400 });
    }

    const player = await db.player.findUnique({
      where: { telegramId },
      include: { inventory: true },
    });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const target = player.inventory.find(i => i.id === inventoryId);
    if (!target) return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
    if (!isGearType(target.type)) {
      return NextResponse.json({ error: 'Крафт-валюту можно применять только к оружию, броне или аксессуарам' }, { status: 400 });
    }
    if (target.equipped) {
      return NextResponse.json({ error: 'Сначала снимите предмет' }, { status: 400 });
    }

    const currencyItem = player.inventory.find(i => i.itemId === currencyItemId && i.type === 'currency');
    if (!currencyItem || currencyItem.quantity < 1) {
      return NextResponse.json({ error: 'Недостаточно этой крафт-валюты' }, { status: 400 });
    }

    const baseItem = ITEMS.find(i => i.id === target.itemId);
    if (!baseItem) return NextResponse.json({ error: 'Базовый предмет не найден' }, { status: 500 });

    const itemLevel = target.itemLevel ?? player.level;
    const currentTier = (target.affixTier as AffixTierName | null) ?? 'normal';
    let currentAffixes: RolledAffix[] = [];
    if (target.affixes) {
      try { currentAffixes = JSON.parse(target.affixes); } catch { currentAffixes = []; }
    }

    const result = applyCurrency(
      currencyItemId as CurrencyId,
      baseItem.nameRu,
      baseItem.stats,
      target.type as 'weapon' | 'armor' | 'accessory',
      itemLevel,
      currentTier,
      currentAffixes
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const before = { name: target.name, stats: target.stats };

    await db.$transaction(async (tx) => {
      if (currencyItem.quantity <= 1) {
        await tx.inventory.delete({ where: { id: currencyItem.id } });
      } else {
        await tx.inventory.update({ where: { id: currencyItem.id }, data: { quantity: { decrement: 1 } } });
      }
      await tx.inventory.update({
        where: { id: target.id },
        data: {
          name: result.name,
          stats: JSON.stringify(result.stats),
          itemLevel,
          affixTier: result.affixTier,
          affixes: JSON.stringify(result.affixes),
        },
      });
    });

    return NextResponse.json({
      message: `${before.name} → ${result.name}`,
      before,
      after: { name: result.name, stats: result.stats, affixTier: result.affixTier, affixes: result.affixes },
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

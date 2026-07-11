import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ITEMS } from '@/lib/game-data';
import { validateTelegramRequest } from '@/lib/auth';
import { rerollSingleAffix, enchantCostForReroll, isGearType, type AffixTierName, type RolledAffix } from '@/lib/item-affixes';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const { inventoryId, affixIndex } = await req.json();
    if (!inventoryId || typeof affixIndex !== 'number') {
      return NextResponse.json({ error: 'Укажите inventoryId и affixIndex' }, { status: 400 });
    }

    const player = await db.player.findUnique({ where: { telegramId }, include: { inventory: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const target = player.inventory.find(i => i.id === inventoryId);
    if (!target) return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
    if (!isGearType(target.type)) {
      return NextResponse.json({ error: 'Зачаровать можно только оружие, броню или аксессуары' }, { status: 400 });
    }
    if (target.equipped) {
      return NextResponse.json({ error: 'Сначала снимите предмет' }, { status: 400 });
    }

    const currentTier = (target.affixTier as AffixTierName | null) ?? 'normal';
    // Цена растёт на ENCHANT_COST_STEP с каждым прокрутом именно ЭТОГО предмета —
    // Inventory.enchantRerolls никогда не сбрасывается, фармить идеальный ролл дорожает.
    const cost = enchantCostForReroll(currentTier, target.enchantRerolls);
    if (cost === null) {
      return NextResponse.json({ error: 'На этом предмете нечего перебрасывать точечно' }, { status: 400 });
    }
    if (player.crownShards < cost) {
      return NextResponse.json({ error: `Недостаточно Осколков Короны (нужно ${cost})` }, { status: 400 });
    }

    const baseItem = ITEMS.find(i => i.id === target.itemId);
    if (!baseItem) return NextResponse.json({ error: 'Базовый предмет не найден' }, { status: 500 });

    let currentAffixes: RolledAffix[] = [];
    if (target.affixes) {
      try { currentAffixes = JSON.parse(target.affixes); } catch { currentAffixes = []; }
    }

    const result = rerollSingleAffix(baseItem.nameRu, baseItem.stats, currentTier, currentAffixes, affixIndex);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const before = { name: target.name, stats: target.stats };

    await db.$transaction(async (tx) => {
      const spend = await tx.player.updateMany({
        where: { telegramId, crownShards: { gte: cost } },
        data: { crownShards: { decrement: cost } },
      });
      if (spend.count === 0) throw new Error('INSUFFICIENT_SHARDS');
      await tx.inventory.update({
        where: { id: target.id },
        data: {
          name: result.name,
          stats: JSON.stringify(result.stats),
          affixes: JSON.stringify(result.affixes),
          enchantRerolls: { increment: 1 },
        },
      });
    });

    const outcome = result.delta > 0 ? `улучшилось на ${result.delta}` : result.delta < 0 ? `ухудшилось на ${Math.abs(result.delta)}` : 'не изменилось';
    return NextResponse.json({
      message: `${before.name} → ${result.name} (значение ${outcome})`,
      before,
      after: { name: result.name, stats: result.stats, affixes: result.affixes },
      delta: result.delta,
      nextCost: enchantCostForReroll(currentTier, target.enchantRerolls + 1),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_SHARDS') {
      return NextResponse.json({ error: 'Недостаточно Осколков Короны' }, { status: 400 });
    }
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { ITEMS } from '@/lib/game-data';
import { addItemToInventory } from '@/lib/economy/inventory-utils';
import { isPremiumActive } from '@/lib/premium/premium-shop';
import { rollFortuneWheel, freeSpinsPerDayFor, PAID_SPIN_COST_SHARDS } from '@/lib/economy/fortune-wheel';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const today = new Date().toISOString().split('T')[0];
    const spinsToday = player.fortuneSpinDate === today ? player.fortuneSpinsToday : 0;
    const premium = isPremiumActive(player.premiumUntil);
    const freeSpins = freeSpinsPerDayFor(premium);

    const usesFreeSpin = spinsToday < freeSpins;
    if (!usesFreeSpin && player.crownShards < PAID_SPIN_COST_SHARDS) {
      return NextResponse.json({
        error: `Бесплатные прокруты на сегодня закончились. Платный прокрут стоит ${PAID_SPIN_COST_SHARDS} Осколков Короны — у вас ${player.crownShards}.`,
      }, { status: 400 });
    }

    const result = rollFortuneWheel();

    // Итоговая дельта Осколков Короны за одно вращение: списание платного прокрута и/или
    // сам приз "осколки" — считаем явно, чтобы не писать increment и decrement на одно поле
    // в одном Prisma-вызове.
    let shardsDelta = usesFreeSpin ? 0 : -PAID_SPIN_COST_SHARDS;
    if (result.reward.kind === 'shards') shardsDelta += result.reward.amount;

    const updateData: Prisma.PlayerUpdateInput = {
      fortuneSpinsToday: spinsToday + 1,
      fortuneSpinDate: today,
    };
    if (shardsDelta !== 0) updateData.crownShards = { increment: shardsDelta };

    if (result.reward.kind === 'gold') {
      updateData.gold = { increment: result.reward.amount };
    } else if (result.reward.kind === 'premium_days') {
      const base = player.premiumUntil && player.premiumUntil.getTime() > Date.now() ? player.premiumUntil : new Date();
      updateData.premiumUntil = new Date(base.getTime() + result.reward.days * 24 * 60 * 60 * 1000);
    } else if (result.reward.kind === 'stash_slots') {
      updateData.stashCapacityBonus = { increment: result.reward.slots };
    }

    await db.player.update({ where: { telegramId: auth.telegramId }, data: updateData });

    let itemWon: string | null = null;
    if (result.reward.kind === 'item') {
      const rarity = result.reward.rarity;
      const pool = ITEMS.filter(i => i.rarity === rarity && i.type !== 'quest');
      if (pool.length > 0) {
        const item = pool[Math.floor(Math.random() * pool.length)];
        itemWon = item.nameRu;
        await addItemToInventory({
          playerId: player.id,
          itemId: item.id,
          name: item.nameRu,
          type: item.type,
          rarity: item.rarity,
          stats: JSON.stringify(item.stats),
          icon: item.icon,
          quantity: 1,
        });
      }
    }

    const final = await db.player.findUnique({
      where: { telegramId: auth.telegramId },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({
      reward: { id: result.id, nameRu: result.nameRu, icon: result.icon, kind: result.reward.kind, itemWon },
      usedFreeSpin: usesFreeSpin,
      spinsLeftToday: Math.max(0, freeSpins - (spinsToday + 1)),
      player: final,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

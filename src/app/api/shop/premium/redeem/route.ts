import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { findPremiumSku } from '@/lib/premium/premium-shop';
import { addItemToInventory } from '@/lib/economy/inventory-utils';
import { ITEMS } from '@/lib/game-data';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { skuId } = await req.json();
    const sku = skuId ? findPremiumSku(skuId) : null;
    if (!sku) return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.crownShards < sku.costShards) {
      return NextResponse.json({ error: `Недостаточно Осколков Короны (нужно ${sku.costShards})` }, { status: 400 });
    }

    const updated = await db.$transaction(async (tx) => {
      const data: Prisma.PlayerUpdateInput = { crownShards: { decrement: sku.costShards } };

      if (sku.effect.kind === 'premium_days') {
        // Если премиум уже активен — продлеваем ОТ текущего срока истечения, а не от "сейчас",
        // чтобы покупка недели поверх недели не съедала уже оплаченное время.
        const base = player.premiumUntil && player.premiumUntil.getTime() > Date.now() ? player.premiumUntil : new Date();
        data.premiumUntil = new Date(base.getTime() + sku.effect.days * 24 * 60 * 60 * 1000);
      } else if (sku.effect.kind === 'stash_expansion') {
        data.stashCapacityBonus = { increment: sku.effect.slots };
      }

      return tx.player.update({
        where: { telegramId: auth.telegramId },
        data,
        include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
      });
    });

    if (sku.effect.kind === 'guaranteed_currency') {
      const { itemId, quantity } = sku.effect;
      const itemData = ITEMS.find(i => i.id === itemId);
      if (itemData) {
        await addItemToInventory({
          playerId: player.id,
          itemId: itemData.id,
          name: itemData.nameRu,
          type: itemData.type,
          rarity: itemData.rarity,
          stats: JSON.stringify(itemData.stats),
          icon: itemData.icon,
          quantity,
        });
      }
    }

    const final = await db.player.findUnique({
      where: { telegramId: auth.telegramId },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({
      message: `Куплено: ${sku.nameRu}`,
      player: final ?? updated,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

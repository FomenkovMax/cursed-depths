import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { findExpeditionTier, expeditionReward, F2P_EXPEDITION_TIER_ID, F2P_REWARD_MULT } from '@/lib/premium/expeditions';
import { isPremiumActive, PREMIUM_GOLD_XP_MULT, isDeathDebuffActive, DEATH_DEBUFF_XP_MULT } from '@/lib/premium/premium-shop';
import { ITEMS } from '@/lib/game-data';
import { addItemToInventory } from '@/lib/economy/inventory-utils';
import { LEAGUE_POINTS } from '@/lib/social/pvp-season';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!player.expeditionTierId || !player.expeditionEndsAt) {
      return NextResponse.json({ error: 'Герой ни в какой экспедиции' }, { status: 400 });
    }
    if (player.expeditionEndsAt.getTime() > Date.now()) {
      return NextResponse.json({ error: 'Экспедиция ещё не завершилась' }, { status: 400 });
    }

    const tier = findExpeditionTier(player.expeditionTierId);
    if (!tier) return NextResponse.json({ error: 'Ошибка данных экспедиции' }, { status: 500 });

    const reward = expeditionReward(tier, player.level);
    const premiumActive = isPremiumActive(player.premiumUntil);
    const premiumMult = premiumActive ? PREMIUM_GOLD_XP_MULT : 1;
    const xpDebuffMult = isDeathDebuffActive(player.deathDebuffUntil, player.premiumUntil) ? DEATH_DEBUFF_XP_MULT : 1;
    // F2P могли попасть сюда только через бесплатный ежедневный F2P_EXPEDITION_TIER_ID (см.
    // api/expedition/start) — награда урезана вдвое, это "вкус" механики, не полный доступ.
    const f2pMult = !premiumActive && tier.id === F2P_EXPEDITION_TIER_ID ? F2P_REWARD_MULT : 1;
    const goldGained = Math.round(reward.gold * premiumMult * f2pMult);
    const xpGained = Math.round(reward.xp * premiumMult * xpDebuffMult * f2pMult);

    let newXp = player.xp + xpGained;
    let newLevel = player.level;
    let newXpToNext = player.xpToNext;
    let newStatPoints = player.statPoints;
    let newMaxHp = player.maxHp;
    let leveledUp = false;
    while (newXp >= newXpToNext) {
      newXp -= newXpToNext;
      newLevel++;
      newXpToNext = newLevel * 100;
      newStatPoints += 2;
      newMaxHp += 10;
      leveledUp = true;
    }

    let itemWon: string | null = null;
    if (Math.random() < tier.itemChance) {
      const pool = ITEMS.filter(i => i.rarity === tier.itemRarity && i.type !== 'quest');
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

    const updated = await db.player.update({
      where: { telegramId: auth.telegramId },
      data: {
        gold: { increment: goldGained },
        xp: newXp,
        expeditionTierId: null,
        expeditionEndsAt: null,
        leagueBonusScore: { increment: LEAGUE_POINTS.expeditionClaimed },
        ...(leveledUp ? { level: newLevel, xpToNext: newXpToNext, statPoints: newStatPoints, maxHp: newMaxHp, hp: newMaxHp } : {}),
      },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({
      message: `${tier.nameRu} завершена: +${goldGained} золота, +${xpGained} опыта${itemWon ? `, найдено: ${itemWon}` : ''}`,
      goldGained, xpGained, itemWon, leveledUp,
      player: updated,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

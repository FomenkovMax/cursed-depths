import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { ENEMIES } from '@/lib/game-data';
import { pickRandomBountyEnemyId, pickGuaranteedBountyItem, BOUNTY_DC, BOUNTY_STAT, BOUNTY_BONUS_GOLD } from '@/lib/economy/bounty-board';
import { rollStatCheck } from '@/lib/combat/exploration-events';
import { isPremiumActive, isDeathDebuffActive, DEATH_DEBUFF_XP_MULT, PREMIUM_GOLD_XP_MULT } from '@/lib/premium/premium-shop';
import { computeEquipmentBonuses } from '@/lib/combat/equipment-stats';
import { findPet } from '@/lib/economy/pets';
import { addItemToInventory } from '@/lib/economy/inventory-utils';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { inventory: true, dailyLimits: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    if (!isPremiumActive(player.premiumUntil)) {
      return NextResponse.json({ error: 'Доска контрактов доступна только с активным премиум-статусом' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    let enemyId = player.dailyLimits?.bountyEnemyId ?? null;
    let attempted = player.dailyLimits?.bountyAttempted ?? false;
    if (player.dailyLimits?.bountyDate !== today || !enemyId) {
      enemyId = pickRandomBountyEnemyId();
      attempted = false;
    }
    if (attempted) {
      return NextResponse.json({ error: 'Попытка на сегодня уже потрачена — новый контракт завтра' }, { status: 400 });
    }

    const enemy = ENEMIES.find(e => e.id === enemyId);
    if (!enemy) return NextResponse.json({ error: 'Ошибка данных контракта' }, { status: 500 });

    const activePet = player.activePetId ? findPet(player.activePetId) : null;
    const equipBonuses = computeEquipmentBonuses(player.inventory, activePet);
    const effectiveInstinct = player.instinct + equipBonuses.instinct;

    const check = rollStatCheck(BOUNTY_STAT, {
      strength: player.strength, dexterity: player.dexterity, vitality: player.vitality,
      intellect: player.intellect, willpower: player.willpower, instinct: effectiveInstinct,
    }, BOUNTY_DC);

    let itemWon: string | null = null;
    const updateData: Prisma.PlayerUpdateInput = {
      dailyLimits: {
        upsert: {
          create: { bountyEnemyId: enemyId, bountyDate: today, bountyAttempted: true },
          update: { bountyEnemyId: enemyId, bountyDate: today, bountyAttempted: true },
        },
      },
    };

    if (check.success) {
      const premiumMult = PREMIUM_GOLD_XP_MULT; // премиум гарантирован проверкой выше по маршруту
      const xpDebuffMult = isDeathDebuffActive(player.deathDebuffUntil, player.premiumUntil) ? DEATH_DEBUFF_XP_MULT : 1;
      const goldGained = Math.round(BOUNTY_BONUS_GOLD * premiumMult);
      const xpGained = Math.round(BOUNTY_BONUS_GOLD * 0.5 * premiumMult * xpDebuffMult);

      updateData.gold = { increment: goldGained };

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
      updateData.xp = newXp;
      if (leveledUp) {
        updateData.level = newLevel;
        updateData.xpToNext = newXpToNext;
        updateData.statPoints = newStatPoints;
        updateData.maxHp = newMaxHp;
        updateData.hp = newMaxHp;
      }

      const item = pickGuaranteedBountyItem(enemyId);
      if (item) {
        itemWon = item.nameRu;
        await addItemToInventory({
          playerId: player.id, itemId: item.id, name: item.nameRu, type: item.type,
          rarity: item.rarity, stats: JSON.stringify(item.stats), icon: item.icon, quantity: 1,
        });
      }
    }

    const updated = await db.player.update({
      where: { telegramId: auth.telegramId },
      data: updateData,
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({
      success: check.success,
      check,
      target: { nameRu: enemy.nameRu, icon: enemy.icon },
      itemWon,
      message: check.success
        ? `Контракт выполнен! ${enemy.nameRu} повержен — добыт трофей: ${itemWon ?? 'ничего в лут-столе'}`
        : `Контракт провален — ${enemy.nameRu} оказался не по силам сегодня. Новая цель завтра.`,
      player: updated,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

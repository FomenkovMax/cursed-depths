import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ENEMIES, ITEMS } from '@/lib/game-data';
import { validateTelegramRequest } from '@/lib/auth';
import { resolveEventChoice } from '@/lib/combat/exploration-events';
import { addItemToInventory } from '@/lib/economy/inventory-utils';
import { initBossState } from '@/lib/combat/boss-mechanics';
import { computeEquipmentBonuses } from '@/lib/combat/equipment-stats';
import { isInActivePartyCombat } from '@/lib/combat/party-guards';
import { isDeathDebuffActive, DEATH_DEBUFF_XP_MULT } from '@/lib/premium/premium-shop';
import { findPet } from '@/lib/economy/pets';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const body = await req.json();
    const { eventId, choiceId } = body as { eventId?: string; choiceId?: string };
    if (!eventId || !choiceId) {
      return NextResponse.json({ error: 'Не указан выбор' }, { status: 400 });
    }

    const player = await db.player.findUnique({
      where: { telegramId },
      include: { inventory: true, class: { include: { abilities: true } } },
    });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.inCombat) return NextResponse.json({ error: 'Вы уже в бою' }, { status: 400 });
    if (player.hp <= 0) return NextResponse.json({ error: 'Вы мертвы. Отдохните в таверне.' }, { status: 400 });
    if (await isInActivePartyCombat(player.id)) {
      return NextResponse.json({ error: 'Нельзя исследовать локацию во время боя пати' }, { status: 400 });
    }

    if (eventId === 'illusory_merchant' && choiceId === 'buy' && player.gold < 30) {
      return NextResponse.json({ error: 'Недостаточно золота (нужно 30)' }, { status: 400 });
    }

    // Проверки характеристик (rollStatCheck) считают эффективный стат так же, как и бой —
    // с учётом экипировки, а не только сырых очков персонажа.
    const activePet = player.activePetId ? findPet(player.activePetId) : null;
    const equipBonuses = computeEquipmentBonuses(player.inventory, activePet);
    const resolution = resolveEventChoice(eventId, choiceId, player.level, {
      strength: player.strength + equipBonuses.strength,
      dexterity: player.dexterity + equipBonuses.dexterity,
      vitality: player.vitality + equipBonuses.vitality,
      intellect: player.intellect + equipBonuses.intellect,
      willpower: player.willpower + equipBonuses.willpower,
      instinct: player.instinct + equipBonuses.instinct,
    });
    if (!resolution) {
      return NextResponse.json({ error: 'Неизвестный выбор' }, { status: 400 });
    }

    if (resolution.startCombat) {
      const locationEnemies = ENEMIES.filter(e => e.locationId === player.locationId && !e.isBoss);
      const pool = locationEnemies.length > 0 ? locationEnemies : ENEMIES.filter(e => e.locationId === player.locationId);
      if (pool.length === 0) {
        return NextResponse.json({ type: 'empty', message: resolution.message, player });
      }
      const enemy = pool[Math.floor(Math.random() * pool.length)];
      const enemyHp = enemy.hp + Math.floor(Math.random() * 5);
      const updated = await db.player.update({
        where: { telegramId },
        data: {
          inCombat: true,
          enemyId: enemy.id,
          enemyHp,
          enemyMaxHp: enemyHp,
          combatLog: JSON.stringify([{ text: `${resolution.message} ${enemy.nameRu} появляется!`, turn: 0 }]),
          bossState: JSON.stringify(initBossState(enemy.mechanics)),
        },
        include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
      });
      return NextResponse.json({
        type: 'combat',
        message: resolution.message,
        enemy: { ...enemy, hp: enemyHp, maxHp: enemyHp },
        player: updated,
        checkResult: resolution.checkResult ?? null,
      });
    }

    const effectiveMaxHp = player.maxHp + equipBonuses.hp;
    const effectiveMaxMp = player.maxMp + equipBonuses.mp;
    // События никогда не убивают напрямую — минимум 1 HP, чтобы не давать нечестную "смерть от текста".
    const newHp = Math.max(1, Math.min(effectiveMaxHp, player.hp + Math.round(effectiveMaxHp * resolution.hpDeltaPercent)));
    const newMp = Math.max(0, Math.min(effectiveMaxMp, player.mp + Math.round(effectiveMaxMp * resolution.mpDeltaPercent)));
    const newGold = Math.max(0, player.gold + resolution.goldDelta);

    // Дебафф смерти (-15% опыта, премиум иммунен) действует на любой источник опыта, не только бой.
    const xpDebuffMult = isDeathDebuffActive(player.deathDebuffUntil, player.premiumUntil) ? DEATH_DEBUFF_XP_MULT : 1;
    let newXp = player.xp + Math.round(resolution.xpDelta * xpDebuffMult);
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

    let foundItem: string | null = null;
    const updated = await db.$transaction(async (tx) => {
      if (resolution.itemRarity) {
        const pool = ITEMS.filter(i => i.rarity === resolution.itemRarity && i.type !== 'quest');
        if (pool.length > 0) {
          const item = pool[Math.floor(Math.random() * pool.length)];
          foundItem = item.id;
          await addItemToInventory({
            playerId: player.id,
            itemId: item.id,
            name: item.nameRu,
            type: item.type,
            rarity: item.rarity,
            stats: JSON.stringify(item.stats),
            icon: item.icon,
            quantity: 1,
          }, tx);
        }
      }

      return tx.player.update({
        where: { telegramId },
        data: {
          hp: leveledUp ? newMaxHp : newHp,
          mp: newMp,
          gold: newGold,
          xp: newXp,
          ...(leveledUp ? { level: newLevel, xpToNext: newXpToNext, statPoints: newStatPoints, maxHp: newMaxHp } : {}),
        },
        include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
      });
    });

    return NextResponse.json({
      type: 'event_result',
      message: resolution.message,
      goldDelta: resolution.goldDelta,
      negative: resolution.hpDeltaPercent < 0 || (resolution.goldDelta < 0 && !foundItem),
      foundItem,
      leveledUp,
      player: updated,
      checkResult: resolution.checkResult ?? null,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

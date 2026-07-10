import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ENEMIES, LOCATIONS, ITEMS } from '@/lib/game-data';
import { rollDice, rollLoot } from '@/lib/dice';
import { validateTelegramRequest } from '@/lib/auth';
import { getCached, setCached, CACHE_TTL } from '@/lib/cache';
import { addItemToInventory } from '@/lib/inventory-utils';
import { initBossState } from '@/lib/boss-mechanics';
import { incrementQuestProgress } from '@/lib/quests';
import { stageUnlockLevel } from '@/lib/combat-engine';
import { parsePassiveEffect, type PassiveEffect } from '@/lib/passive-engine';
import { outOfCombatRegen } from '@/lib/passive-runtime';
import { computeEquipmentBonuses } from '@/lib/equipment-stats';
import { isInActivePartyCombat } from '@/lib/party-guards';
import { EXPLORATION_EVENTS } from '@/lib/exploration-events';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    let player = await db.player.findUnique({
      where: { telegramId },
      include: { inventory: true, class: { include: { abilities: true } } },
    });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.inCombat) return NextResponse.json({ error: 'Вы уже в бою' }, { status: 400 });
    if (player.hp <= 0) return NextResponse.json({ error: 'Вы мертвы. Отдохните в таверне.' }, { status: 400 });
    if (await isInActivePartyCombat(player.id)) {
      return NextResponse.json({ error: 'Нельзя исследовать локацию во время боя пати' }, { status: 400 });
    }

    // Вне-боевая регенерация (forest-whisper и аналоги) — каждый вызов /api/explore это единственный
    // в игре реальный аналог "хода вне боя" (см. заголовок lib/passive-engine.ts).
    const playerLevel = player.level;
    const passives: PassiveEffect[] = player.class.abilities
      .filter(a => a.type === 'passive' && playerLevel >= stageUnlockLevel(a.stage))
      .map(a => parsePassiveEffect(a.description))
      .filter((e): e is PassiveEffect => e !== null);
    const regen = outOfCombatRegen(passives);
    if (regen.hpPercent > 0 || regen.mpPercent > 0) {
      const equipBonuses = computeEquipmentBonuses(player.inventory);
      const effectiveMaxHp = player.maxHp + equipBonuses.hp;
      const effectiveMaxMp = player.maxMp + equipBonuses.mp;
      const newHp = Math.min(effectiveMaxHp, player.hp + Math.round(effectiveMaxHp * regen.hpPercent));
      const newMp = Math.min(effectiveMaxMp, player.mp + Math.round(effectiveMaxMp * regen.mpPercent));
      if (newHp !== player.hp || newMp !== player.mp) {
        player = await db.player.update({
          where: { telegramId },
          data: { hp: newHp, mp: newMp },
          include: { inventory: true, class: { include: { abilities: true } } },
        });
      }
    }

    const location = LOCATIONS.find(l => l.id === player.locationId);
    if (!location) return NextResponse.json({ error: 'Неверная локация' }, { status: 400 });

    if (player.locationId === 'town' || player.locationId === 'market') {
      // Safe locations - find items or nothing
      const goldFound = rollDice('1d4') * player.level;
      const updated = await db.$transaction(async (tx) => {
        await incrementQuestProgress(tx, player.id, 'explore');
        return tx.player.update({
          where: { telegramId },
          data: { gold: { increment: goldFound }, totalExplores: { increment: 1 } },
          include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
        });
      });
      return NextResponse.json({
        type: 'safe',
        message: `Вы осмотрели окрестности и нашли ${goldFound} золота.`,
        goldFound,
        player: updated,
      });
    }

    // Dangerous location - roll between combat / narrative event / gold-loot
    const roll = Math.random();
    if (roll < 0.25) {
      // Narrative mini-event with a choice — resolved separately via /api/explore/event,
      // see lib/exploration-events.ts. Player state isn't touched yet, only the "explore"
      // quest counter, since the event itself is what the player was looking for.
      const event = EXPLORATION_EVENTS[Math.floor(Math.random() * EXPLORATION_EVENTS.length)];
      const updated = await db.$transaction(async (tx) => {
        await incrementQuestProgress(tx, player.id, 'explore');
        return tx.player.update({
          where: { telegramId },
          data: { totalExplores: { increment: 1 } },
          include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
        });
      });
      return NextResponse.json({ type: 'event', event, player: updated });
    }
    if (roll < 0.65) {
      // Combat encounter - fetch enemies with caching
      const cacheKey = `enemies:locationId:${player.locationId}`;
      let locationEnemies = getCached<typeof ENEMIES>(cacheKey);
      if (!locationEnemies) {
        locationEnemies = ENEMIES.filter(e => e.locationId === player.locationId);
        setCached(cacheKey, locationEnemies, CACHE_TTL);
      }

      if (locationEnemies.length === 0) {
        const updated = await db.$transaction(async (tx) => {
          await incrementQuestProgress(tx, player.id, 'explore');
          return tx.player.update({
            where: { telegramId },
            data: { totalExplores: { increment: 1 } },
            include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
          });
        });
        return NextResponse.json({ type: 'empty', message: 'Пусто... Никаких врагов не найдено.', player: updated });
      }

      // Боссы встречаются редко (15%), обычные враги — в остальных случаях;
      // если в локации есть только босс, он становится единственным вариантом.
      const bossPool = locationEnemies.filter(e => e.isBoss);
      const regularPool = locationEnemies.filter(e => !e.isBoss);
      const pool = regularPool.length === 0
        ? bossPool
        : (bossPool.length > 0 && Math.random() < 0.15 ? bossPool : regularPool);

      const enemy = pool[Math.floor(Math.random() * pool.length)];
      const enemyHp = enemy.hp + Math.floor(Math.random() * 5);

      const updated = await db.$transaction(async (tx) => {
        await incrementQuestProgress(tx, player.id, 'explore');
        return tx.player.update({
          where: { telegramId },
          data: {
            inCombat: true,
            enemyId: enemy.id,
            enemyHp,
            enemyMaxHp: enemyHp,
            combatLog: JSON.stringify([{ text: `${enemy.nameRu} появляется!`, turn: 0 }]),
            bossState: JSON.stringify(initBossState(enemy.mechanics)),
            totalExplores: { increment: 1 },
          },
          include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
        });
      });

      return NextResponse.json({
        type: 'combat',
        message: `Вы встретили ${enemy.nameRu}!`,
        enemy: { ...enemy, hp: enemyHp, maxHp: enemyHp },
        player: updated,
      });
    }

    // Exploration - find items or gold
    const goldFound = rollDice('2d4') * player.level;
    const foundItems: string[] = [];

    // Random item drop
    const commonItems = ITEMS.filter(i => i.rarity === 'common' && i.type !== 'quest');

    // Wrap gold addition + item addition + quest progress in a transaction
    const updated = await db.$transaction(async (tx) => {
      if (commonItems.length > 0 && Math.random() < 0.3) {
        const item = commonItems[Math.floor(Math.random() * commonItems.length)];
        foundItems.push(item.id);

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

      await incrementQuestProgress(tx, player.id, 'explore');

      return tx.player.update({
        where: { telegramId },
        data: { gold: { increment: goldFound }, totalExplores: { increment: 1 } },
        include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
      });
    });

    return NextResponse.json({
      type: 'explore',
      message: `Вы исследовали ${location.nameRu} и нашли ${goldFound} золота!`,
      goldFound,
      foundItems,
      player: updated,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

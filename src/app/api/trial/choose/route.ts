import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ENEMIES, ITEMS } from '@/lib/game-data';
import { validateTelegramRequest } from '@/lib/auth';
import { initBossState } from '@/lib/combat/boss-mechanics';
import { computeEquipmentBonuses } from '@/lib/combat/equipment-stats';
import { addItemToInventory } from '@/lib/economy/inventory-utils';
import { rollDice } from '@/lib/dice';
import { findTrial } from '@/lib/combat/trials';
import { bossIntroLine } from '@/lib/combat/exploration-flavor';
import { findPet } from '@/lib/economy/pets';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { direction } = await req.json();
    if (direction !== 'left' && direction !== 'right') {
      return NextResponse.json({ error: 'Не указано направление' }, { status: 400 });
    }

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { inventory: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.inCombat) return NextResponse.json({ error: 'Сначала завершите текущий бой' }, { status: 400 });
    if (!player.dungeonId) return NextResponse.json({ error: 'Вы не в испытании' }, { status: 400 });

    const trial = findTrial(player.dungeonId);
    if (!trial) return NextResponse.json({ error: 'Вы не в испытании' }, { status: 400 });
    const junction = trial.junctions[player.dungeonRoom];
    if (!junction) return NextResponse.json({ error: 'Развилка не найдена' }, { status: 400 });

    const option = junction.options.find(o => o.direction === direction);
    if (!option) return NextResponse.json({ error: 'Неверное направление' }, { status: 400 });

    if (option.type === 'monster') {
      const enemy = ENEMIES.find(e => e.id === option.enemyId);
      if (!enemy) return NextResponse.json({ error: 'Ошибка испытания: враг не найден' }, { status: 500 });
      const enemyHp = enemy.hp + Math.floor(Math.random() * 5);
      const updated = await db.player.update({
        where: { telegramId: auth.telegramId },
        data: {
          inCombat: true,
          enemyId: enemy.id,
          enemyHp,
          enemyMaxHp: enemyHp,
          combatLog: JSON.stringify([{ text: `${option.narrativeRu} ${enemy.nameRu} появляется!`, turn: 0 }]),
          bossState: JSON.stringify(initBossState(enemy.mechanics)),
        },
        include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
      });
      return NextResponse.json({
        type: 'combat',
        message: option.narrativeRu,
        enemy: { ...enemy, hp: enemyHp, maxHp: enemyHp },
        player: updated,
      });
    }

    // reward / trap — резолвится мгновенно, без боя, комната сразу считается пройденной.
    const activePet = player.activePetId ? findPet(player.activePetId) : null;
    const equipBonuses = computeEquipmentBonuses(player.inventory, activePet);
    const effectiveMaxHp = player.maxHp + equipBonuses.hp;
    const goldDelta = option.type === 'reward' ? rollDice('2d6') * (option.goldMult ?? 1) * player.level : 0;
    // Событие никогда не убивает напрямую — минимум 1 HP, тот же принцип, что в exploration-events.ts.
    const newHp = option.hpDamagePercent
      ? Math.max(1, Math.min(effectiveMaxHp, player.hp + Math.round(effectiveMaxHp * option.hpDamagePercent)))
      : player.hp;
    const newGold = Math.max(0, player.gold + goldDelta);
    const nextRoomIndex = player.dungeonRoom + 1;

    let foundItem: string | null = null;
    const updated = await db.$transaction(async (tx) => {
      if (option.itemRarity) {
        const pool = ITEMS.filter(i => i.rarity === option.itemRarity && i.type !== 'quest');
        if (pool.length > 0) {
          const item = pool[Math.floor(Math.random() * pool.length)];
          foundItem = item.id;
          await addItemToInventory({
            playerId: player.id, itemId: item.id, name: item.nameRu, type: item.type,
            rarity: item.rarity, stats: JSON.stringify(item.stats), icon: item.icon, quantity: 1,
          }, tx);
        }
      }

      if (nextRoomIndex < trial.junctions.length) {
        // Ещё есть развилки — комната пройдена, но бой не начинается, следующая развилка ждёт выбора.
        return tx.player.update({
          where: { telegramId: auth.telegramId },
          data: { hp: newHp, gold: newGold, dungeonRoom: nextRoomIndex },
          include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
        });
      }

      // Все развилки пройдены — гарантированный босс спавнится сразу.
      const boss = ENEMIES.find(e => e.id === trial.bossEnemyId);
      if (!boss) throw new Error('TRIAL_BOSS_NOT_FOUND');
      const bossHp = boss.hp + Math.floor(Math.random() * 5);
      const bossLine = bossIntroLine(boss.id) ?? `${boss.nameRu} появляется!`;
      return tx.player.update({
        where: { telegramId: auth.telegramId },
        data: {
          hp: newHp, gold: newGold, dungeonRoom: nextRoomIndex,
          inCombat: true, enemyId: boss.id, enemyHp: bossHp, enemyMaxHp: bossHp,
          combatLog: JSON.stringify([{ text: bossLine, turn: 0 }]),
          bossState: JSON.stringify(initBossState(boss.mechanics)),
        },
        include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
      });
    });

    if (nextRoomIndex < trial.junctions.length) {
      return NextResponse.json({
        type: 'junction',
        message: option.narrativeRu,
        goldDelta,
        foundItem,
        trialJunction: {
          options: trial.junctions[nextRoomIndex].options.map(o => ({ direction: o.direction, type: o.type, label: o.label })),
        },
        player: updated,
      });
    }

    const boss = ENEMIES.find(e => e.id === trial.bossEnemyId)!;
    return NextResponse.json({
      type: 'combat',
      message: option.narrativeRu,
      goldDelta,
      foundItem,
      enemy: { ...boss, hp: updated.enemyHp, maxHp: updated.enemyMaxHp },
      player: updated,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

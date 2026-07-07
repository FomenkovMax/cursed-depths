import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ENEMIES, ITEMS } from '@/lib/game-data';
import { rollDice, rollLoot } from '@/lib/dice';
import { validateTelegramRequest } from '@/lib/auth';
import { getCached, setCached, CACHE_TTL } from '@/lib/cache';
import { addItemToInventory } from '@/lib/inventory-utils';
import {
  basicAttackDamage,
  mitigateDamage,
  manaCostForStage,
  stageUnlockLevel,
  resolveAbility,
  type PlayerCombatStats,
} from '@/lib/combat-engine';
import {
  initBossState,
  applyDamageToBoss,
  resolveBossTurn,
  bossAcMultiplier,
  adaptiveResistMultiplier,
  playerDamageMultiplier,
  type BossFightState,
} from '@/lib/boss-mechanics';
import { computeEquipmentBonuses } from '@/lib/equipment-stats';
import { incrementQuestProgress } from '@/lib/quests';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const body = await req.json();
    const { action } = body; // 'attack', 'ability', 'flee', 'use_item', 'defend'
    const itemId = body.itemId;

    const player = await db.player.findUnique({
      where: { telegramId },
      include: { inventory: true, class: { include: { abilities: true } } },
    });

    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!player.inCombat) return NextResponse.json({ error: 'Вы не в бою' }, { status: 400 });
    if (!player.enemyId) return NextResponse.json({ error: 'Нет врага' }, { status: 400 });

    // Fetch enemy data with caching
    const cacheKey = `enemies:id:${player.enemyId}`;
    let enemyTemplate = getCached<typeof ENEMIES[0]>(cacheKey);
    if (!enemyTemplate) {
      enemyTemplate = ENEMIES.find(e => e.id === player.enemyId) ?? null;
      if (enemyTemplate) {
        setCached(cacheKey, enemyTemplate, CACHE_TTL);
      }
    }

    if (!enemyTemplate) return NextResponse.json({ error: 'Враг не найден' }, { status: 404 });

    let combatLog: { text: string; turn: number }[] = [];
    try {
      combatLog = player.combatLog ? JSON.parse(player.combatLog) : [];
    } catch { combatLog = []; }

    let bossState: BossFightState;
    try {
      bossState = player.bossState ? JSON.parse(player.bossState) : initBossState(enemyTemplate.mechanics);
    } catch { bossState = initBossState(enemyTemplate.mechanics); }

    const currentTurn = combatLog.length;
    let enemyHp = player.enemyHp || 0;
    const enemyMaxHp = player.enemyMaxHp || enemyHp;
    let playerHp = player.hp;
    let playerMp = player.mp;
    let combatOver = false;
    let playerWon = false;
    let playerFled = false;
    let xpGained = 0;
    let goldGained = 0;
    const droppedItems: string[] = [];

    // Track deferred DB operations for transaction
    let itemToConsume: { id: string; delete: boolean } | null = null;
    const lootItems: { itemData: typeof ITEMS[0]; quantity: number }[] = [];
    // Дебафф ослабляет урон врага в его ответный удар в этом же раунде
    // (упрощение: способности-дебаффы пока не переносятся между ходами).
    let enemyDamageReduction = 0;

    // Бонусы экипировки (оружие/броня/аксессуары) — единая точка подсчёта, см. lib/equipment-stats.ts
    const equipBonuses = computeEquipmentBonuses(player.inventory);
    const effectiveMaxHp = player.maxHp + equipBonuses.hp;
    const effectiveMaxMp = player.maxMp + equipBonuses.mp;
    const effectiveVitality = player.vitality + equipBonuses.vitality;

    const combatStats: PlayerCombatStats = {
      strength: player.strength + equipBonuses.strength,
      dexterity: player.dexterity + equipBonuses.dexterity,
      vitality: effectiveVitality,
      intellect: player.intellect + equipBonuses.intellect,
      willpower: player.willpower + equipBonuses.willpower,
      instinct: player.instinct + equipBonuses.instinct,
      level: player.level,
      primaryStat: player.class.primaryStat,
    };

    const weaponBonus = equipBonuses.attack;

    // Защита босса (форма/берсерк/почти-неуязвимость) временно меняет его эффективный AC
    const effectiveAc = Math.max(1, Math.round(enemyTemplate.ac * bossAcMultiplier(enemyTemplate.mechanics, bossState)));
    // Окно уязвимости расходуется на текущее действие вне зависимости от его исхода
    bossState.vulnerableNextTurn = false;
    // Проклятие от лечения-с-проклятием (Сердце Айлет) кумулятивно ослабляет урон игрока
    const curseMult = playerDamageMultiplier(enemyTemplate.mechanics, bossState);

    // Обездвиживание корнями с предыдущего хода отменяет текущее действие игрока целиком
    let actionNegated = false;
    if (bossState.playerRooted) {
      actionNegated = true;
      bossState.playerRooted = false;
      combatLog.push({ text: 'Вы скованы корнями-ловушками и не можете действовать!', turn: currentTurn });
    }

    // Player action
    if (actionNegated) {
      // действие игрока отменено обездвиживанием — переходим сразу к ходу врага
    } else if (action === 'flee') {
      const fleeChance = 0.5 + player.dexterity / 200; // выше Ловкость — выше шанс сбежать
      if (Math.random() < fleeChance) {
        playerFled = true;
        combatOver = true;
        combatLog.push({ text: `Вы сбежали от ${enemyTemplate.nameRu}!`, turn: currentTurn });
      } else {
        combatLog.push({ text: 'Побег не удался!', turn: currentTurn });
      }
    } else if (action === 'defend') {
      bossState.playerDefendedLastTurn = true;
      combatLog.push({ text: 'Вы приняли защитную стойку.', turn: currentTurn });
    } else if (action === 'attack') {
      const resist = adaptiveResistMultiplier(enemyTemplate.mechanics, bossState, 'attack');
      const rawDamage = Math.round(mitigateDamage(basicAttackDamage(combatStats) + weaponBonus, effectiveAc) * curseMult * resist);
      const { hpDamage, messages } = applyDamageToBoss(enemyTemplate.mechanics, bossState, rawDamage);
      enemyHp = Math.max(0, enemyHp - hpDamage);
      const absorbed = rawDamage > 0 && hpDamage === 0;
      combatLog.push({ text: absorbed ? 'Вы атакуете! Урон поглощён щитом.' : `Вы атакуете! Урон: ${hpDamage}`, turn: currentTurn });
      if (resist < 1) combatLog.push({ text: 'Враг адаптировался к этому типу урона!', turn: currentTurn });
      for (const m of messages) combatLog.push({ text: m, turn: currentTurn });
    } else if (action === 'use_item') {
      const item = player.inventory.find(i => i.itemId === itemId && i.type === 'consumable');
      if (!item) {
        combatLog.push({ text: 'Предмет не найден!', turn: currentTurn });
      } else {
        const stats = item.stats ? JSON.parse(item.stats) : {};
        if (stats.healHp) {
          playerHp = Math.min(effectiveMaxHp, playerHp + stats.healHp);
          combatLog.push({ text: `Вы использовали ${item.name}. Восстановлено ${stats.healHp} HP.`, turn: currentTurn });
        } else if (stats.damage) {
          const itemDamage = Math.round(stats.damage * curseMult);
          const { hpDamage, messages } = applyDamageToBoss(enemyTemplate.mechanics, bossState, itemDamage);
          enemyHp = Math.max(0, enemyHp - hpDamage);
          const absorbed = itemDamage > 0 && hpDamage === 0;
          combatLog.push({ text: absorbed ? `Вы использовали ${item.name}. Урон поглощён щитом.` : `Вы использовали ${item.name}. Урон: ${hpDamage}`, turn: currentTurn });
          for (const m of messages) combatLog.push({ text: m, turn: currentTurn });
        }

        // Defer item consumption for transaction
        itemToConsume = { id: item.id, delete: item.quantity <= 1 };
      }
    } else if (action === 'ability') {
      const abilityId = body.abilityId;
      const ability = player.class.abilities.find(a => a.id === abilityId);

      if (!ability) {
        combatLog.push({ text: 'Способность не найдена!', turn: currentTurn });
      } else if (ability.type !== 'active') {
        combatLog.push({ text: 'Эта способность пассивна и не используется в бою напрямую!', turn: currentTurn });
      } else if (player.level < stageUnlockLevel(ability.stage)) {
        combatLog.push({ text: `Нужен уровень ${stageUnlockLevel(ability.stage)}!`, turn: currentTurn });
      } else {
        const manaCost = manaCostForStage(ability.stage);
        if (playerMp < manaCost) {
          combatLog.push({ text: `Нужно ${manaCost} маны!`, turn: currentTurn });
        } else {
          playerMp -= manaCost;
          const resolution = resolveAbility(ability.description, combatStats, effectiveAc);

          let damageAbsorbed = false;
          if (resolution.damage > 0) {
            const resist = adaptiveResistMultiplier(enemyTemplate.mechanics, bossState, 'ability');
            const abilityDamage = Math.round(resolution.damage * curseMult * resist);
            const { hpDamage, messages } = applyDamageToBoss(enemyTemplate.mechanics, bossState, abilityDamage);
            enemyHp = Math.max(0, enemyHp - hpDamage);
            damageAbsorbed = hpDamage === 0;
            resolution.damage = hpDamage;
            if (resist < 1) messages.push('Враг адаптировался к этому типу урона!');
            for (const m of messages) combatLog.push({ text: m, turn: currentTurn });
          }
          if (resolution.heal > 0) {
            playerHp = Math.min(effectiveMaxHp, playerHp + resolution.heal);
          }

          const parts = [`${ability.icon} ${ability.name}!`];
          if (damageAbsorbed) parts.push('Урон поглощён щитом.');
          else if (resolution.damage > 0) parts.push(`Урон: ${resolution.damage}`);
          if (resolution.heal > 0) parts.push(`Восстановлено ${resolution.heal} ХП`);
          if (resolution.enemyDamageReduction > 0) parts.push(`Враг ослаблен на ${Math.round(resolution.enemyDamageReduction * 100)}%`);
          combatLog.push({ text: parts.join(' '), turn: currentTurn });
          enemyDamageReduction = resolution.enemyDamageReduction;
        }
      }
    }

    // Check if enemy is dead
    if (enemyHp <= 0 && !combatOver) {
      combatOver = true;
      playerWon = true;
      xpGained = enemyTemplate.xp;
      goldGained = enemyTemplate.gold + rollDice('1d4') * Math.ceil(player.level / 2);
      droppedItems.push(...rollLoot(enemyTemplate.lootTable));
      combatLog.push({ text: `${enemyTemplate.nameRu} повержен! +${xpGained} XP, +${goldGained} золота`, turn: currentTurn + 1 });

      // Collect loot items for deferred addition in transaction
      for (const lootItemId of droppedItems) {
        const itemData = ITEMS.find(i => i.id === lootItemId);
        if (itemData) {
          lootItems.push({ itemData, quantity: 1 });
          combatLog.push({ text: `Найдено: ${itemData.nameRu}!`, turn: currentTurn + 1 });
        }
      }
    }

    // Enemy attacks back if not dead and not fled
    if (!combatOver && !playerFled) {
      const armorBonus = equipBonuses.defense;
      const rawDamage = rollDice(enemyTemplate.damage) * (1 - enemyDamageReduction);
      const baseEnemyDamage = Math.max(1, Math.round(mitigateDamage(rawDamage, effectiveVitality) - armorBonus));

      const turnResult = resolveBossTurn(enemyTemplate.mechanics, bossState, enemyHp, enemyMaxHp, baseEnemyDamage, effectiveMaxHp);

      if (turnResult.bossHeal > 0) {
        enemyHp = Math.min(enemyMaxHp, enemyHp + turnResult.bossHeal);
      }

      if (turnResult.healToPlayer > 0) {
        playerHp = Math.min(effectiveMaxHp, playerHp + turnResult.healToPlayer);
        combatLog.push({ text: `${enemyTemplate.nameRu} исцеляет вас на ${turnResult.healToPlayer} ХП!`, turn: currentTurn + 1 });
      } else {
        let incomingDamage = turnResult.damageToPlayer;
        if (action === 'defend' && !actionNegated) {
          incomingDamage = Math.round(incomingDamage * 0.5);
        }
        playerHp = Math.max(0, playerHp - incomingDamage);
        combatLog.push({ text: `${enemyTemplate.nameRu} атакует! Урон: ${incomingDamage}`, turn: currentTurn + 1 });
      }

      if (turnResult.dotDamageToPlayer > 0) {
        playerHp = Math.max(0, playerHp - turnResult.dotDamageToPlayer);
        combatLog.push({ text: `Вы получаете ${turnResult.dotDamageToPlayer} урона от продолжающегося эффекта!`, turn: currentTurn + 1 });
      }

      for (const m of turnResult.messages) combatLog.push({ text: m, turn: currentTurn + 1 });
    }

    // Mana regen each round (Фаза 1.3: +10 маны за ход)
    if (!combatOver) {
      playerMp = Math.min(effectiveMaxMp, playerMp + 10);
    }

    // Check if player is dead
    if (playerHp <= 0) {
      combatOver = true;
      combatLog.push({ text: 'Вы погибли! Вернитесь в таверну для восстановления.', turn: currentTurn + 2 });
    }

    // Check level up
    let leveledUp = false;
    let newXp = player.xp + xpGained;
    let newLevel = player.level;
    let newXpToNext = player.xpToNext;
    let newStatPoints = player.statPoints;
    while (newXp >= newXpToNext) {
      newXp -= newXpToNext;
      newLevel++;
      newXpToNext = newLevel * 100;
      newStatPoints += 2;
      leveledUp = true;
    }

    // Update player
    const updateData: Record<string, unknown> = {
      hp: playerHp,
      mp: playerMp,
      combatLog: JSON.stringify(combatLog),
      bossState: combatOver ? null : JSON.stringify(bossState),
      xp: newXp,
      gold: { increment: goldGained },
    };

    if (leveledUp) {
      updateData.level = newLevel;
      updateData.xpToNext = newXpToNext;
      updateData.statPoints = newStatPoints;
      const newMaxHp = player.maxHp + 10;
      updateData.maxHp = newMaxHp;
      updateData.hp = newMaxHp + equipBonuses.hp; // Full heal on level up (с учётом бонуса экипировки)
    }

    if (combatOver) {
      updateData.inCombat = false;
      updateData.enemyId = null;
      updateData.enemyHp = null;
      updateData.enemyMaxHp = null;

      if (playerHp <= 0) {
        // Player died - teleport to town with 1 HP
        updateData.hp = 1;
        updateData.locationId = 'town';
      }
    } else {
      updateData.enemyHp = enemyHp;
    }

    // Wrap all DB writes in a transaction
    const updatedPlayer = await db.$transaction(async (tx) => {
      // Consume used item (if any)
      if (itemToConsume) {
        if (itemToConsume.delete) {
          await tx.inventory.delete({ where: { id: itemToConsume.id } });
        } else {
          await tx.inventory.update({ where: { id: itemToConsume.id }, data: { quantity: { decrement: 1 } } });
        }
      }

      // Add loot items to inventory
      for (const loot of lootItems) {
        await addItemToInventory({
          playerId: player.id,
          itemId: loot.itemData.id,
          name: loot.itemData.nameRu,
          type: loot.itemData.type,
          rarity: loot.itemData.rarity,
          stats: JSON.stringify(loot.itemData.stats),
          icon: loot.itemData.icon,
          quantity: loot.quantity,
        }, tx);
      }

      if (playerWon) {
        await incrementQuestProgress(tx, player.id, 'kill');
      }

      // Update player state
      return tx.player.update({
        where: { telegramId },
        data: updateData,
        include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
      });
    });

    return NextResponse.json({
      combatLog: combatLog.slice(-8), // Last 8 entries
      player: updatedPlayer,
      combatOver,
      playerWon,
      playerFled,
      enemyHp,
      enemyMaxHp: player.enemyMaxHp,
      bossPhase: enemyTemplate.mechanics ? bossState.phase : undefined,
      bossShieldHp: enemyTemplate.mechanics?.shieldMax ? bossState.shieldHp : undefined,
      bossShieldMax: enemyTemplate.mechanics?.shieldMax,
      xpGained,
      goldGained,
      droppedItems,
      leveledUp,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

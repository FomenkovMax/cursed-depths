import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { ENEMIES, ITEMS } from '@/lib/game-data';
import { rollDice, rollLoot } from '@/lib/dice';
import { addItemToInventory } from '@/lib/inventory-utils';
import { incrementQuestProgress } from '@/lib/quests';
import { computeEquipmentBonuses } from '@/lib/equipment-stats';
import {
  basicAttackDamage,
  mitigateDamage,
  manaCostForStage,
  stageUnlockLevel,
  resolveAbility,
  type PlayerCombatStats,
} from '@/lib/combat-engine';
import {
  bossAcMultiplier,
  applyDamageToBoss,
  adaptiveResistMultiplier,
  playerDamageMultiplier,
  resolveBossTurn,
  blockRandomMechanics,
  tickBlockedMechanics,
} from '@/lib/boss-mechanics';
import {
  type PartyFightState,
  currentActingPlayerId,
  advanceTurn,
  addSharedEnemyEffect,
  sharedEnemyEffectBonus,
  addMemberEffect,
  memberEffectBonus,
  addEffectToAllAliveMembers,
  tickPartyEffects,
  applyDamageToMemberShield,
  describesGroupEffect,
  hasActiveMembers,
  mergePartyFightState,
  buildBossShimState,
  writeBackBossShimState,
} from '@/lib/party-combat-engine';

/** Начисление уровня по тем же формулам, что и одиночный бой (см. combat/action/route.ts). */
function applyLevelUp(xp: number, level: number, xpToNext: number, statPoints: number, maxHp: number) {
  let newXp = xp, newLevel = level, newXpToNext = xpToNext, newStatPoints = statPoints, newMaxHp = maxHp;
  let leveledUp = false;
  while (newXp >= newXpToNext) {
    newXp -= newXpToNext;
    newLevel++;
    newXpToNext = newLevel * 100;
    newStatPoints += 2;
    newMaxHp += 10;
    leveledUp = true;
  }
  return { newXp, newLevel, newXpToNext, newStatPoints, newMaxHp, leveledUp };
}

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, abilityId } = body;

    const player = await db.player.findUnique({
      where: { telegramId: auth.telegramId },
      include: { inventory: true, class: { include: { abilities: true } }, partyMember: true },
    });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!player.partyMember) return NextResponse.json({ error: 'Вы не состоите в пати' }, { status: 400 });

    const party = await db.party.findUnique({
      where: { id: player.partyMember.partyId },
      include: { combat: true },
    });
    if (!party || party.status !== 'in_combat' || !party.combat) {
      return NextResponse.json({ error: 'Пати сейчас не в бою' }, { status: 400 });
    }
    const combat = party.combat;
    if (combat.status !== 'active') return NextResponse.json({ error: 'Бой уже завершён' }, { status: 400 });

    const enemyTemplate = ENEMIES.find(e => e.id === combat.enemyId);
    if (!enemyTemplate) return NextResponse.json({ error: 'Враг не найден' }, { status: 404 });
    const isBoss = !!enemyTemplate.mechanics;

    let state: PartyFightState;
    try {
      // Мёржим поверх свежих дефолтов, не доверяя распарсенному JSON целиком — та же защита,
      // что и в одиночном бою (см. mergePartyFightState в party-combat-engine.ts).
      state = mergePartyFightState(JSON.parse(combat.state), enemyTemplate.mechanics);
    } catch {
      return NextResponse.json({ error: 'Повреждённое состояние боя' }, { status: 500 });
    }

    if (currentActingPlayerId(state) !== player.id) {
      return NextResponse.json({ error: 'Сейчас не ваш ход' }, { status: 403 });
    }

    // Полные строки ВСЕХ участников пати — нужны и для фан-аута групповых способностей
    // (лечение/бафф на всю живую пати), и для хода врага (случайная цель может быть не
    // текущим actor'ом), и для распределения наград по завершении боя. Размер пати ≤ 6,
    // цена одного лишнего запроса тут пренебрежимо мала по сравнению с ветвлением логики.
    const memberRows = await db.player.findMany({ where: { id: { in: state.turnOrder } }, include: { inventory: true } });
    const memberById = new Map(memberRows.map(m => [m.id, m]));

    interface Live { hp: number; maxHp: number; vitality: number; equipBonuses: ReturnType<typeof computeEquipmentBonuses> }
    const live = new Map<string, Live>();
    for (const m of memberRows) {
      const equip = computeEquipmentBonuses(m.inventory);
      live.set(m.id, { hp: m.hp, maxHp: m.maxHp + equip.hp, vitality: m.vitality + equip.vitality, equipBonuses: equip });
    }
    const actingLive = live.get(player.id)!;
    let playerMp = player.mp;

    const combatStats: PlayerCombatStats = {
      strength: player.strength + actingLive.equipBonuses.strength,
      dexterity: player.dexterity + actingLive.equipBonuses.dexterity,
      vitality: actingLive.vitality,
      intellect: player.intellect + actingLive.equipBonuses.intellect,
      willpower: player.willpower + actingLive.equipBonuses.willpower,
      instinct: player.instinct + actingLive.equipBonuses.instinct,
      level: player.level,
      primaryStat: player.class.primaryStat,
    };
    const weaponBonus = actingLive.equipBonuses.attack + (player.consumableFightsLeft > 0 ? player.consumableAttackBonus : 0);

    // Личная половина боссовых механик АКТУЮЩЕГО игрока (адаптивная резистентность и
    // проклятие относятся к тому, кто сейчас действует) — см. lib/party-combat-engine.ts.
    // Для рядовых врагов (mechanics === undefined) все функции ниже — честные no-op'ы.
    const actingShim = buildBossShimState(state, player.id);
    const effectiveEnemyAc = Math.max(1, Math.round(enemyTemplate.ac * bossAcMultiplier(enemyTemplate.mechanics, actingShim)));
    actingShim.vulnerableNextTurn = false; // окно уязвимости расходуется на текущее действие вне зависимости от исхода
    const curseMult = playerDamageMultiplier(enemyTemplate.mechanics, actingShim);
    const memberDamageBuff = memberEffectBonus(state, player.id, 'player_damage_buff');

    let enemyHp = combat.enemyHp;
    const enemyMaxHp = combat.enemyMaxHp;
    let combatOver = false;
    let partyWon = false;
    const currentTurn = state.combatLog.length;
    const droppedItemsByMember: Record<string, string[]> = {};

    const aliveIds = () => state.turnOrder.filter(id => state.members[id]?.alive && !state.members[id]?.fled);

    if (action === 'flee') {
      const fleeChance = 0.5 + player.dexterity / 200;
      if (Math.random() < fleeChance) {
        state.members[player.id].fled = true;
        state.combatLog.push({ text: `${player.name} сбегает из боя!`, turn: currentTurn, actorPlayerId: player.id });
      } else {
        state.combatLog.push({ text: `${player.name} пытается сбежать — не вышло!`, turn: currentTurn, actorPlayerId: player.id });
      }
    } else if (action === 'defend') {
      // Снимает риск "Ответного удара" на следующем ходу врага против этого участника (см.
      // resolveBossTurn) — в отличие от одиночного боя, здесь НЕТ гарантированного "враг ударит
      // именно вас следующим" (цель хода врага случайна среди всей пати), поэтому классическое
      // "защита снижает входящий урон вдвое" честно не переносится — половинить урон было бы
      // нечему, пока неизвестно, кого враг вообще атакует.
      actingShim.playerDefendedLastTurn = true;
      state.combatLog.push({ text: `${player.name} принимает защитную стойку.`, turn: currentTurn, actorPlayerId: player.id });
    } else if (action === 'attack') {
      const resist = adaptiveResistMultiplier(enemyTemplate.mechanics, actingShim, 'attack');
      const rawDamage = Math.round(mitigateDamage(basicAttackDamage(combatStats) + weaponBonus, effectiveEnemyAc) * curseMult * resist * (1 + memberDamageBuff));
      const { hpDamage, messages } = applyDamageToBoss(enemyTemplate.mechanics, actingShim, rawDamage);
      enemyHp = Math.max(0, enemyHp - hpDamage);
      const absorbed = rawDamage > 0 && hpDamage === 0;
      state.combatLog.push({ text: absorbed ? `${player.name} атакует! Урон поглощён щитом.` : `${player.name} атакует! Урон: ${hpDamage}`, turn: currentTurn, actorPlayerId: player.id });
      if (resist < 1) state.combatLog.push({ text: 'Враг адаптировался к этому типу урона!', turn: currentTurn });
      for (const m of messages) state.combatLog.push({ text: m, turn: currentTurn });
    } else if (action === 'ability') {
      const ability = player.class.abilities.find(a => a.id === abilityId);
      if (!ability) {
        state.combatLog.push({ text: 'Способность не найдена!', turn: currentTurn, actorPlayerId: player.id });
      } else if (ability.type !== 'active') {
        state.combatLog.push({ text: 'Эта способность пассивна и не используется в бою напрямую!', turn: currentTurn, actorPlayerId: player.id });
      } else if (player.level < stageUnlockLevel(ability.stage)) {
        state.combatLog.push({ text: `Нужен уровень ${stageUnlockLevel(ability.stage)}!`, turn: currentTurn, actorPlayerId: player.id });
      } else if (playerMp < manaCostForStage(ability.stage)) {
        state.combatLog.push({ text: `Нужно ${manaCostForStage(ability.stage)} маны!`, turn: currentTurn, actorPlayerId: player.id });
      } else {
        playerMp -= manaCostForStage(ability.stage);
        const resolution = resolveAbility(ability.description, combatStats, effectiveEnemyAc, isBoss ? { isBoss: true, bossNote: ability.bossNote } : undefined);
        const isGroup = describesGroupEffect(ability.description);

        const parts = [`${ability.icon} ${ability.name}!`];
        if (resolution.damage > 0) {
          const resist = adaptiveResistMultiplier(enemyTemplate.mechanics, actingShim, 'ability');
          const abilityDamage = Math.round(resolution.damage * curseMult * resist * (1 + memberDamageBuff));
          const { hpDamage, messages } = applyDamageToBoss(enemyTemplate.mechanics, actingShim, abilityDamage);
          enemyHp = Math.max(0, enemyHp - hpDamage);
          parts.push(abilityDamage > 0 && hpDamage === 0 ? 'Урон поглощён щитом.' : `Урон: ${hpDamage}`);
          if (resist < 1) parts.push('(враг адаптировался к этому типу урона)');
          for (const m of messages) parts.push(m);
        }
        if (resolution.heal > 0) {
          const healTargets = isGroup ? aliveIds() : [player.id];
          for (const id of healTargets) {
            const l = live.get(id);
            if (l) l.hp = Math.min(l.maxHp, l.hp + resolution.heal);
          }
          parts.push(`Восстановлено ${resolution.heal} ХП${isGroup ? ' всей пати' : ''}`);
        }
        if (resolution.shield > 0) {
          state.members[player.id].shieldHp += resolution.shield;
          parts.push(`Щит: ${resolution.shield} ХП`);
        }
        if (resolution.enemyDamageReduction > 0 && resolution.effectTurns > 0) {
          addSharedEnemyEffect(state, 'enemy_damage_debuff', resolution.enemyDamageReduction, resolution.effectTurns);
          parts.push(`Враг ослаблен на ${Math.round(resolution.enemyDamageReduction * 100)}% на ${resolution.effectTurns} х.`);
        }
        if (resolution.playerDamageBonus > 0 && resolution.effectTurns > 0) {
          if (isGroup) addEffectToAllAliveMembers(state, 'player_damage_buff', resolution.playerDamageBonus, resolution.effectTurns);
          else addMemberEffect(state, player.id, 'player_damage_buff', resolution.playerDamageBonus, resolution.effectTurns);
          parts.push(`Урон усилен на ${Math.round(resolution.playerDamageBonus * 100)}%${isGroup ? ' всей пати' : ''} на ${resolution.effectTurns} х.`);
        }
        if (resolution.dodgeBonus > 0 && resolution.effectTurns > 0) {
          if (isGroup) addEffectToAllAliveMembers(state, 'player_dodge_buff', resolution.dodgeBonus, resolution.effectTurns);
          else addMemberEffect(state, player.id, 'player_dodge_buff', resolution.dodgeBonus, resolution.effectTurns);
          parts.push(`Шанс уклонения повышен на ${Math.round(resolution.dodgeBonus * 100)}%${isGroup ? ' всей пати' : ''} на ${resolution.effectTurns} х.`);
        }
        if (resolution.enemyDotPercent > 0 && resolution.effectTurns > 0) {
          addSharedEnemyEffect(state, 'enemy_dot', resolution.enemyDotPercent, resolution.effectTurns);
          parts.push(`Враг отравлен: ${Math.round(resolution.enemyDotPercent * 100)}% ХП/ход на ${resolution.effectTurns} х.`);
        }
        if (resolution.summonDamage > 0 && resolution.effectTurns > 0) {
          addSharedEnemyEffect(state, 'summon_damage', resolution.summonDamage, resolution.effectTurns);
          parts.push(`Скелет-союзник будет наносить ${resolution.summonDamage} урона в ход (${resolution.effectTurns} х.)`);
        }
        if (resolution.blockSkillCount > 0) {
          // У рядовых врагов нет периодических механик вообще — блокировать нечего,
          // blockRandomMechanics корректно вернёт пустой массив в этом случае.
          const blockedLabels = blockRandomMechanics(enemyTemplate.mechanics, actingShim, resolution.blockSkillCount, resolution.blockSkillTurns);
          parts.push(
            blockedLabels.length > 0
              ? `Заблокирован${blockedLabels.length > 1 ? 'ы' : ''} скилл${blockedLabels.length > 1 ? 'ы' : ''} врага (${blockedLabels.join(', ')}) на ${resolution.blockSkillTurns} х.`
              : 'У врага не нашлось скилла для блокировки.'
          );
        }
        if (resolution.noAllyToTarget) parts.push('Нет цели для этой способности.');
        state.combatLog.push({ text: parts.join(' '), turn: currentTurn, actorPlayerId: player.id });
      }
    } else {
      return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
    }

    writeBackBossShimState(state, player.id, actingShim);

    if (enemyHp <= 0 && !combatOver) {
      combatOver = true;
      partyWon = true;
      state.combatLog.push({ text: `${enemyTemplate.nameRu} повержен!`, turn: currentTurn });
    }

    // Ход врага — только когда круг очереди завершён (все живые/не сбежавшие уже отходили).
    if (!combatOver) {
      const roundCompleted = advanceTurn(state);
      if (roundCompleted) {
        const dotPercent = sharedEnemyEffectBonus(state, 'enemy_dot');
        if (dotPercent > 0 && enemyHp > 0) {
          const dotDmg = Math.round(enemyMaxHp * dotPercent);
          enemyHp = Math.max(0, enemyHp - dotDmg);
          state.combatLog.push({ text: `Враг горит! Урон: ${dotDmg}`, turn: currentTurn });
        }
        const summonDmg = sharedEnemyEffectBonus(state, 'summon_damage');
        if (summonDmg > 0 && enemyHp > 0) {
          enemyHp = Math.max(0, enemyHp - summonDmg);
          state.combatLog.push({ text: `Скелет-союзник наносит урон! Урон: ${summonDmg}`, turn: currentTurn });
        }

        if (enemyHp <= 0) {
          combatOver = true;
          partyWon = true;
          state.combatLog.push({ text: `${enemyTemplate.nameRu} повержен!`, turn: currentTurn });
        } else if (hasActiveMembers(state)) {
          const candidates = aliveIds();
          const targetId = candidates[Math.floor(Math.random() * candidates.length)];
          const targetLive = live.get(targetId);
          const targetRow = memberById.get(targetId);
          if (targetLive && targetRow) {
            const debuff = Math.min(0.9, sharedEnemyEffectBonus(state, 'enemy_damage_debuff'));
            const rawDamage = rollDice(enemyTemplate.damage) * (1 - debuff);
            const baseDamage = Math.max(1, Math.round(mitigateDamage(rawDamage, targetLive.vitality) - targetLive.equipBonuses.defense));

            if (enemyTemplate.mechanics) {
              // Личная половина шима — цель ЭТОГО хода врага (окно уязвимости/обездвиживание/
              // защитная стойка/проклятие относятся к тому, кого враг сейчас атакует).
              const enemyShim = buildBossShimState(state, targetId);
              const turnResult = resolveBossTurn(enemyTemplate.mechanics, enemyShim, enemyHp, enemyMaxHp, baseDamage, targetLive.maxHp);

              if (turnResult.bossHeal > 0) {
                enemyHp = Math.min(enemyMaxHp, enemyHp + turnResult.bossHeal);
              }
              if (turnResult.healToPlayer > 0) {
                targetLive.hp = Math.min(targetLive.maxHp, targetLive.hp + turnResult.healToPlayer);
                state.combatLog.push({ text: `${enemyTemplate.nameRu} исцеляет ${targetRow.name}... но это лечение проклято!`, turn: currentTurn });
              } else {
                const dodgeChance = memberEffectBonus(state, targetId, 'player_dodge_buff');
                if (Math.random() < dodgeChance) {
                  state.combatLog.push({ text: `${enemyTemplate.nameRu} атакует ${targetRow.name}! Уклонение!`, turn: currentTurn });
                } else {
                  const { hpDamage, absorbed } = applyDamageToMemberShield(state, targetId, turnResult.damageToPlayer);
                  targetLive.hp = Math.max(0, targetLive.hp - hpDamage);
                  if (targetLive.hp <= 0) state.members[targetId].alive = false;
                  state.combatLog.push({
                    text: absorbed
                      ? (hpDamage > 0 ? `${enemyTemplate.nameRu} атакует ${targetRow.name}! Щит поглощает часть урона, ${hpDamage} в ХП!` : `${enemyTemplate.nameRu} атакует ${targetRow.name}! Урон полностью поглощён щитом!`)
                      : `${enemyTemplate.nameRu} атакует ${targetRow.name}! Урон: ${hpDamage}`,
                    turn: currentTurn,
                  });
                }
              }

              if (turnResult.dotDamageToPlayer > 0 && !state.members[targetId].poisonCured) {
                const { hpDamage: dotDmg } = applyDamageToMemberShield(state, targetId, turnResult.dotDamageToPlayer);
                targetLive.hp = Math.max(0, targetLive.hp - dotDmg);
                if (targetLive.hp <= 0) state.members[targetId].alive = false;
                state.combatLog.push({ text: `${targetRow.name} получает ${dotDmg} урона от продолжающегося эффекта!`, turn: currentTurn });
              }

              for (const m of turnResult.messages) state.combatLog.push({ text: m, turn: currentTurn });

              writeBackBossShimState(state, targetId, enemyShim);
            } else {
              // Рядовой враг — простая плоская атака без фаз/самолечения/призывов/проклятий.
              const dodgeChance = memberEffectBonus(state, targetId, 'player_dodge_buff');
              if (Math.random() < dodgeChance) {
                state.combatLog.push({ text: `${enemyTemplate.nameRu} атакует ${targetRow.name}! Уклонение!`, turn: currentTurn });
              } else {
                const { hpDamage, absorbed } = applyDamageToMemberShield(state, targetId, baseDamage);
                targetLive.hp = Math.max(0, targetLive.hp - hpDamage);
                if (targetLive.hp <= 0) state.members[targetId].alive = false;
                state.combatLog.push({
                  text: absorbed
                    ? (hpDamage > 0 ? `${enemyTemplate.nameRu} атакует ${targetRow.name}! Щит поглощает часть урона, ${hpDamage} в ХП!` : `${enemyTemplate.nameRu} атакует ${targetRow.name}! Урон полностью поглощён щитом!`)
                    : `${enemyTemplate.nameRu} атакует ${targetRow.name}! Урон: ${hpDamage}`,
                  turn: currentTurn,
                });
              }
            }
          }
        }

        if (state.bossMechanics) {
          // tickBlockedMechanics трогает только общую половину шима (blockedMechanics) — какой
          // memberId подставить неважно, личные поля этим вызовом не читаются и не пишутся.
          const blockShim = buildBossShimState(state, state.turnOrder[0]);
          tickBlockedMechanics(blockShim);
          state.bossMechanics.blockedMechanics = blockShim.blockedMechanics;
        }
        tickPartyEffects(state);

        if (!hasActiveMembers(state) && !combatOver) {
          combatOver = true;
          state.combatLog.push({ text: 'Вся пати повержена или сбежала...', turn: currentTurn });
        }
      }
    }

    // Награда за победу — каждый живой (не сбежавший и не павший) участник получает полный
    // "сольный" XP/золото/лут, без деления между участниками (см. lib/party-combat-engine.ts —
    // намеренное упрощение первой версии, не штрафовать игроков за совместную игру).
    const rewardTargets = partyWon ? aliveIds() : [];
    for (const id of rewardTargets) {
      droppedItemsByMember[id] = rollLoot(enemyTemplate.lootTable);
    }

    const updated = await db.$transaction(async (tx) => {
      // Строка PartyCombat
      await tx.partyCombat.update({
        where: { id: combat.id },
        data: {
          enemyHp,
          state: JSON.stringify(state),
          status: combatOver ? (partyWon ? 'won' : 'lost') : 'active',
        },
      });

      // Ходивший игрок — ХП/МП/уровень/квест
      for (const id of live.keys()) {
        const row = memberById.get(id);
        if (!row) continue;
        const l = live.get(id)!;
        const isActing = id === player.id;
        const xpGain = rewardTargets.includes(id) ? enemyTemplate.xp : 0;
        const goldGain = rewardTargets.includes(id) ? enemyTemplate.gold + rollDice('1d4') * Math.ceil(row.level / 2) : 0;
        const lvl = applyLevelUp(row.xp + xpGain, row.level, row.xpToNext, row.statPoints, row.maxHp);

        const updateData: Record<string, unknown> = {
          hp: lvl.leveledUp ? lvl.newMaxHp + l.equipBonuses.hp : l.hp,
          xp: lvl.newXp,
          gold: { increment: goldGain },
        };
        if (isActing) updateData.mp = playerMp;
        if (lvl.leveledUp) {
          updateData.level = lvl.newLevel;
          updateData.xpToNext = lvl.newXpToNext;
          updateData.statPoints = lvl.newStatPoints;
          updateData.maxHp = lvl.newMaxHp;
        }

        await tx.player.update({ where: { id }, data: updateData });

        for (const itemId of droppedItemsByMember[id] ?? []) {
          const itemData = ITEMS.find(i => i.id === itemId);
          if (itemData) {
            await addItemToInventory({
              playerId: id,
              itemId: itemData.id,
              name: itemData.nameRu,
              type: itemData.type,
              rarity: itemData.rarity,
              stats: JSON.stringify(itemData.stats),
              icon: itemData.icon,
              quantity: 1,
            }, tx);
          }
        }
        if (rewardTargets.includes(id)) {
          await incrementQuestProgress(tx, id, 'kill');
        }
      }

      if (combatOver) {
        await tx.party.update({ where: { id: party.id }, data: { status: 'forming' } });
      }

      return tx.partyCombat.findUnique({ where: { id: combat.id } });
    });

    return NextResponse.json({
      combat: updated,
      combatOver,
      partyWon,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

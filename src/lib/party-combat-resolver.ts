/**
 * Резолвит ОДНО действие ОДНОГО участника пати-боя (атака/способность/защита/побег) — общее
 * ядро для двух вызывающих сторон:
 *  - POST /api/party/combat/action — обычный ход настоящего игрока (actingPlayerId = вызвавший);
 *  - GET /api/party/combat/state — автопропуск хода "отошедшего" (AFK) участника: та же функция,
 *    но actingPlayerId берётся из currentActingPlayerId(state), а action всегда 'defend' (см.
 *    AFK_TIMEOUT_MS в party-combat-engine.ts и вызов ниже в state/route.ts).
 * Вынесено в отдельный модуль, а не продублировано, чтобы бой с боссом (награды, ход врага,
 * фазы/щиты/призывы) резолвился ОДИНАКОВО что от живого клика, что от автопропуска — иначе два
 * независимых куска идентичной логики неизбежно разошлись бы при следующей правке одного из них.
 *
 * Пассивки (lib/passive-engine.ts/passive-runtime.ts) и "заряженные"/условные эффекты способностей
 * включая обереги от смерти (lib/conditional-ability-engine.ts) реализованы здесь по образцу
 * одиночного боя (combat/action/route.ts) функция-в-функцию — читай его как источник истины по
 * формулам, если нужно свериться. Ключевые party-специфичные адаптации:
 *  - passives разбираются для ВСЕХ участников пати заранее (не только для actor'а), поскольку ход
 *    врага может ударить ЛЮБОГО из них — их собственные пассивки (уклонение/отражение/контрудар/
 *    щит-от-блока/лечение от полученных ударов и т.п.) должны сработать именно для той цели, а не
 *    для того, кто ходил последним.
 *  - "Заряженные" одноразовые эффекты и счётчики (armedEffects/playerAttackCount/
 *    playerHitsTakenCount/abilityCooldowns) хранятся НЕПОСРЕДСТВЕННО на PartyMemberFightState
 *    (party-нативные аналоги lib/combat-effects.ts — не через боссовый шим, см. заголовок
 *    party-combat-engine.ts), поэтому читаются/пишутся напрямую через state.members[id], а не
 *    через buildBossShimState/writeBackBossShimState (тот остаётся только про боссовые механики).
 *  - "Обездвиживание корнями" (playerRooted) теперь реально проверяется и отменяет действие
 *    актёра — раньше поле писалось шимом, но никогда не читалось, то есть рут молча не работал
 *    в пати-бою; это тоже часть переноса пассивок (иммунитет к обездвиживанию — пассивка).
 *  - "Защита снижает входящий урон вдвое" восстановлена: раньше была намеренно не перенесена
 *    ("неизвестно, кого враг атакует"), но раз для пассивок (уклонение/блок-лечение/контрудар)
 *    всё равно нужно смотреть на playerDefendedLastTurn ЦЕЛИ хода врага — тот же флаг даёт и
 *    честное "если защищались и вас атаковали — урон вдвое", без дополнительной цены.
 *  - Предел самоисцеления врага (enemy_heal_cap) берётся МИНИМАЛЬНЫМ среди пассивок ВСЕЙ живой
 *    пати, а не только цели хода врага — это дебафф на способность врага лечиться вообще, а не
 *    личный эффект того, кого он в данный момент атакует (симметрично тому, как enemy_damage_debuff
 *    уже общий на пати через sharedEnemyEffects).
 */
import { db } from '@/lib/db';
import { ENEMIES, ITEMS } from '@/lib/game-data';
import { rollDice, rollLoot } from '@/lib/dice';
import { addItemToInventory } from '@/lib/inventory-utils';
import { incrementQuestProgress } from '@/lib/quests';
import { computeEquipmentBonuses } from '@/lib/equipment-stats';
import { rollGearInstance, rollCurrencyDrop } from '@/lib/item-affixes';
import {
  basicAttackDamage,
  mitigateDamage,
  manaCostForStage,
  stageUnlockLevel,
  resolveAbility,
  extractBossOverridePercent,
  EFFECT_DURATION_TURNS,
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
import { parsePassiveEffect, describesGroupPassiveAura, type PassiveEffect } from '@/lib/passive-engine';
import {
  parseDeathWard,
  parseArmedEffects,
  parseImmediateSelfBuff,
  parseExecute,
  parseActivatedOnBlockCounter,
  parseDebuffAmplify,
  type DeathWardEffect,
} from '@/lib/conditional-ability-engine';
import {
  PASSIVE_CRIT_MULTIPLIER,
  hpThresholdBonuses,
  unconditionalBonuses,
  critEveryNHits,
  hitsTakenEveryNHeal,
  dodgeChancePercent,
  reflectChancePercent,
  counterBurnChances,
  counterDamageFlatPercent,
  turnIntervalEmpowered,
  damageVsDebuffedEnemyBonus,
  damageVsShieldedEnemyBonus,
  enemyDebuffStackDrainDamage,
  perTurnLifestealFromEnemyPercent,
  onVictoryHealPercent,
  deathSaveHealPercent,
  hasRootImmune,
  onDefendDefenseBonus,
  hasFirstAttackCrit,
  onBlockHealPercent,
  onBlockCounterPercent,
  healChanceCleanseCurseChance,
  enemyHealCapPercent,
} from '@/lib/passive-runtime';
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
  armMemberEffect,
  peekMemberArmedEffectPercent,
  consumeMemberArmedEffects,
} from '@/lib/party-combat-engine';

interface AuraMemberRow { id: string; level: number; class: { abilities: { type: string; stage: number; description: string }[] } }

/**
 * Совокупный бонус ото всех "аур" (см. describesGroupPassiveAura в passive-engine.ts:
 * eternal-vow/sacred-aura/the-leader) среди ЖИВОЙ пати — каждая действует, только пока у СВОЕГО
 * носителя выполняется её собственное условие (eternal-vow требует HP носителя > 50%, не HP
 * получателя бонуса). Включает бонус от самого получателя, если у него тоже есть такая аура —
 * та же семантика, что и раньше при self-применении (см. заголовок passive-engine.ts). Эти
 * эффекты СОЗНАТЕЛЬНО исключены из partyPassives (см. ниже) — иначе носитель получал бы свой
 * же бонус дважды: один раз отсюда, второй раз через свой личный passives-список.
 */
function partyAuraBonuses(memberRows: AuraMemberRow[], live: Map<string, { hp: number; maxHp: number }>, aliveIdsList: string[]) {
  let damageMultBonus = 0, defenseMultBonus = 0, healingBonusPercent = 0;
  const byId = new Map(memberRows.map(m => [m.id, m]));
  for (const id of aliveIdsList) {
    const row = byId.get(id);
    const bearerLive = live.get(id);
    if (!row || !bearerLive) continue;
    const bearerHpPercent = bearerLive.maxHp > 0 ? (bearerLive.hp / bearerLive.maxHp) * 100 : 100;
    for (const ability of row.class.abilities) {
      if (ability.type !== 'passive' || row.level < stageUnlockLevel(ability.stage)) continue;
      if (!describesGroupPassiveAura(ability.description)) continue;
      const effect = parsePassiveEffect(ability.description);
      if (!effect) continue;
      if (effect.kind === 'hp_threshold') {
        const met = effect.below ? bearerHpPercent < effect.thresholdPercent : bearerHpPercent > effect.thresholdPercent;
        if (met) defenseMultBonus += effect.defenseMultBonus;
      } else if (effect.kind === 'unconditional_damage_buff') {
        damageMultBonus += effect.damageMultBonus;
      } else if (effect.kind === 'unconditional_healing_buff') {
        healingBonusPercent += effect.healingBonusPercent;
      }
    }
  }
  return { damageMultBonus, defenseMultBonus, healingBonusPercent };
}

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

export type ResolvePartyActionOutcome =
  | { ok: true; combat: NonNullable<Awaited<ReturnType<typeof db.partyCombat.findUnique>>>; combatOver: boolean; partyWon: boolean }
  | { ok: false; error: string; status: number };

export async function resolvePartyAction(
  actingPlayerId: string,
  action: string,
  abilityId?: string,
  /** true, когда действие вызвано автопропуском AFK-хода (см. state/route.ts), а не реальным
   * кликом игрока — влияет только на текст лога, чтобы участники видели ПОЧЕМУ ход пропущен. */
  isAfkSkip = false,
): Promise<ResolvePartyActionOutcome> {
  const player = await db.player.findUnique({
    where: { id: actingPlayerId },
    include: { inventory: true, class: { include: { abilities: true } }, partyMember: true },
  });
  if (!player) return { ok: false, error: 'Персонаж не найден', status: 404 };
  if (!player.partyMember) return { ok: false, error: 'Вы не состоите в пати', status: 400 };

  const party = await db.party.findUnique({
    where: { id: player.partyMember.partyId },
    include: { combat: true },
  });
  if (!party || party.status !== 'in_combat' || !party.combat) {
    return { ok: false, error: 'Пати сейчас не в бою', status: 400 };
  }
  const combat = party.combat;
  if (combat.status !== 'active') return { ok: false, error: 'Бой уже завершён', status: 400 };

  const enemyTemplate = ENEMIES.find(e => e.id === combat.enemyId);
  if (!enemyTemplate) return { ok: false, error: 'Враг не найден', status: 404 };
  const isBoss = !!enemyTemplate.mechanics;

  let state: PartyFightState;
  try {
    // Мёржим поверх свежих дефолтов, не доверяя распарсенному JSON целиком — та же защита,
    // что и в одиночном бою (см. mergePartyFightState в party-combat-engine.ts).
    state = mergePartyFightState(JSON.parse(combat.state), enemyTemplate.mechanics);
  } catch {
    return { ok: false, error: 'Повреждённое состояние боя', status: 500 };
  }

  if (currentActingPlayerId(state) !== player.id) {
    return { ok: false, error: 'Сейчас не ваш ход', status: 403 };
  }

  // Полные строки ВСЕХ участников пати (включая классы+способности — нужны как для
  // группового фан-аута/наград, так и для ПАССИВОК ЛЮБОГО участника: ход врага может ударить
  // случайную цель, чьи собственные пассивки — не actor'а — должны сработать именно для неё.
  const memberRows = await db.player.findMany({
    where: { id: { in: state.turnOrder } },
    include: { inventory: true, class: { include: { abilities: true } } },
  });
  const memberById = new Map(memberRows.map(m => [m.id, m]));

  interface Live { hp: number; maxHp: number; vitality: number; equipBonuses: ReturnType<typeof computeEquipmentBonuses> }
  const live = new Map<string, Live>();
  const partyPassives = new Map<string, PassiveEffect[]>();
  for (const m of memberRows) {
    const equip = computeEquipmentBonuses(m.inventory);
    live.set(m.id, { hp: m.hp, maxHp: m.maxHp + equip.hp, vitality: m.vitality + equip.vitality, equipBonuses: equip });
    partyPassives.set(m.id, m.class.abilities
      // describesGroupPassiveAura исключены отсюда намеренно — это ауры на ВСЮ пати
      // (eternal-vow/sacred-aura/the-leader), а не self-only эффекты; их считает
      // partyAuraBonuses() ниже. Оставлять их и тут значило бы удваивать бонус носителю.
      .filter(a => a.type === 'passive' && m.level >= stageUnlockLevel(a.stage) && !describesGroupPassiveAura(a.description))
      .map(a => parsePassiveEffect(a.description))
      .filter((e): e is PassiveEffect => e !== null));
  }
  const actingLive = live.get(player.id)!;
  const actingPassives = partyPassives.get(player.id) ?? [];
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

  const aliveIds = () => state.turnOrder.filter(id => state.members[id]?.alive && !state.members[id]?.fled);

  const hpPercentAtTurnStart = actingLive.maxHp > 0 ? (actingLive.hp / actingLive.maxHp) * 100 : 100;
  const thresholdBonus = hpThresholdBonuses(actingPassives, hpPercentAtTurnStart);
  const uncondBonus = unconditionalBonuses(actingPassives);
  // Ауры пати (eternal-vow/sacred-aura/the-leader, см. describesGroupPassiveAura) — считаются
  // заново на каждом ходу actor'а по ТЕКУЩЕМУ HP всех живых носителей.
  const partyAura = partyAuraBonuses(memberRows, live, aliveIds());
  const totalHealingBonus = thresholdBonus.healingBonusPercent + uncondBonus.healingBonusPercent + partyAura.healingBonusPercent;

  /**
   * Инкрементирует счётчик ударов ЭТОГО участника и считает множитель от "каждый N-й удар"/
   * "раз в N ударов" пассивок + снимает его собственные "заряженные" одноразовые эффекты (см.
   * lib/conditional-ability-engine.ts), ждавшие следующей результативной атаки/способности.
   */
  function applyPassiveOffenseBonuses(playerId: string, passives: PassiveEffect[], forceCrit = false) {
    const m = state.members[playerId];
    m.playerAttackCount += 1;
    const critN = critEveryNHits(passives);
    const firstAttackCrit = m.playerAttackCount === 1 && hasFirstAttackCrit(passives);
    const armedCrit = consumeMemberArmedEffects(state, playerId, 'next_attack_crit').count > 0;
    const isCrit = forceCrit || firstAttackCrit || armedCrit || (critN !== null && m.playerAttackCount % critN === 0);
    let intervalBonus = 0;
    for (const iv of turnIntervalEmpowered(passives)) {
      if (m.playerAttackCount % iv.everyTurns === 0) intervalBonus += iv.damageMultBonus;
    }
    const armedBoost = consumeMemberArmedEffects(state, playerId, 'boost_next_outgoing').percent;
    const lifestealPercent = consumeMemberArmedEffects(state, playerId, 'next_attack_lifesteal').percent;
    const ignoreDefensePercent = consumeMemberArmedEffects(state, playerId, 'next_attack_ignore_defense').percent;

    const messages: string[] = [];
    if (isCrit) messages.push('Критический удар!');
    if (intervalBonus > 0) messages.push('Способность усилена нарастающей мощью!');
    if (armedBoost > 0) messages.push('Заряженная атака усилена!');
    else if (armedBoost < 0) messages.push('Заряженная атака ослаблена побочным эффектом!');
    const mult = Math.max(0, (isCrit ? PASSIVE_CRIT_MULTIPLIER : 1) * (1 + intervalBonus + armedBoost));
    return { mult, messages, lifestealPercent, ignoreDefensePercent };
  }

  /** Шанс снять стак проклятия (лечение-с-проклятием боссов) при собственном лечении — fiery-sermon. */
  function tryCleanseCurseOnHeal(): string | null {
    const chance = healChanceCleanseCurseChance(actingPassives);
    if (chance <= 0 || actingShim.curseStacks <= 0) return null;
    if (Math.random() >= chance) return null;
    actingShim.curseStacks -= 1;
    return 'Пламенная проповедь снимает стак проклятия!';
  }

  // Личная половина боссовых механик АКТУЮЩЕГО игрока (адаптивная резистентность и
  // проклятие относятся к тому, кто сейчас действует) — см. lib/party-combat-engine.ts.
  // Для рядовых врагов (mechanics === undefined) все функции ниже — честные no-op'ы.
  const actingShim = buildBossShimState(state, player.id);
  const effectiveEnemyAc = Math.max(1, Math.round(enemyTemplate.ac * bossAcMultiplier(enemyTemplate.mechanics, actingShim)));
  actingShim.vulnerableNextTurn = false; // окно уязвимости расходуется на текущее действие вне зависимости от исхода
  const curseMult = playerDamageMultiplier(enemyTemplate.mechanics, actingShim);
  const memberDamageBuff = memberEffectBonus(state, player.id, 'player_damage_buff');

  const enemyCurrentlyDebuffed = sharedEnemyEffectBonus(state, 'enemy_damage_debuff') > 0;
  const enemyCurrentlyShielded = !!state.bossMechanics && state.bossMechanics.shieldHp > 0 && !state.bossMechanics.shieldBroken;
  const passiveDamageMult = 1
    + thresholdBonus.damageMultBonus
    + uncondBonus.damageMultBonus
    + partyAura.damageMultBonus
    + damageVsDebuffedEnemyBonus(actingPassives, enemyCurrentlyDebuffed)
    + damageVsShieldedEnemyBonus(actingPassives, enemyCurrentlyShielded)
    + memberDamageBuff;

  let enemyHp = combat.enemyHp;
  const enemyMaxHp = combat.enemyMaxHp;
  let combatOver = false;
  let partyWon = false;
  const currentTurn = state.combatLog.length;
  const droppedItemsByMember: Record<string, string[]> = {};

  // Обездвиживание корнями-ловушками с предыдущего хода отменяет текущее действие ЦЕЛИКОМ
  // (кроме пассивок с иммунитетом, напр. steadfastness) — раньше playerRooted писался шимом,
  // но никогда не читался здесь, то есть рут молча не действовал в пати-бою.
  let actionNegated = false;
  if (actingShim.playerRooted) {
    actingShim.playerRooted = false;
    if (hasRootImmune(actingPassives)) {
      state.combatLog.push({ text: `Несокрушимая воля позволяет ${player.name} преодолеть обездвиживание!`, turn: currentTurn, actorPlayerId: player.id });
    } else {
      actionNegated = true;
      state.combatLog.push({ text: `${player.name} скован корнями-ловушками и не может действовать!`, turn: currentTurn, actorPlayerId: player.id });
    }
  }

  if (actionNegated) {
    // действие отменено обездвиживанием — переходим сразу к проверке хода врага
  } else if (action === 'flee') {
    const fleeChance = 0.5 + player.dexterity / 200;
    if (Math.random() < fleeChance) {
      state.members[player.id].fled = true;
      state.combatLog.push({ text: `${player.name} сбегает из боя!`, turn: currentTurn, actorPlayerId: player.id });
    } else {
      state.combatLog.push({ text: `${player.name} пытается сбежать — не вышло!`, turn: currentTurn, actorPlayerId: player.id });
    }
  } else if (action === 'defend') {
    actingShim.playerDefendedLastTurn = true;
    state.combatLog.push({
      text: isAfkSkip
        ? `${player.name} слишком долго думает — ход пропущен (защитная стойка).`
        : `${player.name} принимает защитную стойку.`,
      turn: currentTurn,
      actorPlayerId: player.id,
    });
  } else if (action === 'attack') {
    actingShim.playerDefendedLastTurn = false;
    const resist = adaptiveResistMultiplier(enemyTemplate.mechanics, actingShim, 'attack');
    const { mult: offenseMult, messages: offenseMsgs, lifestealPercent, ignoreDefensePercent } = applyPassiveOffenseBonuses(player.id, actingPassives);
    const attackAc = ignoreDefensePercent > 0 ? Math.max(1, Math.round(effectiveEnemyAc * (1 - ignoreDefensePercent))) : effectiveEnemyAc;
    const rawDamage = Math.round(mitigateDamage(basicAttackDamage(combatStats) + weaponBonus, attackAc) * curseMult * resist * passiveDamageMult * offenseMult);
    const { hpDamage, messages } = applyDamageToBoss(enemyTemplate.mechanics, actingShim, rawDamage);
    enemyHp = Math.max(0, enemyHp - hpDamage);
    const absorbed = rawDamage > 0 && hpDamage === 0;
    state.combatLog.push({ text: absorbed ? `${player.name} атакует! Урон поглощён щитом.` : `${player.name} атакует! Урон: ${hpDamage}`, turn: currentTurn, actorPlayerId: player.id });
    if (resist < 1) state.combatLog.push({ text: 'Враг адаптировался к этому типу урона!', turn: currentTurn });
    for (const m of [...offenseMsgs, ...messages]) state.combatLog.push({ text: m, turn: currentTurn });
    if (lifestealPercent > 0 && hpDamage > 0) {
      const stolen = Math.round(hpDamage * lifestealPercent);
      if (stolen > 0) {
        actingLive.hp = Math.min(actingLive.maxHp, actingLive.hp + stolen);
        state.combatLog.push({ text: `Заряженная атака исцеляет ${player.name} на ${stolen} ХП!`, turn: currentTurn });
      }
    }
  } else if (action === 'ability') {
    const ability = player.class.abilities.find(a => a.id === abilityId);
    const memberCooldowns = state.members[player.id].abilityCooldowns;

    if (!ability) {
      state.combatLog.push({ text: 'Способность не найдена!', turn: currentTurn, actorPlayerId: player.id });
    } else if (ability.type !== 'active') {
      state.combatLog.push({ text: 'Эта способность пассивна и не используется в бою напрямую!', turn: currentTurn, actorPlayerId: player.id });
    } else if (player.level < stageUnlockLevel(ability.stage)) {
      state.combatLog.push({ text: `Нужен уровень ${stageUnlockLevel(ability.stage)}!`, turn: currentTurn, actorPlayerId: player.id });
    } else if (parseDeathWard(ability.description)) {
      // "Обереги от смерти" срабатывают САМИ при смертельном ударе — их нельзя скастовать вручную.
      state.combatLog.push({ text: 'Эта способность срабатывает автоматически при смертельном ударе — использовать её вручную нельзя.', turn: currentTurn, actorPlayerId: player.id });
    } else if ((memberCooldowns[ability.slug] ?? 0) > 0) {
      state.combatLog.push({ text: `${ability.icon} ${ability.name} ещё перезаряжается: осталось ${memberCooldowns[ability.slug]} х.`, turn: currentTurn, actorPlayerId: player.id });
    } else {
      const manaCost = manaCostForStage(ability.stage);
      const armedSpecs = parseArmedEffects(ability.description);
      const onBlockCounterSpec = parseActivatedOnBlockCounter(ability.description);
      const debuffAmplifySpec = parseDebuffAmplify(ability.description);
      const executeSpec = parseExecute(ability.description);
      const immediateSelfBuff = parseImmediateSelfBuff(ability.description);
      const bossOverridePercent = isBoss ? extractBossOverridePercent(ability.bossNote) : null;

      if (playerMp < manaCost) {
        state.combatLog.push({ text: `Нужно ${manaCost} маны!`, turn: currentTurn, actorPlayerId: player.id });
      } else if (armedSpecs.length > 0) {
        playerMp -= manaCost;
        for (const spec of armedSpecs) armMemberEffect(state, player.id, spec.kind, bossOverridePercent ?? spec.percent);
        state.combatLog.push({ text: `${ability.icon} ${ability.name}! Способность заряжена и сработает при следующем ударе.`, turn: currentTurn, actorPlayerId: player.id });
      } else if (onBlockCounterSpec) {
        playerMp -= manaCost;
        addMemberEffect(state, player.id, 'on_block_counter_active', onBlockCounterSpec.percent, EFFECT_DURATION_TURNS);
        state.combatLog.push({ text: `${ability.icon} ${ability.name}! Контрудар после блока активирован на ${EFFECT_DURATION_TURNS} х.`, turn: currentTurn, actorPlayerId: player.id });
      } else if (debuffAmplifySpec) {
        playerMp -= manaCost;
        const amplifyPercent = bossOverridePercent ?? debuffAmplifySpec.percent;
        addMemberEffect(state, player.id, 'debuff_amplify', amplifyPercent, EFFECT_DURATION_TURNS);
        state.combatLog.push({ text: `${ability.icon} ${ability.name}! Последующие дебаффы усилены на ${Math.round(amplifyPercent * 100)}% на ${EFFECT_DURATION_TURNS} х.`, turn: currentTurn, actorPlayerId: player.id });
      } else if (executeSpec && !isBoss && enemyMaxHp > 0 && enemyHp / enemyMaxHp < executeSpec.thresholdPercent) {
        playerMp -= manaCost;
        enemyHp = 0;
        state.combatLog.push({ text: `${ability.icon} ${ability.name}! Мгновенная казнь!`, turn: currentTurn, actorPlayerId: player.id });
      } else {
        playerMp -= manaCost;
        if (immediateSelfBuff && immediateSelfBuff.cooldownTurns > 0) {
          memberCooldowns[ability.slug] = immediateSelfBuff.cooldownTurns;
        }
        const pendingIgnoreDefense = Math.min(0.9, peekMemberArmedEffectPercent(state, player.id, 'next_attack_ignore_defense') + (immediateSelfBuff?.ignoreDefensePercent ?? 0));
        const abilityAc = pendingIgnoreDefense > 0 ? Math.max(1, Math.round(effectiveEnemyAc * (1 - pendingIgnoreDefense))) : effectiveEnemyAc;
        const resolution = resolveAbility(ability.description, combatStats, abilityAc, isBoss ? { isBoss: true, bossNote: ability.bossNote } : undefined);
        const isGroup = describesGroupEffect(ability.description);

        let damageAbsorbed = false;
        if (resolution.damage > 0) {
          actingShim.playerDefendedLastTurn = false;
          const resist = adaptiveResistMultiplier(enemyTemplate.mechanics, actingShim, 'ability');
          const { mult: offenseMult, messages: offenseMsgs, lifestealPercent } = applyPassiveOffenseBonuses(player.id, actingPassives, immediateSelfBuff?.guaranteedCrit ?? false);
          const abilityDamage = Math.round(resolution.damage * curseMult * resist * passiveDamageMult * offenseMult);
          const { hpDamage, messages } = applyDamageToBoss(enemyTemplate.mechanics, actingShim, abilityDamage);
          enemyHp = Math.max(0, enemyHp - hpDamage);
          damageAbsorbed = hpDamage === 0;
          resolution.damage = hpDamage;
          if (resist < 1) messages.push('Враг адаптировался к этому типу урона!');
          if (lifestealPercent > 0 && hpDamage > 0) {
            const stolen = Math.round(hpDamage * lifestealPercent);
            if (stolen > 0) {
              actingLive.hp = Math.min(actingLive.maxHp, actingLive.hp + stolen);
              messages.push(`Заряженная атака исцеляет ${player.name} на ${stolen} ХП!`);
            }
          }
          for (const m of [...offenseMsgs, ...messages]) state.combatLog.push({ text: m, turn: currentTurn });
        }
        let cleanseMsg: string | null = null;
        if (resolution.heal > 0) {
          resolution.heal = Math.round(resolution.heal * (1 + totalHealingBonus));
          const healTargets = isGroup ? aliveIds() : [player.id];
          for (const id of healTargets) {
            const l = live.get(id);
            if (l) l.hp = Math.min(l.maxHp, l.hp + resolution.heal);
          }
          cleanseMsg = tryCleanseCurseOnHeal();
        }
        if (resolution.shield > 0) {
          state.members[player.id].shieldHp += resolution.shield;
        }
        if (resolution.enemyDamageReduction > 0 && resolution.effectTurns > 0) {
          // "Гниющий знак" и аналоги — активированный усилитель последующих дебаффов (см. выше).
          const debuffAmp = memberEffectBonus(state, player.id, 'debuff_amplify');
          const amplifiedReduction = debuffAmp > 0 ? Math.min(0.9, resolution.enemyDamageReduction * (1 + debuffAmp)) : resolution.enemyDamageReduction;
          addSharedEnemyEffect(state, 'enemy_damage_debuff', amplifiedReduction, resolution.effectTurns);
          resolution.enemyDamageReduction = amplifiedReduction;
        }
        if (resolution.playerDamageBonus > 0 && resolution.effectTurns > 0) {
          if (isGroup) addEffectToAllAliveMembers(state, 'player_damage_buff', resolution.playerDamageBonus, resolution.effectTurns);
          else addMemberEffect(state, player.id, 'player_damage_buff', resolution.playerDamageBonus, resolution.effectTurns);
        }
        if (resolution.dodgeBonus > 0 && resolution.effectTurns > 0) {
          if (isGroup) addEffectToAllAliveMembers(state, 'player_dodge_buff', resolution.dodgeBonus, resolution.effectTurns);
          else addMemberEffect(state, player.id, 'player_dodge_buff', resolution.dodgeBonus, resolution.effectTurns);
        }
        if (resolution.enemyDotPercent > 0 && resolution.effectTurns > 0) {
          addSharedEnemyEffect(state, 'enemy_dot', resolution.enemyDotPercent, resolution.effectTurns);
        }
        if (resolution.summonDamage > 0 && resolution.effectTurns > 0) {
          addSharedEnemyEffect(state, 'summon_damage', resolution.summonDamage, resolution.effectTurns);
        }
        let blockedSkillLabels: string[] = [];
        if (resolution.blockSkillCount > 0) {
          // У рядовых врагов нет периодических механик вообще — блокировать нечего,
          // blockRandomMechanics корректно вернёт пустой массив в этом случае.
          blockedSkillLabels = blockRandomMechanics(enemyTemplate.mechanics, actingShim, resolution.blockSkillCount, resolution.blockSkillTurns);
        }

        const parts = [`${ability.icon} ${ability.name}!`];
        if (damageAbsorbed) parts.push('Урон поглощён щитом.');
        else if (resolution.damage > 0) parts.push(`Урон: ${resolution.damage}`);
        if (resolution.heal > 0) parts.push(`Восстановлено ${resolution.heal} ХП${isGroup ? ' всей пати' : ''}`);
        if (resolution.shield > 0) parts.push(`Щит: ${resolution.shield} ХП`);
        if (resolution.enemyDamageReduction > 0) parts.push(`Враг ослаблен на ${Math.round(resolution.enemyDamageReduction * 100)}% на ${resolution.effectTurns} х.`);
        if (resolution.enemyDotPercent > 0) parts.push(`Враг отравлен: ${Math.round(resolution.enemyDotPercent * 100)}% ХП/ход на ${resolution.effectTurns} х.`);
        if (resolution.playerDamageBonus > 0) parts.push(`Урон усилен на ${Math.round(resolution.playerDamageBonus * 100)}%${isGroup ? ' всей пати' : ''} на ${resolution.effectTurns} х.`);
        if (resolution.dodgeBonus > 0) parts.push(`Шанс уклонения повышен на ${Math.round(resolution.dodgeBonus * 100)}%${isGroup ? ' всей пати' : ''} на ${resolution.effectTurns} х.`);
        if (resolution.summonDamage > 0) parts.push(`Скелет-союзник будет наносить ${resolution.summonDamage} урона в ход (${resolution.effectTurns} х.)`);
        if (resolution.blockSkillCount > 0) {
          parts.push(
            blockedSkillLabels.length > 0
              ? `Заблокирован${blockedSkillLabels.length > 1 ? 'ы' : ''} скилл${blockedSkillLabels.length > 1 ? 'ы' : ''} врага (${blockedSkillLabels.join(', ')}) на ${resolution.blockSkillTurns} х.`
              : 'У врага не нашлось скилла для блокировки.'
          );
        }
        if (resolution.noAllyToTarget) parts.push('Нет цели для этой способности.');
        state.combatLog.push({ text: parts.join(' '), turn: currentTurn, actorPlayerId: player.id });
        if (cleanseMsg) state.combatLog.push({ text: cleanseMsg, turn: currentTurn, actorPlayerId: player.id });
      }
    }
  } else {
    return { ok: false, error: 'Неизвестное действие', status: 400 };
  }

  // Реген от пороговых пассивок (tenacity и т.п.) — тикает СРАЗУ после действия, до хода врага
  // (см. combat/action/route.ts: иначе регенерация после floor(0) делала бы игрока неуязвимым).
  // Блокируется только УСПЕШНЫМ побегом (fled), как и в одиночном бою — неудавшаяся попытка
  // сбежать по-прежнему тикает реген/кражу ХП ниже, ровно как там.
  const actingFled = state.members[player.id].fled;
  if (!actionNegated && !actingFled && thresholdBonus.regenPercent > 0) {
    const regenAmount = Math.round(actingLive.maxHp * thresholdBonus.regenPercent);
    actingLive.hp = Math.min(actingLive.maxHp, actingLive.hp + regenAmount);
    state.combatLog.push({ text: `${player.name} регенерирует ${regenAmount} ХП!`, turn: currentTurn, actorPlayerId: player.id });
  }

  // Пассивные эффекты actor'а, тикающие на ЕГО СОБСТВЕННОМ ходу независимо от выбранного
  // действия (кража ХП, урон по врагу от накопленных дебаффов).
  if (!actionNegated && !actingFled && enemyHp > 0) {
    const stealPercent = perTurnLifestealFromEnemyPercent(actingPassives);
    if (stealPercent > 0) {
      const stolen = Math.min(enemyHp, Math.round(enemyMaxHp * stealPercent));
      if (stolen > 0) {
        enemyHp = Math.max(0, enemyHp - stolen);
        actingLive.hp = Math.min(actingLive.maxHp, actingLive.hp + stolen);
        state.combatLog.push({ text: `${player.name} поглощает ${stolen} ХП врага!`, turn: currentTurn, actorPlayerId: player.id });
      }
    }
    const debuffStacks = state.sharedEnemyEffects.filter(e => e.kind === 'enemy_damage_debuff').length;
    const drainDamage = enemyDebuffStackDrainDamage(actingPassives, debuffStacks, enemyMaxHp);
    if (drainDamage > 0 && enemyHp > 0) {
      enemyHp = Math.max(0, enemyHp - drainDamage);
      state.combatLog.push({ text: `Враг теряет ${drainDamage} ХП от гниения реальности!`, turn: currentTurn });
    }
  }

  writeBackBossShimState(state, player.id, actingShim);

  if (enemyHp <= 0 && !combatOver) {
    combatOver = true;
    partyWon = true;
    state.combatLog.push({ text: `${enemyTemplate.nameRu} повержен!`, turn: currentTurn });
    const victoryHealPercent = onVictoryHealPercent(actingPassives);
    if (victoryHealPercent > 0) {
      const healAmount = Math.round(actingLive.maxHp * victoryHealPercent);
      actingLive.hp = Math.min(actingLive.maxHp, actingLive.hp + healAmount);
      state.combatLog.push({ text: `Победа восстанавливает ${player.name} ${healAmount} ХП!`, turn: currentTurn });
    }
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
        const targetPassives = partyPassives.get(targetId) ?? [];
        if (targetLive && targetRow) {
          const targetMember = state.members[targetId];
          // "Заряженный" блок следующего удара, взведённый ЦЕЛЬЮ на СВОЁМ ходу (может быть
          // давно) — снимается именно сейчас, когда по ней реально бьют.
          const armedBlock = consumeMemberArmedEffects(state, targetId, 'reduce_next_incoming');
          const fullyBlocked = armedBlock.percent >= 1;
          const isDefending = targetMember.playerDefendedLastTurn;
          const targetHpPercent = targetLive.maxHp > 0 ? (targetLive.hp / targetLive.maxHp) * 100 : 100;
          const targetThreshold = hpThresholdBonuses(targetPassives, targetHpPercent);
          const targetUncond = unconditionalBonuses(targetPassives);
          // Ауры пати (eternal-vow и т.п.) — считаются заново по ТЕКУЩЕМУ HP всех живых
          // носителей на момент хода врага (могло измениться с начала запроса).
          const targetPartyAura = partyAuraBonuses(memberRows, live, candidates);
          const enemyDamageReduction = Math.min(0.9, sharedEnemyEffectBonus(state, 'enemy_damage_debuff'));
          const passiveIncomingReduction = Math.min(0.9,
            targetThreshold.incomingReductionPercent + targetThreshold.defenseMultBonus + targetUncond.defenseMultBonus
            + targetPartyAura.defenseMultBonus
            + (isDefending ? onDefendDefenseBonus(targetPassives) : 0)
            + (fullyBlocked ? 0 : armedBlock.percent));
          const totalReduction = Math.min(0.9, enemyDamageReduction + passiveIncomingReduction);
          const rawDamage = rollDice(enemyTemplate.damage) * (1 - totalReduction);
          const baseDamage = Math.max(1, Math.round(mitigateDamage(rawDamage, targetLive.vitality) - targetLive.equipBonuses.defense));

          // Личная половина шима — цель ЭТОГО хода врага (окно уязвимости/обездвиживание/
          // защитная стойка/проклятие относятся к тому, кого враг сейчас атакует). resolveBossTurn
          // безопасно no-op'ает для рядовых врагов (mechanics === undefined) — тот же вызов, что
          // и в одиночном бою, без отдельной "плоской" ветки для рядовых врагов.
          const enemyShim = buildBossShimState(state, targetId);
          const turnResult = resolveBossTurn(enemyTemplate.mechanics, enemyShim, enemyHp, enemyMaxHp, baseDamage, targetLive.maxHp);

          if (turnResult.bossHeal > 0) {
            // Предел самоисцеления врага (depth-silence и аналоги) — минимум среди ВСЕЙ живой
            // пати, не только цели: это дебафф на способность врага лечиться вообще.
            let partyHealCap: number | null = null;
            for (const id of candidates) {
              const cap = enemyHealCapPercent(partyPassives.get(id) ?? []);
              if (cap !== null && (partyHealCap === null || cap < partyHealCap)) partyHealCap = cap;
            }
            if (partyHealCap !== null) turnResult.bossHeal = Math.round(turnResult.bossHeal * partyHealCap);
            enemyHp = Math.min(enemyMaxHp, enemyHp + turnResult.bossHeal);
          }

          if (turnResult.healToPlayer > 0) {
            targetLive.hp = Math.min(targetLive.maxHp, targetLive.hp + turnResult.healToPlayer);
            state.combatLog.push({ text: `${enemyTemplate.nameRu} исцеляет ${targetRow.name}... но это лечение проклято!`, turn: currentTurn });
          } else {
            let incomingDamage = turnResult.damageToPlayer;
            if (isDefending) incomingDamage = Math.round(incomingDamage * 0.5);

            const totalDodgeChance = Math.min(0.9, dodgeChancePercent(targetPassives) + memberEffectBonus(state, targetId, 'player_dodge_buff'));
            const dodged = fullyBlocked || Math.random() < totalDodgeChance;
            if (dodged) {
              state.combatLog.push({
                text: fullyBlocked
                  ? `${enemyTemplate.nameRu} атакует ${targetRow.name}! Заряженная защита полностью блокирует удар!`
                  : `${enemyTemplate.nameRu} атакует ${targetRow.name}! Полное уклонение!`,
                turn: currentTurn,
              });
            } else {
              const reflected = Math.random() < reflectChancePercent(targetPassives);
              if (reflected) {
                const { hpDamage: reflectedDmg, messages } = applyDamageToBoss(enemyTemplate.mechanics, enemyShim, incomingDamage);
                enemyHp = Math.max(0, enemyHp - reflectedDmg);
                state.combatLog.push({ text: `${enemyTemplate.nameRu} атакует ${targetRow.name}! Отражение — враг получает ${reflectedDmg} урона!`, turn: currentTurn });
                for (const m of messages) state.combatLog.push({ text: m, turn: currentTurn });
              } else {
                for (const burn of counterBurnChances(targetPassives)) {
                  if (Math.random() < burn.chancePercent) {
                    addSharedEnemyEffect(state, 'enemy_dot', burn.dotPercent, burn.turns);
                    state.combatLog.push({ text: 'Враг подожжён ответным пламенем!', turn: currentTurn });
                  }
                }
                const counterFlatPercent = counterDamageFlatPercent(targetPassives);
                if (counterFlatPercent > 0) {
                  const counterDmg = Math.round(incomingDamage * counterFlatPercent);
                  if (counterDmg > 0) {
                    const { hpDamage: counterHpDmg, messages } = applyDamageToBoss(enemyTemplate.mechanics, enemyShim, counterDmg);
                    enemyHp = Math.max(0, enemyHp - counterHpDmg);
                    state.combatLog.push({ text: `${targetRow.name} наносит ${counterHpDmg} урона в ответ!`, turn: currentTurn });
                    for (const m of messages) state.combatLog.push({ text: m, turn: currentTurn });
                  }
                }

                const { hpDamage, absorbed } = applyDamageToMemberShield(state, targetId, incomingDamage);
                targetLive.hp = Math.max(0, targetLive.hp - hpDamage);
                targetMember.playerHitsTakenCount += 1;
                state.combatLog.push({
                  text: absorbed
                    ? (hpDamage > 0 ? `${enemyTemplate.nameRu} атакует ${targetRow.name}! Щит поглощает часть урона, ${hpDamage} в ХП!` : `${enemyTemplate.nameRu} атакует ${targetRow.name}! Урон полностью поглощён щитом!`)
                    : `${enemyTemplate.nameRu} атакует ${targetRow.name}! Урон: ${hpDamage}`,
                  turn: currentTurn,
                });

                for (const heal of hitsTakenEveryNHeal(targetPassives)) {
                  if (targetMember.playerHitsTakenCount % heal.n === 0) {
                    const healAmount = Math.round(targetLive.maxHp * heal.healPercent);
                    targetLive.hp = Math.min(targetLive.maxHp, targetLive.hp + healAmount);
                    state.combatLog.push({ text: `Рунная броня восстанавливает ${targetRow.name} на ${healAmount} ХП!`, turn: currentTurn });
                  }
                }

                if (isDefending) {
                  const blockHealPercent = onBlockHealPercent(targetPassives);
                  if (blockHealPercent > 0) {
                    const healAmount = Math.round(targetLive.maxHp * blockHealPercent);
                    targetLive.hp = Math.min(targetLive.maxHp, targetLive.hp + healAmount);
                    state.combatLog.push({ text: `Блокирование восстанавливает ${targetRow.name} на ${healAmount} ХП!`, turn: currentTurn });
                  }
                  const blockCounterPercent = onBlockCounterPercent(targetPassives) + memberEffectBonus(state, targetId, 'on_block_counter_active');
                  if (blockCounterPercent > 0) {
                    const counterDmg = Math.round(incomingDamage * blockCounterPercent);
                    if (counterDmg > 0) {
                      const { hpDamage: counterHpDmg, messages } = applyDamageToBoss(enemyTemplate.mechanics, enemyShim, counterDmg);
                      enemyHp = Math.max(0, enemyHp - counterHpDmg);
                      state.combatLog.push({ text: `Шипы наносят ${counterHpDmg} урона в ответ на блокированный удар!`, turn: currentTurn });
                      for (const m of messages) state.combatLog.push({ text: m, turn: currentTurn });
                    }
                  }
                }
              }
            }
          }

          if (turnResult.dotDamageToPlayer > 0 && !targetMember.poisonCured) {
            const { hpDamage: dotDmg } = applyDamageToMemberShield(state, targetId, turnResult.dotDamageToPlayer);
            targetLive.hp = Math.max(0, targetLive.hp - dotDmg);
            state.combatLog.push({ text: `${targetRow.name} получает ${dotDmg} урона от продолжающегося эффекта!`, turn: currentTurn });
          }

          for (const m of turnResult.messages) state.combatLog.push({ text: m, turn: currentTurn });

          writeBackBossShimState(state, targetId, enemyShim);

          // Смерть цели — с учётом одноразового воскрешения (Феникс-пассивка ИЛИ активный
          // оберег от смерти вроде "Последней воли"), как в одиночном бою.
          if (targetLive.hp <= 0) {
            const reviveHealPercent = deathSaveHealPercent(targetPassives);
            const activeWard: DeathWardEffect | undefined = targetRow.class.abilities
              .filter(a => a.type === 'active' && targetRow.level >= stageUnlockLevel(a.stage))
              .map(a => parseDeathWard(a.description))
              .find((w): w is DeathWardEffect => w !== null) ?? undefined;

            if (!targetMember.deathSaveUsed && activeWard) {
              targetMember.deathSaveUsed = true;
              targetLive.hp = 1;
              if (activeWard.healPercent > 0) targetLive.hp = Math.min(targetLive.maxHp, targetLive.hp + Math.round(targetLive.maxHp * activeWard.healPercent));
              if (activeWard.shieldPercent > 0) targetMember.shieldHp += Math.round(targetLive.maxHp * activeWard.shieldPercent);
              state.combatLog.push({ text: `${targetRow.name} выживает на грани смерти с ${targetLive.hp} ХП!`, turn: currentTurn, actorPlayerId: targetId });
            } else if (!targetMember.deathSaveUsed && reviveHealPercent !== null) {
              targetMember.deathSaveUsed = true;
              targetLive.hp = Math.max(1, Math.round(targetLive.maxHp * reviveHealPercent));
              state.combatLog.push({ text: `${targetRow.name} возрождается из пепла с ${targetLive.hp} ХП!`, turn: currentTurn, actorPlayerId: targetId });
            } else {
              targetMember.alive = false;
              state.combatLog.push({ text: `${targetRow.name} погибает!`, turn: currentTurn, actorPlayerId: targetId });
            }
          }

          // Реванш-проверка: контрудар/отражение во время хода врага мог сам добить его —
          // в одиночном бою такой проверки тоже нет (см. заголовок этого файла), но там у
          // "хода врага" нет отдельного следующего запроса, который мог бы её выполнить;
          // здесь следующий actor начнёт действовать против уже мёртвого врага, если её не
          // сделать сейчас.
          if (enemyHp <= 0 && !combatOver) {
            combatOver = true;
            partyWon = true;
            state.combatLog.push({ text: `${enemyTemplate.nameRu} повержен!`, turn: currentTurn });
            const victoryHealPercent = onVictoryHealPercent(targetPassives);
            if (victoryHealPercent > 0) {
              const healAmount = Math.round(targetLive.maxHp * victoryHealPercent);
              targetLive.hp = Math.min(targetLive.maxHp, targetLive.hp + healAmount);
              state.combatLog.push({ text: `Победа восстанавливает ${targetRow.name} ${healAmount} ХП!`, turn: currentTurn });
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
    if (!combatOver) {
      // Очередь перешла к новому actor'у (либо следующему в этом же раунде, либо первому в
      // новом после хода врага) — его личные "часы AFK" стартуют заново отсюда.
      state.turnStartedAt = Date.now();
    }
  }

  // Награда за победу — живые (не сбежавшие и не павшие) участники делят XP и золото
  // ПОРОВНУ (стандартная для коопа схема: общий эффект усилий делится, а не раздаётся каждому
  // целиком), но лут каждый катает НЕЗАВИСИМО — удача не делится, у каждого свой бросок по той
  // же таблице, что и в сольном бою. round() применяется на КАЖДОГО получателя отдельно (не на
  // сумму — иначе округление в большую сторону при делении копило бы "лишний" XP при
  // распределении по цепочке; так тоже возможна погрешность в ±1 на игрока, но не накопительная).
  const rewardTargets = partyWon ? aliveIds() : [];
  const rewardShare = Math.max(1, rewardTargets.length);
  for (const id of rewardTargets) {
    const drops = rollLoot(enemyTemplate.lootTable);
    const currencyDrop = rollCurrencyDrop(enemyTemplate.isBoss);
    if (currencyDrop) drops.push(currencyDrop);
    droppedItemsByMember[id] = drops;
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

    // Каждый участник — ХП/уровень/квест; МП только у ходившего.
    for (const id of live.keys()) {
      const row = memberById.get(id);
      if (!row) continue;
      const l = live.get(id)!;
      const isActing = id === player.id;
      const xpGain = rewardTargets.includes(id) ? Math.round(enemyTemplate.xp / rewardShare) : 0;
      const goldGain = rewardTargets.includes(id) ? Math.round((enemyTemplate.gold + rollDice('1d4') * Math.ceil(row.level / 2)) / rewardShare) : 0;
      const lvl = applyLevelUp(row.xp + xpGain, row.level, row.xpToNext, row.statPoints, row.maxHp);

      const updateData: Record<string, unknown> = {
        hp: lvl.leveledUp ? lvl.newMaxHp + l.equipBonuses.hp : l.hp,
        xp: lvl.newXp,
        gold: { increment: goldGain },
      };
      if (rewardTargets.includes(id)) {
        updateData.totalKills = { increment: 1 };
        updateData.partyWins = { increment: 1 };
      }
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
          const rolled = rollGearInstance(itemData, row.level);
          await addItemToInventory({
            playerId: id,
            itemId: itemData.id,
            name: rolled.name,
            type: itemData.type,
            rarity: itemData.rarity,
            stats: JSON.stringify(rolled.stats),
            icon: itemData.icon,
            quantity: 1,
            itemLevel: rolled.itemLevel,
            affixTier: rolled.affixTier,
            affixes: rolled.affixes.length > 0 ? JSON.stringify(rolled.affixes) : null,
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

  if (!updated) return { ok: false, error: 'Бой не найден после обновления', status: 500 };
  return { ok: true, combat: updated, combatOver, partyWon };
}

/**
 * Механики боссов (docs/cursed_depths_master.pdf, разделы про боссов Актов 1-6).
 *
 * Каждый босс описан в документе уникальной сюжетной механикой (щит, чередование
 * форм, самоисцеление, ДоТ, призыв приспешников, кража ХП, ответный удар). Вместо
 * шести отдельных спецслучаев эти механики собраны из небольшого набора
 * составных примитивов (BossMechanics), которые описывают конкретного босса
 * декларативно в game-data.ts и разрешаются здесь одним общим движком.
 *
 * Сознательно не реализовано: два чисто нарративных ответвления —
 * «добить или исцелить» у Первого Дракона и «предложение информации в обмен
 * на пощаду» у Первого Восставшего. Это не боевая математика, а диалоговые
 * развилки, требующие отдельного UI, и остаются отдельной задачей.
 */

export interface BossMechanics {
  /** Отдельный пул ХП поверх основного — поглощает урон, пока не будет пробит. */
  shieldMax?: number;
  /** Через сколько ходов босса пробитый щит восстанавливается (и берсерк спадает). */
  shieldRegenTurns?: number;
  /** Пока щит пробит — усиление урона и ослабление защиты босса. */
  enrageOnShieldBreak?: { damageMult: number; acMult: number };

  /** Самоисцеление на % от maxHp в начале каждого хода босса. */
  selfHealPercent?: number;
  /** Самоисцеление действует только пока фаза < этого номера (иначе — всегда). */
  selfHealUntilPhase?: number;

  /** ДоТ на игрока (яд/горение) — % от maxHp игрока за ход. */
  playerDotPercent?: number;
  /** ДоТ на игрока активен начиная с этой фазы. */
  playerDotFromPhase?: number;

  /** Чередование форм: каждые N ходов босса переключается урон/защита. */
  alternateFormEveryTurns?: number;
  formADamageMult?: number;
  formAAcMult?: number;
  formBDamageMult?: number;
  formBAcMult?: number;
  /** С этой фазы обе формы действуют одновременно ("слияние обликов"). */
  mergeFormsAtPhase?: number;

  /** Призыв приспешников каждые N ходов — добавляет урон к атаке босса. */
  summonEveryTurns?: number;
  /** Плоская добавка урона за каждого призванного (накопительно) — фиксированные приспешники. */
  summonBonusDamage?: number;
  /** Множитель урона за каждого призванного (накопительно) — усиление самого босса. */
  summonDamageMultPerStack?: number;
  /** Призыв действует только пока фаза < этого номера. */
  summonUntilPhase?: number;
  /** Призыв действует только начиная с этой фазы. */
  summonFromPhase?: number;

  /** С этой фазы босс лечится на часть урона, нанесённого игроку (кража ХП). */
  hpDrainFromPhase?: number;
  hpDrainPercent?: number;

  /** Ответный удар каждые N ходов — бонусный урон, если игрок не защищался в предыдущий ход. */
  counterStrikeEveryTurns?: number;
  counterStrikeBonusMult?: number;

  /** Обездвиживание (корни-ловушки): раз в N ходов босса игрок пропускает следующий ход. */
  rootEveryTurns?: number;
  rootFromPhase?: number;
  rootUntilPhase?: number;

  /** С этой фазы урон атаки босса умножается (обычно < 1 — угасающий босс). */
  phase2DamageMult?: number;

  /** Порог HP (0-1), при котором наступает фаза 2. */
  phase2AtHpPercent?: number;
  /** Порог HP (0-1), при котором наступает фаза 3. */
  phase3AtHpPercent?: number;
}

export interface BossFightState {
  turnCount: number;
  phase: number;
  shieldHp: number;
  shieldBroken: boolean;
  turnsSinceBroken: number;
  summonStacks: number;
  playerDefendedLastTurn: boolean;
  /** Игрок обездвижен корнями — его следующее действие будет отменено. */
  playerRooted: boolean;
}

export function initBossState(mechanics: BossMechanics | undefined): BossFightState {
  return {
    turnCount: 0,
    phase: 1,
    shieldHp: mechanics?.shieldMax ?? 0,
    shieldBroken: false,
    turnsSinceBroken: 0,
    summonStacks: 0,
    playerDefendedLastTurn: false,
    playerRooted: false,
  };
}

function computePhase(mechanics: BossMechanics, hpPercent: number): number {
  if (mechanics.phase3AtHpPercent !== undefined && hpPercent <= mechanics.phase3AtHpPercent) return 3;
  if (mechanics.phase2AtHpPercent !== undefined && hpPercent <= mechanics.phase2AtHpPercent) return 2;
  return 1;
}

/**
 * Игрок наносит урон боссу: сперва поглощается щитом (если есть), остаток идёт в HP.
 * Возвращает итоговый урон по HP и служебные сообщения (пробитие щита и т.п.).
 */
export function applyDamageToBoss(
  mechanics: BossMechanics | undefined,
  state: BossFightState,
  rawDamage: number
): { hpDamage: number; messages: string[] } {
  const messages: string[] = [];
  if (!mechanics?.shieldMax || state.shieldHp <= 0) {
    return { hpDamage: rawDamage, messages };
  }

  if (rawDamage <= state.shieldHp) {
    state.shieldHp -= rawDamage;
    if (state.shieldHp <= 0) {
      state.shieldBroken = true;
      state.turnsSinceBroken = 0;
      messages.push('Щит пробит! Босс входит в берсерк-режим!');
    }
    return { hpDamage: 0, messages };
  }

  const overflow = rawDamage - state.shieldHp;
  state.shieldHp = 0;
  state.shieldBroken = true;
  state.turnsSinceBroken = 0;
  messages.push('Щит пробит! Босс входит в берсерк-режим!');
  return { hpDamage: overflow, messages };
}

export interface BossTurnResult {
  /** Итоговый урон, наносимый игроку в этот ход (после всех модификаторов). */
  damageToPlayer: number;
  /** Исцеление, полученное боссом в этот ход (самоисцеление + кража ХП). */
  bossHeal: number;
  /** ДоТ-урон игроку от предыдущего эффекта (яд/горение), отдельно от атаки. */
  dotDamageToPlayer: number;
  messages: string[];
}

/**
 * Разрешает ход босса целиком: самоисцеление, чередование форм, призыв
 * приспешников, ответный удар/защита, ДоТ на игрока, кража ХП. Мутирует state.
 */
export function resolveBossTurn(
  mechanics: BossMechanics | undefined,
  state: BossFightState,
  enemyHp: number,
  enemyMaxHp: number,
  baseAttackDamage: number,
  playerMaxHp: number
): BossTurnResult {
  const messages: string[] = [];
  const result: BossTurnResult = { damageToPlayer: 0, bossHeal: 0, dotDamageToPlayer: 0, messages };
  if (!mechanics) {
    result.damageToPlayer = baseAttackDamage;
    return result;
  }

  state.turnCount += 1;
  const hpPercent = enemyMaxHp > 0 ? enemyHp / enemyMaxHp : 1;
  const newPhase = computePhase(mechanics, hpPercent);
  const phaseJustChanged = newPhase !== state.phase;
  if (phaseJustChanged) {
    state.phase = newPhase;
    messages.push(`${'⚠️'} Босс входит в фазу ${newPhase}!`);
  }

  // Щит: восстановление по таймеру, пока он пробит
  if (mechanics.shieldMax && state.shieldBroken) {
    state.turnsSinceBroken += 1;
    if (mechanics.shieldRegenTurns && state.turnsSinceBroken >= mechanics.shieldRegenTurns) {
      state.shieldHp = mechanics.shieldMax;
      state.shieldBroken = false;
      state.turnsSinceBroken = 0;
      messages.push('Щит восстановлен — берсерк спадает.');
    }
  }

  // Самоисцеление
  if (mechanics.selfHealPercent && (mechanics.selfHealUntilPhase === undefined || state.phase < mechanics.selfHealUntilPhase)) {
    result.bossHeal += Math.round(enemyMaxHp * mechanics.selfHealPercent);
  }

  // Чередование форм
  let damageMult = 1;
  if (mechanics.alternateFormEveryTurns) {
    const formIndex = Math.floor(state.turnCount / mechanics.alternateFormEveryTurns) % 2;
    const merged = mechanics.mergeFormsAtPhase !== undefined && state.phase >= mechanics.mergeFormsAtPhase;
    if (merged) {
      damageMult *= (mechanics.formADamageMult ?? 1) * (mechanics.formBDamageMult ?? 1);
      if (phaseJustChanged) messages.push('Облики сливаются воедино!');
    } else {
      damageMult *= formIndex === 0 ? (mechanics.formADamageMult ?? 1) : (mechanics.formBDamageMult ?? 1);
    }
  }

  // Призыв приспешников
  const summonActive =
    (mechanics.summonUntilPhase === undefined || state.phase < mechanics.summonUntilPhase) &&
    (mechanics.summonFromPhase === undefined || state.phase >= mechanics.summonFromPhase);
  if (mechanics.summonEveryTurns && summonActive && state.turnCount % mechanics.summonEveryTurns === 0) {
    state.summonStacks += 1;
    messages.push('Босс призывает подкрепление!');
  }
  const summonDamage = (mechanics.summonBonusDamage ?? 0) * state.summonStacks;
  if (mechanics.summonDamageMultPerStack) {
    damageMult *= 1 + mechanics.summonDamageMultPerStack * state.summonStacks;
  }

  // Щитовой берсерк
  if (mechanics.enrageOnShieldBreak && state.shieldBroken) {
    damageMult *= mechanics.enrageOnShieldBreak.damageMult;
  }

  // Угасание на фазе 2 (например, гаснущий дракон)
  if (mechanics.phase2DamageMult !== undefined && state.phase >= 2) {
    damageMult *= mechanics.phase2DamageMult;
  }

  // Обездвиживание: корни-ловушки раз в N ходов в указанном диапазоне фаз
  const rootActive =
    (mechanics.rootFromPhase === undefined || state.phase >= mechanics.rootFromPhase) &&
    (mechanics.rootUntilPhase === undefined || state.phase < mechanics.rootUntilPhase);
  if (mechanics.rootEveryTurns && rootActive && state.turnCount % mechanics.rootEveryTurns === 0) {
    state.playerRooted = true;
    messages.push('Корни-ловушки оплетают ваши ноги!');
  }

  // Ответный удар (нейтрализуется защитой игрока в предыдущий ход)
  if (mechanics.counterStrikeEveryTurns && state.turnCount % mechanics.counterStrikeEveryTurns === 0) {
    if (state.playerDefendedLastTurn) {
      messages.push('Вы блокируете Ответный удар!');
    } else {
      damageMult *= mechanics.counterStrikeBonusMult ?? 1.5;
      messages.push('Ответный удар!');
    }
  }

  const attackDamage = Math.round(baseAttackDamage * damageMult) + summonDamage;

  // Кража ХП вместо части урона (с указанной фазы)
  if (mechanics.hpDrainFromPhase !== undefined && state.phase >= mechanics.hpDrainFromPhase && mechanics.hpDrainPercent) {
    const drained = Math.round(attackDamage * mechanics.hpDrainPercent);
    result.bossHeal += drained;
    messages.push('Босс крадёт ХП!');
  }

  result.damageToPlayer = attackDamage;

  // ДоТ на игрока (яд/горение) — отдельно от урона атаки
  if (mechanics.playerDotPercent && (mechanics.playerDotFromPhase === undefined || state.phase >= mechanics.playerDotFromPhase)) {
    result.dotDamageToPlayer = Math.round(playerMaxHp * mechanics.playerDotPercent);
  }

  state.playerDefendedLastTurn = false;
  return result;
}

/** Текущий множитель защиты босса (AC) с учётом форм и берсерка — влияет на входящий урон игрока. */
export function bossAcMultiplier(mechanics: BossMechanics | undefined, state: BossFightState): number {
  if (!mechanics) return 1;
  let mult = 1;
  if (mechanics.alternateFormEveryTurns) {
    const formIndex = Math.floor(state.turnCount / mechanics.alternateFormEveryTurns) % 2;
    const merged = mechanics.mergeFormsAtPhase !== undefined && state.phase >= mechanics.mergeFormsAtPhase;
    if (merged) {
      mult *= (mechanics.formAAcMult ?? 1) * (mechanics.formBAcMult ?? 1);
    } else {
      mult *= formIndex === 0 ? (mechanics.formAAcMult ?? 1) : (mechanics.formBAcMult ?? 1);
    }
  }
  if (mechanics.enrageOnShieldBreak && state.shieldBroken) {
    mult *= mechanics.enrageOnShieldBreak.acMult;
  }
  return mult;
}

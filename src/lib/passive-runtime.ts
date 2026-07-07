/**
 * Применение эффектов, разобранных passive-engine.ts, к текущему бою.
 *
 * Каждая функция здесь — чистая агрегация по списку активных пассивок игрока
 * (суммирует величины однотипных эффектов, если у игрока их несколько), либо
 * простая проверка условия. Мутация состояния боя (bossState) и решения о том,
 * КОГДА вызывать эти функции — в combat/action/route.ts, здесь только формулы.
 *
 * Некоторые пассивки завязаны на состояние врага, которого в этом движке не
 * существует как отдельного понятия (например, "враг под дебаффом" или
 * "враг с пониженной защитой") — они приближены единственным доступным
 * сигналом: активен ли сейчас наложенный игроком enemy_damage_debuff
 * (см. combat-effects.ts). Это то же самое эвристическое приближение, которым
 * уже пользуется boss-mechanics.ts для нарративных механик боссов.
 *
 * Гарантированный крит (battle-stance) реализован как x2 к урону — в движке
 * нет d20-бросков атаки (см. dice.ts: isCriticalHit не используется в бою,
 * урон всегда считается по плоской формуле), поэтому x2 — ближайший разумный
 * аналог "критического удара" для системы без бросков попадания.
 */

import type { PassiveEffect } from './passive-engine';

export const PASSIVE_CRIT_MULTIPLIER = 2;

/** Суммарные бонусы всех активных hp_threshold-пассивок, чьё условие сейчас выполняется. */
export function hpThresholdBonuses(effects: PassiveEffect[], hpPercent: number) {
  let damageMultBonus = 0, incomingReductionPercent = 0, healingBonusPercent = 0, defenseMultBonus = 0, regenPercent = 0;
  for (const e of effects) {
    if (e.kind !== 'hp_threshold') continue;
    const met = e.below ? hpPercent < e.thresholdPercent : hpPercent > e.thresholdPercent;
    if (!met) continue;
    damageMultBonus += e.damageMultBonus;
    incomingReductionPercent += e.incomingReductionPercent;
    healingBonusPercent += e.healingBonusPercent;
    defenseMultBonus += e.defenseMultBonus;
    regenPercent += e.regenPercent;
  }
  return { damageMultBonus, incomingReductionPercent, healingBonusPercent, defenseMultBonus, regenPercent };
}

/** Безусловные бонусы (Клятва, Безмолвный жнец, Священная аура, Вожак и т.п.) — действуют всегда, суммируются. */
export function unconditionalBonuses(effects: PassiveEffect[]) {
  let damageMultBonus = 0, defenseMultBonus = 0, healingBonusPercent = 0;
  for (const e of effects) {
    if (e.kind === 'unconditional_triple_buff') {
      damageMultBonus += e.damageMultBonus;
      defenseMultBonus += e.defenseMultBonus;
      healingBonusPercent += e.healingBonusPercent;
    } else if (e.kind === 'unconditional_damage_buff') {
      damageMultBonus += e.damageMultBonus;
    } else if (e.kind === 'unconditional_healing_buff') {
      healingBonusPercent += e.healingBonusPercent;
    }
  }
  return { damageMultBonus, defenseMultBonus, healingBonusPercent };
}

/** Наименьший N среди пассивок "каждый N-й удар — гарантированный крит" (если их несколько — берём самую частую). */
export function critEveryNHits(effects: PassiveEffect[]): number | null {
  const ns = effects.filter((e): e is Extract<PassiveEffect, { kind: 'crit_every_n_hits' }> => e.kind === 'crit_every_n_hits').map(e => e.n);
  return ns.length ? Math.min(...ns) : null;
}

/** Пассивки "каждый N-й полученный удар лечит X%". */
export function hitsTakenEveryNHeal(effects: PassiveEffect[]): { n: number; healPercent: number }[] {
  return effects.filter((e): e is Extract<PassiveEffect, { kind: 'hits_taken_every_n_heal' }> => e.kind === 'hits_taken_every_n_heal');
}

/** Суммарный шанс полностью уклониться от атаки врага (капается на 90%, чтобы бой не стал непроигрываемым). */
export function dodgeChancePercent(effects: PassiveEffect[]): number {
  return Math.min(0.9, effects.reduce((sum, e) => sum + (e.kind === 'dodge_chance' ? e.chancePercent : 0), 0));
}

/** Суммарный шанс отразить входящий урон обратно врагу. */
export function reflectChancePercent(effects: PassiveEffect[]): number {
  return Math.min(0.9, effects.reduce((sum, e) => sum + (e.kind === 'reflect_chance' ? e.chancePercent : 0), 0));
}

/** Пассивки "шанс поджечь/наложить ДоТ на атакующего при получении удара". */
export function counterBurnChances(effects: PassiveEffect[]): { chancePercent: number; dotPercent: number; turns: number }[] {
  return effects.filter((e): e is Extract<PassiveEffect, { kind: 'counter_burn_chance' }> => e.kind === 'counter_burn_chance');
}

/** Суммарный плоский процент контр-урона врагу при получении удара (не завязан на шанс). */
export function counterDamageFlatPercent(effects: PassiveEffect[]): number {
  return effects.reduce((sum, e) => sum + (e.kind === 'counter_damage_flat' ? e.percent : 0), 0);
}

/** Пассивки "раз в N ходов следующая атака усилена на X%". */
export function turnIntervalEmpowered(effects: PassiveEffect[]): { everyTurns: number; damageMultBonus: number }[] {
  return effects.filter((e): e is Extract<PassiveEffect, { kind: 'turn_interval_empowered_attack' }> => e.kind === 'turn_interval_empowered_attack');
}

/** Бонус урона по "ослабленному" врагу (дебафф/пониженная защита — оба приближены одним сигналом enemyDebuffed). */
export function damageVsDebuffedEnemyBonus(effects: PassiveEffect[], enemyDebuffed: boolean): number {
  if (!enemyDebuffed) return 0;
  return effects.reduce((sum, e) => {
    if (e.kind === 'damage_vs_debuffed_enemy' || e.kind === 'damage_vs_reduced_defense_enemy') return sum + e.damageMultBonus;
    return sum;
  }, 0);
}

/** Бонус урона по врагу, у которого сейчас активен реальный щит (boss-mechanics.ts shieldHp). */
export function damageVsShieldedEnemyBonus(effects: PassiveEffect[], enemyShielded: boolean): number {
  if (!enemyShielded) return 0;
  return effects.reduce((sum, e) => sum + (e.kind === 'damage_vs_shielded_enemy' ? e.damageMultBonus : 0), 0);
}

/** Урон врагу за ход, если на нём накоплено достаточно дебаффов (reality-decay и аналоги). */
export function enemyDebuffStackDrainDamage(effects: PassiveEffect[], debuffStackCount: number, enemyMaxHp: number): number {
  let dmg = 0;
  for (const e of effects) {
    if (e.kind !== 'enemy_debuff_stack_drain') continue;
    if (debuffStackCount >= e.minStacks) dmg += Math.round(enemyMaxHp * e.percentMaxHpPerTurn);
  }
  return dmg;
}

/** Кража ХП у врага каждый ход (heat-absorption и аналоги). */
export function perTurnLifestealFromEnemyPercent(effects: PassiveEffect[]): number {
  return effects.reduce((sum, e) => sum + (e.kind === 'per_turn_lifesteal_from_enemy' ? e.percent : 0), 0);
}

/**
 * Процент лечения при победе. Дамаг-компонент on_victory_damage_buff (soul-harvest
 * и т.п.) сознательно не переносится — в этом движке бой заканчивается вместе со
 * смертью врага, а буст "к следующему бою" потребовал бы хранить баффы отдельно
 * от per-encounter bossState (который обнуляется на новый бой) — не в рамках
 * этого прохода, честно опущено (см. заголовок passive-engine.ts).
 */
export function onVictoryHealPercent(effects: PassiveEffect[]): number {
  return effects.reduce((sum, e) => {
    if (e.kind === 'on_victory_heal') return sum + e.healPercent;
    if (e.kind === 'on_victory_damage_buff') return sum + e.healingBonusPercent;
    return sum;
  }, 0);
}

/** Максимальный healPercent среди пассивок воскрешения раз за бой (Феникс и аналоги). */
export function deathSaveHealPercent(effects: PassiveEffect[]): number | null {
  const vals = effects.filter((e): e is Extract<PassiveEffect, { kind: 'death_save' }> => e.kind === 'death_save').map(e => e.healPercent);
  return vals.length ? Math.max(...vals) : null;
}

export function hasRootImmune(effects: PassiveEffect[]): boolean {
  return effects.some(e => e.kind === 'root_immune');
}

/** Суммарный бонус брони (снижение входящего урона), пока игрок в защитной стойке (last-bastion и аналоги). */
export function onDefendDefenseBonus(effects: PassiveEffect[]): number {
  return effects.reduce((sum, e) => sum + (e.kind === 'on_defend_bonus_defense' ? e.defenseMultBonus : 0), 0);
}

/** Гарантированный крит на самую первую результативную атаку/способность игрока в бою (ranger-night-hunter). */
export function hasFirstAttackCrit(effects: PassiveEffect[]): boolean {
  return effects.some(e => e.kind === 'first_attack_guaranteed_crit');
}

/** Суммарное лечение при блокировании удара (защитная стойка, tornak-foundation и аналоги). */
export function onBlockHealPercent(effects: PassiveEffect[]): number {
  return effects.reduce((sum, e) => sum + (e.kind === 'on_block_heal' ? e.healPercent : 0), 0);
}

/** Суммарный контр-урон врагу при блокировании удара (bone-spike и аналоги). */
export function onBlockCounterPercent(effects: PassiveEffect[]): number {
  return effects.reduce((sum, e) => sum + (e.kind === 'on_block_counter_percent_absorbed' ? e.percent : 0), 0);
}

/** Суммарный шанс снять стак проклятия (лечение-с-проклятием боссов) при собственном лечении (fiery-sermon). */
export function healChanceCleanseCurseChance(effects: PassiveEffect[]): number {
  return Math.min(0.9, effects.reduce((sum, e) => sum + (e.kind === 'heal_chance_cleanse_curse' ? e.chancePercent : 0), 0));
}

/** Самый строгий (наименьший) предел самоисцеления врага среди активных пассивок (depth-silence и аналоги). */
export function enemyHealCapPercent(effects: PassiveEffect[]): number | null {
  const caps = effects.filter((e): e is Extract<PassiveEffect, { kind: 'enemy_heal_cap' }> => e.kind === 'enemy_heal_cap').map(e => e.capPercent);
  return caps.length ? Math.min(...caps) : null;
}

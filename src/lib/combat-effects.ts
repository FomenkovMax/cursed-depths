/**
 * Многоходовые баффы/дебаффы/щиты от активных способностей игрока.
 *
 * Раньше "бафф"-способность превращалась в разовый усиленный удар в тот же
 * ход, "дебафф" ослаблял только ответный удар врага в том же раунде, а
 * "щит" вообще ни на что не влиял (resolveAbility считал его, но
 * combat/action/route.ts никогда не читал результат) — все три эффекта
 * жили ровно один ход и нигде не переживали следующий запрос. Этот модуль
 * делает их настоящими многоходовыми эффектами поверх персистентного
 * BossFightState (см. boss-mechanics.ts — это общий "стейт текущего боя",
 * не только боссовых механик).
 */

import type { BossFightState } from './boss-mechanics';

type ActiveEffectKind = 'player_damage_buff' | 'enemy_damage_debuff' | 'enemy_dot';

/** Добавляет новый бафф/дебафф в список активных эффектов боя. */
export function addActiveEffect(state: BossFightState, kind: ActiveEffectKind, percent: number, turns: number): void {
  if (percent <= 0 || turns <= 0) return;
  state.activeEffects.push({ kind, percent, turnsRemaining: turns });
}

/** Суммарная величина всех активных эффектов данного вида (баффы/дебаффы складываются). */
export function activeEffectBonus(state: BossFightState, kind: ActiveEffectKind): number {
  return state.activeEffects
    .filter(e => e.kind === kind)
    .reduce((sum, e) => sum + e.percent, 0);
}

/** Уменьшает оставшуюся длительность всех активных эффектов на 1 ход и убирает истёкшие. Вызывается раз за ход врага. */
export function tickActiveEffects(state: BossFightState): void {
  state.activeEffects = state.activeEffects
    .map(e => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
    .filter(e => e.turnsRemaining > 0);
}

/**
 * Входящий урон сперва поглощается щитом игрока (если есть), остаток идёт в ХП.
 * Симметрично applyDamageToBoss из boss-mechanics.ts, только для игрока.
 */
export function applyDamageToPlayerShield(state: BossFightState, rawDamage: number): { hpDamage: number; absorbed: boolean } {
  if (state.playerShieldHp <= 0) return { hpDamage: rawDamage, absorbed: false };

  if (rawDamage <= state.playerShieldHp) {
    state.playerShieldHp -= rawDamage;
    return { hpDamage: 0, absorbed: true };
  }

  const overflow = rawDamage - state.playerShieldHp;
  state.playerShieldHp = 0;
  return { hpDamage: overflow, absorbed: true };
}

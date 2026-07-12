/**
 * Многоходовые баффы/дебаффы/щиты от активных способностей игрока, и
 * "заряженные" одноразовые эффекты (см. ArmedEffectKind ниже).
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

import type { BossFightState } from '@/lib/combat/boss-mechanics';

type ActiveEffectKind = 'player_damage_buff' | 'enemy_damage_debuff' | 'enemy_dot' | 'on_block_counter_active' | 'debuff_amplify' | 'player_dodge_buff' | 'summon_damage';

/**
 * "Заряженные" одноразовые эффекты от способностей вроде "Снижает урон
 * следующего удара врага на 40%" — в отличие от ActiveEffectKind выше, не
 * тикают по ходам, а ждут ОДНОГО relevant события (следующий входящий удар
 * врага или следующая атака/способность игрока) и снимаются им, сколько бы
 * ходов оно ни заняло. См. lib/conditional-ability-engine.ts.
 */
export type ArmedEffectKind =
  | 'reduce_next_incoming'
  | 'boost_next_outgoing'
  | 'next_attack_crit'
  | 'next_attack_lifesteal'
  | 'next_attack_ignore_defense';

/** Ставит один "заряженный" одноразовый эффект — ждёт следующего relevant события. */
export function armEffect(state: BossFightState, kind: ArmedEffectKind, percent: number): void {
  state.armedEffects.push({ kind, percent });
}

export function hasArmedEffect(state: BossFightState, kind: ArmedEffectKind): boolean {
  return state.armedEffects.some(e => e.kind === kind);
}

/** Сумма заряженных эффектов данного вида БЕЗ снятия — для случаев, когда нужно знать величину заранее, до того как известно, будет ли событие потреблено (см. combat/action/route.ts, ветка ability). */
export function peekArmedEffectPercent(state: BossFightState, kind: ArmedEffectKind): number {
  return state.armedEffects.filter(e => e.kind === kind).reduce((sum, e) => sum + e.percent, 0);
}

/** Снимает и возвращает ВСЕ заряженные эффекты данного вида (обычно 0 или 1, но на случай нескольких — складываются). */
export function consumeArmedEffects(state: BossFightState, kind: ArmedEffectKind): { count: number; percent: number } {
  const matching = state.armedEffects.filter(e => e.kind === kind);
  if (matching.length === 0) return { count: 0, percent: 0 };
  state.armedEffects = state.armedEffects.filter(e => e.kind !== kind);
  return { count: matching.length, percent: matching.reduce((sum, e) => sum + e.percent, 0) };
}

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
 * Кулдауны активных способностей с явным "КД N ходов" в тексте — slug способности → сколько ходов
 * игрока осталось до готовности. Уменьшается на 1 раз в ход врага, вместе с tickActiveEffects.
 */
export function tickCooldowns(state: BossFightState): void {
  for (const slug of Object.keys(state.abilityCooldowns)) {
    const remaining = state.abilityCooldowns[slug] - 1;
    if (remaining <= 0) delete state.abilityCooldowns[slug];
    else state.abilityCooldowns[slug] = remaining;
  }
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

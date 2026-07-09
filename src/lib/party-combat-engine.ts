/**
 * Оркестрация совместного боя пати (несколько живых игроков против одного общего врага).
 * Параллельна одиночному бою (combat/action/route.ts + boss-mechanics.ts) — использует те же
 * чистые функции (resolveAbility, mitigateDamage, basicAttackDamage из combat-engine.ts), но
 * не сам BossFightState: тот смешивает поля ВРАГА (фаза/щит/призывы — общие для всех) с полями
 * ИГРОКА (щит/баффы/кулдауны — свои у каждого), а в пати участников несколько.
 *
 * Сознательно ограничено первой версией — только рядовые (не-boss) враги. Полноценные боссовые
 * механики (BossMechanics: фазы/щит/адаптивная резистентность/блокировка скиллов и т.д.,
 * см. lib/boss-mechanics.ts) рассчитаны на ОДНОГО защищающегося и требуют отдельного прохода
 * поверх уже работающего одиночного боя — не в рамках этой части. Также пока не перенесены:
 * пассивки игроков (lib/passive-engine.ts/passive-runtime.ts), "заряженные" эффекты и кулдауны
 * способностей (lib/conditional-ability-engine.ts) — базовая атака и полный набор resolveAbility
 * kind'ов (damage/heal/shield/debuff/buff/armor/speed/dot/summon) уже работают, что покрывает
 * основной геймплейный цикл; пассивки/чардж-эффекты — честный follow-up после того, как
 * подтвердится, что сама оркестрация ходов работает на реальных партиях игроков.
 */

export type PartySharedEffectKind = 'enemy_damage_debuff' | 'enemy_dot' | 'summon_damage';
export type PartyMemberEffectKind = 'player_damage_buff' | 'player_dodge_buff';

export interface PartyMemberFightState {
  activeEffects: { kind: PartyMemberEffectKind; percent: number; turnsRemaining: number }[];
  shieldHp: number;
  alive: boolean;
  fled: boolean;
}

export interface PartyFightState {
  turnOrder: string[]; // playerId[], фиксирован на старте боя (порядок вступления в пати)
  currentTurnIndex: number;
  round: number;
  sharedEnemyEffects: { kind: PartySharedEffectKind; percent: number; turnsRemaining: number }[];
  members: Record<string, PartyMemberFightState>;
  combatLog: { text: string; turn: number; actorPlayerId?: string }[];
}

export function initPartyFightState(playerIds: string[]): PartyFightState {
  const members: Record<string, PartyMemberFightState> = {};
  for (const id of playerIds) {
    members[id] = { activeEffects: [], shieldHp: 0, alive: true, fled: false };
  }
  return {
    turnOrder: playerIds,
    currentTurnIndex: 0,
    round: 1,
    sharedEnemyEffects: [],
    members,
    combatLog: [],
  };
}

function canAct(state: PartyFightState, playerId: string): boolean {
  const m = state.members[playerId];
  return !!m && m.alive && !m.fled;
}

/** Хоть кто-то в пати ещё может ходить (жив и не сбежал). */
export function hasActiveMembers(state: PartyFightState): boolean {
  return state.turnOrder.some(id => canAct(state, id));
}

export function currentActingPlayerId(state: PartyFightState): string | null {
  if (!hasActiveMembers(state)) return null;
  if (canAct(state, state.turnOrder[state.currentTurnIndex])) return state.turnOrder[state.currentTurnIndex];
  // Текущий указатель мог "протухнуть" (тот, чья это была очередь, сбежал/пал раньше, ещё
  // до своего хода) — ищем следующего дееспособного, не мутируя state (чистое чтение статуса).
  const n = state.turnOrder.length;
  for (let step = 1; step <= n; step++) {
    const idx = (state.currentTurnIndex + step) % n;
    if (canAct(state, state.turnOrder[idx])) return state.turnOrder[idx];
  }
  return null;
}

/**
 * Передаёт ход следующему дееспособному участнику после того, как текущий отходил.
 * Возвращает true, если круг очереди завершился (индекс "перевалил" через начало массива) —
 * значит все живые/не сбежавшие участники отходили в этом раунде, и настал ход врага.
 * Если действовать больше некому (все пали/сбежали), currentTurnIndex не меняется.
 */
export function advanceTurn(state: PartyFightState): boolean {
  const n = state.turnOrder.length;
  for (let step = 1; step <= n; step++) {
    const idx = (state.currentTurnIndex + step) % n;
    if (canAct(state, state.turnOrder[idx])) {
      const wrapped = idx <= state.currentTurnIndex;
      state.currentTurnIndex = idx;
      if (wrapped) state.round += 1;
      return wrapped;
    }
  }
  return false;
}

export function addSharedEnemyEffect(state: PartyFightState, kind: PartySharedEffectKind, percent: number, turns: number): void {
  if (percent <= 0 || turns <= 0) return;
  state.sharedEnemyEffects.push({ kind, percent, turnsRemaining: turns });
}

export function sharedEnemyEffectBonus(state: PartyFightState, kind: PartySharedEffectKind): number {
  return state.sharedEnemyEffects.filter(e => e.kind === kind).reduce((sum, e) => sum + e.percent, 0);
}

export function addMemberEffect(state: PartyFightState, playerId: string, kind: PartyMemberEffectKind, percent: number, turns: number): void {
  if (percent <= 0 || turns <= 0) return;
  const m = state.members[playerId];
  if (!m) return;
  m.activeEffects.push({ kind, percent, turnsRemaining: turns });
}

export function memberEffectBonus(state: PartyFightState, playerId: string, kind: PartyMemberEffectKind): number {
  const m = state.members[playerId];
  if (!m) return 0;
  return m.activeEffects.filter(e => e.kind === kind).reduce((sum, e) => sum + e.percent, 0);
}

/** "Все союзники получают X" — резолвится один раз (у кастующего), но действует на ВСЮ живую пати. */
export function addEffectToAllAliveMembers(state: PartyFightState, kind: PartyMemberEffectKind, percent: number, turns: number): void {
  for (const id of state.turnOrder) {
    if (canAct(state, id)) addMemberEffect(state, id, kind, percent, turns);
  }
}

/** Тикает длительности общих и персональных эффектов на 1 ход, убирает истёкшие. Вызывается раз за ход врага. */
export function tickPartyEffects(state: PartyFightState): void {
  state.sharedEnemyEffects = state.sharedEnemyEffects
    .map(e => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
    .filter(e => e.turnsRemaining > 0);
  for (const m of Object.values(state.members)) {
    m.activeEffects = m.activeEffects
      .map(e => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
      .filter(e => e.turnsRemaining > 0);
  }
}

/** Урон по щиту участника сперва, остаток — в ХП. Симметрично applyDamageToPlayerShield из combat-effects.ts. */
export function applyDamageToMemberShield(state: PartyFightState, playerId: string, rawDamage: number): { hpDamage: number; absorbed: boolean } {
  const m = state.members[playerId];
  if (!m || m.shieldHp <= 0) return { hpDamage: rawDamage, absorbed: false };
  if (rawDamage <= m.shieldHp) {
    m.shieldHp -= rawDamage;
    return { hpDamage: 0, absorbed: true };
  }
  const overflow = rawDamage - m.shieldHp;
  m.shieldHp = 0;
  return { hpDamage: overflow, absorbed: true };
}

/** Масштабирование ХП врага по размеру пати — урон атаки НЕ масштабируется (за ход бьётся
 * только один участник), масштабируется только пул ХП, чтобы бой занимал пропорционально
 * больше ходов, а не убивал случайную жертву быстрее. */
export function scaleEnemyHpForPartySize(baseHp: number, partySize: number): number {
  return Math.round(baseHp * (1 + 0.5 * Math.max(0, partySize - 1)));
}

/**
 * "Все союзники в группе получают X" — впервые за весь сезон точечных правок combat-engine.ts
 * есть кому реально это доставить. Узкий текстовый признак — намеренно НЕ ловит одиночное
 * "себя или союзника" (root-shields, living-thread, reforge-fate и т.п. — там имеется в виду
 * ОДИН выбранный союзник, таргетинга по конкретному игроку в этой первой версии нет, эффект
 * остаётся self-only, как и в одиночном бою), только явные "все союзники"/"союзники в группе".
 * Проверено против всех текстов способностей в seed-data.ts, упоминающих "союзник"/"группа" —
 * матчит ровно те, что реально описывают эффект на всю группу (the-prayer, great-prayer,
 * call-to-battle, woodland-cover, the-onslaught, flame-of-rebirth, call-of-prey), и не матчит
 * "себя или союзника"-таргетинг одного конкретного игрока.
 */
export function describesGroupEffect(description: string): boolean {
  return /все союзники|союзники в группе/i.test(description);
}

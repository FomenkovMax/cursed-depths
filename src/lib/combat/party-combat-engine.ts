/**
 * Оркестрация совместного боя пати (несколько живых игроков против одного общего врага).
 * Параллельна одиночному бою (combat/action/route.ts + boss-mechanics.ts) — использует те же
 * чистые функции (resolveAbility, mitigateDamage, basicAttackDamage из combat-engine.ts, а
 * теперь и resolveBossTurn/applyDamageToBoss/bossAcMultiplier/adaptiveResistMultiplier/
 * playerDamageMultiplier/blockRandomMechanics/tickBlockedMechanics из boss-mechanics.ts), но не
 * сам BossFightState целиком — тот смешивает поля ВРАГА (фаза/щит/призывы — общие для всей
 * пати) с полями ИГРОКА (заряд обездвиживания/серия одинаковых действий/стаки проклятия —
 * свои у каждого участника), а участников теперь несколько.
 *
 * Решение — не форкать и не переписывать boss-mechanics.ts (нулевой риск регрессии для
 * одиночного боя), а на каждый вызов строить временный BossFightState-совместимый "шим" из
 * общей части (bossMechanics ниже) + личных полей ОДНОГО конкретного участника (см.
 * buildBossShimState/writeBackBossShimState), вызывать существующую функцию как есть, и
 * записать её мутации обратно в нужные места. Кого использовать как "личную половину" шима —
 * решает вызывающий код (combat/action/route.ts): на ходу самого игрока — его самого
 * (адаптивная резистентность и проклятие относятся к тому, кто действует), на ходу врага —
 * случайно выбранную цель (окно уязвимости/обездвиживание/защитная стойка относятся к тому,
 * кого враг сейчас атакует).
 *
 * Пассивки игрока (lib/passive-engine.ts/passive-runtime.ts) и "заряженные"/условные эффекты
 * способностей включая обереги от смерти (lib/conditional-ability-engine.ts) ТОЖЕ перенесены
 * (party-combat-resolver.ts), но НЕ через шим выше — все нужные им функции из
 * lib/combat-effects.ts (armEffect/consumeArmedEffects/peekArmedEffectPercent/tickCooldowns и
 * т.п.) тривиальны (простые push/filter/reduce над персональным state), в отличие от сложных
 * формул boss-mechanics.ts, и переиспользовать их через шим значило бы держать armedEffects/
 * playerAttackCount/abilityCooldowns одновременно "живыми" в двух местах (личная половина шима
 * и member) без единого источника истины. Вместо этого ниже — свои, party-нативные аналоги тех
 * же функций (armMemberEffect/consumeMemberArmedEffects/peekMemberArmedEffectPercent), пишущие
 * прямо в PartyMemberFightState, и widened PartyMemberEffectKind для on_block_counter_active/
 * debuff_amplify (переиспользует уже существующие addMemberEffect/memberEffectBonus как есть).
 */

import { initBossState, type BossFightState, type BossMechanics, type BlockableMechanic } from '@/lib/combat/boss-mechanics';

export type { BossFightState };

export type PartySharedEffectKind = 'enemy_damage_debuff' | 'enemy_dot' | 'summon_damage';
/** on_block_counter_active/debuff_amplify — активированные кастом стойки (см.
 * lib/conditional-ability-engine.ts), личные для того, кто их скастовал, ровно как баффы урона/уклонения. */
export type PartyMemberEffectKind = 'player_damage_buff' | 'player_dodge_buff' | 'on_block_counter_active' | 'debuff_amplify';

/** "Заряженные" одноразовые эффекты (см. lib/combat-effects.ts ArmedEffectKind) — личные, ждут
 * следующего relevant события ИМЕННО у этого участника (следующий полученный/нанесённый удар). */
export type PartyArmedEffectKind = 'reduce_next_incoming' | 'boost_next_outgoing' | 'next_attack_crit' | 'next_attack_lifesteal' | 'next_attack_ignore_defense';

export interface PartyMemberFightState {
  activeEffects: { kind: PartyMemberEffectKind; percent: number; turnsRemaining: number }[];
  shieldHp: number;
  alive: boolean;
  fled: boolean;
  // ===== Личная половина боссовых механик (см. buildBossShimState ниже) — актуальны, только
  // пока bossMechanics на PartyFightState не null (бой с боссом). =====
  /** Обездвиживание корнями-ловушками — отменяет СЛЕДУЮЩЕЕ действие именно этого участника. */
  playerRooted: boolean;
  /** Защищался ли этот участник на своём последнем ходу — от этого зависит "Ответный удар". */
  playerDefendedLastTurn: boolean;
  /** Тип последнего результативного действия ЭТОГО участника — для адаптивной резистентности. */
  lastActionType: 'attack' | 'ability' | null;
  /** Сколько раз подряд этот участник использовал один и тот же тип действия. */
  repeatStreak: number;
  /** Стаки проклятия (от лечения-с-проклятием боссов) — свои у каждого исцелённого. */
  curseStacks: number;
  deathSaveUsed: boolean;
  poisonCured: boolean;
  // ===== Личная половина пассивок/условных эффектов (см. lib/passive-runtime.ts,
  // lib/conditional-ability-engine.ts) — party-нативные аналоги combat-effects.ts, не через шим. =====
  armedEffects: { kind: PartyArmedEffectKind; percent: number }[];
  /** Счётчик результативных атак/способностей ЭТОГО участника за бой — "каждый N-й удар". */
  playerAttackCount: number;
  /** Счётчик полученных ЭТИМ участником ударов за бой — "каждый N-й полученный удар". */
  playerHitsTakenCount: number;
  /** Кулдауны активных способностей ЭТОГО участника — slug → ходов до готовности. */
  abilityCooldowns: Record<string, number>;
}

/** Общая (на всю пати) часть боссовых механик — принадлежит ВРАГУ, не конкретному игроку.
 * Подмножество полей BossFightState, см. заголовок файла и buildBossShimState. */
export interface PartyBossMechanicsState {
  turnCount: number;
  phase: number;
  shieldHp: number;
  shieldBroken: boolean;
  turnsSinceBroken: number;
  summonStacks: number;
  vulnerableNextTurn: boolean;
  blockedMechanics: { kind: BlockableMechanic; turnsRemaining: number }[];
}

export interface PartyFightState {
  turnOrder: string[]; // playerId[], фиксирован на старте боя (порядок вступления в пати)
  currentTurnIndex: number;
  round: number;
  sharedEnemyEffects: { kind: PartySharedEffectKind; percent: number; turnsRemaining: number }[];
  members: Record<string, PartyMemberFightState>;
  combatLog: { text: string; turn: number; actorPlayerId?: string }[];
  /** null для рядовых врагов (нет боссовых механик вообще) — см. lib/boss-mechanics.ts BossMechanics. */
  bossMechanics: PartyBossMechanicsState | null;
  /** Epoch ms момента, когда очередь перешла к текущему actor'у — см. AFK_TIMEOUT_MS ниже. */
  turnStartedAt: number;
}

/** Сколько миллисекунд ждать хода текущего actor'а, прежде чем считать его отошедшим (AFK) и
 * автоматически пропустить его ход (см. resolvePartyAction в party-combat-resolver.ts) — без
 * этого один пропавший игрок стопорит очередь всей пати навсегда, ведь фоновых задач/крона
 * в serverless-деплое нет: проверка "протух ли ход" делает GET /api/party/combat/state,
 * которую и так поллят все участники каждые ~2с, пока идёт бой. */
export const AFK_TIMEOUT_MS = 2 * 60 * 1000;

function initMemberFightState(): PartyMemberFightState {
  return {
    activeEffects: [], shieldHp: 0, alive: true, fled: false,
    playerRooted: false, playerDefendedLastTurn: false, lastActionType: null, repeatStreak: 0,
    curseStacks: 0, deathSaveUsed: false, poisonCured: false,
    armedEffects: [], playerAttackCount: 0, playerHitsTakenCount: 0, abilityCooldowns: {},
  };
}

export function initPartyFightState(playerIds: string[], mechanics?: BossMechanics): PartyFightState {
  const members: Record<string, PartyMemberFightState> = {};
  for (const id of playerIds) {
    members[id] = initMemberFightState();
  }
  // Переиспользуем initBossState() ради дефолтов (напр. shieldHp = mechanics.shieldMax), не
  // задваивая формулу — просто вытаскиваем общую (не-per-player) часть результата.
  const bossInit = mechanics ? initBossState(mechanics) : null;
  return {
    turnOrder: playerIds,
    currentTurnIndex: 0,
    round: 1,
    sharedEnemyEffects: [],
    members,
    combatLog: [],
    turnStartedAt: Date.now(),
    bossMechanics: bossInit && mechanics ? {
      turnCount: bossInit.turnCount,
      phase: bossInit.phase,
      shieldHp: bossInit.shieldHp,
      shieldBroken: bossInit.shieldBroken,
      turnsSinceBroken: bossInit.turnsSinceBroken,
      summonStacks: bossInit.summonStacks,
      vulnerableNextTurn: bossInit.vulnerableNextTurn,
      blockedMechanics: bossInit.blockedMechanics,
    } : null,
  };
}

/**
 * Мёржит распарсенный JSON поверх свежих дефолтов — тот же приём, что уже спас
 * combat/action/route.ts (одиночный бой) от 500-к на старых боях после деплоя с новыми
 * полями BossFightState. Здесь риск даже выше: PartyFightState появился в предыдущем PR БЕЗ
 * bossMechanics/личных боссовых полей участников — любая пати, оставшаяся 'in_combat' на
 * момент этого деплоя, имела бы JSON без них, и первое же обращение (buildBossShimState
 * читает member.playerRooted и т.п.) просто вернуло бы undefined благодаря "?? defaultValue"
 * в самом шиме — не упало бы, но лучше не полагаться на защиту в одном-единственном месте.
 * members мёржится ПОЭЛЕМЕНТНО (не одним поверхностным spread'ом) — иначе новые поля внутри
 * уже существующих участников молча терялись бы, раз ключ "members" в распарсенном JSON уже
 * присутствует целиком.
 */
export function mergePartyFightState(parsed: PartyFightState, mechanics?: BossMechanics): PartyFightState {
  const fresh = initPartyFightState(parsed.turnOrder ?? [], mechanics);
  const members: Record<string, PartyMemberFightState> = {};
  for (const id of fresh.turnOrder) {
    members[id] = { ...initMemberFightState(), ...(parsed.members?.[id] ?? {}) };
  }
  return {
    ...fresh,
    ...parsed,
    members,
    bossMechanics: mechanics ? { ...fresh.bossMechanics!, ...(parsed.bossMechanics ?? {}) } : null,
  };
}

/**
 * Строит временный BossFightState-совместимый объект из общей (bossMechanics) и личной
 * (members[memberId]) половин — для разового вызова existing-функций boss-mechanics.ts
 * (resolveBossTurn/applyDamageToBoss/bossAcMultiplier/adaptiveResistMultiplier/
 * playerDamageMultiplier/blockRandomMechanics/tickBlockedMechanics), которые ожидают единый
 * BossFightState и мутируют его на месте. Поля, которых у пати нет и эти функции не читают
 * (activeEffects/playerShieldHp/armedEffects/abilityCooldowns/playerAttackCount/
 * playerHitsTakenCount) — пустые заглушки, безопасно игнорируются вызывающими функциями.
 * Мутации шима нужно вернуть обратно через writeBackBossShimState после вызова.
 */
export function buildBossShimState(state: PartyFightState, memberId: string): BossFightState {
  const shared = state.bossMechanics;
  const member = state.members[memberId];
  return {
    turnCount: shared?.turnCount ?? 0,
    phase: shared?.phase ?? 1,
    shieldHp: shared?.shieldHp ?? 0,
    shieldBroken: shared?.shieldBroken ?? false,
    turnsSinceBroken: shared?.turnsSinceBroken ?? 0,
    summonStacks: shared?.summonStacks ?? 0,
    playerDefendedLastTurn: member?.playerDefendedLastTurn ?? false,
    playerRooted: member?.playerRooted ?? false,
    lastActionType: member?.lastActionType ?? null,
    repeatStreak: member?.repeatStreak ?? 0,
    curseStacks: member?.curseStacks ?? 0,
    vulnerableNextTurn: shared?.vulnerableNextTurn ?? false,
    activeEffects: [],
    playerShieldHp: 0,
    playerAttackCount: 0,
    playerHitsTakenCount: 0,
    deathSaveUsed: member?.deathSaveUsed ?? false,
    armedEffects: [],
    abilityCooldowns: {},
    poisonCured: member?.poisonCured ?? false,
    blockedMechanics: shared?.blockedMechanics ?? [],
  };
}

/** Переносит мутации шима (см. buildBossShimState) обратно в общую и личную половины state. */
export function writeBackBossShimState(state: PartyFightState, memberId: string, shim: BossFightState): void {
  if (state.bossMechanics) {
    state.bossMechanics.turnCount = shim.turnCount;
    state.bossMechanics.phase = shim.phase;
    state.bossMechanics.shieldHp = shim.shieldHp;
    state.bossMechanics.shieldBroken = shim.shieldBroken;
    state.bossMechanics.turnsSinceBroken = shim.turnsSinceBroken;
    state.bossMechanics.summonStacks = shim.summonStacks;
    state.bossMechanics.vulnerableNextTurn = shim.vulnerableNextTurn;
    state.bossMechanics.blockedMechanics = shim.blockedMechanics;
  }
  const member = state.members[memberId];
  if (member) {
    member.playerDefendedLastTurn = shim.playerDefendedLastTurn;
    member.playerRooted = shim.playerRooted;
    member.lastActionType = shim.lastActionType;
    member.repeatStreak = shim.repeatStreak;
    member.curseStacks = shim.curseStacks;
    member.deathSaveUsed = shim.deathSaveUsed;
    member.poisonCured = shim.poisonCured;
  }
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

/** Ставит один "заряженный" одноразовый эффект ИМЕННО этому участнику — party-нативный аналог
 * armEffect из lib/combat-effects.ts, см. заголовок файла. */
export function armMemberEffect(state: PartyFightState, playerId: string, kind: PartyArmedEffectKind, percent: number): void {
  const m = state.members[playerId];
  if (!m) return;
  m.armedEffects.push({ kind, percent });
}

/** Сумма заряженных эффектов данного вида у этого участника БЕЗ снятия (party-аналог peekArmedEffectPercent). */
export function peekMemberArmedEffectPercent(state: PartyFightState, playerId: string, kind: PartyArmedEffectKind): number {
  const m = state.members[playerId];
  if (!m) return 0;
  return m.armedEffects.filter(e => e.kind === kind).reduce((sum, e) => sum + e.percent, 0);
}

/** Снимает и возвращает ВСЕ заряженные эффекты данного вида у этого участника (party-аналог consumeArmedEffects). */
export function consumeMemberArmedEffects(state: PartyFightState, playerId: string, kind: PartyArmedEffectKind): { count: number; percent: number } {
  const m = state.members[playerId];
  if (!m) return { count: 0, percent: 0 };
  const matching = m.armedEffects.filter(e => e.kind === kind);
  if (matching.length === 0) return { count: 0, percent: 0 };
  m.armedEffects = m.armedEffects.filter(e => e.kind !== kind);
  return { count: matching.length, percent: matching.reduce((sum, e) => sum + e.percent, 0) };
}

/** Тикает длительности общих и персональных эффектов и кулдаунов способностей на 1 ход, убирает
 * истёкшие. Вызывается раз за ход врага (та же гранулярность, что и tickActiveEffects/tickCooldowns
 * в одиночном бою — там это раз за запрос, здесь раз за раунд пати). */
export function tickPartyEffects(state: PartyFightState): void {
  state.sharedEnemyEffects = state.sharedEnemyEffects
    .map(e => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
    .filter(e => e.turnsRemaining > 0);
  for (const m of Object.values(state.members)) {
    m.activeEffects = m.activeEffects
      .map(e => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
      .filter(e => e.turnsRemaining > 0);
    for (const slug of Object.keys(m.abilityCooldowns)) {
      const remaining = m.abilityCooldowns[slug] - 1;
      if (remaining <= 0) delete m.abilityCooldowns[slug];
      else m.abilityCooldowns[slug] = remaining;
    }
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

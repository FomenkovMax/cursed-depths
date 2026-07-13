/**
 * Сезонная лига Арены — то, чего не хватало существующему PvP-рейтингу (lib/pvp.ts): рейтинг
 * рос бесконечно и никогда не сбрасывался, "лиги" (PVP_LEAGUES) были лишь статичными порогами
 * без временно́го измерения. Здесь — настоящий сезон длиной ~7 недель (аудит просил 6-8): в
 * конце каждого топ-3 навсегда фиксируется в истории (PvpSeasonReward, чисто информационная
 * запись, без золота/предметов — это НЕ версия SeasonReward у месячного лидерборда level/xp),
 * а рейтинг ВСЕХ игроков мягко сжимается к базе — не жёсткий сброс к 1000 (это обнулило бы
 * тренировку целиком), а удержание 30% отклонения от базы, тот же принцип, что у soft reset в
 * большинстве ranked-лестниц (Overwatch/Apex и т.п.).
 *
 * Итоговый результат сезона (топ-N, см. leagueScore ниже) — не чистый pvpRating, а pvpRating +
 * PvE-очки сезона (Player.leagueBonusScore, LEAGUE_POINTS): изначально лига считала только
 * PvP-победы, что оставляло игроков, качающихся через данжи/испытания/экспедиции, полностью вне
 * таблицы. Матчмейкинг соперников на Арене (api/pvp/opponents) по-прежнему использует чистый
 * pvpRating — сумма влияет только на итоговое место в сезоне, не на подбор противника.
 *
 * Как и currentSeasonId (lib/seasons.ts), сезон определяется чисто по дате — никакой
 * cron-инфраструктуры. Раздача награды + сброс рейтингов выполняются лениво при первом же
 * обращении к /api/pvp/opponents в новом сезоне.
 */

export const PVP_SEASON_LENGTH_DAYS = 49; // ~7 недель
const PVP_SEASON_EPOCH = Date.UTC(2026, 0, 5); // фиксированная точка отсчёта до релиза лиги
const DAY_MS = 24 * 60 * 60 * 1000;

function seasonNumber(date: Date): number {
  const days = Math.floor((date.getTime() - PVP_SEASON_EPOCH) / DAY_MS);
  return Math.max(0, Math.floor(days / PVP_SEASON_LENGTH_DAYS));
}

/** "PVP-S3" — текущий сезон Арены. */
export function currentPvpSeasonId(date = new Date()): string {
  return `PVP-S${seasonNumber(date)}`;
}

/** Сезон, предшествующий текущему — тот, за который нужно раздать награду и сбросить рейтинги. */
export function previousPvpSeasonId(date = new Date()): string {
  return `PVP-S${Math.max(0, seasonNumber(date) - 1)}`;
}

/** Сколько дней осталось до конца текущего сезона — для отображения в UI. */
export function daysUntilPvpSeasonEnd(date = new Date()): number {
  const days = Math.floor((date.getTime() - PVP_SEASON_EPOCH) / DAY_MS);
  const daysIntoSeason = ((days % PVP_SEASON_LENGTH_DAYS) + PVP_SEASON_LENGTH_DAYS) % PVP_SEASON_LENGTH_DAYS;
  return PVP_SEASON_LENGTH_DAYS - daysIntoSeason;
}

export const PVP_SEASON_TOP_N = 3;

const SOFT_RESET_BASE = 1000;
const SOFT_RESET_RETENTION = 0.3;
const MIN_RATING = 100;

/** Мягкий сброс рейтинга между сезонами — 30% отклонения от базы сохраняется, остальное
 * сжимается. Устойчиво сильный игрок стартует новый сезон выше нуля, но не может расти
 * бесконечно из сезона в сезон. */
export function softResetRating(rating: number): number {
  return Math.max(MIN_RATING, Math.round(SOFT_RESET_BASE + (rating - SOFT_RESET_BASE) * SOFT_RESET_RETENTION));
}

/** Очки лиги за PvE-активность за ТЕКУЩИЙ сезон (Player.leagueBonusScore) — начисляются в
 * соответствующих роутах (combat/action.ts на dungeonCompleted/trialCompleted,
 * expedition/claim/route.ts). Не за PvP-победы — тем PvP-игрок уже награждён напрямую через рост
 * pvpRating, начислять очки лиги ещё и за это было бы двойным счётом одного и того же сигнала. */
export const LEAGUE_POINTS = {
  dungeonOrTrialCompleted: 15,
  expeditionClaimed: 10,
} as const;

/** Итоговый результат для сезонной таблицы лиги — pvpRating (матчмейкинг Арены остаётся на
 * чистом рейтинге, не на этой сумме) плюс очки за PvE-активность сезона. */
export function leagueScore(pvpRating: number, leagueBonusScore: number): number {
  return pvpRating + leagueBonusScore;
}

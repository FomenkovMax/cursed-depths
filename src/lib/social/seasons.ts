/**
 * Сезонный лидерборд — без отдельной cron-инфраструктуры (Vercel Cron не подключён, и заводить
 * его ради этого не стоит): сезон определяется чисто по дате (календарный месяц), а награда за
 * прошлый сезон раздаётся ЛЕНИВО при первом же обращении к лидерборду в новом месяце — тот же
 * паттерн, что уже трижды использован в этой сессии (achievements, quest-chains бэкфилл).
 *
 * Прогресс игроков (уровень/опыт) НЕ сбрасывается между сезонами — это слишком разрушительно
 * для RPG с постоянным персонажем. "Сезон" здесь — это периодическая (ежемесячная) награда
 * текущим лидерам, а не полный ресет прогресса.
 */

export interface SeasonRewardTier {
  rank: number;
  gold: number;
  xp: number;
}

export const SEASON_REWARDS: SeasonRewardTier[] = [
  { rank: 1, gold: 2000, xp: 1000 },
  { rank: 2, gold: 1000, xp: 500 },
  { rank: 3, gold: 500, xp: 250 },
];

/** "2026-07" — текущий сезон. */
export function currentSeasonId(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Сезон, предшествующий переданному (или текущему) — тот, за который нужно раздать награду. */
export function previousSeasonId(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
  return currentSeasonId(d);
}

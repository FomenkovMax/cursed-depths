/**
 * Боевой пропуск — премиум-эксклюзивная сезонная прогрессия: очки за победы в бою (только пока
 * премиум активен), тиры с наградами, месячный цикл (переиспользует currentSeasonId из
 * lib/seasons.ts). В отличие от SeasonReward (разовая награда топ-3 лидерборда раз в месяц), тут
 * тиры доступны ЛЮБОМУ игроку, набравшему нужно количество очков — не соревнование, а прогресс.
 * Полный премиум-лок: без премиума очки не начисляются и тиры нельзя забрать, даже если очков
 * хватило бы (то есть очки без премиума просто не появляются, а не "появляются, но не тратятся").
 */

export interface BattlePassReward {
  gold?: number;
  crownShards?: number;
}

export interface BattlePassTier {
  tier: number;
  xpRequired: number; // накопительно за сезон
  reward: BattlePassReward;
}

export const BATTLE_PASS_TIERS: BattlePassTier[] = [
  { tier: 1, xpRequired: 50, reward: { gold: 300 } },
  { tier: 2, xpRequired: 150, reward: { gold: 400 } },
  { tier: 3, xpRequired: 300, reward: { crownShards: 10 } },
  { tier: 4, xpRequired: 500, reward: { gold: 500 } },
  { tier: 5, xpRequired: 750, reward: { gold: 600, crownShards: 20 } },
  { tier: 6, xpRequired: 1050, reward: { gold: 600 } },
  { tier: 7, xpRequired: 1400, reward: { crownShards: 15 } },
  { tier: 8, xpRequired: 1800, reward: { gold: 700 } },
  { tier: 9, xpRequired: 2250, reward: { crownShards: 15 } },
  { tier: 10, xpRequired: 2750, reward: { gold: 1000, crownShards: 40 } },
  { tier: 11, xpRequired: 3300, reward: { gold: 800 } },
  { tier: 12, xpRequired: 3900, reward: { crownShards: 20 } },
  { tier: 13, xpRequired: 4550, reward: { gold: 900 } },
  { tier: 14, xpRequired: 5250, reward: { crownShards: 25 } },
  { tier: 15, xpRequired: 6000, reward: { gold: 2000, crownShards: 100 } },
];

/** Очки за одну победу в бою — 10% от опыта врага, минимум 1, чтобы даже слабый противник
 * что-то давал (тот же "пол", что у rewardForShare мирового босса). */
export function battlePassXpForKill(enemyXp: number): number {
  return Math.max(1, Math.round(enemyXp * 0.1));
}

/** Эффективный счёт очков за ТЕКУЩИЙ сезон — если у игрока сохранён счёт за прошлый сезон,
 * считаем как 0 (сброс происходит лениво в момент чтения/начисления, без отдельной записи в БД
 * до первого реального события — так же, как lastDailyReward у ежедневной награды). */
export function effectiveBattlePassXp(storedSeasonId: string | null, storedXp: number, currentSeasonId: string): number {
  return storedSeasonId === currentSeasonId ? storedXp : 0;
}

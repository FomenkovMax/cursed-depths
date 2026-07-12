/**
 * Боевой пропуск — премиум-эксклюзивная сезонная прогрессия: очки за победы в бою (только пока
 * премиум активен), тиры с наградами, месячный цикл (переиспользует currentSeasonId из
 * lib/seasons.ts). В отличие от SeasonReward (разовая награда топ-3 лидерборда раз в месяц), тут
 * тиры доступны ЛЮБОМУ игроку, набравшему нужно количество очков — не соревнование, а прогресс.
 * Полный премиум-лок: без премиума очки не начисляются и тиры нельзя забрать, даже если очков
 * хватило бы (то есть очки без премиума просто не появляются, а не "появляются, но не тратятся").
 */

export interface BattlePassRewardItem {
  itemId: string;
  quantity: number;
}

export interface BattlePassReward {
  gold?: number;
  crownShards?: number;
  items?: BattlePassRewardItem[];
}

export interface BattlePassTier {
  tier: number;
  xpRequired: number; // накопительно за сезон
  reward: BattlePassReward;
}

/** Состав наград пересмотрен (аудит 2026-07): раньше сезон отдавал ~7800 золота и 245 Осколков
 * Короны — деньги без ограничения на то, что можно на них купить, ПОВЕРХ уже существующего
 * +15% золота премиума со ЛЮБОГО боя (см. PREMIUM_GOLD_XP_MULT) — двойное усиление одной и той
 * же оси прогресса. Теперь золото и Осколки сведены к нескольким небольшим вехам, а основной
 * объём наград — крафтовые валюты (ash_shard/aylet_tear/tornak_seal/kessara_whisper, полезны
 * ТОЛЬКО для точечного улучшения предметов через Кузницу — их нельзя потратить на что угодно) и
 * расходники, которые не масштабируют силу игрока бесконечно. */
export const BATTLE_PASS_TIERS: BattlePassTier[] = [
  { tier: 1, xpRequired: 50, reward: { gold: 150 } },
  { tier: 2, xpRequired: 150, reward: { items: [{ itemId: 'ash_shard', quantity: 1 }] } },
  { tier: 3, xpRequired: 300, reward: { crownShards: 10 } },
  { tier: 4, xpRequired: 500, reward: { items: [{ itemId: 'health_potion', quantity: 3 }, { itemId: 'mana_potion', quantity: 3 }] } },
  { tier: 5, xpRequired: 750, reward: { gold: 100, items: [{ itemId: 'aylet_tear', quantity: 1 }] } },
  { tier: 6, xpRequired: 1050, reward: { items: [{ itemId: 'greater_health', quantity: 3 }] } },
  { tier: 7, xpRequired: 1400, reward: { crownShards: 15 } },
  { tier: 8, xpRequired: 1800, reward: { items: [{ itemId: 'tornak_seal', quantity: 1 }] } },
  { tier: 9, xpRequired: 2250, reward: { items: [{ itemId: 'elixir_power', quantity: 2 }] } },
  { tier: 10, xpRequired: 2750, reward: { crownShards: 20, items: [{ itemId: 'ash_shard', quantity: 1 }] } },
  { tier: 11, xpRequired: 3300, reward: { items: [{ itemId: 'aylet_tear', quantity: 1 }, { itemId: 'tornak_seal', quantity: 1 }] } },
  { tier: 12, xpRequired: 3900, reward: { crownShards: 20 } },
  { tier: 13, xpRequired: 4550, reward: { items: [{ itemId: 'elixir_power', quantity: 2 }, { itemId: 'greater_health', quantity: 3 }] } },
  { tier: 14, xpRequired: 5250, reward: { items: [{ itemId: 'kessara_whisper', quantity: 1 }] } },
  { tier: 15, xpRequired: 6000, reward: { gold: 500, crownShards: 50, items: [{ itemId: 'kessara_whisper', quantity: 1 }] } },
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

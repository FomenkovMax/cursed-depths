/**
 * Заточка снаряжения — фаза 2 переработки итемизации (после случайных аффиксов, см.
 * lib/item-affixes.ts). Механика по образцу "Подземелий Колодца" (заточка через свиток с
 * убывающим шансом успеха), но без потери предмета/уровня при провале — только свиток
 * тратится впустую. Максимум 10 уровней заточки.
 *
 * Как и аффиксы, заточка живёт прямо в `Inventory.stats` — на успехе плюс 1 к каждому
 * числовому ключу, который уже есть на предмете. combat-engine.ts/equipment-stats.ts не
 * тронуты, читают `stats` как единую сумму, как и раньше.
 */

export const MAX_ENHANCEMENT_LEVEL = 10;

const SUCCESS_CHANCE_BY_LEVEL: number[] = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];

/** Шанс успеха попытки заточки из currentLevel в currentLevel+1. */
export function temperSuccessChance(currentLevel: number): number {
  if (currentLevel < 0 || currentLevel >= MAX_ENHANCEMENT_LEVEL) return 0;
  return SUCCESS_CHANCE_BY_LEVEL[currentLevel];
}

// Шанс выпадения свитка закалки за победу в бою — тот же паттерн, что и у крафт-валюты
// аффиксов (см. rollCurrencyDrop в lib/item-affixes.ts), но независимый ролл и id.
const SCROLL_DROP_CHANCE_REGULAR = 0.06;
const SCROLL_DROP_CHANCE_BOSS = 0.12;

export function rollTemperScrollDrop(isBoss: boolean): 'tempering_scroll' | null {
  const chance = isBoss ? SCROLL_DROP_CHANCE_BOSS : SCROLL_DROP_CHANCE_REGULAR;
  return Math.random() < chance ? 'tempering_scroll' : null;
}

export type TemperResult =
  | { ok: true; success: true; newLevel: number; stats: Record<string, number> }
  | { ok: true; success: false } // свиток потрачен впустую, предмет не меняется
  | { ok: false; error: string };

export function applyTemper(currentLevel: number, currentStats: Record<string, number>): TemperResult {
  if (currentLevel >= MAX_ENHANCEMENT_LEVEL) {
    return { ok: false, error: `Максимальный уровень заточки (+${MAX_ENHANCEMENT_LEVEL}) уже достигнут.` };
  }
  const chance = temperSuccessChance(currentLevel);
  if (Math.random() >= chance) {
    return { ok: true, success: false };
  }
  const stats = { ...currentStats };
  for (const key of Object.keys(stats)) {
    stats[key] = stats[key] + 1;
  }
  return { ok: true, success: true, newLevel: currentLevel + 1, stats };
}

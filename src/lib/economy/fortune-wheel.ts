/**
 * Колесо фортуны — коллекционно-азартная механика поверх уже урезанного (см. game-data.ts
 * rarity-rescale) лут-стола: способ получить что-то полезное без похода в подземелье, но с тем
 * же хардкорным духом — лучшие призы выпадают ооооочень редко (см. веса ниже).
 */

export type FortuneRewardKind =
  | { kind: 'gold'; amount: number }
  | { kind: 'shards'; amount: number }
  | { kind: 'premium_days'; days: number }
  | { kind: 'stash_slots'; slots: number }
  | { kind: 'item'; rarity: 'common' | 'uncommon' | 'rare' | 'epic' }
  | { kind: 'nothing' };

export interface FortuneReward {
  id: string;
  nameRu: string;
  icon: string;
  weight: number; // относительный вес — чем больше, тем чаще выпадает
  reward: FortuneRewardKind;
}

// Веса намеренно НЕ суммируются в круглое число — сумма лишь нормирует относительные шансы.
// Лучшие призы (epic-предмет, неделя према) весят в 50-100 раз меньше "золота по мелочи".
export const FORTUNE_WHEEL: FortuneReward[] = [
  { id: 'gold_small', nameRu: 'Горсть золота', icon: '🪙', weight: 25, reward: { kind: 'gold', amount: 40 } },
  { id: 'gold_medium', nameRu: 'Мешочек золота', icon: '💰', weight: 15, reward: { kind: 'gold', amount: 120 } },
  { id: 'nothing', nameRu: 'Пыль и разочарование', icon: '💨', weight: 14, reward: { kind: 'nothing' } },
  { id: 'item_common', nameRu: 'Простая находка', icon: '📦', weight: 14, reward: { kind: 'item', rarity: 'common' } },
  { id: 'shards_small', nameRu: 'Осколки Короны', icon: '👑', weight: 10, reward: { kind: 'shards', amount: 15 } },
  { id: 'item_uncommon', nameRu: 'Зачарованная находка', icon: '🔷', weight: 9, reward: { kind: 'item', rarity: 'uncommon' } },
  { id: 'stash_slots', nameRu: 'Расширение хранилища', icon: '🗄️', weight: 6, reward: { kind: 'stash_slots', slots: 5 } },
  { id: 'shards_medium', nameRu: 'Горсть Осколков Короны', icon: '👑', weight: 4, reward: { kind: 'shards', amount: 50 } },
  { id: 'premium_day', nameRu: 'День премиум-статуса', icon: '⭐', weight: 3, reward: { kind: 'premium_days', days: 1 } },
  { id: 'item_rare', nameRu: 'Редкая находка', icon: '🔶', weight: 2.5, reward: { kind: 'item', rarity: 'rare' } },
  { id: 'premium_week', nameRu: 'Неделя премиум-статуса', icon: '🌟', weight: 0.8, reward: { kind: 'premium_days', days: 7 } },
  { id: 'item_epic', nameRu: 'Эпическая находка', icon: '💎', weight: 0.3, reward: { kind: 'item', rarity: 'epic' } },
];

const TOTAL_WEIGHT = FORTUNE_WHEEL.reduce((sum, r) => sum + r.weight, 0);

export function rollFortuneWheel(): FortuneReward {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const entry of FORTUNE_WHEEL) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return FORTUNE_WHEEL[0];
}

/** Бесплатных прокруток в день: премиум получает вдвое больше — та же логика, что и у
 * Мирового босса (dailyAttackCapFor в lib/world-boss.ts). */
export function freeSpinsPerDayFor(isPremium: boolean): number {
  return isPremium ? 2 : 1;
}

/** Цена платного прокрута сверх бесплатных лимитов — тратит уже купленные за Stars Осколки,
 * поэтому фактически доступна только тем, кто донатил (см. общий курс "выкидываем F2P"). */
export const PAID_SPIN_COST_SHARDS = 50;

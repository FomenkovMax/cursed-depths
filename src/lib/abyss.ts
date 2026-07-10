/**
 * Бездонный Разлом — бесконечный соло-эндгейм (фаза 4 переработки, после итемизации/заточки/
 * реальной опасности). В отличие от lib/dungeons.ts (фиксированное число комнат, привязка к
 * одной локации), у Разлома нет конца — глубина растёт, пока игрок не сбежит или не погибнет.
 * Переиспользует тот же паттерн "бесшовный переход между комнатами" из combat/action.ts,
 * что и обычные данжи — никаких изменений в combat-engine.ts/boss-mechanics.ts не требуется.
 *
 * Не путать с "Дном" из мастер-документа (docs/cursed_depths_master.pdf, раздел 2.2) — тот
 * эндгейм по документу требует "полную группу в максимальной экипировке" (рейд-механика,
 * которой пока нет). Разлом — сознательно отдельная, более скромная СОЛО-система: честная
 * замена на сейчас, а не попытка выдать за то, что описано в документе.
 */

import { ENEMIES } from './game-data';

export const ABYSS_LOCATION_ID = 'upper_deep';
export const ABYSS_MIN_LEVEL = 5;

// Каждая ELITE_INTERVAL-я глубина — усиленный бой с одним из "боссовых" шаблонов врагов
// вместо обычного — контрольная точка с более заметным риском.
const ELITE_INTERVAL = 5;

const REGULAR_ENEMY_IDS = ENEMIES.filter(e => !e.isBoss).map(e => e.id);
const ELITE_ENEMY_IDS = ENEMIES.filter(e => e.isBoss).map(e => e.id);

export function isEliteDepth(depth: number): boolean {
  return depth > 0 && depth % ELITE_INTERVAL === 0;
}

/** Враг для конкретной глубины — из широкого пула (все обычные враги игры для обычных глубин,
 * все боссы для контрольных точек), а не только враги текущей локации, как у обычных данжей —
 * это то самое "ощущение бесконечного разнообразия", которого не даёт фиксированный список. */
export function abyssEnemyIdForDepth(depth: number): string | null {
  const pool = isEliteDepth(depth) ? ELITE_ENEMY_IDS : REGULAR_ENEMY_IDS;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface AbyssScaling {
  hpMult: number;
  damageMult: number;
  goldMult: number;
  xpMult: number;
}

/** Линейный рост сложности и награды с глубиной — на глубине 10 враги уже +50% HP/+30% урона,
 * зато и золото/опыт заметно выше. Никакого потолка — глубина 50 будет свирепой, но это
 * честно: чем дальше идёшь, тем больше рискуешь и тем больше можешь заработать. */
export function abyssScaling(depth: number): AbyssScaling {
  return {
    hpMult: 1 + depth * 0.15,
    damageMult: 1 + depth * 0.08,
    goldMult: 1 + depth * 0.12,
    xpMult: 1 + depth * 0.1,
  };
}

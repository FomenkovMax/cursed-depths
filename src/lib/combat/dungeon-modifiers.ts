/**
 * Модификаторы забега по данжу — POE2/Diablo-style "map mods", но не выбираемые игроком, а
 * роллящиеся при входе (см. POST /api/dungeon/start). Цель — дать реиграбельность тем же двум
 * данжам: один и тот же "Храм Пепла" каждый раз ощущается иначе, риск/награда меняются.
 *
 * Модификатор хранится на Player.dungeonModifierId на всё время забега (сбрасывается вместе с
 * dungeonId/dungeonRoom при завершении/побеге/смерти — см. combat/action.ts) и применяется в
 * combat/action.ts к урону врага, HP врага при спавне комнаты, и наградам XP/золота. Никаких
 * изменений в combat-engine.ts/boss-mechanics.ts не требуется — модификатор это чистый
 * множитель поверх уже посчитанных чисел.
 */

export interface DungeonModifier {
  id: string;
  nameRu: string;
  icon: string;
  descriptionRu: string;
  enemyDamageMult: number;
  enemyHpMult: number;
  goldMult: number;
  xpMult: number;
}

export const DUNGEON_MODIFIERS: DungeonModifier[] = [
  {
    id: 'blight_fury',
    nameRu: 'Ярость Скверны',
    icon: '💢',
    descriptionRu: 'Враги наносят на 25% больше урона, но дают на 30% больше золота.',
    enemyDamageMult: 1.25,
    enemyHpMult: 1,
    goldMult: 1.3,
    xpMult: 1,
  },
  {
    id: 'ashen_veil',
    nameRu: 'Пелена Пепла',
    icon: '🌫️',
    descriptionRu: 'У врагов на 30% больше HP, но опыта за них на 30% больше.',
    enemyDamageMult: 1,
    enemyHpMult: 1.3,
    goldMult: 1,
    xpMult: 1.3,
  },
  {
    id: 'karsus_greed',
    nameRu: 'Жадность Карсуса',
    icon: '💰',
    descriptionRu: 'Золото за забег +50%, но опыта на 20% меньше.',
    enemyDamageMult: 1,
    enemyHpMult: 1,
    goldMult: 1.5,
    xpMult: 0.8,
  },
  {
    id: 'tornak_wrath',
    nameRu: 'Гнев Торнака',
    icon: '⚡',
    descriptionRu: 'Враги крепче и злее (+15% урон, +15% HP), но и награда выше (+20% золото и опыт).',
    enemyDamageMult: 1.15,
    enemyHpMult: 1.15,
    goldMult: 1.2,
    xpMult: 1.2,
  },
  {
    id: 'dark_whisper',
    nameRu: 'Шёпот Тьмы',
    icon: '🌑',
    descriptionRu: 'Максимальный риск: враги наносят на 40% больше урона, зато золота на 60% больше.',
    enemyDamageMult: 1.4,
    enemyHpMult: 1,
    goldMult: 1.6,
    xpMult: 1,
  },
];

// 40% забегов — без модификатора ("чистый" забег для тех, кто не хочет рисковать).
const NO_MODIFIER_CHANCE = 0.4;

export function rollDungeonModifier(): string | null {
  if (Math.random() < NO_MODIFIER_CHANCE) return null;
  return DUNGEON_MODIFIERS[Math.floor(Math.random() * DUNGEON_MODIFIERS.length)].id;
}

export function findDungeonModifier(id: string | null): DungeonModifier | null {
  if (!id) return null;
  return DUNGEON_MODIFIERS.find(m => m.id === id) ?? null;
}

const NEUTRAL_EFFECT = { enemyDamageMult: 1, enemyHpMult: 1, goldMult: 1, xpMult: 1 };

/** Возвращает множители для расчётов в combat/action.ts — 1 по всем осям, если модификатора нет. */
export function dungeonModifierEffect(id: string | null): Pick<DungeonModifier, 'enemyDamageMult' | 'enemyHpMult' | 'goldMult' | 'xpMult'> {
  const mod = findDungeonModifier(id);
  return mod ?? NEUTRAL_EFFECT;
}

export type ModifierEffect = Pick<DungeonModifier, 'enemyDamageMult' | 'enemyHpMult' | 'goldMult' | 'xpMult'>;

/** Heat-уровень (0..MAX_HEAT_LEVEL) — риск-модификатор, который игрок ВЫБИРАЕТ сам перед входом
 * в данж (в отличие от DUNGEON_MODIFIERS выше, который всегда роллится случайно и независимо от
 * игрока). Оба слоя действуют одновременно поверх друг друга — см. multiplyEffects ниже. */
export const MAX_HEAT_LEVEL = 5;

const HEAT_ICONS = ['🕯️', '🔥', '🔥', '💢', '🌋', '👁️'];
const HEAT_NAMES = ['Без риска', 'Тлеющий жар', 'Полыхающий гнев', 'Пожар Скверны', 'Пепельная буря', 'Гнев Карсуса'];

function clampHeatLevel(level: number): number {
  return Math.max(0, Math.min(MAX_HEAT_LEVEL, Math.round(level)));
}

export function heatLevelEffect(level: number): ModifierEffect {
  const clamped = clampHeatLevel(level);
  return {
    enemyDamageMult: 1 + clamped * 0.15,
    enemyHpMult: 1 + clamped * 0.15,
    goldMult: 1 + clamped * 0.2,
    xpMult: 1 + clamped * 0.2,
  };
}

export function heatLevelLabel(level: number): { nameRu: string; icon: string } {
  const clamped = clampHeatLevel(level);
  return { nameRu: HEAT_NAMES[clamped], icon: HEAT_ICONS[clamped] };
}

/** Перемножает два независимых слоя множителей (случайный модификатор × выбранный heat-уровень)
 * поосно — оба применяются одновременно к одному и тому же забегу. */
export function multiplyEffects(a: ModifierEffect, b: ModifierEffect): ModifierEffect {
  return {
    enemyDamageMult: a.enemyDamageMult * b.enemyDamageMult,
    enemyHpMult: a.enemyHpMult * b.enemyHpMult,
    goldMult: a.goldMult * b.goldMult,
    xpMult: a.xpMult * b.xpMult,
  };
}

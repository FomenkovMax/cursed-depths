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

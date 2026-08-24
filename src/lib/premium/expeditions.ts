/**
 * Экспедиции — офлайн-механика: отправить героя "в отлучку" на фиксированное время и
 * вернуться за наградой. Не блокирует обычную игру (можно продолжать драться/исследовать
 * параллельно, в отличие от боевых активностей) — чистый таймер поверх уже открытой сессии,
 * вознаграждающий за то, что игрок вернулся в игру позже.
 *
 * Премиум даёт доступ к ЛЮБОМУ тиру без ограничений. F2P (волна 2B, п.24) получает "вкус"
 * механики — раз в день самый короткий тир (F2P_EXPEDITION_TIER_ID) с половинной наградой
 * (F2P_REWARD_MULT), а не полную невидимость: раньше свободный игрок не видел экспедиции
 * вообще, что обычно конвертирует хуже, чем "попробовал — хочу больше".
 */

export interface ExpeditionTier {
  id: string;
  nameRu: string;
  icon: string;
  hours: number;
  descriptionRu: string;
  itemChance: number; // шанс бонусного предмета при получении награды
  itemRarity: 'common' | 'uncommon' | 'rare' | 'epic';
}

export const EXPEDITION_TIERS: ExpeditionTier[] = [
  { id: 'short', nameRu: 'Короткая вылазка', icon: '🥾', hours: 1,
    descriptionRu: 'Пробежка до ближайших развалин и обратно — риска почти нет, награда скромная.',
    itemChance: 0.15, itemRarity: 'common' },
  { id: 'medium', nameRu: 'Дневной поход', icon: '🎒', hours: 4,
    descriptionRu: 'Полноценная вылазка за черту безопасных земель.',
    itemChance: 0.12, itemRarity: 'uncommon' },
  { id: 'long', nameRu: 'Долгая экспедиция', icon: '🗺️', hours: 12,
    descriptionRu: 'Герой уходит на всю ночь — туда, где карты уже не врут, потому что их никто не составлял.',
    itemChance: 0.06, itemRarity: 'rare' },
  { id: 'epic', nameRu: 'Экспедиция за Грань', icon: '🌌', hours: 24,
    descriptionRu: 'Сутки за пределами всего нанесённого на карту — рискованно, но кто не рискует.',
    itemChance: 0.025, itemRarity: 'epic' },
];

/** Единственный тир, доступный без премиума, раз в день (см. Player.expeditionFreeUsedDate). */
export const F2P_EXPEDITION_TIER_ID = 'short';
/** Награда F2P-вылазки урезана вдвое — "вкус" механики, а не полноценный бесплатный доступ. */
export const F2P_REWARD_MULT = 0.5;

export function findExpeditionTier(id: string): ExpeditionTier | null {
  return EXPEDITION_TIERS.find(t => t.id === id) ?? null;
}

/** Золото/опыт растут с длительностью и уровнем героя — та же логика, что и у ежедневной
 * награды (api/daily/route.ts), просто с множителем часов. */
export function expeditionReward(tier: ExpeditionTier, playerLevel: number): { gold: number; xp: number } {
  const variance = 0.85 + Math.random() * 0.3; // 85%-115% разброс, чтобы не было идеально предсказуемо
  return {
    gold: Math.round(tier.hours * 15 * playerLevel * variance),
    xp: Math.round(tier.hours * 10 * playerLevel * variance),
  };
}

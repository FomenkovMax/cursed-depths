/**
 * Монетизация — премиум-валюта "Осколки Короны" (см. codex.ts 'crown_curse': осколки
 * доспеха короля, отказавшегося умирать по правилам Столпов — берём готовый лор, а не
 * выдумываем валюту с нуля). Единственный разрешённый способ платить за цифровые товары
 * внутри Telegram-бота — Stars (обязательное требование Telegram с 2024 года, см.
 * https://core.telegram.org/bots/payments-stars), поэтому реальные деньги идут ТОЛЬКО через
 * SHARD_PACKS ("купить Осколки за Stars"), а весь остальной магазин (PREMIUM_CATALOG)
 * тратит уже начисленные Осколки — это и есть модель premium-валюты, которую использует
 * "Подземелья Колодца" (Осколки Сердца), а не косметика-онли модель самого PoE.
 */

export interface ShardPack {
  id: string;
  nameRu: string;
  icon: string;
  stars: number;
  shards: number;
}

// Курс намеренно неровный — крупные паки дают больше Осколков за Star, поощряя разовую
// покупку побольше, тот же приём, что в любом мобильном магазине премиум-валюты.
export const SHARD_PACKS: ShardPack[] = [
  { id: 'small_pouch', nameRu: 'Малый мешочек', icon: '👛', stars: 100, shards: 100 },
  { id: 'large_pouch', nameRu: 'Большой мешочек', icon: '💰', stars: 500, shards: 550 },
  { id: 'crown_chest', nameRu: 'Сундук Короны', icon: '🗝️', stars: 1000, shards: 1200 },
  { id: 'crown_hoard', nameRu: 'Клад Короны', icon: '👑', stars: 2000, shards: 2600 },
];

export function findShardPack(id: string): ShardPack | null {
  return SHARD_PACKS.find(p => p.id === id) ?? null;
}

export type PremiumSkuEffect =
  | { kind: 'premium_days'; days: number }
  | { kind: 'guaranteed_currency'; itemId: string; quantity: number }
  | { kind: 'stash_expansion'; slots: number };

export interface PremiumSku {
  id: string;
  nameRu: string;
  descriptionRu: string;
  icon: string;
  costShards: number;
  effect: PremiumSkuEffect;
}

export const PREMIUM_CATALOG: PremiumSku[] = [
  {
    id: 'premium_week',
    nameRu: 'Премиум-статус — неделя',
    descriptionRu: '+15% золота и опыта за каждый бой на 7 дней.',
    icon: '⭐',
    costShards: 300,
    effect: { kind: 'premium_days', days: 7 },
  },
  {
    id: 'premium_month',
    nameRu: 'Премиум-статус — месяц',
    descriptionRu: '+15% золота и опыта за каждый бой на 30 дней — выгоднее понедельной цены.',
    icon: '🌟',
    costShards: 900,
    effect: { kind: 'premium_days', days: 30 },
  },
  {
    id: 'guaranteed_currency',
    nameRu: 'Мешочек Осколков Пепла',
    descriptionRu: '3x Осколок Пепла — гарантированно, без похода по подземельям.',
    icon: '🔥',
    costShards: 150,
    effect: { kind: 'guaranteed_currency', itemId: 'ash_shard', quantity: 3 },
  },
  {
    id: 'stash_expansion',
    nameRu: 'Расширение хранилища',
    descriptionRu: '+20 слотов хранилища навсегда. Можно купить несколько раз.',
    icon: '🗄️',
    costShards: 250,
    effect: { kind: 'stash_expansion', slots: 20 },
  },
];

export function findPremiumSku(id: string): PremiumSku | null {
  return PREMIUM_CATALOG.find(s => s.id === id) ?? null;
}

export function isPremiumActive(premiumUntil: Date | null): boolean {
  return !!premiumUntil && premiumUntil.getTime() > Date.now();
}

/** Единственное место, откуда премиум-бонус берёт своё число — описание SKU выше ("+15%
 * золота и опыта") ссылается на эту же величину, чтобы текст и реальный расчёт не разошлись. */
export const PREMIUM_GOLD_XP_MULT = 1.15;

/** Штраф за смерть — реальная цена поражения сверх уже существующей потери золота
 * (см. combat/action.ts): -15% опыта на сутки. Премиум полностью иммунен — это не отдельная
 * механика, а часть того же расчёта: проверяется isPremiumActive рядом с сроком дебаффа. */
export const DEATH_DEBUFF_XP_MULT = 0.85;
export const DEATH_DEBUFF_HOURS = 24;

export function isDeathDebuffActive(deathDebuffUntil: Date | null, premiumUntil: Date | null): boolean {
  if (isPremiumActive(premiumUntil)) return false;
  return !!deathDebuffUntil && deathDebuffUntil.getTime() > Date.now();
}

/** Смена расы (и, вслед за ней, класса — классы жёстко привязаны к расе, см. GameClass.raceId)
 * — платная услуга за уже купленные Осколки, а не starter-фича, поэтому цена вне PREMIUM_CATALOG:
 * это не разовая покупка эффекта, а сервис с собственным API (см. api/player/change-race). */
export const RACE_CHANGE_COST_SHARDS = 400;

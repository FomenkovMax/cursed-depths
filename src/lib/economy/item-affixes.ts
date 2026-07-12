/**
 * Система случайных аффиксов на снаряжении — первая фаза переработки итемизации
 * (см. обсуждение с пользователем: сделать "эффект неожиданности" находок, как в POE2,
 * но в масштабе, посильном одному разработчику, а не скопировать POE2 буквально).
 *
 * Ключевой принцип: `stats` в Inventory остаётся ЕДИНСТВЕННЫМ источником правды для
 * combat-engine.ts / equipment-stats.ts — они как читали суммарные числа, так и продолжают,
 * без единого изменения. Аффиксы просто прибавляются к базовым `stats` предмета в момент
 * ролла; `affixTier`/`affixes` хранятся отдельно только для отображения и для крафт-валют.
 *
 * Пул аффиксов сознательно небольшой на старте (по 5-8 доступных на слот) — это семя,
 * которое имеет смысл расширять дальше по реальному фидбеку игроков, а не гадать заранее.
 */

import type { Item } from '@/lib/game-data';

export type StatKey = 'strength' | 'dexterity' | 'vitality' | 'intellect' | 'willpower' | 'instinct' | 'attack' | 'defense' | 'hp' | 'mp';
export type GearSlot = 'weapon' | 'armor' | 'accessory';
export type AffixTierName = 'normal' | 'magic' | 'rare' | 'corrupted';

/** Левел-гейт на экип (см. api/inventory/equip) — нельзя получить имбалансную вещь не по
 * уровню и тут же выключить сложность. Гейтится по редкости самого предмета (она уже лежит
 * в Inventory.rarity на каждой строке), а не по отдельному полю на каждом из ~150 предметов. */
export const MIN_LEVEL_BY_RARITY: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 4,
  epic: 7,
  legendary: 11,
  mythic: 16,
};

export function minLevelForRarity(rarity: string): number {
  return MIN_LEVEL_BY_RARITY[rarity] ?? 1;
}

export interface AffixTierDef {
  tier: number; // 1 — лучший
  minItemLevel: number;
  min: number;
  max: number;
}

export interface AffixDef {
  id: string;
  labelRu: string; // добавляется к имени предмета в родительном падеже, см. rollGearInstance
  statKey: StatKey;
  kind: 'prefix' | 'suffix';
  slots: GearSlot[];
  tiers: AffixTierDef[]; // от сильного (tier 1) к слабому
}

export interface RolledAffix {
  affixId: string;
  labelRu: string;
  statKey: StatKey;
  kind: 'prefix' | 'suffix';
  tier: number;
  value: number;
}

export function isGearType(type: string): type is GearSlot {
  return type === 'weapon' || type === 'armor' || type === 'accessory';
}

const T3 = (min: number, max: number): AffixTierDef => ({ tier: 3, minItemLevel: 1, min, max });
const T2 = (min: number, max: number): AffixTierDef => ({ tier: 2, minItemLevel: 4, min, max });
const T1 = (min: number, max: number): AffixTierDef => ({ tier: 1, minItemLevel: 8, min, max });

export const AFFIX_POOL: AffixDef[] = [
  // === ПРЕФИКСЫ — основной боевой стат ===
  { id: 'pfx_fury', labelRu: 'Ярости', statKey: 'attack', kind: 'prefix', slots: ['weapon'], tiers: [T3(1, 2), T2(3, 4), T1(5, 7)] },
  { id: 'pfx_bulwark', labelRu: 'Бастиона', statKey: 'defense', kind: 'prefix', slots: ['armor'], tiers: [T3(1, 2), T2(3, 4), T1(5, 6)] },
  { id: 'pfx_might', labelRu: 'Мощи', statKey: 'strength', kind: 'prefix', slots: ['weapon', 'armor'], tiers: [T3(1, 2), T2(3, 4), T1(5, 6)] },
  { id: 'pfx_swift', labelRu: 'Стремительности', statKey: 'dexterity', kind: 'prefix', slots: ['weapon', 'accessory'], tiers: [T3(1, 2), T2(3, 4), T1(5, 6)] },
  { id: 'pfx_stone', labelRu: 'Камня', statKey: 'vitality', kind: 'prefix', slots: ['armor', 'accessory'], tiers: [T3(1, 2), T2(3, 4), T1(5, 6)] },
  { id: 'pfx_arcane', labelRu: 'Аркана', statKey: 'intellect', kind: 'prefix', slots: ['weapon', 'accessory'], tiers: [T3(1, 2), T2(3, 4), T1(5, 6)] },

  // === СУФФИКСЫ — второстепенные/утилитарные статы ===
  { id: 'sfx_will', labelRu: 'Воли', statKey: 'willpower', kind: 'suffix', slots: ['armor', 'accessory'], tiers: [T3(1, 2), T2(3, 4), T1(5, 6)] },
  { id: 'sfx_instinct', labelRu: 'Инстинкта', statKey: 'instinct', kind: 'suffix', slots: ['weapon', 'accessory'], tiers: [T3(1, 2), T2(3, 4), T1(5, 6)] },
  { id: 'sfx_life', labelRu: 'Жизни', statKey: 'hp', kind: 'suffix', slots: ['armor', 'accessory'], tiers: [T3(5, 10), T2(11, 20), T1(21, 30)] },
  { id: 'sfx_mana', labelRu: 'Маны', statKey: 'mp', kind: 'suffix', slots: ['accessory', 'weapon'], tiers: [T3(5, 8), T2(9, 15), T1(16, 22)] },
  { id: 'sfx_precision', labelRu: 'Точности', statKey: 'attack', kind: 'suffix', slots: ['accessory'], tiers: [T3(1, 1), T2(2, 2), T1(3, 3)] },
  { id: 'sfx_ward', labelRu: 'Стража', statKey: 'defense', kind: 'suffix', slots: ['accessory'], tiers: [T3(1, 1), T2(2, 2), T1(3, 3)] },
];

// Вес шанса каждого уровня аффиксов при обычном выпадении (не через валюту крафта).
const AFFIX_TIER_WEIGHTS: { tier: 'normal' | 'magic' | 'rare'; weight: number }[] = [
  { tier: 'normal', weight: 0.55 },
  { tier: 'magic', weight: 0.32 },
  { tier: 'rare', weight: 0.13 },
];

function pickAffixTierRoll(): 'normal' | 'magic' | 'rare' {
  const total = AFFIX_TIER_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of AFFIX_TIER_WEIGHTS) {
    if (r < w.weight) return w.tier;
    r -= w.weight;
  }
  return 'normal';
}

function eligibleAffixes(slot: GearSlot, kind: 'prefix' | 'suffix', itemLevel: number, excludeStatKeys: Set<string>): AffixDef[] {
  return AFFIX_POOL.filter(a =>
    a.kind === kind &&
    a.slots.includes(slot) &&
    !excludeStatKeys.has(a.statKey) &&
    a.tiers.some(t => t.minItemLevel <= itemLevel)
  );
}

function rollOneAffix(def: AffixDef, itemLevel: number): RolledAffix {
  const eligibleTiers = def.tiers.filter(t => t.minItemLevel <= itemLevel);
  const tierDef = eligibleTiers[Math.floor(Math.random() * eligibleTiers.length)];
  const value = tierDef.min + Math.floor(Math.random() * (tierDef.max - tierDef.min + 1));
  return { affixId: def.id, labelRu: def.labelRu, statKey: def.statKey, kind: def.kind, tier: tierDef.tier, value };
}

/** Катает набор из `count` аффиксов для слота, максимум 2 префикса + 2 суффикса, без
 * повторяющихся статов (иначе "Мощи ... Мощи" на одном предмете было бы странно). */
export function rollAffixSet(slot: GearSlot, itemLevel: number, count: number): RolledAffix[] {
  const result: RolledAffix[] = [];
  const usedStatKeys = new Set<string>();
  let prefixCount = 0;
  let suffixCount = 0;
  const maxPerKind = 2;
  let attempts = 0;
  while (result.length < count && attempts < 40) {
    attempts++;
    let wantKind: 'prefix' | 'suffix' = Math.random() < 0.5 ? 'prefix' : 'suffix';
    if (wantKind === 'prefix' && prefixCount >= maxPerKind) wantKind = 'suffix';
    if (wantKind === 'suffix' && suffixCount >= maxPerKind) wantKind = 'prefix';
    if ((wantKind === 'prefix' && prefixCount >= maxPerKind) || (wantKind === 'suffix' && suffixCount >= maxPerKind)) continue;

    const pool = eligibleAffixes(slot, wantKind, itemLevel, usedStatKeys);
    if (pool.length === 0) continue;
    const def = pool[Math.floor(Math.random() * pool.length)];
    result.push(rollOneAffix(def, itemLevel));
    usedStatKeys.add(def.statKey);
    if (def.kind === 'prefix') prefixCount++; else suffixCount++;
  }
  return result;
}

function affixCountForTier(tier: 'normal' | 'magic' | 'rare'): number {
  if (tier === 'normal') return 0;
  if (tier === 'magic') return Math.random() < 0.5 ? 1 : 2;
  return Math.random() < 0.5 ? 3 : 4;
}

function nameWithAffixes(baseNameRu: string, affixes: RolledAffix[]): string {
  if (affixes.length === 0) return baseNameRu;
  return `${baseNameRu} ${affixes.map(a => a.labelRu).join(' ')}`;
}

function mergeStats(baseStats: Record<string, number>, affixes: RolledAffix[]): Record<string, number> {
  const stats = { ...baseStats };
  for (const a of affixes) stats[a.statKey] = (stats[a.statKey] ?? 0) + a.value;
  return stats;
}

export interface RolledGear {
  name: string;
  stats: Record<string, number>;
  itemLevel: number;
  affixTier: AffixTierName | null; // null — не снаряжение, аффиксы не применимы
  affixes: RolledAffix[];
}

/** Единая точка ролла предмета при выпадении из боя/исследования. Для не-снаряжения (материалы,
 * расходники, чертежи, валюта) — чистый passthrough, ничего не меняется. */
export function rollGearInstance(item: Pick<Item, 'nameRu' | 'type' | 'stats'>, itemLevel: number): RolledGear {
  const clampedLevel = Math.max(1, Math.min(99, Math.round(itemLevel)));
  if (!isGearType(item.type)) {
    return { name: item.nameRu, stats: { ...item.stats }, itemLevel: clampedLevel, affixTier: null, affixes: [] };
  }
  const slot = item.type;
  const tier = pickAffixTierRoll();
  const count = affixCountForTier(tier);
  const affixes = count > 0 ? rollAffixSet(slot, clampedLevel, count) : [];
  return {
    name: nameWithAffixes(item.nameRu, affixes),
    stats: mergeStats(item.stats, affixes),
    itemLevel: clampedLevel,
    affixTier: tier,
    affixes,
  };
}

// ===== КРАФТ-ВАЛЮТА =====
// Четыре предмета-валюты (см. game-data.ts, type: 'currency'), переименованные под лор из
// Библии мира (docs/cursed_depths_master.pdf) — механики позаимствованы у жанра (аналоги
// Chaos/Alteration/Exalted/Vaal orb из POE2), только со своими названиями и балансом.
export const CURRENCY_IDS = ['ash_shard', 'aylet_tear', 'tornak_seal', 'kessara_whisper'] as const;
export type CurrencyId = typeof CURRENCY_IDS[number];

// Шанс выпадения крафт-валюты за победу в бою — независимо от lootTable конкретного врага
// (та же схема, что у чертежей тира 3, только не привязана к конкретным боссам). Веса
// выбирают, КАКАЯ валюта выпала, при условии что валюта вообще выпала.
const CURRENCY_DROP_CHANCE_REGULAR = 0.05;
const CURRENCY_DROP_CHANCE_BOSS = 0.15;
const CURRENCY_WEIGHTS: { id: CurrencyId; weight: number }[] = [
  { id: 'ash_shard', weight: 45 },
  { id: 'aylet_tear', weight: 30 },
  { id: 'tornak_seal', weight: 18 },
  { id: 'kessara_whisper', weight: 7 },
];

/** Роллит, выпала ли крафт-валюта за победу в этом бою, и если да — какая. Вызывающий код
 * сам решает, что делать с id (обычно — просто добавить в тот же список dropped-предметов,
 * что и обычный лут, т.к. currency-предметы уже есть в ITEMS и addItemToInventory их
 * прекрасно обрабатывает как есть). */
export function rollCurrencyDrop(isBoss: boolean): CurrencyId | null {
  const chance = isBoss ? CURRENCY_DROP_CHANCE_BOSS : CURRENCY_DROP_CHANCE_REGULAR;
  if (Math.random() >= chance) return null;
  const total = CURRENCY_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of CURRENCY_WEIGHTS) {
    if (r < w.weight) return w.id;
    r -= w.weight;
  }
  return null;
}

export type CurrencyApplyResult =
  | { ok: true; name: string; stats: Record<string, number>; affixTier: AffixTierName; affixes: RolledAffix[] }
  | { ok: false; error: string };

/** Применяет одну единицу крафт-валюты к предмету. `baseStats`/`baseNameRu` — статы и имя
 * БАЗОВОГО шаблона из ITEMS (без каких-либо аффиксов), чтобы пересчёт всегда шёл от чистой
 * основы, а не пытался "вычесть" старые аффиксы из уже смешанных чисел. */
export function applyCurrency(
  currencyId: CurrencyId,
  baseNameRu: string,
  baseStats: Record<string, number>,
  slot: GearSlot,
  itemLevel: number,
  currentTier: AffixTierName,
  currentAffixes: RolledAffix[]
): CurrencyApplyResult {
  if (currentTier === 'corrupted') {
    return { ok: false, error: 'Осквернённый предмет больше нельзя изменять.' };
  }

  let newTier: AffixTierName = currentTier;
  let newAffixes: RolledAffix[];

  if (currencyId === 'ash_shard') {
    if (currentAffixes.length === 0) {
      return { ok: false, error: 'На предмете нет свойств для переброса.' };
    }
    newAffixes = rollAffixSet(slot, itemLevel, currentAffixes.length);
  } else if (currencyId === 'aylet_tear') {
    if (currentTier === 'rare') {
      return { ok: false, error: 'Предмет уже редкий — улучшать дальше некуда.' };
    }
    newTier = currentTier === 'normal' ? 'magic' : 'rare';
    newAffixes = rollAffixSet(slot, itemLevel, affixCountForTier(newTier));
  } else if (currencyId === 'tornak_seal') {
    if (currentTier !== 'rare') {
      return { ok: false, error: 'Печать Торнака работает только на редких предметах.' };
    }
    if (currentAffixes.length >= 4) {
      return { ok: false, error: 'На предмете уже максимум свойств.' };
    }
    const usedKeys = new Set(currentAffixes.map(a => a.statKey));
    const prefixCount = currentAffixes.filter(a => a.kind === 'prefix').length;
    const suffixCount = currentAffixes.filter(a => a.kind === 'suffix').length;
    let wantKind: 'prefix' | 'suffix' = prefixCount <= suffixCount ? 'prefix' : 'suffix';
    let pool = eligibleAffixes(slot, wantKind, itemLevel, usedKeys);
    if (pool.length === 0) {
      wantKind = wantKind === 'prefix' ? 'suffix' : 'prefix';
      pool = eligibleAffixes(slot, wantKind, itemLevel, usedKeys);
    }
    if (pool.length === 0) {
      return { ok: false, error: 'Не осталось доступных свойств для этого предмета.' };
    }
    const def = pool[Math.floor(Math.random() * pool.length)];
    newAffixes = [...currentAffixes, rollOneAffix(def, itemLevel)];
  } else {
    // kessara_whisper — рискованная полная переброска: перебрасывает всё заново и с
    // небольшим шансом добавляет пятый, сверхкомплектный аффикс. В любом исходе предмет
    // становится осквернённым — дальнейший крафт на нём больше недоступен (как Vaal Orb).
    const rerolled = rollAffixSet(slot, itemLevel, Math.max(currentAffixes.length, 3));
    const bonusProc = Math.random() < 0.15;
    if (bonusProc) {
      const usedKeys = new Set(rerolled.map(a => a.statKey));
      const bonus = rollAffixSet(slot, itemLevel, 1).filter(a => !usedKeys.has(a.statKey));
      newAffixes = [...rerolled, ...bonus];
    } else {
      newAffixes = rerolled;
    }
    newTier = 'corrupted';
  }

  return {
    ok: true,
    name: nameWithAffixes(baseNameRu, newAffixes),
    stats: mergeStats(baseStats, newAffixes),
    affixTier: newTier,
    affixes: newAffixes,
  };
}

// ===== МАСТЕРСКАЯ ЗАЧАРОВАНИЯ (премиум, api/craft/enchant) =====
// В отличие от applyCurrency('ash_shard', ...) выше, который перебрасывает ВСЕ аффиксы
// предмета разом, здесь перебрасывается только ОДНО ЗНАЧЕНИЕ выбранного аффикса — какой это
// стат, не меняется, только его сила. Платится не крафт-валютой с дропа, а Осколками Короны
// (премиум-валюта). Рискованно: значение может как вырасти, так и упасть — не гарантированное
// улучшение, а азартная переброска, поэтому и цена растёт с каждым разом на одном предмете
// (см. enchantCostForReroll) — иначе можно было бы бесконечно фармить идеальный ролл.
export const ENCHANT_BASE_COST_BY_TIER: Record<string, number> = {
  magic: 100,
  rare: 200,
};
export const ENCHANT_COST_STEP = 100;

export function enchantCostForReroll(tier: AffixTierName, rerollsSoFar: number): number | null {
  const base = ENCHANT_BASE_COST_BY_TIER[tier];
  if (base === undefined) return null;
  return base + ENCHANT_COST_STEP * Math.max(0, rerollsSoFar);
}

export type SingleRerollResult =
  | { ok: true; name: string; stats: Record<string, number>; affixes: RolledAffix[]; delta: number }
  | { ok: false; error: string };

/** Меняет ЗНАЧЕНИЕ одного аффикса по индексу — какой это стат, не трогает, только силу.
 * Дельта случайна и по знаку, и по величине (≈±30% от текущего значения, минимум ±1) — может
 * как улучшить характеристику, так и ухудшить, пол — 1 (бонус не уходит в 0 или в минус).
 * Остальные аффиксы предмета не затрагиваются. */
export function rerollSingleAffix(
  baseNameRu: string,
  baseStats: Record<string, number>,
  currentTier: AffixTierName,
  currentAffixes: RolledAffix[],
  affixIndex: number
): SingleRerollResult {
  if (currentTier === 'corrupted') {
    return { ok: false, error: 'Осквернённый предмет больше нельзя изменять.' };
  }
  if (affixIndex < 0 || affixIndex >= currentAffixes.length) {
    return { ok: false, error: 'Такого свойства нет на предмете.' };
  }
  const target = currentAffixes[affixIndex];
  const magnitude = Math.max(1, Math.round(target.value * 0.3));
  const delta = Math.floor(Math.random() * (2 * magnitude + 1)) - magnitude;
  const newValue = Math.max(1, target.value + delta);
  const newAffix: RolledAffix = { ...target, value: newValue };
  const newAffixes = currentAffixes.map((a, i) => (i === affixIndex ? newAffix : a));

  return {
    ok: true,
    name: nameWithAffixes(baseNameRu, newAffixes),
    stats: mergeStats(baseStats, newAffixes),
    affixes: newAffixes,
    delta: newValue - target.value,
  };
}

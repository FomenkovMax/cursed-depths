/**
 * Магазин "Торговый двор" (локация market). Текст локации явно обещает
 * ("Уцелевшие торговцы предлагают снаряжение тем немногим, кто ещё решается
 * выйти за стены") продажу снаряжения, но до этого модуля никакого /api/shop
 * не существовало вообще — предметы можно было получить только с дропа/крафта,
 * а поле value у каждого Item (game-data.ts) нигде не читалось.
 *
 * Ассортимент на продажу: снаряжение редкости common/uncommon + ЛЮБЫЕ
 * расходники (зелья/свитки/эликсиры — обычный товар любого торговца, не
 * влияет на итемизацию). Уцелевшие торговцы намеренно не продают
 * rare+ снаряжение — иначе магазин обесценивал бы прогрессию через
 * исследование/боссов чистым золотом. Материалы не продаются (должны
 * добываться для крафта) и не покупаются. Квестовые предметы (value: 0)
 * не участвуют в магазине вообще.
 *
 * Продать игрок может что угодно, кроме квестовых предметов, материалов и
 * того, что сейчас надето — по половине заявленной цены (value).
 */

import { ITEMS, type Item } from '@/lib/game-data';

export const SHOP_SELL_MULTIPLIER = 0.5;

/** Ассортимент магазина — снаряжение common/uncommon + все расходники. */
export function getShopBuyableItems(): Item[] {
  return ITEMS.filter(i =>
    i.type !== 'quest' && i.type !== 'material' &&
    (i.type === 'consumable' || i.rarity === 'common' || i.rarity === 'uncommon')
  );
}

/** Можно ли продать предмет с данным itemId магазину (всё, кроме квестовых и материалов —
 * материалы не продаются симметрично тому, что и не покупаются, см. заголовок файла). */
export function isSellableItem(itemId: string): boolean {
  const itemData = ITEMS.find(i => i.id === itemId);
  return !!itemData && itemData.type !== 'quest' && itemData.type !== 'material';
}

/** Цена продажи магазину — половина базовой стоимости (округление вниз). */
export function getSellPrice(itemId: string): number {
  const itemData = ITEMS.find(i => i.id === itemId);
  if (!itemData) return 0;
  return Math.floor(itemData.value * SHOP_SELL_MULTIPLIER);
}

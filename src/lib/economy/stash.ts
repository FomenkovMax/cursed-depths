/** Хранилище (сундук) — см. schema.prisma StashItem. Ограничение слотов — не техническое, а
 * осмысленный игровой выбор ("что стоит сохранить"), матчит просьбу "инвентарь (сундуки), где
 * они могут что-то коллекционировать" отдельно от рабочего боевого инвентаря. */
export const STASH_CAPACITY = 60;

/** База + накопленные покупки "Расширение хранилища" (lib/premium-shop.ts, Player.stashCapacityBonus). */
export function effectiveStashCapacity(stashCapacityBonus: number): number {
  return STASH_CAPACITY + stashCapacityBonus;
}

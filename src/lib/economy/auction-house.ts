/**
 * Аукционный дом — премиум-эксклюзивная альтернатива мгновенному Рынку (lib/market не существует
 * отдельно — вся его логика в api/market/*): отложенные ставки вместо мгновенной покупки. Голд
 * бидера удерживается СРАЗУ при ставке (decrement), возвращается при перебитии (increment) — при
 * закрытии лота удержанный голд просто становится выплатой продавцу, повторного списания не
 * требуется. Закрытие — ленивое, тот же паттерн, что resolveFortressCycleIfNeeded в lib/fortress.ts:
 * каждый GET резолвит просроченные лоты перед ответом, никакой cron-инфраструктуры не нужно.
 */

import { addItemToInventory } from '@/lib/economy/inventory-utils';
import { db } from '@/lib/db';

export const AUCTION_FEE_PERCENT = 0.1; // тот же процент, что и у мгновенного Рынка (market/buy)
export const MAX_ACTIVE_AUCTIONS = 5; // отдельный от Рынка (10) лимит — премиум-фича скромнее
export const MIN_BID_INCREMENT_PERCENT = 0.05; // следующая ставка минимум на 5% выше текущей

export interface AuctionDuration {
  hours: number;
  labelRu: string;
}

export const AUCTION_DURATIONS: AuctionDuration[] = [
  { hours: 6, labelRu: '6 часов' },
  { hours: 24, labelRu: '24 часа' },
  { hours: 72, labelRu: '3 дня' },
];

type AuctionRow = { startingPrice: number; currentBid: number | null };

/** Минимальная сумма следующей ставки — стартовая цена, если ставок ещё не было, иначе текущая
 * ставка + минимум 5%, округлённые вверх, чтобы шаг всегда был хотя бы в 1 золото. */
export function minNextBid(auction: AuctionRow): number {
  if (auction.currentBid === null) return auction.startingPrice;
  return auction.currentBid + Math.max(1, Math.ceil(auction.currentBid * MIN_BID_INCREMENT_PERCENT));
}

type PrismaClientLike = {
  auction: typeof db.auction;
  player: typeof db.player;
  inventory: typeof db.inventory;
  playerQuest: typeof db.playerQuest;
};

/** Резолвит один просроченный лот: если была ставка — платит продавцу (минус комиссия) и отдаёт
 * предмет победителю (голд победителя уже удержан при ставке, второй раз не списывается); если
 * ставок не было — просто возвращает предмет продавцу. Строка лота удаляется в обоих случаях. */
async function resolveExpiredAuction(tx: PrismaClientLike, auction: {
  id: string; sellerId: string; itemId: string; name: string; type: string; rarity: string;
  stats: string | null; icon: string | null; itemLevel: number | null; affixTier: string | null;
  affixes: string | null; enhancementLevel: number; quantity: number;
  currentBid: number | null; currentBidderId: string | null;
}) {
  const recipientId = auction.currentBidderId ?? auction.sellerId;

  if (auction.currentBidderId && auction.currentBid !== null) {
    const payout = Math.round(auction.currentBid * (1 - AUCTION_FEE_PERCENT));
    await tx.player.update({ where: { id: auction.sellerId }, data: { gold: { increment: payout } } });
  }

  await addItemToInventory({
    playerId: recipientId,
    itemId: auction.itemId,
    name: auction.name,
    type: auction.type,
    rarity: auction.rarity,
    stats: auction.stats,
    icon: auction.icon,
    quantity: auction.quantity,
    itemLevel: auction.itemLevel,
    affixTier: auction.affixTier,
    affixes: auction.affixes,
    enhancementLevel: auction.enhancementLevel,
  }, tx);

  await tx.auction.delete({ where: { id: auction.id } });
}

/** Находит все просроченные лоты и резолвит их по одному в отдельных транзакциях — вызывается на
 * каждый GET перед ответом (тот же принцип "лениво на чтение", что у Крепости/сезонных наград). */
export async function resolveExpiredAuctionsIfNeeded(client: typeof db) {
  const expired = await client.auction.findMany({ where: { expiresAt: { lte: new Date() } } });
  for (const auction of expired) {
    try {
      await client.$transaction(async (tx) => resolveExpiredAuction(tx, auction));
    } catch {
      // Гонка: другой параллельный запрос уже резолвил этот же лот — просто пропускаем.
    }
  }
}

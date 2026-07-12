import { describe, it, expect } from 'vitest';
import { minNextBid, AUCTION_FEE_PERCENT, MIN_BID_INCREMENT_PERCENT } from './auction-house';

describe('minNextBid', () => {
  it('is the starting price when no bid has been placed yet', () => {
    expect(minNextBid({ startingPrice: 100, currentBid: null })).toBe(100);
  });

  it('is at least MIN_BID_INCREMENT_PERCENT above the current bid', () => {
    const min = minNextBid({ startingPrice: 100, currentBid: 200 });
    expect(min).toBeGreaterThanOrEqual(200 * (1 + MIN_BID_INCREMENT_PERCENT));
  });

  it('always requires a strictly higher bid, even at a tiny current bid', () => {
    // ceil() floor guarantees at least +1 gold even when 5% of the bid rounds to 0
    expect(minNextBid({ startingPrice: 1, currentBid: 1 })).toBeGreaterThan(1);
  });

  it('the 5%-increment case computes exactly (100 -> 105)', () => {
    expect(minNextBid({ startingPrice: 1, currentBid: 100 })).toBe(105);
  });
});

describe('auction fee sanity', () => {
  it('fee percent is a fraction between 0 and 1, never eating the whole payout', () => {
    expect(AUCTION_FEE_PERCENT).toBeGreaterThan(0);
    expect(AUCTION_FEE_PERCENT).toBeLessThan(1);
  });
});

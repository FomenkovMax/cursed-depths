import { describe, it, expect } from 'vitest';
import { currentPvpSeasonId, previousPvpSeasonId, daysUntilPvpSeasonEnd, softResetRating, PVP_SEASON_LENGTH_DAYS } from './pvp-season';

describe('currentPvpSeasonId / previousPvpSeasonId', () => {
  it('advances to the next season exactly PVP_SEASON_LENGTH_DAYS after the previous one started', () => {
    const start = new Date('2026-01-05T00:00:00Z'); // season epoch
    const seasonAtStart = currentPvpSeasonId(start);

    const justBeforeRollover = new Date(start.getTime() + (PVP_SEASON_LENGTH_DAYS * 24 * 60 * 60 * 1000) - 1000);
    expect(currentPvpSeasonId(justBeforeRollover)).toBe(seasonAtStart);

    const atRollover = new Date(start.getTime() + PVP_SEASON_LENGTH_DAYS * 24 * 60 * 60 * 1000);
    expect(currentPvpSeasonId(atRollover)).not.toBe(seasonAtStart);
  });

  it('previousPvpSeasonId is always the season immediately before the current one', () => {
    const now = new Date('2026-07-12T00:00:00Z');
    const current = currentPvpSeasonId(now);
    const previous = previousPvpSeasonId(now);
    expect(previous).not.toBe(current);

    // Advancing to the start of a fresh season should make the OLD "current" become "previous".
    const nextSeasonStart = new Date(now.getTime() + PVP_SEASON_LENGTH_DAYS * 24 * 60 * 60 * 1000);
    expect(previousPvpSeasonId(nextSeasonStart)).toBe(current);
  });

  it('never returns a negative season number, even for dates before the epoch', () => {
    const wayBefore = new Date('2000-01-01T00:00:00Z');
    expect(currentPvpSeasonId(wayBefore)).toBe('PVP-S0');
    expect(previousPvpSeasonId(wayBefore)).toBe('PVP-S0');
  });
});

describe('daysUntilPvpSeasonEnd', () => {
  it('counts down from PVP_SEASON_LENGTH_DAYS to a small remainder within a season', () => {
    const start = new Date('2026-01-05T00:00:00Z');
    expect(daysUntilPvpSeasonEnd(start)).toBe(PVP_SEASON_LENGTH_DAYS);

    const oneDayLater = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    expect(daysUntilPvpSeasonEnd(oneDayLater)).toBe(PVP_SEASON_LENGTH_DAYS - 1);
  });

  it('resets to the full season length right at a season boundary', () => {
    const start = new Date('2026-01-05T00:00:00Z');
    const nextSeasonStart = new Date(start.getTime() + PVP_SEASON_LENGTH_DAYS * 24 * 60 * 60 * 1000);
    expect(daysUntilPvpSeasonEnd(nextSeasonStart)).toBe(PVP_SEASON_LENGTH_DAYS);
  });
});

describe('softResetRating', () => {
  it('leaves the 1000 baseline untouched', () => {
    expect(softResetRating(1000)).toBe(1000);
  });

  it('compresses a high rating toward the baseline, keeping only a fraction of the gap', () => {
    const compressed = softResetRating(1600);
    expect(compressed).toBeLessThan(1600);
    expect(compressed).toBeGreaterThan(1000);
  });

  it('compresses a low rating upward toward the baseline symmetrically', () => {
    const compressed = softResetRating(400);
    expect(compressed).toBeGreaterThan(400);
    expect(compressed).toBeLessThan(1000);
  });

  it('never drops below the minimum rating floor', () => {
    expect(softResetRating(100)).toBeGreaterThanOrEqual(100);
    expect(softResetRating(0)).toBeGreaterThanOrEqual(100);
  });

  it('rewards a higher pre-reset rating with a higher post-reset rating (order-preserving)', () => {
    const lower = softResetRating(1200);
    const higher = softResetRating(1500);
    expect(higher).toBeGreaterThan(lower);
  });
});

import { describe, it, expect } from 'vitest';
import { streakDayInCycle, computeNextStreak, shouldConsumeStreakFreeze, MAX_STREAK_FREEZES, STREAK_MULTIPLIERS, STREAK_CYCLE_LENGTH } from './daily-streak';

describe('streakDayInCycle', () => {
  it('maps streak 1-7 directly to cycle days 1-7', () => {
    for (let s = 1; s <= 7; s++) {
      expect(streakDayInCycle(s)).toBe(s);
    }
  });

  it('wraps back to day 1 on day 8, restarting the cycle', () => {
    expect(streakDayInCycle(8)).toBe(1);
    expect(streakDayInCycle(9)).toBe(2);
  });

  it('every cycle day has a defined multiplier', () => {
    for (let d = 1; d <= STREAK_CYCLE_LENGTH; d++) {
      expect(STREAK_MULTIPLIERS[d]).toBeGreaterThan(0);
    }
  });

  it('multipliers strictly increase across the cycle', () => {
    for (let d = 2; d <= STREAK_CYCLE_LENGTH; d++) {
      expect(STREAK_MULTIPLIERS[d]).toBeGreaterThan(STREAK_MULTIPLIERS[d - 1]);
    }
  });
});

describe('computeNextStreak', () => {
  it('starts at 1 on the very first claim ever (null last claim)', () => {
    expect(computeNextStreak(null, 0, '2026-07-13')).toBe(1);
  });

  it('increments when the last claim was exactly yesterday', () => {
    expect(computeNextStreak('2026-07-12', 3, '2026-07-13')).toBe(4);
  });

  it('resets to 1 when a day was skipped', () => {
    expect(computeNextStreak('2026-07-10', 5, '2026-07-13')).toBe(1);
  });

  it('resets to 1 when the gap is exactly two days (still a skip)', () => {
    expect(computeNextStreak('2026-07-11', 5, '2026-07-13')).toBe(1);
  });

  it('handles month boundaries correctly when computing "yesterday"', () => {
    expect(computeNextStreak('2026-06-30', 6, '2026-07-01')).toBe(7);
  });
});

describe('shouldConsumeStreakFreeze (Wave 2A, п.46)', () => {
  it('consumes a freeze when exactly one day was skipped and freezes are available', () => {
    expect(shouldConsumeStreakFreeze('2026-07-11', '2026-07-13', 1)).toBe(true);
  });

  it('does not consume a freeze when none are available', () => {
    expect(shouldConsumeStreakFreeze('2026-07-11', '2026-07-13', 0)).toBe(false);
  });

  it('does not consume a freeze when the last claim was yesterday (no gap to bridge)', () => {
    expect(shouldConsumeStreakFreeze('2026-07-12', '2026-07-13', 2)).toBe(false);
  });

  it('does not consume a freeze when the gap is two or more days (freeze covers exactly one missed day)', () => {
    expect(shouldConsumeStreakFreeze('2026-07-10', '2026-07-13', 3)).toBe(false);
  });

  it('does not consume a freeze on the very first claim ever (null last claim)', () => {
    expect(shouldConsumeStreakFreeze(null, '2026-07-13', 2)).toBe(false);
  });

  it('handles month boundaries correctly when computing "two days ago"', () => {
    expect(shouldConsumeStreakFreeze('2026-06-29', '2026-07-01', 1)).toBe(true);
  });

  it('MAX_STREAK_FREEZES is a small positive cap, not unlimited', () => {
    expect(MAX_STREAK_FREEZES).toBeGreaterThan(0);
    expect(MAX_STREAK_FREEZES).toBeLessThanOrEqual(5);
  });
});

import { describe, it, expect } from 'vitest';
import { totalRespecBudget, validateRespecAllocations, RESPEC_STAT_FIELDS, type RespecStatField } from './respec';

const raceBase: Record<RespecStatField, number> = {
  strength: 10, dexterity: 10, vitality: 10, intellect: 10, willpower: 10, instinct: 10,
};

describe('totalRespecBudget', () => {
  it('sums unspent statPoints with already-invested points across all stats', () => {
    const currentStats: Record<RespecStatField, number> = {
      strength: 15, dexterity: 10, vitality: 12, intellect: 10, willpower: 10, instinct: 10,
    };
    // 5 in strength + 2 in vitality already spent, plus 3 unspent = 10 total ever granted.
    expect(totalRespecBudget(3, currentStats, raceBase)).toBe(10);
  });

  it('never counts a stat below its race base as negative spend (e.g. after a race change lowered a base)', () => {
    const currentStats: Record<RespecStatField, number> = {
      strength: 8, dexterity: 10, vitality: 10, intellect: 10, willpower: 10, instinct: 10,
    };
    expect(totalRespecBudget(0, currentStats, raceBase)).toBe(0);
  });
});

describe('validateRespecAllocations', () => {
  const zero = (): Record<RespecStatField, number> => {
    const out = {} as Record<RespecStatField, number>;
    for (const f of RESPEC_STAT_FIELDS) out[f] = 0;
    return out;
  };

  it('accepts a balanced distribution within budget', () => {
    const allocations = { ...zero(), strength: 3, vitality: 3, dexterity: 2 };
    expect(validateRespecAllocations(allocations, 10)).toBeNull();
  });

  it('rejects spending more than the budget', () => {
    const allocations = { ...zero(), strength: 11 };
    expect(validateRespecAllocations(allocations, 10)).not.toBeNull();
  });

  it('rejects more than 60% of allocated points in a single stat', () => {
    // 7 of 10 allocated points in one stat = 70%, over the 60% cap.
    const allocations = { ...zero(), strength: 7, vitality: 3 };
    expect(validateRespecAllocations(allocations, 10)).not.toBeNull();
  });

  it('allows saving the whole budget unspent (all zeros)', () => {
    expect(validateRespecAllocations(zero(), 10)).toBeNull();
  });

  it('rejects negative or non-integer allocations', () => {
    const allocations = { ...zero(), strength: -1 };
    expect(validateRespecAllocations(allocations, 10)).not.toBeNull();
    const fractional = { ...zero(), strength: 1.5 };
    expect(validateRespecAllocations(fractional, 10)).not.toBeNull();
  });
});

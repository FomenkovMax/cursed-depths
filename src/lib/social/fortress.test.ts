import { describe, it, expect } from 'vitest';
import { currentWeekId, assaultPoints } from './fortress';

describe('currentWeekId', () => {
  it('formats as ISO year-week, e.g. 2026-W28', () => {
    // 2026-07-12 falls in ISO week 28 of 2026
    expect(currentWeekId(new Date('2026-07-12T12:00:00Z'))).toBe('2026-W28');
  });

  it('is stable across every day within the same ISO week', () => {
    const monday = currentWeekId(new Date('2026-07-06T00:00:00Z'));
    const sunday = currentWeekId(new Date('2026-07-12T23:59:59Z'));
    expect(monday).toBe(sunday);
  });

  it('changes when the ISO week rolls over', () => {
    const thisWeek = currentWeekId(new Date('2026-07-12T00:00:00Z'));
    const nextWeek = currentWeekId(new Date('2026-07-13T00:00:00Z'));
    expect(nextWeek).not.toBe(thisWeek);
  });

  it('handles the year boundary correctly (Dec 31 can belong to next year\'s week 1)', () => {
    // 2025-12-31 is a Wednesday, ISO week 1 of 2026
    expect(currentWeekId(new Date('2025-12-31T12:00:00Z'))).toBe('2026-W01');
  });
});

describe('assaultPoints', () => {
  it('mirrors basicAttackDamage plus a flat weapon bonus', () => {
    const stats = { strength: 10, dexterity: 10, vitality: 10, intellect: 10, willpower: 10, instinct: 10, level: 1, primaryStat: 'Сила' };
    expect(assaultPoints(stats, 5)).toBe(10 * 2 + 1 * 3 + 5);
  });
});

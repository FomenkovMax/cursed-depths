import { describe, it, expect, vi, afterEach } from 'vitest';
import { rollStatCheck, type CheckStats } from './exploration-events';

const STATS: CheckStats = { strength: 10, dexterity: 14, vitality: 8, intellect: 12, willpower: 6, instinct: 20 };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('rollStatCheck', () => {
  it('modifier is floor(stat/2), the D&D-style half-scaling modifier', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // roll = 1
    const r = rollStatCheck('instinct', STATS, 15);
    expect(r.modifier).toBe(10); // floor(20/2)
    expect(r.roll).toBe(1);
    expect(r.total).toBe(11);
  });

  it('succeeds exactly when roll+modifier >= dc, not >', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // roll = 11
    const r = rollStatCheck('dexterity', STATS, 18); // modifier floor(14/2)=7, total=18
    expect(r.total).toBe(18);
    expect(r.success).toBe(true);
  });

  it('fails when total is one short of the DC', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // roll = 11
    const r = rollStatCheck('dexterity', STATS, 19); // total=18, dc=19
    expect(r.success).toBe(false);
  });

  it('roll is always an integer in [1, 20]', () => {
    for (const rand of [0, 0.049999, 0.99999]) {
      vi.spyOn(Math, 'random').mockReturnValue(rand);
      const r = rollStatCheck('strength', STATS, 10);
      expect(r.roll).toBeGreaterThanOrEqual(1);
      expect(r.roll).toBeLessThanOrEqual(20);
      expect(Number.isInteger(r.roll)).toBe(true);
    }
  });

  it('labels the checked stat in Russian for display', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollStatCheck('willpower', STATS, 10).statLabel).toBe('Воля');
  });
});

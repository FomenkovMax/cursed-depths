import { describe, it, expect, vi, afterEach } from 'vitest';
import { rollStatCheck, resolveEventChoice, EXPLORATION_EVENTS, type CheckStats } from './exploration-events';

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

describe('EXPLORATION_EVENTS pool integrity', () => {
  it('every choice of every event resolves to a non-null EventResolution — catches an event added without a matching resolveEventChoice case', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    for (const event of EXPLORATION_EVENTS) {
      for (const choice of event.choices) {
        const resolution = resolveEventChoice(event.id, choice.id, 5, STATS);
        expect(resolution, `${event.id}:${choice.id} should resolve`).not.toBeNull();
      }
    }
  });
});

describe('resolveEventChoice — new branching check events (audit 3, C3)', () => {
  it('crumbling_bridge:cross uses a Vitality check — the only stat with no prior check coverage', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // near-max roll, succeeds
    const resolution = resolveEventChoice('crumbling_bridge', 'cross', 5, STATS)!;
    expect(resolution.checkResult?.statLabel).toBe('Стойкость');
    expect(resolution.checkResult?.success).toBe(true);
    expect(resolution.goldDelta).toBeGreaterThan(0);
  });

  it('crumbling_bridge:cross on failure costs HP, not gold', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // roll = 1, guaranteed failure at DC 13
    const resolution = resolveEventChoice('crumbling_bridge', 'cross', 5, STATS)!;
    expect(resolution.checkResult?.success).toBe(false);
    expect(resolution.hpDeltaPercent).toBeLessThan(0);
    expect(resolution.goldDelta).toBe(0);
  });

  it('every new event has a safe fallback choice with no checkResult', () => {
    const safeChoices: [string, string][] = [
      ['crumbling_bridge', 'around'],
      ['whispering_well', 'ignore'],
      ['bound_prisoner', 'leave'],
      ['frozen_shrine', 'ignore'],
      ['collapsed_tunnel', 'leave'],
    ];
    for (const [eventId, choiceId] of safeChoices) {
      const resolution = resolveEventChoice(eventId, choiceId, 5, STATS)!;
      expect(resolution.checkResult).toBeUndefined();
      expect(resolution.startCombat).toBe(false);
    }
  });

  it('market_thief:shrug always costs gold with no dice roll involved', () => {
    const resolution = resolveEventChoice('market_thief', 'shrug', 5, STATS)!;
    expect(resolution.goldDelta).toBeLessThan(0);
    expect(resolution.checkResult).toBeUndefined();
  });

  it('an unknown event/choice pair returns null', () => {
    expect(resolveEventChoice('not_a_real_event', 'nope', 5, STATS)).toBeNull();
  });
});

describe('resolveEventChoice — natural 1 escalates to an ambush (Wave 2A, п.19)', () => {
  it('a failed check on a natural 1 (roll=1) sets startCombat, on top of the normal failure penalty', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // roll = 1, guaranteed failure at DC 12
    const resolution = resolveEventChoice('old_chest', 'open', 5, STATS)!;
    expect(resolution.checkResult?.roll).toBe(1);
    expect(resolution.checkResult?.success).toBe(false);
    expect(resolution.startCombat).toBe(true);
    expect(resolution.hpDeltaPercent).toBeLessThan(0); // the original penalty still applies too
  });

  it('a failed check on a roll above 1 does NOT escalate to combat', () => {
    // roll = 2: Math.random() = 1/20 = 0.05 gives Math.floor(0.05*20) = 1, so roll = 1+1 = 2
    vi.spyOn(Math, 'random').mockReturnValue(0.05);
    const resolution = resolveEventChoice('old_chest', 'open', 5, STATS)!;
    expect(resolution.checkResult?.roll).toBe(2);
    expect(resolution.checkResult?.success).toBe(false);
    expect(resolution.startCombat).toBe(false);
  });

  it('an event that already starts combat on failure (sleeping_guardian:sneak) is not double-escalated or re-labeled', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // roll = 1
    const resolution = resolveEventChoice('sleeping_guardian', 'sneak', 5, STATS)!;
    expect(resolution.checkResult?.roll).toBe(1);
    expect(resolution.startCombat).toBe(true);
    expect(resolution.message).not.toContain('А на шум из темноты выходит кое-кто ещё');
  });
});

import { describe, it, expect } from 'vitest';
import { pickWeeklyEnemy, simulateWeeklyChallenge, type WeeklyChallengeCombatant } from './weekly-challenge';

function makeCombatant(overrides: Partial<WeeklyChallengeCombatant> = {}): WeeklyChallengeCombatant {
  return {
    playerId: 'p1',
    name: 'Тестовый искатель',
    stats: { strength: 10, dexterity: 10, vitality: 10, intellect: 10, willpower: 10, instinct: 10, level: 1, primaryStat: 'Сила' },
    maxHp: 100,
    maxMp: 100,
    weaponBonus: 0,
    armorBonus: 0,
    abilities: [],
    ...overrides,
  };
}

describe('pickWeeklyEnemy', () => {
  it('is deterministic — same weekId always picks the same boss', () => {
    const a = pickWeeklyEnemy('2026-W29');
    const b = pickWeeklyEnemy('2026-W29');
    expect(a.id).toBe(b.id);
  });

  it('only picks boss-tier enemies', () => {
    for (const weekId of ['2026-W01', '2026-W15', '2026-W29', '2026-W52']) {
      expect(pickWeeklyEnemy(weekId).isBoss).toBe(true);
    }
  });

  it('varies across different weeks (not always the same boss)', () => {
    const picks = new Set(
      Array.from({ length: 20 }, (_, i) => pickWeeklyEnemy(`2026-W${i + 1}`).id),
    );
    expect(picks.size).toBeGreaterThan(1);
  });
});

describe('simulateWeeklyChallenge', () => {
  it('a very strong player reliably beats a weak boss', () => {
    const strongPlayer = makeCombatant({
      stats: { strength: 50, dexterity: 50, vitality: 50, intellect: 50, willpower: 50, instinct: 50, level: 30, primaryStat: 'Сила' },
      maxHp: 2000,
      weaponBonus: 100,
    });
    const weakBoss = pickWeeklyEnemy('2026-W01');
    const result = simulateWeeklyChallenge(strongPlayer, weakBoss);
    expect(result.won).toBe(true);
    expect(result.hpPercentRemaining).toBeGreaterThan(0);
  });

  it('a very weak player reliably loses to any boss', () => {
    const weakPlayer = makeCombatant({
      stats: { strength: 1, dexterity: 1, vitality: 1, intellect: 1, willpower: 1, instinct: 1, level: 1, primaryStat: 'Сила' },
      maxHp: 5,
    });
    const boss = pickWeeklyEnemy('2026-W01');
    const result = simulateWeeklyChallenge(weakPlayer, boss);
    expect(result.won).toBe(false);
    expect(result.hpPercentRemaining).toBe(0);
  });

  it('always terminates within the turn cap and produces a non-empty log', () => {
    const player = makeCombatant();
    const boss = pickWeeklyEnemy('2026-W10');
    const result = simulateWeeklyChallenge(player, boss);
    expect(result.turnsTaken).toBeGreaterThan(0);
    expect(result.turnsTaken).toBeLessThanOrEqual(40);
    expect(result.log.length).toBeGreaterThan(1);
  });

  it('hpPercentRemaining is always within 0-100', () => {
    const player = makeCombatant();
    const boss = pickWeeklyEnemy('2026-W20');
    const result = simulateWeeklyChallenge(player, boss);
    expect(result.hpPercentRemaining).toBeGreaterThanOrEqual(0);
    expect(result.hpPercentRemaining).toBeLessThanOrEqual(100);
  });
});

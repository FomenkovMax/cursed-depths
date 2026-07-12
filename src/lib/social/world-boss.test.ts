import { describe, it, expect } from 'vitest';
import { dailyAttackCapFor, maxHpForIncarnation, rewardForShare, DAILY_ATTACK_CAP, PREMIUM_DAILY_ATTACK_CAP } from './world-boss';

describe('dailyAttackCapFor', () => {
  it('gives premium players strictly more daily attempts than free players', () => {
    expect(dailyAttackCapFor(true)).toBe(PREMIUM_DAILY_ATTACK_CAP);
    expect(dailyAttackCapFor(false)).toBe(DAILY_ATTACK_CAP);
    expect(PREMIUM_DAILY_ATTACK_CAP).toBeGreaterThan(DAILY_ATTACK_CAP);
  });
});

describe('maxHpForIncarnation', () => {
  it('grows each incarnation so the boss never gets easier after a kill', () => {
    const hp1 = maxHpForIncarnation(1);
    const hp2 = maxHpForIncarnation(2);
    const hp10 = maxHpForIncarnation(10);
    expect(hp2).toBeGreaterThan(hp1);
    expect(hp10).toBeGreaterThan(hp2);
  });
});

describe('rewardForShare', () => {
  it('scales reward with damage share', () => {
    const full = rewardForShare(1);
    const tenth = rewardForShare(0.1);
    expect(full.gold).toBeGreaterThan(tenth.gold);
  });

  it('never rewards a contributor with 0 — every hit matters', () => {
    const reward = rewardForShare(0.0001);
    expect(reward.gold).toBeGreaterThan(0);
    expect(reward.xp).toBeGreaterThan(0);
  });
});

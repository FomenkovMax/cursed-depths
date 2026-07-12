import { describe, it, expect } from 'vitest';
import { maxHpForGuild, rewardForRaidShare, RAID_BOSS_DAILY_ATTACK_CAP } from './guild-raid-boss';

describe('maxHpForGuild', () => {
  it('scales up with member count so a 30-person guild fights a tougher boss than a 3-person one', () => {
    const small = maxHpForGuild(3);
    const large = maxHpForGuild(30);
    expect(large).toBeGreaterThan(small);
  });

  it('each additional member adds the same fixed HP increment (base + per-member*count)', () => {
    const step1 = maxHpForGuild(2) - maxHpForGuild(1);
    const step2 = maxHpForGuild(11) - maxHpForGuild(10);
    expect(step1).toBe(step2);
  });

  it('never drops below the single-member floor, even for a 0-member edge case', () => {
    expect(maxHpForGuild(0)).toBe(maxHpForGuild(1));
  });
});

describe('rewardForRaidShare', () => {
  it('gives the full kill reward to a 100% damage share', () => {
    const full = rewardForRaidShare(1);
    const half = rewardForRaidShare(0.5);
    expect(full.gold).toBeGreaterThan(half.gold);
    expect(full.xp).toBeGreaterThan(half.xp);
  });

  it('floors reward at a minimum even for a near-zero contribution — participation is never worthless', () => {
    const reward = rewardForRaidShare(0.001);
    expect(reward.gold).toBeGreaterThan(0);
    expect(reward.xp).toBeGreaterThan(0);
  });
});

describe('RAID_BOSS_DAILY_ATTACK_CAP', () => {
  it('is a small positive number of attempts', () => {
    expect(RAID_BOSS_DAILY_ATTACK_CAP).toBeGreaterThan(0);
    expect(RAID_BOSS_DAILY_ATTACK_CAP).toBeLessThan(10);
  });
});

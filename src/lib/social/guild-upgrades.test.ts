import { describe, it, expect } from 'vitest';
import { GUILD_UPGRADES, guildGoldMultBonus, guildXpMultBonus, canUnlockGuildUpgrade, findGuildUpgrade } from './guild-upgrades';

describe('guildGoldMultBonus / guildXpMultBonus', () => {
  it('sums bonuses only from unlocked nodes of the matching axis', () => {
    const unlocked = new Set(['forge_1', 'forge_2']);
    expect(guildGoldMultBonus(unlocked)).toBeCloseTo(0.09); // forge_1 + forge_2
    expect(guildXpMultBonus(unlocked)).toBe(0); // forge nodes don't grant xp
  });

  it('returns 0 for an empty guild (no upgrades unlocked)', () => {
    expect(guildGoldMultBonus(new Set())).toBe(0);
    expect(guildXpMultBonus(new Set())).toBe(0);
  });

  it('a fully-unlocked building sums to the total of all its tiers', () => {
    const sanctuaryIds = GUILD_UPGRADES.filter(u => u.buildingId === 'sanctuary').map(u => u.id);
    expect(guildXpMultBonus(new Set(sanctuaryIds))).toBeCloseTo(0.03 + 0.06 + 0.10);
  });
});

describe('canUnlockGuildUpgrade', () => {
  it('rejects a tier-2 node when its tier-1 prerequisite is not unlocked yet', () => {
    const def = findGuildUpgrade('forge_2')!;
    expect(canUnlockGuildUpgrade(def, new Set(), 999999)).toBe(false);
  });

  it('allows a tier-2 node once its prerequisite is unlocked and treasury covers the cost', () => {
    const def = findGuildUpgrade('forge_2')!;
    expect(canUnlockGuildUpgrade(def, new Set(['forge_1']), def.cost)).toBe(true);
  });

  it('rejects when treasury is short by even 1 gold', () => {
    const def = findGuildUpgrade('forge_1')!;
    expect(canUnlockGuildUpgrade(def, new Set(), def.cost - 1)).toBe(false);
  });

  it('rejects a node that is already unlocked, regardless of treasury', () => {
    const def = findGuildUpgrade('forge_1')!;
    expect(canUnlockGuildUpgrade(def, new Set(['forge_1']), 999999)).toBe(false);
  });
});

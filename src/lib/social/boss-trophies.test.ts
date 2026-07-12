import { describe, it, expect } from 'vitest';
import { bossEnemies, rarestBossDrop, pityCapFor, BOSS_TROPHY_LORE } from './boss-trophies';

describe('rarestBossDrop', () => {
  it('returns null for a non-boss or unknown enemy id', () => {
    expect(rarestBossDrop('nonexistent_enemy')).toBeNull();
  });

  it('picks the lowest-chance drop in a boss lootTable, not the first one', () => {
    // "Сломанная Клятва" lists several drops; the rarest is the tier-3 gauntlet blueprint (0.008),
    // not the first entry in its lootTable.
    const rarest = rarestBossDrop('broken_oath');
    expect(rarest).not.toBeNull();
    expect(rarest!.itemId).toBe('blueprint_gauntlets_broken_oath');
  });

  it('every real boss has a resolvable rarest drop', () => {
    for (const boss of bossEnemies()) {
      expect(rarestBossDrop(boss.id)).not.toBeNull();
    }
  });
});

describe('pityCapFor', () => {
  it('clamps the cap between 20 and 120 kills regardless of how extreme the underlying chance is', () => {
    for (const boss of bossEnemies()) {
      const cap = pityCapFor(boss.id);
      expect(cap).toBeGreaterThanOrEqual(20);
      expect(cap).toBeLessThanOrEqual(120);
    }
  });

  it('gives a rarer drop (lower chance) a higher or equal pity cap than a more common one', () => {
    // keeper_of_ashes' rarest drop (0.022) is far more common than first_dragon's (0.0064).
    const commonerCap = pityCapFor('keeper_of_ashes');
    const rarerCap = pityCapFor('first_dragon');
    expect(rarerCap).toBeGreaterThanOrEqual(commonerCap);
  });
});

describe('BOSS_TROPHY_LORE', () => {
  it('has lore for every boss that can drop a trophy', () => {
    for (const boss of bossEnemies()) {
      expect(BOSS_TROPHY_LORE[boss.id]).toBeTruthy();
    }
  });
});

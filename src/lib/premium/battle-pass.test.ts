import { describe, it, expect } from 'vitest';
import { battlePassXpForKill, effectiveBattlePassXp, BATTLE_PASS_TIERS } from './battle-pass';

describe('battlePassXpForKill', () => {
  it('grants 10% of enemy xp, rounded', () => {
    expect(battlePassXpForKill(70)).toBe(7);
    expect(battlePassXpForKill(1000)).toBe(100);
  });

  it('always grants at least 1 point, even for trivial enemies', () => {
    expect(battlePassXpForKill(1)).toBe(1);
    expect(battlePassXpForKill(0)).toBe(1);
  });
});

describe('effectiveBattlePassXp', () => {
  it('returns the stored xp when the stored season matches the current one', () => {
    expect(effectiveBattlePassXp('2026-07', 450, '2026-07')).toBe(450);
  });

  it('resets to 0 when the stored season is stale', () => {
    expect(effectiveBattlePassXp('2026-06', 450, '2026-07')).toBe(0);
  });

  it('resets to 0 when no season has ever been recorded', () => {
    expect(effectiveBattlePassXp(null, 0, '2026-07')).toBe(0);
  });
});

describe('BATTLE_PASS_TIERS', () => {
  it('has strictly increasing xpRequired thresholds', () => {
    for (let i = 1; i < BATTLE_PASS_TIERS.length; i++) {
      expect(BATTLE_PASS_TIERS[i].xpRequired).toBeGreaterThan(BATTLE_PASS_TIERS[i - 1].xpRequired);
    }
  });

  it('has sequential tier numbers starting at 1', () => {
    BATTLE_PASS_TIERS.forEach((t, i) => expect(t.tier).toBe(i + 1));
  });

  it('every tier grants at least one reward (gold, shards, or items)', () => {
    for (const t of BATTLE_PASS_TIERS) {
      const hasReward = !!t.reward.gold || !!t.reward.crownShards || (t.reward.items?.length ?? 0) > 0;
      expect(hasReward).toBe(true);
    }
  });

  it('keeps total season gold well below the pre-rebalance total, so it no longer stacks with the +15% premium gold multiplier into a pay-to-win-adjacent bonus', () => {
    const totalGold = BATTLE_PASS_TIERS.reduce((sum, t) => sum + (t.reward.gold ?? 0), 0);
    // Pre-rebalance total was 7800 — this guards against silently drifting back toward it.
    expect(totalGold).toBeLessThan(2000);
  });

  it('grants at least one non-currency item reward across the season (crafting materials, consumables)', () => {
    const totalItemRewards = BATTLE_PASS_TIERS.reduce((sum, t) => sum + (t.reward.items?.length ?? 0), 0);
    expect(totalItemRewards).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { pickUncollectedTome, TOME_DROP_CHANCE } from './recipe-tomes';

const ALL_SIX_RECIPES = new Set([
  'craft_cursed_king_blade', 'craft_crown_armor', 'craft_crown_fragment',
  'craft_crown_of_ash', 'craft_gauntlets_broken_oath', 'craft_boots_fallen_pillar',
]);

describe('pickUncollectedTome', () => {
  it('returns null once every recipe is already learned — nothing left to roll', () => {
    expect(pickUncollectedTome(ALL_SIX_RECIPES)).toBeNull();
  });

  it('picks among all 6 blueprints when nothing is learned yet', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const tome = pickUncollectedTome(new Set());
      if (tome) seen.add(tome.id);
    }
    expect(seen.size).toBe(6);
  });

  it('never re-offers a blueprint whose recipe is already learned', () => {
    const oneLearned = new Set(['craft_cursed_king_blade']);
    for (let i = 0; i < 200; i++) {
      const tome = pickUncollectedTome(oneLearned);
      expect(tome?.id).not.toBe('blueprint_cursed_king_blade');
    }
  });
});

describe('TOME_DROP_CHANCE', () => {
  it('is a small, deliberately rare probability (F2P odds are untouched by this system)', () => {
    expect(TOME_DROP_CHANCE).toBeGreaterThan(0);
    expect(TOME_DROP_CHANCE).toBeLessThan(0.05);
  });
});

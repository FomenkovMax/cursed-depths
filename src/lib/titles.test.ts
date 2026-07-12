import { describe, it, expect } from 'vitest';
import { TITLE_CATALOG, findTitle, isTitleUnlocked, type TitleRequirementContext } from './titles';

const ZERO_CTX: TitleRequirementContext = {
  level: 1, totalKills: 0, pvpWins: 0, pvpRating: 1000, bestAbyssDepth: 0,
  trophyCount: 0, achievementCount: 0, petCount: 0,
  everPurchasedShards: false, isGuildLeader: false, premiumActive: true,
};

describe('findTitle', () => {
  it('resolves a known id to its catalog entry', () => {
    const first = TITLE_CATALOG[0];
    expect(findTitle(first.id)?.nameRu).toBe(first.nameRu);
  });
  it('returns null for an unknown id, and for null/undefined', () => {
    expect(findTitle('does_not_exist')).toBeNull();
    expect(findTitle(null)).toBeNull();
    expect(findTitle(undefined)).toBeNull();
  });
});

describe('isTitleUnlocked', () => {
  it('is false for every non-trivial title at a fresh, all-zero player state', () => {
    for (const title of TITLE_CATALOG) {
      if (title.check(ZERO_CTX)) {
        // Only titles that require literally nothing but premium (e.g. "Голос Карсуса")
        // are allowed to be true at zero stats — everything else should be locked.
        expect(title.descriptionRu.toLowerCase()).toContain('премиум');
      }
    }
  });

  it('unlocks a level-based title once the level threshold is met', () => {
    const leveled = { ...ZERO_CTX, level: 25 };
    const legend = TITLE_CATALOG.find(t => t.id === 'ashen_legend')!;
    expect(isTitleUnlocked(legend.id, leveled)).toBe(true);
    expect(isTitleUnlocked(legend.id, ZERO_CTX)).toBe(false);
  });

  it('returns false for a title id that does not exist', () => {
    expect(isTitleUnlocked('not_a_real_title', ZERO_CTX)).toBe(false);
  });
});

describe('TITLE_CATALOG', () => {
  it('has no duplicate ids', () => {
    const ids = TITLE_CATALOG.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

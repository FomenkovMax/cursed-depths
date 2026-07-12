import { describe, it, expect } from 'vitest';
import { TRIALS, findTrial, trialForLocation } from './trials';
import { ENEMIES } from '@/lib/game-data';

describe('TRIALS data integrity', () => {
  it('every monster-type junction option and bossEnemyId references a real ENEMIES entry', () => {
    for (const trial of TRIALS) {
      expect(ENEMIES.some(e => e.id === trial.bossEnemyId), `${trial.id}: unknown bossEnemyId ${trial.bossEnemyId}`).toBe(true);
      for (const junction of trial.junctions) {
        for (const option of junction.options) {
          if (option.type === 'monster') {
            expect(ENEMIES.some(e => e.id === option.enemyId), `${trial.id}: unknown enemyId ${option.enemyId}`).toBe(true);
          }
        }
      }
    }
  });

  it('locationId is unique per trial — trialForLocation must resolve unambiguously', () => {
    const locationIds = TRIALS.map(t => t.locationId);
    expect(new Set(locationIds).size).toBe(locationIds.length);
  });
});

describe('quick_ashen_gauntlet — short guaranteed run (audit 4.1, C6)', () => {
  it('exists, is findable by id and by its location', () => {
    const trial = findTrial('quick_ashen_gauntlet');
    expect(trial).not.toBeNull();
    expect(trialForLocation('burned_village')?.id).toBe('quick_ashen_gauntlet');
  });

  it('is bounded at 2 junctions — a guaranteed 3-action run (2 choices + boss), not the 4-junction full trial', () => {
    const trial = findTrial('quick_ashen_gauntlet')!;
    expect(trial.junctions.length).toBe(2);
  });

  it('is accessible from level 1 — no gate keeping new players from the short-run demo', () => {
    const trial = findTrial('quick_ashen_gauntlet')!;
    expect(trial.minLevel).toBe(1);
  });
});

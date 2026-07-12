import { describe, it, expect } from 'vitest';
import {
  heatLevelEffect, heatLevelLabel, multiplyEffects, MAX_HEAT_LEVEL,
  dungeonModifierEffect, DUNGEON_MODIFIERS,
} from './dungeon-modifiers';

describe('heatLevelEffect', () => {
  it('is neutral (all multipliers 1) at level 0 — the "no chosen risk" default', () => {
    const effect = heatLevelEffect(0);
    expect(effect).toEqual({ enemyDamageMult: 1, enemyHpMult: 1, goldMult: 1, xpMult: 1 });
  });

  it('scales risk and reward up together as the level increases', () => {
    const low = heatLevelEffect(1);
    const high = heatLevelEffect(MAX_HEAT_LEVEL);
    expect(high.enemyDamageMult).toBeGreaterThan(low.enemyDamageMult);
    expect(high.enemyHpMult).toBeGreaterThan(low.enemyHpMult);
    expect(high.goldMult).toBeGreaterThan(low.goldMult);
    expect(high.xpMult).toBeGreaterThan(low.xpMult);
  });

  it('clamps out-of-range levels into [0, MAX_HEAT_LEVEL] instead of trusting caller input', () => {
    expect(heatLevelEffect(-5)).toEqual(heatLevelEffect(0));
    expect(heatLevelEffect(999)).toEqual(heatLevelEffect(MAX_HEAT_LEVEL));
  });

  it('rounds fractional levels to the nearest whole level', () => {
    expect(heatLevelEffect(2.4)).toEqual(heatLevelEffect(2));
    expect(heatLevelEffect(2.6)).toEqual(heatLevelEffect(3));
  });
});

describe('heatLevelLabel', () => {
  it('has a distinct name and icon for every level from 0 to MAX_HEAT_LEVEL', () => {
    const seen = new Set<string>();
    for (let level = 0; level <= MAX_HEAT_LEVEL; level++) {
      const label = heatLevelLabel(level);
      expect(label.nameRu.length).toBeGreaterThan(0);
      seen.add(label.nameRu);
    }
    expect(seen.size).toBe(MAX_HEAT_LEVEL + 1);
  });
});

describe('multiplyEffects', () => {
  it('combines two independent multiplier layers by multiplying axis-by-axis', () => {
    const a = { enemyDamageMult: 1.2, enemyHpMult: 1.1, goldMult: 1.3, xpMult: 1 };
    const b = { enemyDamageMult: 1.5, enemyHpMult: 1, goldMult: 1.2, xpMult: 1.2 };
    const combined = multiplyEffects(a, b);
    expect(combined.enemyDamageMult).toBeCloseTo(1.8);
    expect(combined.enemyHpMult).toBeCloseTo(1.1);
    expect(combined.goldMult).toBeCloseTo(1.56);
    expect(combined.xpMult).toBeCloseTo(1.2);
  });

  it('combining with a neutral (all-1) effect is a no-op', () => {
    const neutral = { enemyDamageMult: 1, enemyHpMult: 1, goldMult: 1, xpMult: 1 };
    const modifier = dungeonModifierEffect(DUNGEON_MODIFIERS[0].id);
    expect(multiplyEffects(modifier, neutral)).toEqual({
      enemyDamageMult: modifier.enemyDamageMult,
      enemyHpMult: modifier.enemyHpMult,
      goldMult: modifier.goldMult,
      xpMult: modifier.xpMult,
    });
  });

  it('a random dungeon modifier and a chosen heat level stack multiplicatively, not additively', () => {
    const modifier = dungeonModifierEffect(DUNGEON_MODIFIERS[0].id); // enemyDamageMult 1.25
    const heat = heatLevelEffect(2); // enemyDamageMult 1.3
    const combined = multiplyEffects(modifier, heat);
    expect(combined.enemyDamageMult).toBeCloseTo(modifier.enemyDamageMult * heat.enemyDamageMult);
    expect(combined.enemyDamageMult).not.toBeCloseTo(modifier.enemyDamageMult + heat.enemyDamageMult - 1);
  });
});

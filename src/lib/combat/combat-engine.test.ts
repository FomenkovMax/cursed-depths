import { describe, it, expect } from 'vitest';
import { basicAttackDamage, mitigateDamage, manaCostForStage, stageUnlockLevel, classifyEffect, extractEffectPercent, type PlayerCombatStats } from './combat-engine';

function stats(overrides: Partial<PlayerCombatStats> = {}): PlayerCombatStats {
  return {
    strength: 10, dexterity: 10, vitality: 10, intellect: 10, willpower: 10, instinct: 10,
    level: 1, primaryStat: 'Сила',
    ...overrides,
  };
}

describe('basicAttackDamage', () => {
  it('scales with primary stat and level (primary*2 + level*3)', () => {
    expect(basicAttackDamage(stats({ strength: 10, level: 1 }))).toBe(23); // 10*2 + 1*3
    expect(basicAttackDamage(stats({ strength: 20, level: 5 }))).toBe(55); // 20*2 + 5*3
  });

  it('reads the stat named by primaryStat, not always strength', () => {
    const rogue = stats({ dexterity: 15, strength: 5, primaryStat: 'Ловкость', level: 1 });
    expect(basicAttackDamage(rogue)).toBe(33); // 15*2 + 1*3, not 5*2+3
  });
});

describe('mitigateDamage', () => {
  it('applies zero mitigation at zero defense', () => {
    expect(mitigateDamage(100, 0)).toBe(100);
  });

  it('follows the diminishing-returns curve defense/(defense+100)', () => {
    // 100 defense -> 50% reduction
    expect(mitigateDamage(100, 100)).toBe(50);
    // 400 defense -> 80% reduction
    expect(mitigateDamage(100, 400)).toBe(20);
  });

  it('never rounds damage below 1, even against huge defense', () => {
    expect(mitigateDamage(5, 100_000)).toBe(1);
  });
});

describe('manaCostForStage', () => {
  it('costs 20 at stage 1 (and anything below)', () => {
    expect(manaCostForStage(1)).toBe(20);
    expect(manaCostForStage(0)).toBe(20);
  });
  it('costs 35 at stage 2, 50 at stage 3+', () => {
    expect(manaCostForStage(2)).toBe(35);
    expect(manaCostForStage(3)).toBe(50);
    expect(manaCostForStage(4)).toBe(50);
  });
});

describe('stageUnlockLevel', () => {
  it('returns a monotonically increasing unlock level per stage', () => {
    const l1 = stageUnlockLevel(1);
    const l2 = stageUnlockLevel(2);
    const l3 = stageUnlockLevel(3);
    expect(l2).toBeGreaterThan(l1);
    expect(l3).toBeGreaterThan(l2);
  });
});

describe('extractEffectPercent', () => {
  it('reads the first percent literally out of the description', () => {
    expect(extractEffectPercent('Наносит 40% доп. урона')).toBeCloseTo(0.4);
  });
  it('defaults to 30% when no percent is present', () => {
    expect(extractEffectPercent('Наносит урон врагу')).toBeCloseTo(0.3);
  });
});

/**
 * classifyEffect() — регрессионные проверки на реальные текстовые ловушки, задокументированные
 * прямо в combat-engine.ts построчными комментариями (battle-roar, slant-strike, moon-cycle,
 * the-onslaught, frost-bite, dead-vein, thread-severance, cold-fingers). Каждый кейс здесь —
 * не выдуманный пример, а буквальное описание из этих комментариев: цель — чтобы правка одного
 * regex-паттерна для новой способности не тихо сломала уже работающую классификацию старой.
 */
describe('classifyEffect — regression against documented text traps', () => {
  it('"снижает защиту врага" is a debuff, not a shield (battle-roar trap)', () => {
    expect(classifyEffect('Боевой клич: снижает защиту врага на 20% на 2 хода')).toBe('debuff');
  });

  it('"если у врага нет щита" is a damage buff condition, not a shield grant (slant-strike trap)', () => {
    expect(classifyEffect('Мощная атака: игнорирует 25% брони, либо, если у врага нет щита — +50% урона')).toBe('damage');
  });

  it('stance-choice abilities with multiple percents are not misread by the first one (moon-cycle trap)', () => {
    expect(classifyEffect('Тень (+20% уклонение) / Кровь (+25% крит) / Яд (6% ХП/ход) — выбирает одну стойку')).not.toBe('dot');
  });

  it('"+N% к скорости" without урон nearby is speed, not damage (the-onslaught trap)', () => {
    expect(classifyEffect('Даёт +20% к скорости на 2 хода')).toBe('speed');
  });

  it('lifesteal-flavored damage is damage/debuff, not a pure heal (frost-bite trap)', () => {
    const kind = classifyEffect('Атака, снижающая скорость врага, крадущая 5% ХП как исцеление себе');
    expect(kind).not.toBe('heal');
  });

  it('blocking enemy regen is a debuff, not self-heal (dead-vein trap)', () => {
    expect(classifyEffect('Блокирует пассивную регенерацию врага')).toBe('debuff');
  });

  it('draining enemy healing while dealing damage keeps its damage kind (thread-severance trap)', () => {
    const kind = classifyEffect('Снимает эффекты лечения и регена, наносит урон');
    expect(kind).toBe('damage');
  });

  it('summon abilities are summon, even when they mention percent damage (skeleton trap)', () => {
    expect(classifyEffect('Призывает 2 скелетов, каждый со 50% ХП и урона оригинала')).toBe('summon');
  });

  it('a plain damage ability with no other keywords classifies as damage', () => {
    expect(classifyEffect('Наносит 150% урона врагу')).toBe('damage');
  });

  it('an unrecognized description falls back to utility, not a crash', () => {
    expect(classifyEffect('Совершенно нераспознаваемый текст без ключевых слов')).toBe('utility');
  });
});

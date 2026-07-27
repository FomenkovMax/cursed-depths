import { describe, it, expect } from 'vitest';
import { resolveBossTurn, initBossState, type BossMechanics } from './boss-mechanics';

describe('resolveBossTurn — passive self-heal cap (баг: heart_of_ailet не терял HP в Разломе)', () => {
  it('caps combined selfHealPercent + summonHealPercentPerStack at 12% of enemyMaxHp even at max stacks', () => {
    // Реальная конфигурация heart_of_ailet: 10% + 5×3% = 25% без потолка — на большой глубине
    // Разлома (enemyMaxHp растёт линейно) это превышало урон игрока за один удар, и босс
    // восстанавливался до maxHp каждый ход, оставаясь фактически неубиваемым.
    const mechanics: BossMechanics = {
      selfHealPercent: 0.10,
      selfHealUntilPhase: 2,
      summonEveryTurns: 3,
      summonHealPercentPerStack: 0.03,
      summonUntilPhase: 2,
      summonMaxStacks: 5,
    };
    const state = initBossState(mechanics);
    state.summonStacks = 5; // максимум стаков уже накоплен

    const enemyMaxHp = 3302; // масштаб как в отчёте (глубина 80)
    const result = resolveBossTurn(mechanics, state, enemyMaxHp, enemyMaxHp, 100, 1000);

    expect(result.bossHeal).toBeLessThanOrEqual(Math.round(enemyMaxHp * 0.12));
    // Без потолка heal был бы round(3302*0.25) = 826 — проверяем, что реально урезано, а не совпало случайно.
    expect(result.bossHeal).toBeLessThan(Math.round(enemyMaxHp * 0.25));
  });

  it('does not reduce a boss with only a low selfHealPercent below its declared value', () => {
    const mechanics: BossMechanics = { selfHealPercent: 0.05, selfHealUntilPhase: 2 };
    const state = initBossState(mechanics);
    const enemyMaxHp = 1000;

    const result = resolveBossTurn(mechanics, state, enemyMaxHp, enemyMaxHp, 50, 500);

    expect(result.bossHeal).toBe(Math.round(enemyMaxHp * 0.05));
  });

  it('a single player hit exceeding the heal cap always nets the boss down (never gets stuck at max HP)', () => {
    const mechanics: BossMechanics = {
      selfHealPercent: 0.10,
      selfHealUntilPhase: 2,
      summonEveryTurns: 3,
      summonHealPercentPerStack: 0.03,
      summonUntilPhase: 2,
      summonMaxStacks: 5,
    };
    const state = initBossState(mechanics);
    state.summonStacks = 5;

    const enemyMaxHp = 3302;
    const playerHitDamage = 567; // как в отчёте игрока
    const result = resolveBossTurn(mechanics, state, enemyMaxHp, enemyMaxHp, 100, 1000);
    const hpAfterPlayerHitThenHeal = Math.min(enemyMaxHp, (enemyMaxHp - playerHitDamage) + result.bossHeal);

    expect(hpAfterPlayerHitThenHeal).toBeLessThan(enemyMaxHp);
  });
});

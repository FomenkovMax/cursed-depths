/**
 * Доска контрактов — премиум-эксклюзивная ежедневная охота: раз в день назначается конкретный
 * босс-цель, и одна попытка (d20 + Инстинкт против Сложности, тот же принцип, что и в
 * exploration-events.ts) решает, удастся ли добыть гарантированный предмет из ЕГО реального
 * лут-стола — не случайный дроп с шансом, а осознанная охота за конкретной наградой.
 */

import { ENEMIES, ITEMS, type Item } from '@/lib/game-data';

export const BOUNTY_DC = 15;
export const BOUNTY_STAT = 'instinct' as const;
export const BOUNTY_BONUS_GOLD = 300;

export function bountyBosses() {
  return ENEMIES.filter(e => e.isBoss);
}

export function pickRandomBountyEnemyId(): string {
  const bosses = bountyBosses();
  return bosses[Math.floor(Math.random() * bosses.length)].id;
}

/** Гарантированный предмет из реального лут-стола босса-цели — веса берутся из уже
 * существующих (урезанных, см. рескейл шансов в game-data.ts) chance-значений лут-стола,
 * просто нормированных друг относительно друга, а не против "не выпало ничего". */
export function pickGuaranteedBountyItem(enemyId: string): Item | null {
  const enemy = ENEMIES.find(e => e.id === enemyId);
  if (!enemy || enemy.lootTable.length === 0) return null;
  const total = enemy.lootTable.reduce((s, l) => s + l.chance, 0);
  let r = Math.random() * total;
  for (const entry of enemy.lootTable) {
    r -= entry.chance;
    if (r <= 0) return ITEMS.find(i => i.id === entry.itemId) ?? null;
  }
  return ITEMS.find(i => i.id === enemy.lootTable[0].itemId) ?? null;
}

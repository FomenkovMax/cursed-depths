/**
 * D&D 5e Dice Rolling Engine
 */

export function rollDice(notation: string): number {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return 0;
  
  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;
  
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total + modifier;
}

export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

export function rollD20WithModifier(modifier: number): number {
  return rollD20() + modifier;
}

export function isCriticalHit(roll: number): boolean {
  return roll === 20;
}

export function isCriticalMiss(roll: number): boolean {
  return roll === 1;
}

export function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function rollLoot(lootTable: { itemId: string; chance: number }[]): string[] {
  const dropped: string[] = [];
  for (const loot of lootTable) {
    if (Math.random() < loot.chance) {
      dropped.push(loot.itemId);
    }
  }
  return dropped;
}

export function randomEnemyForLocation(locationId: string, enemies: { id: string; locationId: string; isBoss: boolean }[]): string | null {
  const regular = enemies.filter(e => e.locationId === locationId && !e.isBoss);
  if (regular.length === 0) return null;
  return regular[Math.floor(Math.random() * regular.length)].id;
}

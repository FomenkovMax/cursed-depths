/**
 * D&D 5e Dice Rolling Engine
 */

export function rollDice(notation: string): number {
  // Supports single terms ("2d6", "2d6+3") and additive multi-dice notation ("1d8+1d4")
  const terms = notation.match(/[+-]?\d+d\d+|[+-]?\d+/g);
  if (!terms) return 0;

  let total = 0;
  for (const term of terms) {
    const diceMatch = term.match(/^([+-]?)(\d+)d(\d+)$/);
    if (diceMatch) {
      const sign = diceMatch[1] === '-' ? -1 : 1;
      const count = parseInt(diceMatch[2]);
      const sides = parseInt(diceMatch[3]);
      let roll = 0;
      for (let i = 0; i < count; i++) {
        roll += Math.floor(Math.random() * sides) + 1;
      }
      total += sign * roll;
    } else {
      total += parseInt(term);
    }
  }
  return total;
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

export function rollLoot(lootTable: { itemId: string; chance: number }[], chanceMult = 1): string[] {
  const dropped: string[] = [];
  for (const loot of lootTable) {
    if (Math.random() < Math.min(1, loot.chance * chanceMult)) {
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

/**
 * Единая точка подсчёта бонусов от экипированных предметов.
 *
 * До этого модуля `Inventory.stats` (JSON вроде `{"attack":5,"strength":2,"hp":15}`)
 * читался только для двух ключей — `attack` у оружия и `defense` у брони, оба
 * прямо в combat/action/route.ts. Все остальные ключи (strength/dexterity/vitality/
 * intellect/willpower/instinct/hp/mp), которыми размечена половина предметов в
 * game-data.ts начиная с Акта 1, нигде не читались и не влияли на игру — эффект
 * экипировки ограничивался декоративными бейджами в инвентаре. Особенно заметно
 * это било по аксессуарам: единственные их статы (`hp`/`willpower`/`instinct` и т.д.)
 * были чистой витриной.
 */

const BONUS_KEYS = [
  'strength', 'dexterity', 'vitality', 'intellect', 'willpower', 'instinct',
  'attack', 'defense', 'hp', 'mp',
] as const;

export type EquipmentBonuses = Record<typeof BONUS_KEYS[number], number>;

function emptyBonuses(): EquipmentBonuses {
  return { strength: 0, dexterity: 0, vitality: 0, intellect: 0, willpower: 0, instinct: 0, attack: 0, defense: 0, hp: 0, mp: 0 };
}

/** Суммирует статы всех экипированных предметов инвентаря в один объект бонусов. */
export function computeEquipmentBonuses(inventory: { equipped: boolean; stats: string | null }[]): EquipmentBonuses {
  const bonuses = emptyBonuses();
  for (const item of inventory) {
    if (!item.equipped || !item.stats) continue;
    let parsed: Record<string, number>;
    try {
      parsed = JSON.parse(item.stats);
    } catch {
      continue;
    }
    for (const key of BONUS_KEYS) {
      const value = parsed[key];
      if (typeof value === 'number') bonuses[key] += value;
    }
  }
  return bonuses;
}

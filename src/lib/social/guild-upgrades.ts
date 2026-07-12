// Гильдейское дерево построек/апгрейдов (аудит 4.1, D2) — постоянные пассивные бонусы гильдии
// за совместную активность (пожертвования золота в казну, POST /api/guild/donate), не только
// разовые события вроде рейд-босса или Крепости. Два независимых узких дерева ("постройки"),
// каждое из 3 тиров — тир N требует, чтобы тир N-1 той же постройки уже был разблокирован.
// Разблокировка тратит guild.treasury, необратима (см. schema.prisma комментарий GuildUpgrade).

export type GuildBuildingId = 'forge' | 'sanctuary';

export interface GuildUpgradeDef {
  id: string;
  buildingId: GuildBuildingId;
  buildingNameRu: string;
  buildingIcon: string;
  tier: number;
  nameRu: string;
  descriptionRu: string;
  cost: number;
  requiresUpgradeId?: string;
  /** Доля (0.03 = +3%), применяется как множитель к goldGained. */
  goldMultBonus?: number;
  /** Доля (0.03 = +3%), применяется как множитель к xpGained. */
  xpMultBonus?: number;
}

export const GUILD_UPGRADES: GuildUpgradeDef[] = [
  {
    id: 'forge_1', buildingId: 'forge', buildingNameRu: 'Кузница', buildingIcon: '⚒️', tier: 1,
    nameRu: 'Точильные камни', descriptionRu: '+3% золота с любого боя для всех членов гильдии.',
    cost: 500, goldMultBonus: 0.03,
  },
  {
    id: 'forge_2', buildingId: 'forge', buildingNameRu: 'Кузница', buildingIcon: '⚒️', tier: 2,
    nameRu: 'Гильдейские горны', descriptionRu: '+6% золота с любого боя.',
    cost: 1500, requiresUpgradeId: 'forge_1', goldMultBonus: 0.06,
  },
  {
    id: 'forge_3', buildingId: 'forge', buildingNameRu: 'Кузница', buildingIcon: '⚒️', tier: 3,
    nameRu: 'Наковальня Торнака', descriptionRu: '+10% золота с любого боя.',
    cost: 4000, requiresUpgradeId: 'forge_2', goldMultBonus: 0.10,
  },
  {
    id: 'sanctuary_1', buildingId: 'sanctuary', buildingNameRu: 'Святилище', buildingIcon: '🕯️', tier: 1,
    nameRu: 'Тихий алтарь', descriptionRu: '+3% опыта с любого боя для всех членов гильдии.',
    cost: 500, xpMultBonus: 0.03,
  },
  {
    id: 'sanctuary_2', buildingId: 'sanctuary', buildingNameRu: 'Святилище', buildingIcon: '🕯️', tier: 2,
    nameRu: 'Свет Айлет', descriptionRu: '+6% опыта с любого боя.',
    cost: 1500, requiresUpgradeId: 'sanctuary_1', xpMultBonus: 0.06,
  },
  {
    id: 'sanctuary_3', buildingId: 'sanctuary', buildingNameRu: 'Святилище', buildingIcon: '🕯️', tier: 3,
    nameRu: 'Хор Забытых', descriptionRu: '+10% опыта с любого боя.',
    cost: 4000, requiresUpgradeId: 'sanctuary_2', xpMultBonus: 0.10,
  },
];

export function findGuildUpgrade(upgradeId: string): GuildUpgradeDef | undefined {
  return GUILD_UPGRADES.find(u => u.id === upgradeId);
}

/** Суммарный бонус к золоту (0.03 = +3%) от всех разблокированных узлов. */
export function guildGoldMultBonus(unlockedIds: Set<string>): number {
  return GUILD_UPGRADES.filter(u => unlockedIds.has(u.id)).reduce((sum, u) => sum + (u.goldMultBonus ?? 0), 0);
}

/** Суммарный бонус к опыту (0.03 = +3%) от всех разблокированных узлов. */
export function guildXpMultBonus(unlockedIds: Set<string>): number {
  return GUILD_UPGRADES.filter(u => unlockedIds.has(u.id)).reduce((sum, u) => sum + (u.xpMultBonus ?? 0), 0);
}

/** Можно ли разблокировать узел прямо сейчас: не разблокирован, пререквизит (если есть) уже
 * разблокирован, и в казне хватает золота. */
export function canUnlockGuildUpgrade(def: GuildUpgradeDef, unlockedIds: Set<string>, treasury: number): boolean {
  if (unlockedIds.has(def.id)) return false;
  if (def.requiresUpgradeId && !unlockedIds.has(def.requiresUpgradeId)) return false;
  return treasury >= def.cost;
}

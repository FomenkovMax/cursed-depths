/**
 * Данжи — разовый забег из нескольких комнат подряд с боссом в конце, привязанный к
 * конкретной локации. Переиспользует существующий движок одиночного боя целиком (все поля
 * inCombat/enemyId/enemyHp/bossState/combatLog на Player) — комнаты просто НЕ дают игроку
 * выйти из боя между собой (см. переход комнат в combat/action.ts), а финальная награда
 * выдаётся поверх обычной награды за победу над боссом.
 */

export interface Dungeon {
  id: string;
  nameRu: string;
  icon: string;
  descriptionRu: string;
  locationId: string;
  minLevel: number;
  /** Враги для всех комнат кроме последней — выбираются по кругу/случайно из этого списка. */
  regularEnemyIds: string[];
  /** Финальная комната — всегда этот босс. */
  bossEnemyId: string;
  roomCount: number;
  /** Бонусная награда за прохождение ВСЕГО данжа — выдаётся поверх обычной награды за убийство босса. */
  completionReward: { xp: number; gold: number; items?: string[] };
}

export const DUNGEONS: Dungeon[] = [
  {
    id: 'temple_of_ashes',
    nameRu: 'Храм Пепла',
    icon: '⚱️',
    descriptionRu: 'Три комнаты оскверненного храма Велариона, за ними — Хранитель Пепла.',
    locationId: 'velarion_temple',
    minLevel: 1,
    regularEnemyIds: ['corrupted_acolyte', 'ashen_guardian'],
    bossEnemyId: 'keeper_of_ashes',
    roomCount: 3,
    completionReward: { xp: 150, gold: 80, items: ['greater_health'] },
  },
  {
    id: 'karsus_depths',
    nameRu: 'Глубины Разлома',
    icon: '🌀',
    descriptionRu: 'Четыре комнаты искажённого пространства Разлома Карсуса, за ними — Первый Свидетель.',
    locationId: 'karsus_rift',
    minLevel: 3,
    regularEnemyIds: ['rift_spawn'],
    bossEnemyId: 'first_witness',
    roomCount: 4,
    completionReward: { xp: 400, gold: 200, items: ['elixir_power'] },
  },
];

export function dungeonForLocation(locationId: string): Dungeon | null {
  return DUNGEONS.find(d => d.locationId === locationId) ?? null;
}

export function findDungeon(dungeonId: string): Dungeon | null {
  return DUNGEONS.find(d => d.id === dungeonId) ?? null;
}

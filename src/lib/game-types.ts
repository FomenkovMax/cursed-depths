export interface RaceData {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  lore: string;
  baseStrength: number;
  baseDexterity: number;
  baseVitality: number;
  baseIntellect: number;
  baseWillpower: number;
  baseInstinct: number;
  classes?: GameClassData[];
}

export interface AbilityData {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  classId: string;
  stage: number;
  stageName: string;
  type: string;
  bossNote: string | null;
}

export interface GameClassData {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  raceId: string;
  path: string;
  role: string;
  primaryStat: string;
  abilities?: AbilityData[];
  race?: RaceData;
}

export interface PlayerData {
  id: string;
  telegramId: string;
  name: string;
  raceId: string;
  race: RaceData;
  classId: string;
  class: GameClassData;
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  strength: number;
  dexterity: number;
  vitality: number;
  intellect: number;
  willpower: number;
  instinct: number;
  statPoints: number;
  gold: number;
  locationId: string;
  inCombat: boolean;
  enemyId: string | null;
  enemyHp: number | null;
  enemyMaxHp: number | null;
  combatLog: string | null;
  bossState: string | null;
  lastDailyReward: string | null;
  consumableAttackBonus: number;
  consumableFightsLeft: number;
  totalKills: number;
  totalExplores: number;
  totalCrafts: number;
  partyWins: number;
  dungeonId: string | null;
  dungeonRoom: number;
  dungeonModifierId: string | null;
  abyssDepth: number;
  bestAbyssDepth: number;
  inventory: InventoryItem[];
  quests: QuestData[];
  /** Только GET /api/player заполняет это поле — остальные роуты не включают его в ответ,
   * поэтому в page.tsx изученные рецепты хранятся отдельным стейтом (learnedRecipeIds), а
   * не читаются отсюда после каждого действия. */
  recipes?: { recipeId: string }[];
}

export interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  type: string;
  rarity: string;
  equipped: boolean;
  slot: string | null;
  stats: string | null;
  quantity: number;
  icon: string | null;
  itemLevel: number | null;
  affixTier: string | null;
  affixes: string | null;
  enhancementLevel: number;
}

export interface RolledAffixView {
  labelRu: string;
  statKey: string;
  value: number;
}

export function parseAffixes(affixesStr: string | null): RolledAffixView[] {
  if (!affixesStr) return [];
  try { return JSON.parse(affixesStr); } catch { return []; }
}

export interface QuestData {
  id: string;
  questId: string;
  type: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  reward: string;
  createdAt: string;
}

export interface CombatLogEntry {
  text: string;
  turn: number;
}

export interface PartyMemberData {
  id: string;
  playerId: string;
  joinedAt: string;
  player: {
    id: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    class: { name: string; icon: string };
  };
}

export interface PartyCombatData {
  id: string;
  enemyId: string;
  enemyHp: number;
  enemyMaxHp: number;
  status: string;
}

export interface PartyData {
  id: string;
  leaderId: string;
  status: string;
  members: PartyMemberData[];
  combat: PartyCombatData | null;
}

export interface GuildMemberData {
  id: string;
  playerId: string;
  joinedAt: string;
  player: {
    id: string;
    name: string;
    level: number;
    class: { name: string; icon: string };
  };
}

export interface GuildData {
  id: string;
  name: string;
  tag: string;
  leaderId: string;
  members: GuildMemberData[];
}

export interface PartyCombatLogEntry {
  text: string;
  turn: number;
  actorPlayerId?: string;
}

export interface PartyFightStateData {
  turnOrder: string[];
  currentTurnIndex: number;
  round: number;
  /** Epoch ms момента начала текущего хода — используется для отсчёта AFK-таймаута (см.
   * AFK_TIMEOUT_MS в lib/party-combat-engine.ts). */
  turnStartedAt: number;
  sharedEnemyEffects: { kind: string; percent: number; turnsRemaining: number }[];
  members: Record<string, {
    activeEffects: { kind: string; percent: number; turnsRemaining: number }[];
    armedEffects: { kind: string; percent: number }[];
    abilityCooldowns: Record<string, number>;
    shieldHp: number;
    alive: boolean;
    fled: boolean;
    playerRooted: boolean;
    curseStacks: number;
  }>;
  combatLog: PartyCombatLogEntry[];
  bossMechanics: {
    phase: number;
    shieldHp: number;
    shieldBroken: boolean;
    summonStacks: number;
    vulnerableNextTurn: boolean;
  } | null;
}

export interface PartyCombatMemberSnapshot {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  level: number;
  class: { name: string; icon: string };
}

export interface PartyCombatStateResponse {
  combat: { id: string; enemyId: string; enemyHp: number; enemyMaxHp: number; status: string } | null;
  state: PartyFightStateData | null;
  members: PartyCombatMemberSnapshot[];
  currentActingPlayerId: string | null;
  enemy: { id: string; nameRu: string; icon: string; ac: number; damage: string; isBoss: boolean; shieldMax: number | null } | null;
}

export type GameScreen = 'loading' | 'creation' | 'game';
export type GameTab = 'overview' | 'combat' | 'map' | 'inventory' | 'quests' | 'craft' | 'leaderboard' | 'party' | 'achievements' | 'guild' | 'codex' | 'market';

export type GameMessage = { text: string; type: 'info' | 'success' | 'error' } | null;

export interface EventChoice {
  id: string;
  label: string;
  hint: string;
}

export interface ExplorationEvent {
  id: string;
  icon: string;
  textRu: string;
  choices: EventChoice[];
}

export interface AchievementEntry {
  id: string;
  nameRu: string;
  descriptionRu: string;
  icon: string;
  target: number | null;
  progress: number | null;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface MarketListingView {
  id: string;
  itemId: string;
  name: string;
  type: string;
  rarity: string;
  stats: string | null;
  icon: string | null;
  itemLevel: number | null;
  affixTier: string | null;
  affixes: string | null;
  enhancementLevel: number;
  quantity: number;
  price: number;
  createdAt: string;
  sellerName: string;
  isOwn: boolean;
}

export interface CodexEntryView {
  id: string;
  category: string;
  titleRu: string;
  icon: string;
  textRu: string | null;
  unlocked: boolean;
  unlockedAt: string | null;
}

// Telegram WebApp SDK types
export type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  initData?: string;
  initDataUnsafe?: { user?: { id: number; first_name?: string; username?: string } };
};
export type TelegramGlobal = { Telegram?: { WebApp?: TelegramWebApp } };

// Шесть характеристик из docs/cursed_depths_master.pdf (Фаза 1.2) —
// заменяют D&D-набор Str/Dex/Con/Int/Wis/Cha.
export const STAT_NAMES_RU: Record<string, string> = {
  strength: 'Сила',
  dexterity: 'Ловкость',
  vitality: 'Стойкость',
  intellect: 'Разум',
  willpower: 'Воля',
  instinct: 'Инстинкт',
};

export const STAT_SHORT_RU: Record<string, string> = {
  strength: 'СИЛ',
  dexterity: 'ЛОВ',
  vitality: 'СТОЙ',
  intellect: 'РАЗ',
  willpower: 'ВОЛ',
  instinct: 'ИНСТ',
};

export const PATH_NAMES_RU: Record<string, string> = {
  ash: 'Путь Пепла',
  blight: 'Путь Скверны',
};

export const ROLE_NAMES_RU: Record<string, string> = {
  tank: 'Танк',
  healer: 'Хилер',
  dps: 'ДПС',
  support: 'Саппорт',
  antibuff: 'Антибафф',
};

export const ITEM_TYPE_RU: Record<string, string> = {
  weapon: 'Оружие',
  armor: 'Броня',
  accessory: 'Аксессуар',
  consumable: 'Расходуемое',
  material: 'Материал',
  quest: 'Квестовый предмет',
  blueprint: 'Чертёж',
  currency: 'Крафт-валюта',
};

/** Независимая от `rarity` ось — сколько случайных аффиксов накатано на конкретный экземпляр
 * снаряжения (см. lib/item-affixes.ts). */
export const AFFIX_TIER_RU: Record<string, string> = {
  magic: 'Зачарованный',
  rare: 'Редкий ролл',
  corrupted: 'Осквернённый',
};

export const AFFIX_TIER_COLORS: Record<string, string> = {
  magic: '#60a5fa',
  rare: '#c084fc',
  corrupted: '#ef4444',
};

export const SLOT_RU: Record<string, string> = {
  weapon: 'Оружие',
  chest: 'Нагрудник',
  accessory1: 'Аксессуар',
};

export function parseStats(statsStr: string | null): Record<string, number> {
  if (!statsStr) return {};
  try { return JSON.parse(statsStr); } catch { return {}; }
}

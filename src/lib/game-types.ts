export interface PlayerData {
  id: string;
  telegramId: string;
  name: string;
  race: string;
  class: string;
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  gold: number;
  locationId: string;
  inCombat: boolean;
  enemyId: string | null;
  enemyHp: number | null;
  enemyMaxHp: number | null;
  combatLog: string | null;
  lastDailyReward: string | null;
  inventory: InventoryItem[];
  quests: QuestData[];
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
  expiresAt: string | null;
  createdAt: string;
}

export interface CombatLogEntry {
  text: string;
  turn: number;
}

export type GameScreen = 'loading' | 'creation' | 'game';
export type GameTab = 'overview' | 'combat' | 'map' | 'inventory' | 'quests' | 'craft';

export type GameMessage = { text: string; type: 'info' | 'success' | 'error' } | null;

// Telegram WebApp SDK types
export type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  initData?: string;
  initDataUnsafe?: { user?: { id: number; first_name?: string; username?: string } };
};
export type TelegramGlobal = { Telegram?: { WebApp?: TelegramWebApp } };

export const STAT_NAMES_RU: Record<string, string> = {
  strength: 'Сила',
  dexterity: 'Ловкость',
  constitution: 'Выносливость',
  intelligence: 'Интеллект',
  wisdom: 'Мудрость',
  charisma: 'Харизма',
};

export const STAT_SHORT_RU: Record<string, string> = {
  strength: 'СИЛ',
  dexterity: 'ЛОВ',
  constitution: 'ВЫН',
  intelligence: 'ИНТ',
  wisdom: 'МДР',
  charisma: 'ХАР',
};

export const ITEM_TYPE_RU: Record<string, string> = {
  weapon: 'Оружие',
  armor: 'Броня',
  accessory: 'Аксессуар',
  consumable: 'Расходуемое',
  material: 'Материал',
  quest: 'Квестовый предмет',
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

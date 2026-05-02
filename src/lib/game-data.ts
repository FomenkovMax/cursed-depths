// ===== RACES (9 D&D 5e races) =====
export interface Race {
  id: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  bonuses: Record<string, number>;
  icon: string;
}

export const RACES: Race[] = [
  {
    id: 'human',
    nameRu: 'Человек',
    nameEn: 'Human',
    descriptionRu: 'Универсальная раса. Все характеристики +1. Адаптивные и амбициозные.',
    descriptionEn: 'Versatile race. All stats +1. Adaptable and ambitious.',
    bonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
    icon: '🧑',
  },
  {
    id: 'elf',
    nameRu: 'Эльф',
    nameEn: 'Elf',
    descriptionRu: 'Ловкие и мудрые. Ловкость +2, Мудрость +1. Острые чувства и любовь к магии.',
    descriptionEn: 'Agile and wise. Dexterity +2, Wisdom +1. Keen senses and love of magic.',
    bonuses: { dexterity: 2, wisdom: 1 },
    icon: '🧝',
  },
  {
    id: 'dwarf',
    nameRu: 'Дварф',
    nameEn: 'Dwarf',
    descriptionRu: 'Стойкие и сильные. Выносливость +2, Сила +1. Мастера кузнечного дела.',
    descriptionEn: 'Stout and strong. Constitution +2, Strength +1. Master smiths.',
    bonuses: { constitution: 2, strength: 1 },
    icon: '🪓',
  },
  {
    id: 'halfling',
    nameRu: 'Полурослик',
    nameEn: 'Halfling',
    descriptionRu: 'Проворные и удачливые. Ловкость +2, Харизма +1. Удача всегда на их стороне.',
    descriptionEn: 'Nimble and lucky. Dexterity +2, Charisma +1. Luck is always on their side.',
    bonuses: { dexterity: 2, charisma: 1 },
    icon: '🍀',
  },
  {
    id: 'gnome',
    nameRu: 'Гном',
    nameEn: 'Gnome',
    descriptionRu: 'Мудрые и любознательные. Интеллект +2, Выносливость +1. Прирождённые изобретатели.',
    descriptionEn: 'Wise and curious. Intelligence +2, Constitution +1. Natural inventors.',
    bonuses: { intelligence: 2, constitution: 1 },
    icon: '⚙️',
  },
  {
    id: 'half-orc',
    nameRu: 'Полуорк',
    nameEn: 'Half-Orc',
    descriptionRu: 'Могучие воины. Сила +2, Выносливость +1. Свирепые в бою, неутомимые.',
    descriptionEn: 'Mighty warriors. Strength +2, Constitution +1. Fierce in battle, relentless.',
    bonuses: { strength: 2, constitution: 1 },
    icon: '🗡️',
  },
  {
    id: 'tiefling',
    nameRu: 'Тифлинг',
    nameEn: 'Tiefling',
    descriptionRu: 'Дети преисподней. Харизма +2, Интеллект +1. Тёмное наследие и врождённая магия.',
    descriptionEn: 'Children of the hells. Charisma +2, Intelligence +1. Dark heritage and innate magic.',
    bonuses: { charisma: 2, intelligence: 1 },
    icon: '😈',
  },
  {
    id: 'dragonborn',
    nameRu: 'Драконорождённый',
    nameEn: 'Dragonborn',
    descriptionRu: 'Могучие потомки драконов. Сила +2, Харизма +1. Дыхание дракона и чешуя.',
    descriptionEn: 'Powerful dragon descendants. Strength +2, Charisma +1. Dragon breath and scales.',
    bonuses: { strength: 2, charisma: 1 },
    icon: '🐉',
  },
  {
    id: 'half-elf',
    nameRu: 'Полуэльф',
    nameEn: 'Half-Elf',
    descriptionRu: 'Обаятельные и разносторонние. Харизма +2, две любые +1. Лучшее от обеих рас.',
    descriptionEn: 'Charming and versatile. Charisma +2, two any +1. Best of both races.',
    bonuses: { charisma: 2, dexterity: 1, wisdom: 1 },
    icon: '🌟',
  },
];

// ===== CLASSES =====
export interface GameClass {
  id: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  primaryStat: string;
  hitDie: string;
  icon: string;
  baseHp: number;
  baseMp: number;
}

export const CLASSES: GameClass[] = [
  {
    id: 'warrior',
    nameRu: 'Воин',
    nameEn: 'Warrior',
    descriptionRu: 'Мастер ближнего боя. Высокое HP, тяжёлые доспехи. Базовое HP: 12.',
    descriptionEn: 'Master of melee. High HP, heavy armor. Base HP: 12.',
    primaryStat: 'strength',
    hitDie: '1d12',
    icon: '⚔️',
    baseHp: 12,
    baseMp: 2,
  },
  {
    id: 'mage',
    nameRu: 'Маг',
    nameEn: 'Mage',
    descriptionRu: 'Повелитель арканы. Мощные заклинания, но мало HP. Базовое HP: 6.',
    descriptionEn: 'Master of arcane. Powerful spells but low HP. Base HP: 6.',
    primaryStat: 'intelligence',
    hitDie: '1d6',
    icon: '🔮',
    baseHp: 6,
    baseMp: 10,
  },
  {
    id: 'rogue',
    nameRu: 'Плут',
    nameEn: 'Rogue',
    descriptionRu: 'Мастер скрытности и критических ударов. Ловкий и смертоносный. Базовое HP: 8.',
    descriptionEn: 'Master of stealth and critical hits. Agile and deadly. Base HP: 8.',
    primaryStat: 'dexterity',
    hitDie: '1d8',
    icon: '🗡️',
    baseHp: 8,
    baseMp: 3,
  },
  {
    id: 'cleric',
    nameRu: 'Жрец',
    nameEn: 'Cleric',
    descriptionRu: 'Целитель и защитник. Исцеление и божественная магия. Базовое HP: 8.',
    descriptionEn: 'Healer and protector. Healing and divine magic. Base HP: 8.',
    primaryStat: 'wisdom',
    hitDie: '1d8',
    icon: '✨',
    baseHp: 8,
    baseMp: 8,
  },
  {
    id: 'ranger',
    nameRu: 'Следопыт',
    nameEn: 'Ranger',
    descriptionRu: 'Охотник и следопыт. Луки, ловушки, магия природы. Базовое HP: 10.',
    descriptionEn: 'Hunter and tracker. Bows, traps, nature magic. Base HP: 10.',
    primaryStat: 'dexterity',
    hitDie: '1d10',
    icon: '🏹',
    baseHp: 10,
    baseMp: 4,
  },
];

// ===== LOCATIONS =====
export interface Location {
  id: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  icon: string;
  level: number;
  connections: string[];
}

export const LOCATIONS: Location[] = [
  {
    id: 'town',
    nameRu: 'Таверна «Проклятая Глубина»',
    nameEn: 'Cursed Depth Tavern',
    descriptionRu: 'Безопасное место для отдыха. Восстановите HP и MP здесь.',
    descriptionEn: 'Safe haven for rest. Restore HP and MP here.',
    icon: '🍺',
    level: 0,
    connections: ['forest', 'market'],
  },
  {
    id: 'market',
    nameRu: 'Рынок Теней',
    nameEn: 'Shadow Market',
    descriptionRu: 'Купите и продайте снаряжение. Торговцы со всего подземелья.',
    descriptionEn: 'Buy and sell equipment. Merchants from across the dungeon.',
    icon: '🏪',
    level: 0,
    connections: ['town'],
  },
  {
    id: 'forest',
    nameRu: 'Тёмный Лес',
    nameEn: 'Dark Forest',
    descriptionRu: 'Мрачный лес у входа в подземелье. Уровень 1-3.',
    descriptionEn: 'Gloomy forest at the dungeon entrance. Level 1-3.',
    icon: '🌲',
    level: 1,
    connections: ['town', 'caves'],
  },
  {
    id: 'caves',
    nameRu: 'Пещеры Эха',
    nameEn: 'Echo Caves',
    descriptionRu: 'Извилистые пещеры с эхом криков. Уровень 3-5.',
    descriptionEn: 'Winding caves with echoing cries. Level 3-5.',
    icon: '🕳️',
    level: 3,
    connections: ['forest', 'crypt'],
  },
  {
    id: 'crypt',
    nameRu: 'Древняя Гробница',
    nameEn: 'Ancient Crypt',
    descriptionRu: 'Проклятая гробница нежити. Уровень 5-7.',
    descriptionEn: 'Cursed crypt of the undead. Level 5-7.',
    icon: '💀',
    level: 5,
    connections: ['caves', 'labyrinth'],
  },
  {
    id: 'labyrinth',
    nameRu: 'Лабиринт Теней',
    nameEn: 'Shadow Labyrinth',
    descriptionRu: 'Запутанный лабиринт, полный ловушек. Уровень 7-9.',
    descriptionEn: 'Confusing labyrinth full of traps. Level 7-9.',
    icon: '🌀',
    level: 7,
    connections: ['crypt', 'forge'],
  },
  {
    id: 'forge',
    nameRu: 'Кузница Демонов',
    nameEn: 'Demon Forge',
    descriptionRu: 'Раскалённая кузница, где куются легендарные клинки. Уровень 9-11.',
    descriptionEn: 'Blazing forge where legendary blades are made. Level 9-11.',
    icon: '🔥',
    level: 9,
    connections: ['labyrinth', 'abyss'],
  },
  {
    id: 'abyss',
    nameRu: 'Врата Бездны',
    nameEn: 'Abyss Gates',
    descriptionRu: 'Врата, за которыми скрывается древнее зло. Уровень 11-13.',
    descriptionEn: 'Gates behind which ancient evil lurks. Level 11-13.',
    icon: '👹',
    level: 11,
    connections: ['forge', 'throne'],
  },
  {
    id: 'throne',
    nameRu: 'Трон Проклятого Короля',
    nameEn: "Cursed King's Throne",
    descriptionRu: 'Последний рубеж. Проклятый Король ждёт. Уровень 13+.',
    descriptionEn: 'The final frontier. The Cursed King awaits. Level 13+.',
    icon: '👑',
    level: 13,
    connections: ['abyss'],
  },
];

// ===== ITEMS =====
export interface Item {
  id: string;
  nameRu: string;
  nameEn: string;
  type: string;
  rarity: string;
  stats: Record<string, number>;
  descriptionRu: string;
  descriptionEn: string;
  icon: string;
  value: number;
}

export const ITEMS: Item[] = [
  // === WEAPONS ===
  { id: 'rusty_sword', nameRu: 'Ржавый меч', nameEn: 'Rusty Sword', type: 'weapon', rarity: 'common', stats: { attack: 2 }, descriptionRu: 'Старый ржавый меч. Лучше, чем кулаки.', descriptionEn: 'Old rusty sword. Better than fists.', icon: '🗡️', value: 10 },
  { id: 'iron_sword', nameRu: 'Железный меч', nameEn: 'Iron Sword', type: 'weapon', rarity: 'common', stats: { attack: 4 }, descriptionRu: 'Надёжный железный клинок.', descriptionEn: 'Reliable iron blade.', icon: '⚔️', value: 30 },
  { id: 'steel_sword', nameRu: 'Стальной меч', nameEn: 'Steel Sword', type: 'weapon', rarity: 'uncommon', stats: { attack: 6 }, descriptionRu: 'Острый стальной меч.', descriptionEn: 'Sharp steel sword.', icon: '⚔️', value: 80 },
  { id: 'elven_bow', nameRu: 'Эльфийский лук', nameEn: 'Elven Bow', type: 'weapon', rarity: 'uncommon', stats: { attack: 5, dexterity: 1 }, descriptionRu: 'Изящный лук эльфийской работы.', descriptionEn: 'Elegant elven-crafted bow.', icon: '🏹', value: 100 },
  { id: 'shadow_dagger', nameRu: 'Теневой кинжал', nameEn: 'Shadow Dagger', type: 'weapon', rarity: 'rare', stats: { attack: 7, dexterity: 2 }, descriptionRu: 'Кинжал, пронзающий тени.', descriptionEn: 'A dagger that pierces shadows.', icon: '🗡️', value: 200 },
  { id: 'flame_blade', nameRu: 'Пламенный клинок', nameEn: 'Flame Blade', type: 'weapon', rarity: 'rare', stats: { attack: 9, intelligence: 1 }, descriptionRu: 'Меч, пылающий магическим огнём.', descriptionEn: 'Sword blazing with magical fire.', icon: '🔥', value: 350 },
  { id: 'frost_axe', nameRu: 'Ледяной топор', nameEn: 'Frost Axe', type: 'weapon', rarity: 'epic', stats: { attack: 12, strength: 2 }, descriptionRu: 'Топор вечного холода. Замораживает врагов.', descriptionEn: 'Axe of eternal cold. Freezes enemies.', icon: '🪓', value: 600 },
  { id: 'void_staff', nameRu: 'Посох Пустоты', nameEn: 'Void Staff', type: 'weapon', rarity: 'epic', stats: { attack: 8, intelligence: 4, mp: 15 }, descriptionRu: 'Посох, черпающий силу из Пустоты.', descriptionEn: 'Staff drawing power from the Void.', icon: '🪄', value: 700 },
  { id: 'dragonslayer', nameRu: 'Драконоборец', nameEn: 'Dragonslayer', type: 'weapon', rarity: 'legendary', stats: { attack: 16, strength: 3, constitution: 2 }, descriptionRu: 'Легендарный меч, созданный для убийства драконов.', descriptionEn: 'Legendary sword forged to slay dragons.', icon: '⚔️', value: 1500 },
  { id: 'cursed_king_blade', nameRu: 'Клинок Проклятого Короля', nameEn: "Cursed King's Blade", type: 'weapon', rarity: 'mythic', stats: { attack: 25, strength: 5, dexterity: 3 }, descriptionRu: 'Мифический клинок, пропитанный проклятием Короля.', descriptionEn: "Mythic blade soaked in the King's curse.", icon: '👑', value: 5000 },

  // === ARMOR ===
  { id: 'leather_armor', nameRu: 'Кожаная броня', nameEn: 'Leather Armor', type: 'armor', rarity: 'common', stats: { defense: 2 }, descriptionRu: 'Простая кожаная броня.', descriptionEn: 'Simple leather armor.', icon: '🦺', value: 15 },
  { id: 'chainmail', nameRu: 'Кольчуга', nameEn: 'Chainmail', type: 'armor', rarity: 'uncommon', stats: { defense: 4 }, descriptionRu: 'Кольчужная броня из стальных колец.', descriptionEn: 'Chainmail of steel rings.', icon: '🛡️', value: 60 },
  { id: 'dwarven_plate', nameRu: 'Дварфийская латная броня', nameEn: 'Dwarven Plate', type: 'armor', rarity: 'rare', stats: { defense: 7, constitution: 1 }, descriptionRu: 'Тяжёлая броня дварфийской ковки.', descriptionEn: 'Heavy armor of dwarven make.', icon: '🛡️', value: 250 },
  { id: 'shadow_cloak', nameRu: 'Плащ Теней', nameEn: 'Shadow Cloak', type: 'armor', rarity: 'rare', stats: { defense: 3, dexterity: 2 }, descriptionRu: 'Плащ, скрывающий во тьме.', descriptionEn: 'A cloak that hides in darkness.', icon: '🧥', value: 200 },
  { id: 'dragonscale_armor', nameRu: 'Драконья чешуя', nameEn: 'Dragonscale Armor', type: 'armor', rarity: 'epic', stats: { defense: 10, strength: 1, constitution: 2 }, descriptionRu: 'Броня из чешуи дракона.', descriptionEn: 'Armor made from dragon scales.', icon: '🐉', value: 800 },
  { id: 'celestial_robe', nameRu: 'Небесная мантия', nameEn: 'Celestial Robe', type: 'armor', rarity: 'epic', stats: { defense: 4, intelligence: 3, wisdom: 2 }, descriptionRu: 'Мантия, благословлённая небесами.', descriptionEn: 'Robe blessed by the heavens.', icon: '✨', value: 700 },
  { id: 'crown_armor', nameRu: 'Броня Короны', nameEn: 'Crown Armor', type: 'armor', rarity: 'legendary', stats: { defense: 14, strength: 2, constitution: 3, charisma: 2 }, descriptionRu: 'Легендарная броня, носящая печать Короля.', descriptionEn: "Legendary armor bearing the King's seal.", icon: '👑', value: 2000 },

  // === ACCESSORIES ===
  { id: 'copper_ring', nameRu: 'Медное кольцо', nameEn: 'Copper Ring', type: 'accessory', rarity: 'common', stats: { hp: 5 }, descriptionRu: 'Простое медное кольцо с защитным чаром.', descriptionEn: 'Simple copper ring with a ward charm.', icon: '💍', value: 10 },
  { id: 'amulet_vitality', nameRu: 'Амулет Жизни', nameEn: 'Amulet of Vitality', type: 'accessory', rarity: 'uncommon', stats: { hp: 15, constitution: 1 }, descriptionRu: 'Амулет, усиливающий жизненную силу.', descriptionEn: 'Amulet that enhances vitality.', icon: '📿', value: 80 },
  { id: 'ring_power', nameRu: 'Кольцо Силы', nameEn: 'Ring of Power', type: 'accessory', rarity: 'rare', stats: { strength: 2, attack: 3 }, descriptionRu: 'Кольцо, дающее невероятную силу.', descriptionEn: 'Ring granting incredible power.', icon: '💍', value: 200 },
  { id: 'arcane_pendant', nameRu: 'Тайная подвеска', nameEn: 'Arcane Pendant', type: 'accessory', rarity: 'rare', stats: { intelligence: 2, mp: 10 }, descriptionRu: 'Подвеска, концентрирующая магическую энергию.', descriptionEn: 'Pendant concentrating magical energy.', icon: '🔮', value: 250 },
  { id: 'lucky_charm', nameRu: 'Талисман Удачи', nameEn: 'Lucky Charm', type: 'accessory', rarity: 'epic', stats: { dexterity: 2, charisma: 2, hp: 10 }, descriptionRu: 'Талисман, приносящий удачу в бою.', descriptionEn: 'Charm bringing luck in battle.', icon: '🍀', value: 500 },
  { id: 'crown_fragment', nameRu: 'Осколок Короны', nameEn: 'Crown Fragment', type: 'accessory', rarity: 'legendary', stats: { strength: 3, intelligence: 3, hp: 25 }, descriptionRu: 'Фрагмент Короны Проклятого Короля.', descriptionEn: "Fragment of the Cursed King's Crown.", icon: '👑', value: 3000 },

  // === CONSUMABLES ===
  { id: 'health_potion', nameRu: 'Зелье здоровья', nameEn: 'Health Potion', type: 'consumable', rarity: 'common', stats: { healHp: 15 }, descriptionRu: 'Восстанавливает 15 HP.', descriptionEn: 'Restores 15 HP.', icon: '🧪', value: 15 },
  { id: 'mana_potion', nameRu: 'Зелье маны', nameEn: 'Mana Potion', type: 'consumable', rarity: 'common', stats: { healMp: 8 }, descriptionRu: 'Восстанавливает 8 MP.', descriptionEn: 'Restores 8 MP.', icon: '💧', value: 20 },
  { id: 'greater_health', nameRu: 'Сильное зелье здоровья', nameEn: 'Greater Health Potion', type: 'consumable', rarity: 'uncommon', stats: { healHp: 35 }, descriptionRu: 'Восстанавливает 35 HP.', descriptionEn: 'Restores 35 HP.', icon: '🧪', value: 50 },
  { id: 'elixir_power', nameRu: 'Эликсир Мощи', nameEn: 'Elixir of Power', type: 'consumable', rarity: 'rare', stats: { attack: 5, duration: 3 }, descriptionRu: '+5 к атаке на 3 боя.', descriptionEn: '+5 attack for 3 fights.', icon: '⚗️', value: 150 },
  { id: 'scroll_fireball', nameRu: 'Свиток Огненного Шара', nameEn: 'Fireball Scroll', type: 'consumable', rarity: 'rare', stats: { damage: 20 }, descriptionRu: 'Наносит 20 урона огнём.', descriptionEn: 'Deals 20 fire damage.', icon: '📜', value: 120 },
  { id: 'scroll_heal', nameRu: 'Свиток Исцеления', nameEn: 'Healing Scroll', type: 'consumable', rarity: 'uncommon', stats: { healHp: 25 }, descriptionRu: 'Восстанавливает 25 HP.', descriptionEn: 'Restores 25 HP.', icon: '📜', value: 60 },
  { id: 'antidote', nameRu: 'Противоядие', nameEn: 'Antidote', type: 'consumable', rarity: 'common', stats: { curePoison: 1 }, descriptionRu: 'Снимает отравление.', descriptionEn: 'Cures poison.', icon: '💊', value: 25 },

  // === MATERIALS ===
  { id: 'iron_ore', nameRu: 'Железная руда', nameEn: 'Iron Ore', type: 'material', rarity: 'common', stats: {}, descriptionRu: 'Кусок железной руды. Нужен для крафта.', descriptionEn: 'Piece of iron ore. Needed for crafting.', icon: '🪨', value: 5 },
  { id: 'shadow_essence', nameRu: 'Эссенция Тени', nameEn: 'Shadow Essence', type: 'material', rarity: 'uncommon', stats: {}, descriptionRu: 'Сгусток тёмной энергии. Для зачарования.', descriptionEn: 'Dark energy clump. For enchanting.', icon: '🌑', value: 30 },
  { id: 'dragon_scale', nameRu: 'Чешуя дракона', nameEn: 'Dragon Scale', type: 'material', rarity: 'rare', stats: {}, descriptionRu: 'Прочная чешуя дракона. Редкий материал.', descriptionEn: 'Tough dragon scale. Rare material.', icon: '🐲', value: 100 },
  { id: 'void_crystal', nameRu: 'Кристалл Пустоты', nameEn: 'Void Crystal', type: 'material', rarity: 'epic', stats: {}, descriptionRu: 'Кристалл чистой энергии Пустоты.', descriptionEn: 'Crystal of pure Void energy.', icon: '💎', value: 300 },
  { id: 'crown_shard', nameRu: 'Осколок Короны', nameEn: 'Crown Shard', type: 'material', rarity: 'legendary', stats: {}, descriptionRu: 'Магический осколок проклятой Короны.', descriptionEn: 'Magical shard of the cursed Crown.', icon: '💠', value: 800 },

  // === QUEST ITEMS ===
  { id: 'ancient_map', nameRu: 'Древняя карта', nameEn: 'Ancient Map', type: 'quest', rarity: 'uncommon', stats: {}, descriptionRu: 'Карта, указывающая путь к сокровищу.', descriptionEn: 'Map showing the way to treasure.', icon: '🗺️', value: 0 },
  { id: 'cursed_locket', nameRu: 'Проклятый медальон', nameEn: 'Cursed Locket', type: 'quest', rarity: 'rare', stats: {}, descriptionRu: 'Медальон с тёмной магией.', descriptionEn: 'Locket with dark magic.', icon: '📿', value: 0 },
];

// ===== ENEMIES =====
export interface EnemyTemplate {
  id: string;
  nameRu: string;
  nameEn: string;
  hp: number;
  ac: number;
  attack: number;
  damage: string;
  xp: number;
  gold: number;
  lootTable: { itemId: string; chance: number }[];
  locationId: string;
  isBoss: boolean;
  icon: string;
}

export const ENEMIES: EnemyTemplate[] = [
  // Forest (Level 1-3)
  { id: 'goblin', nameRu: 'Гоблин', nameEn: 'Goblin', hp: 12, ac: 8, attack: 3, damage: '1d4+1', xp: 15, gold: 5, lootTable: [{ itemId: 'rusty_sword', chance: 0.2 }, { itemId: 'health_potion', chance: 0.3 }], locationId: 'forest', isBoss: false, icon: '👺' },
  { id: 'wolf', nameRu: 'Лютоволк', nameEn: 'Dire Wolf', hp: 18, ac: 10, attack: 4, damage: '1d6+2', xp: 20, gold: 3, lootTable: [{ itemId: 'leather_armor', chance: 0.15 }], locationId: 'forest', isBoss: false, icon: '🐺' },
  { id: 'spider', nameRu: 'Гигантский паук', nameEn: 'Giant Spider', hp: 15, ac: 9, attack: 4, damage: '1d4+2', xp: 18, gold: 4, lootTable: [{ itemId: 'antidote', chance: 0.4 }, { itemId: 'shadow_essence', chance: 0.1 }], locationId: 'forest', isBoss: false, icon: '🕷️' },
  { id: 'forest_witch', nameRu: 'Лесная ведьма', nameEn: 'Forest Witch', hp: 25, ac: 11, attack: 6, damage: '1d8+3', xp: 50, gold: 20, lootTable: [{ itemId: 'mana_potion', chance: 0.5 }, { itemId: 'shadow_essence', chance: 0.3 }], locationId: 'forest', isBoss: true, icon: '🧙‍♀️' },

  // Caves (Level 3-5)
  { id: 'bat_swarm', nameRu: 'Стая летучих мышей', nameEn: 'Bat Swarm', hp: 14, ac: 9, attack: 3, damage: '1d4+1', xp: 12, gold: 2, lootTable: [], locationId: 'caves', isBoss: false, icon: '🦇' },
  { id: 'cave_troll', nameRu: 'Пещерный тролль', nameEn: 'Cave Troll', hp: 35, ac: 10, attack: 6, damage: '1d8+4', xp: 35, gold: 15, lootTable: [{ itemId: 'iron_ore', chance: 0.4 }, { itemId: 'iron_sword', chance: 0.15 }], locationId: 'caves', isBoss: false, icon: '🧌' },
  { id: 'slime', nameRu: 'Кислотный слизень', nameEn: 'Acid Slime', hp: 20, ac: 6, attack: 4, damage: '1d6+2', xp: 15, gold: 8, lootTable: [{ itemId: 'antidote', chance: 0.3 }], locationId: 'caves', isBoss: false, icon: '🟢' },
  { id: 'rock_golem', nameRu: 'Каменный голем', nameEn: 'Rock Golem', hp: 45, ac: 14, attack: 7, damage: '1d10+5', xp: 60, gold: 30, lootTable: [{ itemId: 'iron_ore', chance: 0.6 }, { itemId: 'steel_sword', chance: 0.2 }], locationId: 'caves', isBoss: true, icon: '🗿' },

  // Crypt (Level 5-7)
  { id: 'skeleton', nameRu: 'Скелет-воин', nameEn: 'Skeleton Warrior', hp: 22, ac: 11, attack: 5, damage: '1d6+3', xp: 25, gold: 10, lootTable: [{ itemId: 'chainmail', chance: 0.1 }], locationId: 'crypt', isBoss: false, icon: '💀' },
  { id: 'zombie', nameRu: 'Гниющий зомби', nameEn: 'Rotting Zombie', hp: 30, ac: 8, attack: 5, damage: '1d8+2', xp: 22, gold: 5, lootTable: [{ itemId: 'health_potion', chance: 0.3 }], locationId: 'crypt', isBoss: false, icon: '🧟' },
  { id: 'wraith', nameRu: 'Призрак', nameEn: 'Wraith', hp: 28, ac: 13, attack: 7, damage: '1d8+4', xp: 35, gold: 15, lootTable: [{ itemId: 'shadow_essence', chance: 0.4 }, { itemId: 'arcane_pendant', chance: 0.05 }], locationId: 'crypt', isBoss: false, icon: '👻' },
  { id: 'lich', nameRu: 'Лич', nameEn: 'Lich', hp: 60, ac: 15, attack: 10, damage: '2d6+5', xp: 100, gold: 50, lootTable: [{ itemId: 'void_staff', chance: 0.1 }, { itemId: 'void_crystal', chance: 0.3 }], locationId: 'crypt', isBoss: true, icon: '☠️' },

  // Labyrinth (Level 7-9)
  { id: 'minotaur', nameRu: 'Минотавр', nameEn: 'Minotaur', hp: 45, ac: 12, attack: 8, damage: '1d10+6', xp: 45, gold: 20, lootTable: [{ itemId: 'steel_sword', chance: 0.15 }], locationId: 'labyrinth', isBoss: false, icon: '🐂' },
  { id: 'medusa', nameRu: 'Медуза', nameEn: 'Medusa', hp: 40, ac: 14, attack: 9, damage: '1d8+5', xp: 50, gold: 25, lootTable: [{ itemId: 'shadow_dagger', chance: 0.1 }], locationId: 'labyrinth', isBoss: false, icon: '🐍' },
  { id: 'dark_mage', nameRu: 'Тёмный маг', nameEn: 'Dark Mage', hp: 35, ac: 11, attack: 12, damage: '2d6+4', xp: 55, gold: 30, lootTable: [{ itemId: 'scroll_fireball', chance: 0.2 }, { itemId: 'arcane_pendant', chance: 0.1 }], locationId: 'labyrinth', isBoss: false, icon: '🧙' },
  { id: 'shadow_lord', nameRu: 'Повелитель Теней', nameEn: 'Shadow Lord', hp: 80, ac: 16, attack: 12, damage: '2d8+6', xp: 150, gold: 80, lootTable: [{ itemId: 'shadow_cloak', chance: 0.2 }, { itemId: 'shadow_dagger', chance: 0.3 }], locationId: 'labyrinth', isBoss: true, icon: '🌑' },

  // Forge (Level 9-11)
  { id: 'fire_elemental', nameRu: 'Огненный элементаль', nameEn: 'Fire Elemental', hp: 50, ac: 13, attack: 10, damage: '2d6+5', xp: 55, gold: 25, lootTable: [{ itemId: 'flame_blade', chance: 0.08 }], locationId: 'forge', isBoss: false, icon: '🔥' },
  { id: 'demon_forge', nameRu: 'Демон-кузнец', nameEn: 'Forge Demon', hp: 55, ac: 14, attack: 11, damage: '2d8+4', xp: 60, gold: 30, lootTable: [{ itemId: 'iron_ore', chance: 0.5 }, { itemId: 'dragon_scale', chance: 0.1 }], locationId: 'forge', isBoss: false, icon: '😈' },
  { id: 'inferno_dragon', nameRu: 'Инфернальный дракон', nameEn: 'Inferno Dragon', hp: 100, ac: 17, attack: 14, damage: '3d6+8', xp: 200, gold: 100, lootTable: [{ itemId: 'dragonscale_armor', chance: 0.15 }, { itemId: 'dragon_scale', chance: 0.5 }], locationId: 'forge', isBoss: true, icon: '🐲' },

  // Abyss (Level 11-13)
  { id: 'void_walker', nameRu: 'Ходок Пустоты', nameEn: 'Void Walker', hp: 60, ac: 15, attack: 13, damage: '2d8+6', xp: 70, gold: 35, lootTable: [{ itemId: 'void_crystal', chance: 0.2 }], locationId: 'abyss', isBoss: false, icon: '🕳️' },
  { id: 'abyss_horror', nameRu: 'Ужас Бездны', nameEn: 'Abyss Horror', hp: 70, ac: 16, attack: 15, damage: '3d6+7', xp: 85, gold: 40, lootTable: [{ itemId: 'void_crystal', chance: 0.3 }, { itemId: 'crown_shard', chance: 0.05 }], locationId: 'abyss', isBoss: false, icon: '👁️' },

  // Throne (Level 13+)
  { id: 'cursed_king', nameRu: 'Проклятый Король', nameEn: 'Cursed King', hp: 200, ac: 20, attack: 18, damage: '3d10+10', xp: 500, gold: 300, lootTable: [{ itemId: 'cursed_king_blade', chance: 0.1 }, { itemId: 'crown_fragment', chance: 0.15 }, { itemId: 'crown_shard', chance: 0.4 }], locationId: 'throne', isBoss: true, icon: '👑' },
];

// ===== CRAFTING RECIPES =====
export interface CraftingRecipe {
  id: string;
  nameRu: string;
  nameEn: string;
  materials: { itemId: string; quantity: number }[];
  result: { itemId: string; quantity: number };
  icon: string;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  { id: 'craft_steel_sword', nameRu: 'Ковать Стальной меч', nameEn: 'Forge Steel Sword', materials: [{ itemId: 'iron_ore', quantity: 3 }], result: { itemId: 'steel_sword', quantity: 1 }, icon: '⚒️' },
  { id: 'craft_chainmail', nameRu: 'Ковать Кольчугу', nameEn: 'Forge Chainmail', materials: [{ itemId: 'iron_ore', quantity: 4 }], result: { itemId: 'chainmail', quantity: 1 }, icon: '⚒️' },
  { id: 'craft_health_potion', nameRu: 'Варить Зелье здоровья', nameEn: 'Brew Health Potion', materials: [{ itemId: 'iron_ore', quantity: 1 }], result: { itemId: 'health_potion', quantity: 2 }, icon: '🧪' },
  { id: 'craft_shadow_dagger', nameRu: 'Зачаровать Теневой кинжал', nameEn: 'Enchant Shadow Dagger', materials: [{ itemId: 'steel_sword', quantity: 1 }, { itemId: 'shadow_essence', quantity: 2 }], result: { itemId: 'shadow_dagger', quantity: 1 }, icon: '✨' },
  { id: 'craft_flame_blade', nameRu: 'Ковать Пламенный клинок', nameEn: 'Forge Flame Blade', materials: [{ itemId: 'steel_sword', quantity: 1 }, { itemId: 'dragon_scale', quantity: 1 }], result: { itemId: 'flame_blade', quantity: 1 }, icon: '🔥' },
  { id: 'craft_dragonscale', nameRu: 'Ковать Драконью чешую', nameEn: 'Forge Dragonscale Armor', materials: [{ itemId: 'dragon_scale', quantity: 3 }, { itemId: 'iron_ore', quantity: 5 }], result: { itemId: 'dragonscale_armor', quantity: 1 }, icon: '🐉' },
  { id: 'craft_void_staff', nameRu: 'Создать Посох Пустоты', nameEn: 'Create Void Staff', materials: [{ itemId: 'void_crystal', quantity: 2 }, { itemId: 'shadow_essence', quantity: 3 }], result: { itemId: 'void_staff', quantity: 1 }, icon: '🪄' },
  { id: 'craft_greater_health', nameRu: 'Варить Сильное зелье', nameEn: 'Brew Greater Health Potion', materials: [{ itemId: 'health_potion', quantity: 2 }, { itemId: 'shadow_essence', quantity: 1 }], result: { itemId: 'greater_health', quantity: 1 }, icon: '🧪' },
  { id: 'craft_frost_axe', nameRu: 'Ковать Ледяной топор', nameEn: 'Forge Frost Axe', materials: [{ itemId: 'dragon_scale', quantity: 2 }, { itemId: 'void_crystal', quantity: 1 }], result: { itemId: 'frost_axe', quantity: 1 }, icon: '🪓' },
  { id: 'craft_crown_shard', nameRu: 'Собрать Осколок Короны', nameEn: 'Assemble Crown Shard', materials: [{ itemId: 'void_crystal', quantity: 3 }, { itemId: 'shadow_essence', quantity: 5 }], result: { itemId: 'crown_shard', quantity: 1 }, icon: '💠' },
  { id: 'craft_elixir', nameRu: 'Варить Эликсир Мощи', nameEn: 'Brew Elixir of Power', materials: [{ itemId: 'shadow_essence', quantity: 2 }, { itemId: 'health_potion', quantity: 1 }], result: { itemId: 'elixir_power', quantity: 1 }, icon: '⚗️' },
];

// ===== QUEST TEMPLATES =====
export interface QuestTemplate {
  id: string;
  type: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  target: number;
  reward: { xp: number; gold: number; items?: string[] };
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  { id: 'daily_kill_1', type: 'daily', titleRu: 'Охота на гоблинов', titleEn: 'Goblin Hunt', descriptionRu: 'Убейте 3 гоблинов в Тёмном Лесу.', descriptionEn: 'Kill 3 goblins in the Dark Forest.', target: 3, reward: { xp: 30, gold: 15 } },
  { id: 'daily_explore_1', type: 'daily', titleRu: 'Исследователь', titleEn: 'Explorer', descriptionRu: 'Исследуйте любую локацию 5 раз.', descriptionEn: 'Explore any location 5 times.', target: 5, reward: { xp: 20, gold: 10 } },
  { id: 'daily_craft_1', type: 'daily', titleRu: 'Подмастерье', titleEn: 'Apprentice', descriptionRu: 'Скрафтите 2 предмета.', descriptionEn: 'Craft 2 items.', target: 2, reward: { xp: 25, gold: 12 } },
  { id: 'kill_boss_1', type: 'kill', titleRu: 'Убить Лесную ведьму', titleEn: 'Kill the Forest Witch', descriptionRu: 'Победите Лесную ведьму.', descriptionEn: 'Defeat the Forest Witch.', target: 1, reward: { xp: 100, gold: 50, items: ['shadow_essence'] } },
  { id: 'kill_boss_2', type: 'kill', titleRu: 'Убить Лича', titleEn: 'Kill the Lich', descriptionRu: 'Победите Лича в Древней Гробнице.', descriptionEn: 'Defeat the Lich in the Ancient Crypt.', target: 1, reward: { xp: 200, gold: 100, items: ['void_crystal'] } },
  { id: 'kill_boss_3', type: 'kill', titleRu: 'Свергнуть Короля', titleEn: 'Dethrone the King', descriptionRu: 'Победите Проклятого Короля.', descriptionEn: 'Defeat the Cursed King.', target: 1, reward: { xp: 1000, gold: 500, items: ['crown_fragment'] } },
];

// ===== ABILITIES =====
export interface Ability {
  id: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  classId: string;       // which class can use this
  mpCost: number;        // MP cost to use
  hpCost: number;        // HP cost (0 for most)
  level: number;         // minimum level required
  type: 'damage' | 'heal' | 'buff';  // ability type
  damage?: string;       // dice formula for damage (e.g. "3d6")
  heal?: string;         // dice formula for healing
  scalingStat: string;   // which stat adds bonus (e.g. "intelligence")
  icon: string;
}

export const ABILITIES: Ability[] = [
  // Warrior
  { id: 'power_strike', nameRu: 'Мощный удар', nameEn: 'Power Strike', descriptionRu: 'Сильный удар, наносящий двойной урон.', descriptionEn: 'A powerful strike dealing double damage.', classId: 'warrior', mpCost: 0, hpCost: 5, level: 1, type: 'damage', damage: '2d8', scalingStat: 'strength', icon: '💥' },
  { id: 'shield_bash', nameRu: 'Удар щитом', nameEn: 'Shield Bash', descriptionRu: 'Оглушает врага, пропуская его ход.', descriptionEn: 'Stuns the enemy, skipping their turn.', classId: 'warrior', mpCost: 3, hpCost: 0, level: 3, type: 'damage', damage: '1d6', scalingStat: 'strength', icon: '🛡️' },
  { id: 'berserker_rage', nameRu: 'Берсерк', nameEn: 'Berserker Rage', descriptionRu: 'Жертвует HP для массивного урона.', descriptionEn: 'Sacrifices HP for massive damage.', classId: 'warrior', mpCost: 0, hpCost: 10, level: 5, type: 'damage', damage: '3d10', scalingStat: 'strength', icon: '😤' },

  // Mage
  { id: 'fireball', nameRu: 'Огненный шар', nameEn: 'Fireball', descriptionRu: 'Взрыв огня, наносящий 3d6 урона.', descriptionEn: 'Blast of fire dealing 3d6 damage.', classId: 'mage', mpCost: 5, hpCost: 0, level: 1, type: 'damage', damage: '3d6', scalingStat: 'intelligence', icon: '🔥' },
  { id: 'ice_storm', nameRu: 'Ледяная буря', nameEn: 'Ice Storm', descriptionRu: 'Замораживающая буря. 2d8 урона.', descriptionEn: 'Freezing storm. 2d8 damage.', classId: 'mage', mpCost: 7, hpCost: 0, level: 3, type: 'damage', damage: '2d8', scalingStat: 'intelligence', icon: '❄️' },
  { id: 'arcane_blast', nameRu: 'Арканный взрыв', nameEn: 'Arcane Blast', descriptionRu: 'Чистая магическая энергия. 4d6 урона.', descriptionEn: 'Pure magical energy. 4d6 damage.', classId: 'mage', mpCost: 10, hpCost: 0, level: 5, type: 'damage', damage: '4d6', scalingStat: 'intelligence', icon: '💜' },

  // Rogue
  { id: 'sneak_attack', nameRu: 'Скрытая атака', nameEn: 'Sneak Attack', descriptionRu: 'Атака из тени с авто-критом.', descriptionEn: 'Strike from shadows with auto-crit.', classId: 'rogue', mpCost: 3, hpCost: 0, level: 1, type: 'damage', damage: '2d6', scalingStat: 'dexterity', icon: '🗡️' },
  { id: 'poison_blade', nameRu: 'Отравленный клинок', nameEn: 'Poison Blade', descriptionRu: 'Наносит урон ядом. 1d8 + 1d4.', descriptionEn: 'Poisoned strike. 1d8 + 1d4.', classId: 'rogue', mpCost: 4, hpCost: 0, level: 3, type: 'damage', damage: '1d8+1d4', scalingStat: 'dexterity', icon: '☠️' },
  { id: 'shadow_strike', nameRu: 'Теневой удар', nameEn: 'Shadow Strike', descriptionRu: 'Молниеносная атака. 3d8 урона.', descriptionEn: 'Lightning strike. 3d8 damage.', classId: 'rogue', mpCost: 6, hpCost: 0, level: 5, type: 'damage', damage: '3d8', scalingStat: 'dexterity', icon: '🌑' },

  // Cleric
  { id: 'heal', nameRu: 'Исцеление', nameEn: 'Heal', descriptionRu: 'Восстанавливает HP.', descriptionEn: 'Restores HP.', classId: 'cleric', mpCost: 4, hpCost: 0, level: 1, type: 'heal', heal: '2d8', scalingStat: 'wisdom', icon: '✨' },
  { id: 'smite', nameRu: 'Кара', nameEn: 'Smite', descriptionRu: 'Божественный удар. 2d8 урона нежити.', descriptionEn: 'Divine strike. 2d8 damage to undead.', classId: 'cleric', mpCost: 5, hpCost: 0, level: 1, type: 'damage', damage: '2d8', scalingStat: 'wisdom', icon: '⚡' },
  { id: 'divine_shield', nameRu: 'Божественный щит', nameEn: 'Divine Shield', descriptionRu: 'Исцеление + урон. 1d6 исцеления, 1d6 урона.', descriptionEn: 'Heal + damage. 1d6 heal, 1d6 damage.', classId: 'cleric', mpCost: 7, hpCost: 0, level: 4, type: 'heal', heal: '1d6', damage: '1d6', scalingStat: 'wisdom', icon: '🛡️' },

  // Ranger
  { id: 'aimed_shot', nameRu: 'Прицельный выстрел', nameEn: 'Aimed Shot', descriptionRu: 'Точный выстрел с бонусом. 2d8 урона.', descriptionEn: 'Precise shot with bonus. 2d8 damage.', classId: 'ranger', mpCost: 3, hpCost: 0, level: 1, type: 'damage', damage: '2d8', scalingStat: 'dexterity', icon: '🎯' },
  { id: 'volley', nameRu: 'Залп стрел', nameEn: 'Arrow Volley', descriptionRu: 'Дождь стрел. 2d6 урона.', descriptionEn: 'Rain of arrows. 2d6 damage.', classId: 'ranger', mpCost: 5, hpCost: 0, level: 3, type: 'damage', damage: '2d6', scalingStat: 'dexterity', icon: '🏹' },
  { id: 'natures_wrath', nameRu: 'Гнев природы', nameEn: "Nature's Wrath", descriptionRu: 'Сила природы обрушивается на врага. 3d8 урона.', descriptionEn: "Nature's fury unleashed. 3d8 damage.", classId: 'ranger', mpCost: 8, hpCost: 0, level: 5, type: 'damage', damage: '3d8', scalingStat: 'wisdom', icon: '🌿' },
];

export function getAbilitiesForClass(classId: string, level: number): Ability[] {
  return ABILITIES.filter(a => a.classId === classId && a.level <= level);
}

// ===== RARITY COLORS =====
export const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
  artifact: '#ef4444',
  mythic: '#ec4899',
};

export const RARITY_NAMES_RU: Record<string, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
  artifact: 'Артефакт',
  mythic: 'Мифический',
};

// ===== HELPER FUNCTIONS =====
export function getRace(id: string): Race | undefined {
  return RACES.find(r => r.id === id);
}

export function getClass(id: string): GameClass | undefined {
  return CLASSES.find(c => c.id === id);
}

export function getLocation(id: string): Location | undefined {
  return LOCATIONS.find(l => l.id === id);
}

export function getItem(id: string): Item | undefined {
  return ITEMS.find(i => i.id === id);
}

export function getEnemiesForLocation(locationId: string): EnemyTemplate[] {
  return ENEMIES.filter(e => e.locationId === locationId);
}

export function calculateStat(base: number, raceBonus: number, level: number): number {
  return base + raceBonus + Math.floor(level / 4);
}

export function xpForLevel(level: number): number {
  return level * 100;
}

export function getItemByRarity(rarity: string): Item[] {
  return ITEMS.filter(i => i.rarity === rarity);
}

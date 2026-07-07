// ===== LOCATIONS =====
// Акт 1: Пепельные Врата (Люди), уровни 1-3. Остальные Акты (2-6) ещё не спроектированы
// под новый лор и намеренно не включены — см. docs/cursed_depths_master.pdf, раздел 2.1.
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
    nameRu: 'Пепельные Врата',
    nameEn: 'Ashen Gate',
    descriptionRu: 'Вы очнулись здесь без памяти — лишь шрам через полмира и эхо голоса Карсуса в ушах. Безопасное убежище. Отдохните, чтобы восстановить HP и MP.',
    descriptionEn: 'You woke here with no memory — only a scar across half the world and the echo of Karsus\' voice. A safe haven. Rest here to restore HP and MP.',
    icon: '🏚️',
    level: 0,
    connections: ['market', 'burned_village'],
  },
  {
    id: 'market',
    nameRu: 'Торговый двор Врат',
    nameEn: "Gate's Trading Yard",
    descriptionRu: 'Уцелевшие торговцы предлагают снаряжение тем немногим, кто ещё решается выйти за стены.',
    descriptionEn: 'Surviving merchants offer gear to the few still willing to leave the walls.',
    icon: '🏪',
    level: 0,
    connections: ['town'],
  },
  {
    id: 'burned_village',
    nameRu: 'Сожжённая деревня',
    nameEn: 'Burned Village',
    descriptionRu: 'Обугленные остовы домов. Здесь выжившие делают первые шаги против того, во что превратился мир после Падения.',
    descriptionEn: 'Charred husks of houses. Here survivors take their first steps against what the world became after the Fall.',
    icon: '🔥',
    level: 1,
    connections: ['town', 'velarion_temple', 'sorrow_road'],
  },
  {
    id: 'velarion_temple',
    nameRu: 'Храм Велариона',
    nameEn: 'Temple of Velarion',
    descriptionRu: 'Заброшенный храм Владыки Огня и Пепла. Тени под сводами ещё помнят, каким он был до Падения.',
    descriptionEn: 'An abandoned temple of the Lord of Fire and Ash. The shadows beneath its vaults still remember what it was before the Fall.',
    icon: '⛩️',
    level: 1,
    connections: ['burned_village'],
  },
  {
    id: 'sorrow_road',
    nameRu: 'Тракт Скорби',
    nameEn: 'Sorrow Road',
    descriptionRu: 'Дорога между руинами, усеянная брошенными телегами и следами тех, кто не дошёл.',
    descriptionEn: 'A road between ruins, littered with abandoned carts and the traces of those who never made it.',
    icon: '🪦',
    level: 2,
    connections: ['burned_village', 'ashen_fortress'],
  },
  {
    id: 'ashen_fortress',
    nameRu: 'Пепельная крепость',
    nameEn: 'Ashen Fortress',
    descriptionRu: 'Последний оплот людей перед Падением. Стены ещё стоят — но гарнизон уже не тот.',
    descriptionEn: "Humanity's last stronghold before the Fall. The walls still stand — but the garrison is no longer what it was.",
    icon: '🏰',
    level: 2,
    connections: ['sorrow_road', 'karsus_rift'],
  },
  {
    id: 'karsus_rift',
    nameRu: 'Разлом Карсуса',
    nameEn: "Karsus' Rift",
    descriptionRu: 'Трещина в самой ткани мира. Отсюда голос Карсуса впервые прозвучал на весь Пепельный Край. Вход в Глубь.',
    descriptionEn: "A crack in the fabric of the world. Here Karsus' voice first rang out across the Ashen Reach. The entrance to the Depths.",
    icon: '🌀',
    level: 3,
    connections: ['ashen_fortress'],
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
  { id: 'flame_blade', nameRu: 'Пламенный клинок', nameEn: 'Flame Blade', type: 'weapon', rarity: 'rare', stats: { attack: 9, intellect: 1 }, descriptionRu: 'Меч, пылающий магическим огнём.', descriptionEn: 'Sword blazing with magical fire.', icon: '🔥', value: 350 },
  { id: 'frost_axe', nameRu: 'Ледяной топор', nameEn: 'Frost Axe', type: 'weapon', rarity: 'epic', stats: { attack: 12, strength: 2 }, descriptionRu: 'Топор вечного холода. Замораживает врагов.', descriptionEn: 'Axe of eternal cold. Freezes enemies.', icon: '🪓', value: 600 },
  { id: 'void_staff', nameRu: 'Посох Пустоты', nameEn: 'Void Staff', type: 'weapon', rarity: 'epic', stats: { attack: 8, intellect: 4, mp: 15 }, descriptionRu: 'Посох, черпающий силу из Пустоты.', descriptionEn: 'Staff drawing power from the Void.', icon: '🪄', value: 700 },
  { id: 'dragonslayer', nameRu: 'Драконоборец', nameEn: 'Dragonslayer', type: 'weapon', rarity: 'legendary', stats: { attack: 16, strength: 3, vitality: 2 }, descriptionRu: 'Легендарный меч, созданный для убийства драконов.', descriptionEn: 'Legendary sword forged to slay dragons.', icon: '⚔️', value: 1500 },
  { id: 'cursed_king_blade', nameRu: 'Клинок Проклятого Короля', nameEn: "Cursed King's Blade", type: 'weapon', rarity: 'mythic', stats: { attack: 25, strength: 5, dexterity: 3 }, descriptionRu: 'Мифический клинок, пропитанный проклятием Короля.', descriptionEn: "Mythic blade soaked in the King's curse.", icon: '👑', value: 5000 },

  // === ARMOR ===
  { id: 'leather_armor', nameRu: 'Кожаная броня', nameEn: 'Leather Armor', type: 'armor', rarity: 'common', stats: { defense: 2 }, descriptionRu: 'Простая кожаная броня.', descriptionEn: 'Simple leather armor.', icon: '🦺', value: 15 },
  { id: 'chainmail', nameRu: 'Кольчуга', nameEn: 'Chainmail', type: 'armor', rarity: 'uncommon', stats: { defense: 4 }, descriptionRu: 'Кольчужная броня из стальных колец.', descriptionEn: 'Chainmail of steel rings.', icon: '🛡️', value: 60 },
  { id: 'dwarven_plate', nameRu: 'Дварфийская латная броня', nameEn: 'Dwarven Plate', type: 'armor', rarity: 'rare', stats: { defense: 7, vitality: 1 }, descriptionRu: 'Тяжёлая броня дварфийской ковки.', descriptionEn: 'Heavy armor of dwarven make.', icon: '🛡️', value: 250 },
  { id: 'shadow_cloak', nameRu: 'Плащ Теней', nameEn: 'Shadow Cloak', type: 'armor', rarity: 'rare', stats: { defense: 3, dexterity: 2 }, descriptionRu: 'Плащ, скрывающий во тьме.', descriptionEn: 'A cloak that hides in darkness.', icon: '🧥', value: 200 },
  { id: 'dragonscale_armor', nameRu: 'Драконья чешуя', nameEn: 'Dragonscale Armor', type: 'armor', rarity: 'epic', stats: { defense: 10, strength: 1, vitality: 2 }, descriptionRu: 'Броня из чешуи дракона.', descriptionEn: 'Armor made from dragon scales.', icon: '🐉', value: 800 },
  { id: 'celestial_robe', nameRu: 'Небесная мантия', nameEn: 'Celestial Robe', type: 'armor', rarity: 'epic', stats: { defense: 4, intellect: 3, willpower: 2 }, descriptionRu: 'Мантия, благословлённая небесами.', descriptionEn: 'Robe blessed by the heavens.', icon: '✨', value: 700 },
  { id: 'crown_armor', nameRu: 'Броня Короны', nameEn: 'Crown Armor', type: 'armor', rarity: 'legendary', stats: { defense: 14, strength: 2, vitality: 3, willpower: 2 }, descriptionRu: 'Легендарная броня, носящая печать Короля.', descriptionEn: "Legendary armor bearing the King's seal.", icon: '👑', value: 2000 },

  // === ACCESSORIES ===
  { id: 'copper_ring', nameRu: 'Медное кольцо', nameEn: 'Copper Ring', type: 'accessory', rarity: 'common', stats: { hp: 5 }, descriptionRu: 'Простое медное кольцо с защитным чаром.', descriptionEn: 'Simple copper ring with a ward charm.', icon: '💍', value: 10 },
  { id: 'amulet_vitality', nameRu: 'Амулет Жизни', nameEn: 'Amulet of Vitality', type: 'accessory', rarity: 'uncommon', stats: { hp: 15, vitality: 1 }, descriptionRu: 'Амулет, усиливающий жизненную силу.', descriptionEn: 'Amulet that enhances vitality.', icon: '📿', value: 80 },
  { id: 'ring_power', nameRu: 'Кольцо Силы', nameEn: 'Ring of Power', type: 'accessory', rarity: 'rare', stats: { strength: 2, attack: 3 }, descriptionRu: 'Кольцо, дающее невероятную силу.', descriptionEn: 'Ring granting incredible power.', icon: '💍', value: 200 },
  { id: 'arcane_pendant', nameRu: 'Тайная подвеска', nameEn: 'Arcane Pendant', type: 'accessory', rarity: 'rare', stats: { intellect: 2, mp: 10 }, descriptionRu: 'Подвеска, концентрирующая магическую энергию.', descriptionEn: 'Pendant concentrating magical energy.', icon: '🔮', value: 250 },
  { id: 'lucky_charm', nameRu: 'Талисман Удачи', nameEn: 'Lucky Charm', type: 'accessory', rarity: 'epic', stats: { dexterity: 2, instinct: 2, hp: 10 }, descriptionRu: 'Талисман, приносящий удачу в бою.', descriptionEn: 'Charm bringing luck in battle.', icon: '🍀', value: 500 },
  { id: 'crown_fragment', nameRu: 'Осколок Короны', nameEn: 'Crown Fragment', type: 'accessory', rarity: 'legendary', stats: { strength: 3, intellect: 3, hp: 25 }, descriptionRu: 'Фрагмент Короны Проклятого Короля.', descriptionEn: "Fragment of the Cursed King's Crown.", icon: '👑', value: 3000 },
  { id: 'ashen_amulet', nameRu: 'Пепельный амулет Хранителя', nameEn: "Keeper's Ashen Amulet", type: 'accessory', rarity: 'rare', stats: { willpower: 2, hp: 15 }, descriptionRu: 'Амулет падшего жреца Велариона, ещё хранящий отголосок веры.', descriptionEn: "Amulet of a fallen priest of Velarion, still echoing with faith.", icon: '📿', value: 220 },
  { id: 'witness_eye', nameRu: 'Око Первого Свидетеля', nameEn: 'Eye of the First Witness', type: 'accessory', rarity: 'epic', stats: { instinct: 3, willpower: 2, hp: 20 }, descriptionRu: 'Застывшее око духа, видевшего Падение. Носитель иногда слышит его крик.', descriptionEn: 'The frozen eye of the spirit who witnessed the Fall. Its wearer sometimes hears its scream.', icon: '👁️', value: 650 },

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
// Акт 1: Пепельные Врата, уровни 1-3. У босса «Первый Свидетель» по лору два боевых
// облика, чередующихся каждые 3 хода (физический/магический), и вторая фаза на 30% HP,
// объединяющая оба облика — эта механика фаз пока не реализована в combat-engine
// (текущий движок работает с одиночным набором hp/ac/attack/damage на врага) и намеренно
// отложена как отдельная задача; сейчас босс представлен усреднённым набором характеристик.
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
  // Сожжённая деревня (Level 1)
  { id: 'blighted_villager', nameRu: 'Заражённый Скверной крестьянин', nameEn: 'Blighted Villager', hp: 12, ac: 7, attack: 3, damage: '1d4+1', xp: 12, gold: 4, lootTable: [{ itemId: 'health_potion', chance: 0.3 }, { itemId: 'rusty_sword', chance: 0.15 }], locationId: 'burned_village', isBoss: false, icon: '🧟' },
  { id: 'ashen_jackal', nameRu: 'Пепельный шакал', nameEn: 'Ashen Jackal', hp: 10, ac: 8, attack: 3, damage: '1d4', xp: 10, gold: 2, lootTable: [{ itemId: 'antidote', chance: 0.2 }], locationId: 'burned_village', isBoss: false, icon: '🐺' },
  { id: 'ash_marauder', nameRu: 'Мародёр Пепла', nameEn: 'Ash Marauder', hp: 16, ac: 9, attack: 4, damage: '1d6+1', xp: 16, gold: 7, lootTable: [{ itemId: 'leather_armor', chance: 0.15 }, { itemId: 'rusty_sword', chance: 0.2 }], locationId: 'burned_village', isBoss: false, icon: '🔪' },

  // Храм Велариона (Level 1-2)
  { id: 'corrupted_acolyte', nameRu: 'Осквернённый послушник', nameEn: 'Corrupted Acolyte', hp: 18, ac: 9, attack: 4, damage: '1d6+1', xp: 18, gold: 8, lootTable: [{ itemId: 'mana_potion', chance: 0.3 }, { itemId: 'antidote', chance: 0.2 }], locationId: 'velarion_temple', isBoss: false, icon: '🕯️' },
  { id: 'ashen_guardian', nameRu: 'Пепельный страж', nameEn: 'Ashen Guardian', hp: 24, ac: 11, attack: 5, damage: '1d6+2', xp: 24, gold: 10, lootTable: [{ itemId: 'iron_sword', chance: 0.15 }, { itemId: 'iron_ore', chance: 0.3 }], locationId: 'velarion_temple', isBoss: false, icon: '🗿' },
  { id: 'keeper_of_ashes', nameRu: 'Хранитель Пепла', nameEn: 'Keeper of Ashes', hp: 42, ac: 12, attack: 7, damage: '1d8+3', xp: 70, gold: 30, lootTable: [{ itemId: 'ashen_amulet', chance: 0.4 }, { itemId: 'greater_health', chance: 0.3 }], locationId: 'velarion_temple', isBoss: true, icon: '⚱️' },

  // Тракт Скорби (Level 2)
  { id: 'road_bandit', nameRu: 'Разбойник Тракта', nameEn: 'Road Bandit', hp: 20, ac: 9, attack: 5, damage: '1d6+2', xp: 20, gold: 15, lootTable: [{ itemId: 'iron_sword', chance: 0.2 }, { itemId: 'chainmail', chance: 0.1 }], locationId: 'sorrow_road', isBoss: false, icon: '🗡️' },
  { id: 'mourning_wraith', nameRu: 'Скорбный дух', nameEn: 'Mourning Wraith', hp: 19, ac: 11, attack: 5, damage: '1d6+2', xp: 23, gold: 6, lootTable: [{ itemId: 'shadow_essence', chance: 0.25 }, { itemId: 'mana_potion', chance: 0.3 }], locationId: 'sorrow_road', isBoss: false, icon: '👻' },
  { id: 'ashen_crow_flock', nameRu: 'Стая пепельных воронов', nameEn: 'Ashen Crow Flock', hp: 14, ac: 8, attack: 4, damage: '1d4+2', xp: 15, gold: 4, lootTable: [{ itemId: 'antidote', chance: 0.2 }], locationId: 'sorrow_road', isBoss: false, icon: '🐦' },

  // Пепельная крепость (Level 2-3)
  { id: 'possessed_guard', nameRu: 'Одержимый страж крепости', nameEn: 'Possessed Fortress Guard', hp: 30, ac: 12, attack: 6, damage: '1d8+3', xp: 30, gold: 16, lootTable: [{ itemId: 'chainmail', chance: 0.2 }, { itemId: 'steel_sword', chance: 0.1 }], locationId: 'ashen_fortress', isBoss: false, icon: '🛡️' },
  { id: 'renegade_mage', nameRu: 'Скверный маг-отступник', nameEn: 'Blight-touched Renegade', hp: 26, ac: 10, attack: 7, damage: '1d8+2', xp: 32, gold: 18, lootTable: [{ itemId: 'mana_potion', chance: 0.4 }, { itemId: 'scroll_fireball', chance: 0.1 }], locationId: 'ashen_fortress', isBoss: false, icon: '🧙' },
  { id: 'fortress_ash_golem', nameRu: 'Пепельный голем крепости', nameEn: 'Fortress Ash Golem', hp: 45, ac: 13, attack: 8, damage: '1d10+3', xp: 48, gold: 25, lootTable: [{ itemId: 'iron_ore', chance: 0.5 }, { itemId: 'dwarven_plate', chance: 0.05 }], locationId: 'ashen_fortress', isBoss: false, icon: '🗿' },

  // Разлом Карсуса (Level 3)
  { id: 'rift_spawn', nameRu: 'Порождение Разлома', nameEn: 'Rift Spawn', hp: 28, ac: 11, attack: 6, damage: '1d8+2', xp: 30, gold: 12, lootTable: [{ itemId: 'shadow_essence', chance: 0.3 }, { itemId: 'greater_health', chance: 0.2 }], locationId: 'karsus_rift', isBoss: false, icon: '🕳️' },
  { id: 'first_witness', nameRu: 'Первый Свидетель', nameEn: 'The First Witness', hp: 95, ac: 14, attack: 10, damage: '2d8+5', xp: 280, gold: 120, lootTable: [{ itemId: 'witness_eye', chance: 0.25 }, { itemId: 'ashen_amulet', chance: 0.15 }, { itemId: 'elixir_power', chance: 0.3 }], locationId: 'karsus_rift', isBoss: true, icon: '👁️' },
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

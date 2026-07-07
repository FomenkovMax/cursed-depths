// ===== LOCATIONS =====
// Акт 1: Пепельные Врата (Люди), уровни 1-3. Акт 2: Корневая Роща (Эльфы), уровни 3-4.
// Акт 3: Каменный Чертог (Гномы), уровни 4-5. Акт 4: Драконье Горнило (Драконорождённые),
// уровни 5-6. Акты 5-6 ещё не спроектированы под новый лор и намеренно не включены —
// см. docs/cursed_depths_master.pdf, раздел 2.1.
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
    connections: ['ashen_fortress', 'outer_grove'],
  },
  {
    id: 'outer_grove',
    nameRu: 'Внешняя роща',
    nameEn: 'Outer Grove',
    descriptionRu: 'Лес на границе владений эльфов. Деревья ещё живы, но их листва день ото дня сереет — Нить Жизни рвётся где-то глубже.',
    descriptionEn: "A forest on the edge of elven lands. The trees still live, but their leaves grey by the day — the Thread of Life is fraying somewhere deeper.",
    icon: '🌲',
    level: 3,
    connections: ['karsus_rift', 'dead_shore', 'heart_of_grove'],
  },
  {
    id: 'dead_shore',
    nameRu: 'Мёртвый берег',
    nameEn: 'Dead Shore',
    descriptionRu: 'Река, несущая Скверну из Глуби. Вода здесь не отражает свет и не даёт жизни ничему, что в неё войдёт.',
    descriptionEn: "A river carrying Blight up from the Depths. The water here reflects no light and gives life to nothing that enters it.",
    icon: '🌊',
    level: 3,
    connections: ['outer_grove'],
  },
  {
    id: 'heart_of_grove',
    nameRu: 'Сердце Рощи',
    nameEn: 'Heart of the Grove',
    descriptionRu: 'Гигантское мёртвое дерево — некогда храм Айлет. Его корни ещё помнят тепло богини, но кора сочится чёрным соком.',
    descriptionEn: "A gigantic dead tree — once a temple of Ailet. Its roots still remember the goddess' warmth, but its bark weeps black sap.",
    icon: '🌳',
    level: 3,
    connections: ['outer_grove', 'shade_mycelium'],
  },
  {
    id: 'shade_mycelium',
    nameRu: 'Тень-грибница',
    nameEn: 'Shade Mycelium',
    descriptionRu: 'Подземная сеть, заражённая Скверной. То, что раньше связывало лес воедино, теперь тянет его к гибели.',
    descriptionEn: "An underground network infected by the Blight. What once bound the forest together now drags it toward death.",
    icon: '🍄',
    level: 4,
    connections: ['heart_of_grove', 'abyss_root'],
  },
  {
    id: 'abyss_root',
    nameRu: 'Корень Бездны',
    nameEn: 'Root of the Abyss',
    descriptionRu: 'Корни мёртвого дерева уходят прямиком в Глубь. Здесь обитает то, что осталось от богини Жизни.',
    descriptionEn: "The dead tree's roots plunge straight into the Depths. Here dwells what remains of the goddess of Life.",
    icon: '🥀',
    level: 4,
    connections: ['shade_mycelium', 'outer_mines'],
  },
  {
    id: 'outer_mines',
    nameRu: 'Внешние шахты',
    nameEn: 'Outer Mines',
    descriptionRu: 'Заброшенные тоннели на границе гномьих владений. Кирки всё ещё торчат из стен там, где их бросили шахтёры.',
    descriptionEn: 'Abandoned tunnels on the edge of dwarven lands. Pickaxes still jut from the walls where miners dropped them.',
    icon: '⛏️',
    level: 4,
    connections: ['abyss_root', 'rune_workshop'],
  },
  {
    id: 'rune_workshop',
    nameRu: 'Рунная мастерская',
    nameEn: 'Rune Workshop',
    descriptionRu: 'Мастерская, полная недоделанных рун и ловушек. Гномы верили, что руны защитят их основы — не защитили.',
    descriptionEn: 'A workshop full of unfinished runes and traps. The dwarves believed runes would protect their foundations — they did not.',
    icon: '✳️',
    level: 4,
    connections: ['outer_mines', 'oath_hall'],
  },
  {
    id: 'oath_hall',
    nameRu: 'Зал Клятв',
    nameEn: 'Hall of Oaths',
    descriptionRu: 'Бывший зал суда, теперь — арена. Здесь гномы когда-то клялись Торнаку. Клятвы остались, бог — нет.',
    descriptionEn: 'A former hall of judgment, now an arena. Here dwarves once swore oaths to Tornak. The oaths remain — the god does not.',
    icon: '🏛️',
    level: 5,
    connections: ['rune_workshop', 'great_forge'],
  },
  {
    id: 'great_forge',
    nameRu: 'Великая Кузница',
    nameEn: 'Great Forge',
    descriptionRu: 'Руины главной святыни Торнака. Горны остыли, но что-то в глубине них всё ещё пылает.',
    descriptionEn: "Ruins of Tornak's central sanctuary. The furnaces have gone cold, but something deep within them still burns.",
    icon: '🔥',
    level: 5,
    connections: ['oath_hall', 'foundation_rift'],
  },
  {
    id: 'foundation_rift',
    nameRu: 'Разлом Основы',
    nameEn: 'Foundation Rift',
    descriptionRu: 'Кузница рухнула прямо в Глубь. На дне разлома ждёт тот, кто когда-то клялся её защищать.',
    descriptionEn: 'The forge collapsed straight into the Depths. At the bottom of the rift waits one who once swore to protect it.',
    icon: '💔',
    level: 5,
    connections: ['great_forge', 'ashen_wasteland'],
  },
  {
    id: 'ashen_wasteland',
    nameRu: 'Пепельная пустошь',
    nameEn: 'Ashen Wasteland',
    descriptionRu: 'Выжженная земля вокруг вулкана. Воздух дрожит от жара, а под ногами хрустит остывшая лава.',
    descriptionEn: 'Scorched earth around the volcano. The air shimmers with heat, and cooled lava crunches underfoot.',
    icon: '🌋',
    level: 5,
    connections: ['foundation_rift', 'dragon_nests'],
  },
  {
    id: 'dragon_nests',
    nameRu: 'Гнёзда',
    nameEn: 'The Nests',
    descriptionRu: 'Остатки драконьих поселений. Скорлупа хрустит под ногами — кладок здесь больше нет, а те, кто остался, одичали.',
    descriptionEn: "Remains of dragonborn settlements. Eggshells crunch underfoot — the clutches are long gone, and what remains has gone feral.",
    icon: '🥚',
    level: 5,
    connections: ['ashen_wasteland', 'obsidian_labyrinth'],
  },
  {
    id: 'obsidian_labyrinth',
    nameRu: 'Обсидиановый лабиринт',
    nameEn: 'Obsidian Labyrinth',
    descriptionRu: 'Застывшая лава сплелась в запутанные ходы. Легко потерять дорогу — и ещё легче потерять себя.',
    descriptionEn: 'Cooled lava twisted into a maze of tunnels. Easy to lose the way — easier still to lose yourself.',
    icon: '🗿',
    level: 6,
    connections: ['dragon_nests', 'ignira_maw'],
  },
  {
    id: 'ignira_maw',
    nameRu: 'Жерло Игниры',
    nameEn: "Ignira's Maw",
    descriptionRu: 'Вулкан, где Скверна горит в огне, а не гниёт во тьме. Даже проклятие здесь — пламя.',
    descriptionEn: 'A volcano where the Blight burns in fire instead of rotting in darkness. Even the curse here is flame.',
    icon: '🔥',
    level: 6,
    connections: ['obsidian_labyrinth', 'flame_cradle'],
  },
  {
    id: 'flame_cradle',
    nameRu: 'Колыбель Пламени',
    nameEn: 'Cradle of Flame',
    descriptionRu: 'Сердце вулкана. Здесь Веларион выковал первого из своих детей — и здесь тот обезумел от собственного огня.',
    descriptionEn: 'The heart of the volcano. Here Velarion forged the first of his children — and here that child went mad with his own fire.',
    icon: '🐉',
    level: 6,
    connections: ['ignira_maw'],
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
  { id: 'broken_oath_hammer', nameRu: 'Молот Сломанной Клятвы', nameEn: 'Hammer of the Broken Oath', type: 'weapon', rarity: 'legendary', stats: { attack: 18, strength: 3, vitality: 2 }, descriptionRu: 'Молот гнома-титана, преданного своим богом. Каждый удар — эхо разбитой клятвы.', descriptionEn: 'The hammer of a dwarf-titan betrayed by his own god. Every blow echoes a broken vow.', icon: '🔨', value: 1800 },
  { id: 'ignira_fang', nameRu: 'Клык Игниры', nameEn: 'Fang of Ignira', type: 'weapon', rarity: 'epic', stats: { attack: 14, strength: 2, instinct: 1 }, descriptionRu: 'Клык, вырванный из пасти древнего огненного зверя.', descriptionEn: 'A fang torn from the maw of an ancient fire beast.', icon: '🦷', value: 750 },

  // === ARMOR ===
  { id: 'leather_armor', nameRu: 'Кожаная броня', nameEn: 'Leather Armor', type: 'armor', rarity: 'common', stats: { defense: 2 }, descriptionRu: 'Простая кожаная броня.', descriptionEn: 'Simple leather armor.', icon: '🦺', value: 15 },
  { id: 'chainmail', nameRu: 'Кольчуга', nameEn: 'Chainmail', type: 'armor', rarity: 'uncommon', stats: { defense: 4 }, descriptionRu: 'Кольчужная броня из стальных колец.', descriptionEn: 'Chainmail of steel rings.', icon: '🛡️', value: 60 },
  { id: 'dwarven_plate', nameRu: 'Дварфийская латная броня', nameEn: 'Dwarven Plate', type: 'armor', rarity: 'rare', stats: { defense: 7, vitality: 1 }, descriptionRu: 'Тяжёлая броня дварфийской ковки.', descriptionEn: 'Heavy armor of dwarven make.', icon: '🛡️', value: 250 },
  { id: 'shadow_cloak', nameRu: 'Плащ Теней', nameEn: 'Shadow Cloak', type: 'armor', rarity: 'rare', stats: { defense: 3, dexterity: 2 }, descriptionRu: 'Плащ, скрывающий во тьме.', descriptionEn: 'A cloak that hides in darkness.', icon: '🧥', value: 200 },
  { id: 'dragonscale_armor', nameRu: 'Драконья чешуя', nameEn: 'Dragonscale Armor', type: 'armor', rarity: 'epic', stats: { defense: 10, strength: 1, vitality: 2 }, descriptionRu: 'Броня из чешуи дракона.', descriptionEn: 'Armor made from dragon scales.', icon: '🐉', value: 800 },
  { id: 'celestial_robe', nameRu: 'Небесная мантия', nameEn: 'Celestial Robe', type: 'armor', rarity: 'epic', stats: { defense: 4, intellect: 3, willpower: 2 }, descriptionRu: 'Мантия, благословлённая небесами.', descriptionEn: 'Robe blessed by the heavens.', icon: '✨', value: 700 },
  { id: 'crown_armor', nameRu: 'Броня Короны', nameEn: 'Crown Armor', type: 'armor', rarity: 'legendary', stats: { defense: 14, strength: 2, vitality: 3, willpower: 2 }, descriptionRu: 'Легендарная броня, носящая печать Короля.', descriptionEn: "Legendary armor bearing the King's seal.", icon: '👑', value: 2000 },
  { id: 'first_dragon_scale', nameRu: 'Чешуя Первого Дракона', nameEn: 'Scale of the First Dragon', type: 'armor', rarity: 'legendary', stats: { defense: 16, strength: 2, vitality: 3 }, descriptionRu: 'Чешуя дракона, выкованного самим Веларионом. Ещё хранит жар его безумия.', descriptionEn: 'A scale from the dragon forged by Velarion himself. It still holds the heat of his madness.', icon: '🐉', value: 2200 },

  // === ACCESSORIES ===
  { id: 'copper_ring', nameRu: 'Медное кольцо', nameEn: 'Copper Ring', type: 'accessory', rarity: 'common', stats: { hp: 5 }, descriptionRu: 'Простое медное кольцо с защитным чаром.', descriptionEn: 'Simple copper ring with a ward charm.', icon: '💍', value: 10 },
  { id: 'amulet_vitality', nameRu: 'Амулет Жизни', nameEn: 'Amulet of Vitality', type: 'accessory', rarity: 'uncommon', stats: { hp: 15, vitality: 1 }, descriptionRu: 'Амулет, усиливающий жизненную силу.', descriptionEn: 'Amulet that enhances vitality.', icon: '📿', value: 80 },
  { id: 'ring_power', nameRu: 'Кольцо Силы', nameEn: 'Ring of Power', type: 'accessory', rarity: 'rare', stats: { strength: 2, attack: 3 }, descriptionRu: 'Кольцо, дающее невероятную силу.', descriptionEn: 'Ring granting incredible power.', icon: '💍', value: 200 },
  { id: 'arcane_pendant', nameRu: 'Тайная подвеска', nameEn: 'Arcane Pendant', type: 'accessory', rarity: 'rare', stats: { intellect: 2, mp: 10 }, descriptionRu: 'Подвеска, концентрирующая магическую энергию.', descriptionEn: 'Pendant concentrating magical energy.', icon: '🔮', value: 250 },
  { id: 'lucky_charm', nameRu: 'Талисман Удачи', nameEn: 'Lucky Charm', type: 'accessory', rarity: 'epic', stats: { dexterity: 2, instinct: 2, hp: 10 }, descriptionRu: 'Талисман, приносящий удачу в бою.', descriptionEn: 'Charm bringing luck in battle.', icon: '🍀', value: 500 },
  { id: 'crown_fragment', nameRu: 'Осколок Короны', nameEn: 'Crown Fragment', type: 'accessory', rarity: 'legendary', stats: { strength: 3, intellect: 3, hp: 25 }, descriptionRu: 'Фрагмент Короны Проклятого Короля.', descriptionEn: "Fragment of the Cursed King's Crown.", icon: '👑', value: 3000 },
  { id: 'ashen_amulet', nameRu: 'Пепельный амулет Хранителя', nameEn: "Keeper's Ashen Amulet", type: 'accessory', rarity: 'rare', stats: { willpower: 2, hp: 15 }, descriptionRu: 'Амулет падшего жреца Велариона, ещё хранящий отголосок веры.', descriptionEn: "Amulet of a fallen priest of Velarion, still echoing with faith.", icon: '📿', value: 220 },
  { id: 'witness_eye', nameRu: 'Око Первого Свидетеля', nameEn: 'Eye of the First Witness', type: 'accessory', rarity: 'epic', stats: { instinct: 3, willpower: 2, hp: 20 }, descriptionRu: 'Застывшее око духа, видевшего Падение. Носитель иногда слышит его крик.', descriptionEn: 'The frozen eye of the spirit who witnessed the Fall. Its wearer sometimes hears its scream.', icon: '👁️', value: 650 },
  { id: 'ailet_tear', nameRu: 'Слеза Айлет', nameEn: 'Tear of Ailet', type: 'accessory', rarity: 'rare', stats: { willpower: 2, intellect: 1, hp: 10 }, descriptionRu: 'Застывшая слеза богини, всё ещё хранящая отголосок исцеления.', descriptionEn: "A frozen tear of the goddess, still echoing with healing.", icon: '💧', value: 230 },
  { id: 'echo_thorn_crown', nameRu: 'Терновый венец Эха', nameEn: "Echo's Thorn Crown", type: 'accessory', rarity: 'epic', stats: { willpower: 3, instinct: 2, hp: 20 }, descriptionRu: 'Венец из терний, что носила Эхо Айлет — прекрасный и ядовитый одновременно.', descriptionEn: 'A thorn crown worn by the Echo of Ailet — beautiful and poisonous at once.', icon: '🥀', value: 680 },
  { id: 'oath_shield_shard', nameRu: 'Осколок Щита Клятвы', nameEn: 'Shard of the Oath Shield', type: 'accessory', rarity: 'rare', stats: { vitality: 2, hp: 15 }, descriptionRu: 'Обломок щита, что раскалывался и восстанавливался тысячи раз. Ещё хранит клятву.', descriptionEn: 'A shard of a shield shattered and reforged a thousand times. It still holds the oath.', icon: '🛡️', value: 240 },

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
// Акт 1: Пепельные Врата, уровни 1-3. Акт 2: Корневая Роща, уровни 3-4.
// Акт 3: Каменный Чертог, уровни 4-5. Акт 4: Драконье Горнило, уровни 5-6.
// У всех боссов по лору многофазные механики («Первый Свидетель» чередует физический
// и магический облик каждые 3 хода и сливает их на 30% HP; «Эхо Айлет» самоисцеляется 5%
// HP за ход, на фазе 2 обездвиживает корнями, на фазе 3 накладывает яд на весь бой;
// «Сломанная Клятва» имеет щит, восстанавливающийся каждые 4 хода, а при сломанном щите
// уходит в берсерк — +50% урона, -30% защиты; «Первый Дракон» накладывает «Горение»
// каждый ход, а на фазе 2 гаснет — урон падает, но появляется Скверна, и игроку даётся
// выбор добить его или попытаться исцелить) — ни одна из этих механик пока не
// реализована в combat-engine (текущий движок работает с одиночным набором
// hp/ac/attack/damage на врага без фаз, самоисцеления, щитов, ДоТ-эффектов или
// ветвящихся исходов) и намеренно отложена как отдельная задача; все четыре босса
// представлены усреднённым набором характеристик под сложность своего Акта.
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

  // Внешняя роща (Level 3)
  { id: 'blighted_treant', nameRu: 'Заражённый древень', nameEn: 'Blighted Treant', hp: 32, ac: 12, attack: 6, damage: '1d8+2', xp: 30, gold: 12, lootTable: [{ itemId: 'iron_ore', chance: 0.2 }, { itemId: 'health_potion', chance: 0.3 }], locationId: 'outer_grove', isBoss: false, icon: '🌳' },
  { id: 'thorn_wolf', nameRu: 'Терновый волк', nameEn: 'Thorn Wolf', hp: 24, ac: 10, attack: 6, damage: '1d6+3', xp: 24, gold: 8, lootTable: [{ itemId: 'elven_bow', chance: 0.1 }, { itemId: 'antidote', chance: 0.25 }], locationId: 'outer_grove', isBoss: false, icon: '🐺' },
  { id: 'withering_dryad', nameRu: 'Увядающая дриада', nameEn: 'Withering Dryad', hp: 26, ac: 11, attack: 6, damage: '1d6+3', xp: 28, gold: 14, lootTable: [{ itemId: 'mana_potion', chance: 0.3 }, { itemId: 'shadow_essence', chance: 0.15 }], locationId: 'outer_grove', isBoss: false, icon: '🧚' },

  // Мёртвый берег (Level 3)
  { id: 'blight_current_spawn', nameRu: 'Порождение Скверного течения', nameEn: 'Blight Current Spawn', hp: 28, ac: 10, attack: 6, damage: '1d6+3', xp: 26, gold: 10, lootTable: [{ itemId: 'shadow_essence', chance: 0.3 }], locationId: 'dead_shore', isBoss: false, icon: '🌊' },
  { id: 'drowned_elf', nameRu: 'Утопленный эльф', nameEn: 'Drowned Elf', hp: 24, ac: 11, attack: 6, damage: '1d8+2', xp: 27, gold: 12, lootTable: [{ itemId: 'shadow_cloak', chance: 0.08 }, { itemId: 'antidote', chance: 0.25 }], locationId: 'dead_shore', isBoss: false, icon: '💀' },
  { id: 'silt_crawler', nameRu: 'Илистый ползун', nameEn: 'Silt Crawler', hp: 22, ac: 9, attack: 5, damage: '1d6+2', xp: 22, gold: 6, lootTable: [{ itemId: 'antidote', chance: 0.3 }], locationId: 'dead_shore', isBoss: false, icon: '🐌' },

  // Сердце Рощи (Level 3-4)
  { id: 'corrupted_treekeeper', nameRu: 'Осквернённый хранитель дерева', nameEn: 'Corrupted Treekeeper', hp: 34, ac: 12, attack: 7, damage: '1d8+3', xp: 34, gold: 16, lootTable: [{ itemId: 'greater_health', chance: 0.25 }, { itemId: 'iron_ore', chance: 0.3 }], locationId: 'heart_of_grove', isBoss: false, icon: '🌲' },
  { id: 'root_wraith', nameRu: 'Дух-корень', nameEn: 'Root Wraith', hp: 30, ac: 13, attack: 7, damage: '1d6+3', xp: 32, gold: 14, lootTable: [{ itemId: 'shadow_essence', chance: 0.3 }, { itemId: 'mana_potion', chance: 0.3 }], locationId: 'heart_of_grove', isBoss: false, icon: '👻' },
  { id: 'lost_grove_soul', nameRu: 'Пленённая душа Рощи', nameEn: 'Lost Soul of the Grove', hp: 36, ac: 12, attack: 8, damage: '1d8+3', xp: 38, gold: 18, lootTable: [{ itemId: 'ailet_tear', chance: 0.15 }, { itemId: 'arcane_pendant', chance: 0.1 }], locationId: 'heart_of_grove', isBoss: false, icon: '👤' },

  // Тень-грибница (Level 4)
  { id: 'spore_horror', nameRu: 'Ужас спор', nameEn: 'Spore Horror', hp: 38, ac: 13, attack: 8, damage: '1d8+3', xp: 40, gold: 18, lootTable: [{ itemId: 'greater_health', chance: 0.25 }, { itemId: 'shadow_essence', chance: 0.3 }], locationId: 'shade_mycelium', isBoss: false, icon: '🍄' },
  { id: 'blight_mycelium_crawler', nameRu: 'Ползун Скверной грибницы', nameEn: 'Blight Mycelium Crawler', hp: 34, ac: 12, attack: 8, damage: '1d8+3', xp: 38, gold: 16, lootTable: [{ itemId: 'antidote', chance: 0.3 }], locationId: 'shade_mycelium', isBoss: false, icon: '🕸️' },
  { id: 'fungal_stalker', nameRu: 'Грибной охотник', nameEn: 'Fungal Stalker', hp: 30, ac: 11, attack: 7, damage: '1d6+4', xp: 34, gold: 15, lootTable: [{ itemId: 'shadow_dagger', chance: 0.06 }], locationId: 'shade_mycelium', isBoss: false, icon: '🦠' },

  // Корень Бездны (Level 4)
  { id: 'root_horror', nameRu: 'Ужас корней', nameEn: 'Root Horror', hp: 40, ac: 13, attack: 9, damage: '1d10+3', xp: 45, gold: 20, lootTable: [{ itemId: 'greater_health', chance: 0.3 }, { itemId: 'iron_ore', chance: 0.3 }], locationId: 'abyss_root', isBoss: false, icon: '🌿' },
  { id: 'echo_of_ailet', nameRu: 'Эхо Айлет', nameEn: 'Echo of Ailet', hp: 110, ac: 15, attack: 11, damage: '2d8+6', xp: 350, gold: 150, lootTable: [{ itemId: 'echo_thorn_crown', chance: 0.2 }, { itemId: 'ailet_tear', chance: 0.3 }, { itemId: 'scroll_heal', chance: 0.3 }], locationId: 'abyss_root', isBoss: true, icon: '🥀' },

  // Внешние шахты (Level 4)
  { id: 'collapsed_miner', nameRu: 'Погребённый шахтёр', nameEn: 'Collapsed Miner', hp: 36, ac: 12, attack: 8, damage: '1d8+3', xp: 36, gold: 16, lootTable: [{ itemId: 'iron_ore', chance: 0.4 }, { itemId: 'health_potion', chance: 0.25 }], locationId: 'outer_mines', isBoss: false, icon: '⛏️' },
  { id: 'rock_crawler', nameRu: 'Каменный ползун', nameEn: 'Rock Crawler', hp: 32, ac: 13, attack: 7, damage: '1d6+4', xp: 32, gold: 14, lootTable: [{ itemId: 'iron_ore', chance: 0.3 }], locationId: 'outer_mines', isBoss: false, icon: '🪨' },
  { id: 'tunnel_wraith', nameRu: 'Туннельный призрак', nameEn: 'Tunnel Wraith', hp: 34, ac: 13, attack: 8, damage: '1d8+3', xp: 38, gold: 18, lootTable: [{ itemId: 'shadow_essence', chance: 0.3 }], locationId: 'outer_mines', isBoss: false, icon: '👻' },

  // Рунная мастерская (Level 4-5)
  { id: 'rune_construct', nameRu: 'Рунный страж', nameEn: 'Rune Construct', hp: 40, ac: 14, attack: 9, damage: '1d8+4', xp: 42, gold: 20, lootTable: [{ itemId: 'steel_sword', chance: 0.15 }, { itemId: 'iron_ore', chance: 0.3 }], locationId: 'rune_workshop', isBoss: false, icon: '🗿' },
  { id: 'trapped_apprentice', nameRu: 'Пленённый подмастерье', nameEn: 'Trapped Apprentice', hp: 36, ac: 12, attack: 8, damage: '1d8+3', xp: 40, gold: 18, lootTable: [{ itemId: 'mana_potion', chance: 0.4 }, { itemId: 'scroll_fireball', chance: 0.1 }], locationId: 'rune_workshop', isBoss: false, icon: '🧙' },
  { id: 'living_rune', nameRu: 'Ожившая руна', nameEn: 'Living Rune', hp: 38, ac: 13, attack: 9, damage: '1d10+3', xp: 44, gold: 20, lootTable: [{ itemId: 'arcane_pendant', chance: 0.1 }], locationId: 'rune_workshop', isBoss: false, icon: '✳️' },

  // Зал Клятв (Level 5)
  { id: 'oathbreaker_shade', nameRu: 'Тень клятвопреступника', nameEn: 'Oathbreaker Shade', hp: 44, ac: 14, attack: 10, damage: '1d10+4', xp: 48, gold: 22, lootTable: [{ itemId: 'shadow_essence', chance: 0.3 }, { itemId: 'chainmail', chance: 0.1 }], locationId: 'oath_hall', isBoss: false, icon: '🗡️' },
  { id: 'arena_champion', nameRu: 'Чемпион арены', nameEn: 'Arena Champion', hp: 50, ac: 15, attack: 11, damage: '1d10+5', xp: 55, gold: 28, lootTable: [{ itemId: 'dwarven_plate', chance: 0.1 }, { itemId: 'steel_sword', chance: 0.15 }], locationId: 'oath_hall', isBoss: false, icon: '🪓' },
  { id: 'betrayed_guardian', nameRu: 'Преданный страж', nameEn: 'Betrayed Guardian', hp: 46, ac: 15, attack: 10, damage: '2d6+3', xp: 50, gold: 24, lootTable: [{ itemId: 'oath_shield_shard', chance: 0.15 }, { itemId: 'greater_health', chance: 0.3 }], locationId: 'oath_hall', isBoss: false, icon: '🛡️' },

  // Великая Кузница (Level 5)
  { id: 'forge_wraith', nameRu: 'Дух Кузницы', nameEn: 'Forge Wraith', hp: 48, ac: 14, attack: 11, damage: '1d10+4', xp: 52, gold: 24, lootTable: [{ itemId: 'iron_ore', chance: 0.4 }, { itemId: 'shadow_essence', chance: 0.2 }], locationId: 'great_forge', isBoss: false, icon: '🔥' },
  { id: 'molten_golem', nameRu: 'Расплавленный голем', nameEn: 'Molten Golem', hp: 55, ac: 16, attack: 12, damage: '2d6+4', xp: 58, gold: 28, lootTable: [{ itemId: 'dragon_scale', chance: 0.1 }, { itemId: 'iron_ore', chance: 0.4 }], locationId: 'great_forge', isBoss: false, icon: '🌋' },
  { id: 'tornak_zealot', nameRu: 'Фанатик Торнака', nameEn: 'Tornak Zealot', hp: 45, ac: 13, attack: 11, damage: '1d10+4', xp: 54, gold: 26, lootTable: [{ itemId: 'greater_health', chance: 0.3 }, { itemId: 'steel_sword', chance: 0.15 }], locationId: 'great_forge', isBoss: false, icon: '⚒️' },

  // Разлом Основы (Level 5)
  { id: 'rift_collapse_horror', nameRu: 'Ужас обвала', nameEn: 'Rift Collapse Horror', hp: 50, ac: 15, attack: 11, damage: '1d10+5', xp: 56, gold: 26, lootTable: [{ itemId: 'greater_health', chance: 0.3 }, { itemId: 'dwarven_plate', chance: 0.08 }], locationId: 'foundation_rift', isBoss: false, icon: '🕳️' },
  { id: 'broken_oath', nameRu: 'Сломанная Клятва', nameEn: 'The Broken Oath', hp: 140, ac: 17, attack: 13, damage: '2d10+6', xp: 450, gold: 200, lootTable: [{ itemId: 'broken_oath_hammer', chance: 0.15 }, { itemId: 'oath_shield_shard', chance: 0.3 }, { itemId: 'greater_health', chance: 0.3 }], locationId: 'foundation_rift', isBoss: true, icon: '💔' },

  // Пепельная пустошь (Level 5)
  { id: 'cinder_stalker', nameRu: 'Пепельный хищник', nameEn: 'Cinder Stalker', hp: 52, ac: 15, attack: 11, damage: '1d10+4', xp: 55, gold: 24, lootTable: [{ itemId: 'greater_health', chance: 0.25 }, { itemId: 'iron_ore', chance: 0.3 }], locationId: 'ashen_wasteland', isBoss: false, icon: '🔥' },
  { id: 'ash_wyrmling', nameRu: 'Пепельный дракончик', nameEn: 'Ash Wyrmling', hp: 48, ac: 14, attack: 11, damage: '1d8+5', xp: 52, gold: 22, lootTable: [{ itemId: 'dragon_scale', chance: 0.15 }], locationId: 'ashen_wasteland', isBoss: false, icon: '🦎' },
  { id: 'wasteland_marauder', nameRu: 'Мародёр пустоши', nameEn: 'Wasteland Marauder', hp: 50, ac: 14, attack: 12, damage: '1d10+4', xp: 56, gold: 26, lootTable: [{ itemId: 'steel_sword', chance: 0.15 }, { itemId: 'chainmail', chance: 0.1 }], locationId: 'ashen_wasteland', isBoss: false, icon: '⚔️' },

  // Гнёзда (Level 5-6)
  { id: 'nest_guardian', nameRu: 'Страж гнезда', nameEn: 'Nest Guardian', hp: 56, ac: 16, attack: 12, damage: '1d10+5', xp: 58, gold: 26, lootTable: [{ itemId: 'dragon_scale', chance: 0.2 }, { itemId: 'greater_health', chance: 0.3 }], locationId: 'dragon_nests', isBoss: false, icon: '🥚' },
  { id: 'feral_hatchling', nameRu: 'Одичавший детёныш', nameEn: 'Feral Hatchling', hp: 44, ac: 13, attack: 11, damage: '1d8+5', xp: 50, gold: 20, lootTable: [{ itemId: 'dragon_scale', chance: 0.15 }], locationId: 'dragon_nests', isBoss: false, icon: '🐣' },
  { id: 'broodmother_wyrm', nameRu: 'Матриарх выводка', nameEn: 'Broodmother Wyrm', hp: 62, ac: 16, attack: 13, damage: '2d6+5', xp: 65, gold: 30, lootTable: [{ itemId: 'dragon_scale', chance: 0.3 }, { itemId: 'ignira_fang', chance: 0.08 }], locationId: 'dragon_nests', isBoss: false, icon: '🐲' },

  // Обсидиановый лабиринт (Level 6)
  { id: 'obsidian_golem', nameRu: 'Обсидиановый голем', nameEn: 'Obsidian Golem', hp: 65, ac: 18, attack: 13, damage: '2d6+5', xp: 68, gold: 30, lootTable: [{ itemId: 'iron_ore', chance: 0.4 }, { itemId: 'void_crystal', chance: 0.08 }], locationId: 'obsidian_labyrinth', isBoss: false, icon: '🗿' },
  { id: 'molten_shade', nameRu: 'Расплавленная тень', nameEn: 'Molten Shade', hp: 58, ac: 16, attack: 14, damage: '1d10+6', xp: 64, gold: 28, lootTable: [{ itemId: 'shadow_essence', chance: 0.3 }], locationId: 'obsidian_labyrinth', isBoss: false, icon: '👤' },
  { id: 'labyrinth_stalker', nameRu: 'Хищник лабиринта', nameEn: 'Labyrinth Stalker', hp: 54, ac: 15, attack: 13, damage: '1d10+5', xp: 60, gold: 26, lootTable: [{ itemId: 'shadow_dagger', chance: 0.08 }], locationId: 'obsidian_labyrinth', isBoss: false, icon: '🦂' },

  // Жерло Игниры (Level 6)
  { id: 'ignira_zealot', nameRu: 'Фанатик Игниры', nameEn: 'Ignira Zealot', hp: 58, ac: 16, attack: 14, damage: '1d10+6', xp: 66, gold: 30, lootTable: [{ itemId: 'greater_health', chance: 0.3 }, { itemId: 'scroll_fireball', chance: 0.15 }], locationId: 'ignira_maw', isBoss: false, icon: '🔥' },
  { id: 'magma_elemental', nameRu: 'Магмовый элементаль', nameEn: 'Magma Elemental', hp: 70, ac: 17, attack: 15, damage: '2d8+5', xp: 75, gold: 34, lootTable: [{ itemId: 'dragon_scale', chance: 0.25 }, { itemId: 'ignira_fang', chance: 0.1 }], locationId: 'ignira_maw', isBoss: false, icon: '🌋' },

  // Колыбель Пламени (Level 6)
  { id: 'flame_wisp_swarm', nameRu: 'Рой огненных духов', nameEn: 'Flame Wisp Swarm', hp: 60, ac: 15, attack: 14, damage: '1d10+6', xp: 70, gold: 32, lootTable: [{ itemId: 'mana_potion', chance: 0.3 }], locationId: 'flame_cradle', isBoss: false, icon: '✨' },
  { id: 'first_dragon', nameRu: 'Первый Дракон', nameEn: 'The First Dragon', hp: 160, ac: 18, attack: 15, damage: '3d8+6', xp: 550, gold: 250, lootTable: [{ itemId: 'first_dragon_scale', chance: 0.15 }, { itemId: 'ignira_fang', chance: 0.25 }, { itemId: 'elixir_power', chance: 0.3 }], locationId: 'flame_cradle', isBoss: true, icon: '🐉' },
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

import { db } from './db';

export async function seedDatabase() {
  // Check if already seeded
  const raceCount = await db.race.count();
  if (raceCount > 0) {
    return { message: 'Database already seeded', raceCount };
  }

  // ===== RACES =====
  const races = await Promise.all([
    db.race.create({
      data: {
        name: 'Тёмные Эльфы',
        slug: 'dark-elves',
        description: 'Подземные мастера магии и интриг, правящие лабиринтами глубин',
        icon: '🌑',
        lore: 'Тёмные Эльфы, или Дроу, — древняя раса, изгнанная с поверхности веками назад. В глубинах они построили величественные города из кристаллов и обсидиана. Их общество пронизано интригами, а магия теней — их главное оружие.',
        baseHp: 90,
        baseMana: 70,
        baseStr: 8,
        baseDex: 14,
        baseInt: 15,
        baseWis: 12,
        baseCon: 9,
      },
    }),
    db.race.create({
      data: {
        name: 'Гномы-Кузнецы',
        slug: 'forge-dwarves',
        description: 'Мастера металла и механизмов, рождённые в пламени кузниц',
        icon: '🔨',
        lore: 'Гномы-Кузнецы — народ, чья кровь смешана с расплавленным металлом. Их кузни пылают в сердце вулканов, и ни один клинок в мире не сравнится с гномьим. Они верят, что металл — это душа мира, а кузня — его сердце.',
        baseHp: 120,
        baseMana: 40,
        baseStr: 14,
        baseDex: 8,
        baseInt: 10,
        baseWis: 10,
        baseCon: 16,
      },
    }),
    db.race.create({
      data: {
        name: 'Оборотни',
        slug: 'skinwalkers',
        description: 'Оборотни с двойной природой — зверь и человек в одном теле',
        icon: '🐺',
        lore: 'Оборотни — проклятые и благословенные одновременно. Их двойная природа даёт им силу зверя и разум человека. В Теневом Лесу они нашли приют, где луна освещает их тайные ритуалы, а звериный инстинкт сливается с человеческой волей.',
        baseHp: 110,
        baseMana: 50,
        baseStr: 13,
        baseDex: 14,
        baseInt: 8,
        baseWis: 10,
        baseCon: 13,
      },
    }),
    db.race.create({
      data: {
        name: 'Люди Пепла',
        slug: 'ashborn-humans',
        description: 'Выжившие после Катаклизма, закалённые в пепле и огне',
        icon: '🔥',
        lore: 'Люди Пепла — потомки тех, кто пережил Великий Катаклизм. Огонь уничтожил их мир, но не их дух. Они вышли из пепла сильнее, чем прежде, с шрамами от пламени и волей, твёрже стали. Пепел — их прошлое, их память, их сила.',
        baseHp: 100,
        baseMana: 55,
        baseStr: 10,
        baseDex: 10,
        baseInt: 12,
        baseWis: 10,
        baseCon: 12,
      },
    }),
    db.race.create({
      data: {
        name: 'Дриады Теней',
        slug: 'shadow-dryads',
        description: 'Существа между жизнью и смертью, хранящие тайны Теневого Леса',
        icon: '🌳',
        lore: 'Дриады Теней — духи деревьев, поглощённых Скверной. Они не живы и не мертвы — они существуют в промежутке, черпая силу из мира теней. Их корни уходят в обе реальности, и шёпот леса — их голос.',
        baseHp: 85,
        baseMana: 75,
        baseStr: 7,
        baseDex: 12,
        baseInt: 14,
        baseWis: 16,
        baseCon: 8,
      },
    }),
    db.race.create({
      data: {
        name: 'Дети Глубин',
        slug: 'deepspawn',
        description: 'Порождения подземных тварей, адаптировавшиеся к мраку бездны',
        icon: '👁️',
        lore: 'Дети Глубин — результат скрещивания древних тварей и заблудших душ. Они обитают в самых глубоких туннелях, где свет — это миф. Их тела мутировали для выживания во тьме, а разум — для безумия глубин.',
        baseHp: 105,
        baseMana: 60,
        baseStr: 12,
        baseDex: 12,
        baseInt: 11,
        baseWis: 9,
        baseCon: 14,
      },
    }),
  ]);

  const [darkElves, forgeDwarves, skinwalkers, ashbornHumans, shadowDryads, deepspawn] = races;

  // ===== RACE-SPECIFIC CLASSES =====
  const darkElfClasses = await Promise.all([
    db.gameClass.create({
      data: {
        name: 'Тёмный Жрец',
        slug: 'dark-priest',
        description: 'Служитель тёмных богов, черпающий силу из запретных ритуалов',
        icon: '⛧',
        role: 'healer',
        raceId: darkElves.id,
        isUniversal: false,
        hpMod: 0.9,
        manaMod: 1.4,
        strMod: 0.8,
        dexMod: 1.0,
        intMod: 1.3,
        wisMod: 1.5,
        conMod: 0.8,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Теневой Клинок',
        slug: 'shadow-blade',
        description: 'Убийца, слившийся с тьмой — его клинок находят прежде, чем заметят тень',
        icon: '🗡️',
        role: 'dps',
        raceId: darkElves.id,
        isUniversal: false,
        hpMod: 0.85,
        manaMod: 1.0,
        strMod: 1.0,
        dexMod: 1.5,
        intMod: 1.0,
        wisMod: 0.9,
        conMod: 0.85,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Плетущий Чары',
        slug: 'charm-weaver',
        description: 'Мастер иллюзий и контроля разума, плетущий сети обмана',
        icon: '🕸️',
        role: 'support',
        raceId: darkElves.id,
        isUniversal: false,
        hpMod: 0.8,
        manaMod: 1.5,
        strMod: 0.7,
        dexMod: 1.0,
        intMod: 1.5,
        wisMod: 1.2,
        conMod: 0.75,
      },
    }),
  ]);

  const forgeDwarfClasses = await Promise.all([
    db.gameClass.create({
      data: {
        name: 'Огненный Кузнец',
        slug: 'fire-smith',
        description: 'Воин-ремесленник, чьи удары молота вызывают пламя',
        icon: '⚒️',
        role: 'dps',
        raceId: forgeDwarves.id,
        isUniversal: false,
        hpMod: 1.2,
        manaMod: 0.8,
        strMod: 1.4,
        dexMod: 0.8,
        intMod: 0.9,
        wisMod: 1.0,
        conMod: 1.3,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Механист',
        slug: 'mechanist',
        description: 'Инженер безумных механизмов, создающий машины разрушения',
        icon: '⚙️',
        role: 'support',
        raceId: forgeDwarves.id,
        isUniversal: false,
        hpMod: 1.0,
        manaMod: 1.2,
        strMod: 1.0,
        dexMod: 1.0,
        intMod: 1.4,
        wisMod: 1.1,
        conMod: 1.0,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Каменный Страж',
        slug: 'stone-guardian',
        description: 'Несокрушимый защитник, чья кожа тверда как гранит',
        icon: '🛡️',
        role: 'tank',
        raceId: forgeDwarves.id,
        isUniversal: false,
        hpMod: 1.5,
        manaMod: 0.6,
        strMod: 1.3,
        dexMod: 0.7,
        intMod: 0.8,
        wisMod: 1.0,
        conMod: 1.6,
      },
    }),
  ]);

  const skinwalkerClasses = await Promise.all([
    db.gameClass.create({
      data: {
        name: 'Кровавый Охотник',
        slug: 'blood-hunter',
        description: 'Выслеживающий добычу по запаху крови, неумолимый и безжалостный',
        icon: '🩸',
        role: 'dps',
        raceId: skinwalkers.id,
        isUniversal: false,
        hpMod: 1.1,
        manaMod: 0.8,
        strMod: 1.3,
        dexMod: 1.4,
        intMod: 0.8,
        wisMod: 0.9,
        conMod: 1.1,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Дикий Оборотень',
        slug: 'wild-werewolf',
        description: 'Берсерк, полностью поддающийся звериной ярости',
        icon: '🐾',
        role: 'dps',
        raceId: skinwalkers.id,
        isUniversal: false,
        hpMod: 1.3,
        manaMod: 0.6,
        strMod: 1.5,
        dexMod: 1.2,
        intMod: 0.6,
        wisMod: 0.8,
        conMod: 1.4,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Тотемный Шаман',
        slug: 'totem-shaman',
        description: 'Шаман-медиум, призывающий духов зверей через тотемы',
        icon: '🗿',
        role: 'support',
        raceId: skinwalkers.id,
        isUniversal: false,
        hpMod: 1.0,
        manaMod: 1.3,
        strMod: 0.9,
        dexMod: 1.0,
        intMod: 1.1,
        wisMod: 1.4,
        conMod: 1.0,
      },
    }),
  ]);

  const ashbornClasses = await Promise.all([
    db.gameClass.create({
      data: {
        name: 'Пепельный Рыцарь',
        slug: 'ash-knight',
        description: 'Воин, чьи доспехи покрыты пеплом — несущий возмездие из огня',
        icon: '⚔️',
        role: 'tank',
        raceId: ashbornHumans.id,
        isUniversal: false,
        hpMod: 1.4,
        manaMod: 0.7,
        strMod: 1.3,
        dexMod: 0.9,
        intMod: 0.9,
        wisMod: 1.0,
        conMod: 1.4,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Огненный Маг',
        slug: 'fire-mage',
        description: 'Повелитель пламени Катаклизма, испепеляющий врагов',
        icon: '🔥',
        role: 'dps',
        raceId: ashbornHumans.id,
        isUniversal: false,
        hpMod: 0.8,
        manaMod: 1.5,
        strMod: 0.7,
        dexMod: 0.9,
        intMod: 1.5,
        wisMod: 1.1,
        conMod: 0.8,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Бродячий Целитель',
        slug: 'wandering-healer',
        description: 'Странствующий лекарь, несущий исцеление сквозь пепельные пустоши',
        icon: '💚',
        role: 'healer',
        raceId: ashbornHumans.id,
        isUniversal: false,
        hpMod: 0.95,
        manaMod: 1.4,
        strMod: 0.8,
        dexMod: 1.0,
        intMod: 1.1,
        wisMod: 1.5,
        conMod: 0.9,
      },
    }),
  ]);

  const shadowDryadClasses = await Promise.all([
    db.gameClass.create({
      data: {
        name: 'Ткач Снов',
        slug: 'dream-weaver',
        description: 'Манипулятор сновидениями, способный убить во сне',
        icon: '💭',
        role: 'support',
        raceId: shadowDryads.id,
        isUniversal: false,
        hpMod: 0.75,
        manaMod: 1.6,
        strMod: 0.6,
        dexMod: 1.0,
        intMod: 1.5,
        wisMod: 1.5,
        conMod: 0.7,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Колючий Страж',
        slug: 'thorn-guardian',
        description: 'Живой щит из шипов и корней, защищающий лес до последней капли сока',
        icon: '🌿',
        role: 'tank',
        raceId: shadowDryads.id,
        isUniversal: false,
        hpMod: 1.5,
        manaMod: 0.8,
        strMod: 1.2,
        dexMod: 0.8,
        intMod: 0.9,
        wisMod: 1.2,
        conMod: 1.5,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Ядочарница',
        slug: 'venom-charmer',
        description: 'Мастерница ядов и отрав, чей поцелуй смертоноснее кинжала',
        icon: '☠️',
        role: 'dps',
        raceId: shadowDryads.id,
        isUniversal: false,
        hpMod: 0.85,
        manaMod: 1.3,
        strMod: 0.8,
        dexMod: 1.3,
        intMod: 1.3,
        wisMod: 1.1,
        conMod: 0.8,
      },
    }),
  ]);

  const deepspawnClasses = await Promise.all([
    db.gameClass.create({
      data: {
        name: 'Глубинный Сталкер',
        slug: 'depth-stalker',
        description: 'Хищник бездны, незаметный даже во тьме',
        icon: '👁️‍🗨️',
        role: 'dps',
        raceId: deepspawn.id,
        isUniversal: false,
        hpMod: 1.0,
        manaMod: 1.0,
        strMod: 1.1,
        dexMod: 1.5,
        intMod: 1.0,
        wisMod: 0.9,
        conMod: 1.0,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Кислотный Плеватель',
        slug: 'acid-spitter',
        description: 'Мутант, извергающий кислоту, разъедающую любую броню',
        icon: '🧪',
        role: 'dps',
        raceId: deepspawn.id,
        isUniversal: false,
        hpMod: 0.9,
        manaMod: 1.2,
        strMod: 1.0,
        dexMod: 1.0,
        intMod: 1.3,
        wisMod: 1.0,
        conMod: 0.9,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Туннельный Берсерк',
        slug: 'tunnel-berserker',
        description: 'Неистовый воин подземелий, сокрушающий камни голыми руками',
        icon: '💪',
        role: 'dps',
        raceId: deepspawn.id,
        isUniversal: false,
        hpMod: 1.3,
        manaMod: 0.5,
        strMod: 1.6,
        dexMod: 1.0,
        intMod: 0.6,
        wisMod: 0.7,
        conMod: 1.5,
      },
    }),
  ]);

  // ===== UNIVERSAL CLASSES =====
  const universalClasses = await Promise.all([
    db.gameClass.create({
      data: {
        name: 'Некромант',
        slug: 'necromancer',
        description: 'Повелитель мёртвых, поднимающий армии из могил',
        icon: '💀',
        role: 'dps',
        raceId: null,
        isUniversal: true,
        hpMod: 0.8,
        manaMod: 1.5,
        strMod: 0.7,
        dexMod: 0.8,
        intMod: 1.5,
        wisMod: 1.2,
        conMod: 0.7,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Бард Скверны',
        slug: 'blight-bard',
        description: 'Певец проклятий, чьи песни несут безумие и отчаяние',
        icon: '🎵',
        role: 'support',
        raceId: null,
        isUniversal: true,
        hpMod: 0.85,
        manaMod: 1.3,
        strMod: 0.7,
        dexMod: 1.1,
        intMod: 1.2,
        wisMod: 1.3,
        conMod: 0.8,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Мистик Пелла',
        slug: 'pell-mystic',
        description: 'Посвящённый силе Пелла, несущий свет во тьму',
        icon: '✨',
        role: 'healer',
        raceId: null,
        isUniversal: true,
        hpMod: 0.9,
        manaMod: 1.5,
        strMod: 0.7,
        dexMod: 0.9,
        intMod: 1.3,
        wisMod: 1.5,
        conMod: 0.8,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Охотник за Головами',
        slug: 'bounty-hunter',
        description: 'Безжалостный следопыт, продающий свои услуги тому, кто больше заплатит',
        icon: '💰',
        role: 'dps',
        raceId: null,
        isUniversal: true,
        hpMod: 1.0,
        manaMod: 0.9,
        strMod: 1.2,
        dexMod: 1.3,
        intMod: 0.9,
        wisMod: 1.0,
        conMod: 1.0,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Торговец Теней',
        slug: 'shadow-merchant',
        description: 'Контрабандист тёмных артефактов, знающий цену всему',
        icon: '🏪',
        role: 'support',
        raceId: null,
        isUniversal: true,
        hpMod: 0.9,
        manaMod: 1.2,
        strMod: 0.8,
        dexMod: 1.2,
        intMod: 1.3,
        wisMod: 1.1,
        conMod: 0.85,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Странствующий Мечник',
        slug: 'wandering-swordsman',
        description: 'Ронин без хозяина, чей клинок служит только ему самому',
        icon: '⚔️',
        role: 'dps',
        raceId: null,
        isUniversal: true,
        hpMod: 1.1,
        manaMod: 0.8,
        strMod: 1.3,
        dexMod: 1.3,
        intMod: 0.9,
        wisMod: 1.0,
        conMod: 1.1,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Жрец Равновесия',
        slug: 'balance-priest',
        description: 'Хранитель равновесия между светом и тьмой, Пеллом и Скверной',
        icon: '⚖️',
        role: 'healer',
        raceId: null,
        isUniversal: true,
        hpMod: 0.95,
        manaMod: 1.4,
        strMod: 0.8,
        dexMod: 0.9,
        intMod: 1.2,
        wisMod: 1.5,
        conMod: 0.85,
      },
    }),
    db.gameClass.create({
      data: {
        name: 'Алхимик Бездны',
        slug: 'abyss-alchemist',
        description: 'Безумный учёный, создающий эликсиры из субстанций бездны',
        icon: '⚗️',
        role: 'support',
        raceId: null,
        isUniversal: true,
        hpMod: 0.85,
        manaMod: 1.4,
        strMod: 0.7,
        dexMod: 1.0,
        intMod: 1.4,
        wisMod: 1.2,
        conMod: 0.8,
      },
    }),
  ]);

  // ===== ABILITIES =====
  const allClasses = [
    ...darkElfClasses,
    ...forgeDwarfClasses,
    ...skinwalkerClasses,
    ...ashbornClasses,
    ...shadowDryadClasses,
    ...deepspawnClasses,
    ...universalClasses,
  ];

  const abilityData: Array<{
    name: string;
    slug: string;
    description: string;
    icon: string;
    type: string;
    school: string;
    manaCost: number;
    cooldown: number;
    damage: number;
    healing: number;
    duration: number;
    classSlug: string;
    levelReq: number;
  }> = [
    // Тёмный Жрец
    { name: 'Тёмное исцеление', slug: 'dark-heal', description: 'Исцеляет союзника, черпая силу из тьмы', icon: '🖤', type: 'active', school: 'shadow', manaCost: 30, cooldown: 3, damage: 0, healing: 45, duration: 0, classSlug: 'dark-priest', levelReq: 1 },
    { name: 'Ритуал боли', slug: 'pain-ritual', description: 'Причиняет боль врагу, восстанавливая здоровье союзникам', icon: '🩸', type: 'active', school: 'shadow', manaCost: 40, cooldown: 5, damage: 35, healing: 20, duration: 0, classSlug: 'dark-priest', levelReq: 3 },
    { name: 'Покровительство тьмы', slug: 'dark-patronage', description: 'Снижает входящий урон группе', icon: '🌑', type: 'active', school: 'shadow', manaCost: 50, cooldown: 8, damage: 0, healing: 0, duration: 4, classSlug: 'dark-priest', levelReq: 5 },
    { name: 'Аура отчаяния', slug: 'despair-aura', description: 'Постоянно ослабляет ближайших врагов', icon: '😰', type: 'passive', school: 'shadow', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'dark-priest', levelReq: 7 },
    { name: 'Жертвоприношение', slug: 'sacrifice', description: 'Жертвует здоровьем ради мощного исцеления', icon: '⛧', type: 'ultimate', school: 'shadow', manaCost: 80, cooldown: 15, damage: 0, healing: 100, duration: 0, classSlug: 'dark-priest', levelReq: 10 },
    { name: 'Касание бездны', slug: 'abyss-touch', description: 'Наносит урон тьмой и восстанавливает ману', icon: '🕳️', type: 'active', school: 'shadow', manaCost: 15, cooldown: 4, damage: 25, healing: 0, duration: 0, classSlug: 'dark-priest', levelReq: 2 },
    { name: 'Тёмный обет', slug: 'dark-vow', description: 'Увеличивает эффективность исцеления в ночное время', icon: '🌙', type: 'passive', school: 'shadow', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'dark-priest', levelReq: 4 },

    // Теневой Клинок
    { name: 'Удар из тени', slug: 'shadow-strike', description: 'Атакует врага из невидимости с увеличенным уроном', icon: '🗡️', type: 'active', school: 'shadow', manaCost: 20, cooldown: 3, damage: 55, healing: 0, duration: 0, classSlug: 'shadow-blade', levelReq: 1 },
    { name: 'Затухание', slug: 'fade', description: 'Растворяется в тенях, становясь невидимым', icon: '👤', type: 'active', school: 'shadow', manaCost: 30, cooldown: 8, damage: 0, healing: 0, duration: 3, classSlug: 'shadow-blade', levelReq: 2 },
    { name: 'Яд лезвия', slug: 'blade-venom', description: 'Покрывает оружие ядом, наносящим урон во времени', icon: '☠️', type: 'active', school: 'physical', manaCost: 15, cooldown: 6, damage: 15, healing: 0, duration: 5, classSlug: 'shadow-blade', levelReq: 3 },
    { name: 'Теневой шаг', slug: 'shadow-step', description: 'Мгновенно перемещается за спину врага', icon: '👣', type: 'active', school: 'shadow', manaCost: 25, cooldown: 5, damage: 30, healing: 0, duration: 0, classSlug: 'shadow-blade', levelReq: 4 },
    { name: 'Смертельное лезвие', slug: 'death-blade', description: 'Наносит критический удар с шансом мгновенного убийства', icon: '💀', type: 'ultimate', school: 'shadow', manaCost: 60, cooldown: 15, damage: 120, healing: 0, duration: 0, classSlug: 'shadow-blade', levelReq: 10 },
    { name: 'Мастер теней', slug: 'shadow-master', description: 'Увеличивает урон из невидимости', icon: '🌑', type: 'passive', school: 'shadow', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'shadow-blade', levelReq: 6 },
    { name: 'Веер клинков', slug: 'blade-fan', description: 'Бросает несколько ножей по площади', icon: '🔪', type: 'active', school: 'physical', manaCost: 35, cooldown: 6, damage: 40, healing: 0, duration: 0, classSlug: 'shadow-blade', levelReq: 5 },

    // Плетущий Чары
    { name: 'Путы разума', slug: 'mind-binds', description: 'Обездвиживает врага, опутывая его разум иллюзиями', icon: '🕸️', type: 'active', school: 'arcane', manaCost: 35, cooldown: 6, damage: 10, healing: 0, duration: 3, classSlug: 'charm-weaver', levelReq: 1 },
    { name: 'Зеркальная иллюзия', slug: 'mirror-illusion', description: 'Создаёт копию себя, отвлекающую врагов', icon: '🪞', type: 'active', school: 'arcane', manaCost: 40, cooldown: 10, damage: 0, healing: 0, duration: 5, classSlug: 'charm-weaver', levelReq: 3 },
    { name: 'Шёпот безумия', slug: 'madness-whisper', description: 'Вгоняет врага в состояние замешательства', icon: '🌀', type: 'active', school: 'shadow', manaCost: 30, cooldown: 8, damage: 20, healing: 0, duration: 4, classSlug: 'charm-weaver', levelReq: 2 },
    { name: 'Паутина лжи', slug: 'web-lies', description: 'Снижает защиту и сопротивляемость врага', icon: '🧶', type: 'active', school: 'arcane', manaCost: 25, cooldown: 5, damage: 0, healing: 0, duration: 4, classSlug: 'charm-weaver', levelReq: 5 },
    { name: 'Массовое наваждение', slug: 'mass-hallucination', description: 'Погружает всех врагов в кошмар', icon: '😱', type: 'ultimate', school: 'arcane', manaCost: 80, cooldown: 18, damage: 50, healing: 0, duration: 5, classSlug: 'charm-weaver', levelReq: 10 },
    { name: 'Магический резонанс', slug: 'magic-resonance', description: 'Увеличивает силу заклинаний союзников', icon: '🔮', type: 'passive', school: 'arcane', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'charm-weaver', levelReq: 7 },

    // Огненный Кузнец
    { name: 'Удар молота', slug: 'hammer-strike', description: 'Обрушивает раскалённый молот на врага', icon: '🔨', type: 'active', school: 'fire', manaCost: 20, cooldown: 3, damage: 50, healing: 0, duration: 0, classSlug: 'fire-smith', levelReq: 1 },
    { name: 'Раскалённая броня', slug: 'heated-armor', description: 'Покрывает доспех пламенем, обжигая атакующих', icon: '🔥', type: 'active', school: 'fire', manaCost: 30, cooldown: 8, damage: 15, healing: 0, duration: 5, classSlug: 'fire-smith', levelReq: 3 },
    { name: 'Кузнечный удар', slug: 'forge-slam', description: 'Мощный удар, оглушающий врага', icon: '💥', type: 'active', school: 'physical', manaCost: 35, cooldown: 6, damage: 65, healing: 0, duration: 2, classSlug: 'fire-smith', levelReq: 4 },
    { name: 'Пламенная волна', slug: 'flame-wave', description: 'Выпускает волну огня перед собой', icon: '🌊', type: 'active', school: 'fire', manaCost: 45, cooldown: 7, damage: 55, healing: 0, duration: 0, classSlug: 'fire-smith', levelReq: 5 },
    { name: 'Извержение кузни', slug: 'forge-eruption', description: 'Вызывает огненный взрыв огромной силы', icon: '🌋', type: 'ultimate', school: 'fire', manaCost: 70, cooldown: 15, damage: 130, healing: 0, duration: 0, classSlug: 'fire-smith', levelReq: 10 },
    { name: 'Жар кузницы', slug: 'forge-heat', description: 'Постепенно увеличивает урон от огненных атак', icon: '🌡️', type: 'passive', school: 'fire', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'fire-smith', levelReq: 6 },

    // Механист
    { name: 'Механический голем', slug: 'mechanical-golem', description: 'Создаёт механического помощника', icon: '🤖', type: 'active', school: 'arcane', manaCost: 40, cooldown: 10, damage: 25, healing: 0, duration: 8, classSlug: 'mechanist', levelReq: 1 },
    { name: 'Паровой щит', slug: 'steam-shield', description: 'Создаёт барьер из пара, поглощающий урон', icon: '💨', type: 'active', school: 'arcane', manaCost: 25, cooldown: 6, damage: 0, healing: 0, duration: 4, classSlug: 'mechanist', levelReq: 2 },
    { name: 'Шрапнельная мина', slug: 'shrapnel-mine', description: 'Устанавливает взрывную мину', icon: '💣', type: 'active', school: 'physical', manaCost: 30, cooldown: 8, damage: 60, healing: 0, duration: 0, classSlug: 'mechanist', levelReq: 3 },
    { name: 'Масляное пятно', slug: 'oil-slick', description: 'Создаёт скользкую поверхность, замедляющую врагов', icon: '🛢️', type: 'active', school: 'physical', manaCost: 20, cooldown: 5, damage: 0, healing: 0, duration: 4, classSlug: 'mechanist', levelReq: 4 },
    { name: 'Механический колосс', slug: 'mechanical-colossus', description: 'Призывает огромного боевого механизма', icon: '⚙️', type: 'ultimate', school: 'arcane', manaCost: 90, cooldown: 20, damage: 80, healing: 0, duration: 10, classSlug: 'mechanist', levelReq: 10 },
    { name: 'Инженерный гений', slug: 'engineering-genius', description: 'Снижает стоимость механических устройств', icon: '🧠', type: 'passive', school: 'arcane', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'mechanist', levelReq: 7 },

    // Каменный Страж
    { name: 'Каменная стена', slug: 'stone-wall', description: 'Принимает стойку, резко увеличивающую защиту', icon: '🧱', type: 'active', school: 'physical', manaCost: 20, cooldown: 6, damage: 0, healing: 0, duration: 5, classSlug: 'stone-guardian', levelReq: 1 },
    { name: 'Землетрясение', slug: 'earthquake', description: 'Ударяет в землю, оглушая врагов вокруг', icon: '🌍', type: 'active', school: 'physical', manaCost: 35, cooldown: 8, damage: 40, healing: 0, duration: 2, classSlug: 'stone-guardian', levelReq: 3 },
    { name: 'Каменная кожа', slug: 'stone-skin', description: 'Покрывает кожу каменной бронёй', icon: '🪨', type: 'active', school: 'nature', manaCost: 30, cooldown: 10, damage: 0, healing: 0, duration: 6, classSlug: 'stone-guardian', levelReq: 2 },
    { name: 'Щит горы', slug: 'mountain-shield', description: 'Блокирует атаку, перенаправляя урон в землю', icon: '🏔️', type: 'active', school: 'physical', manaCost: 15, cooldown: 4, damage: 0, healing: 0, duration: 2, classSlug: 'stone-guardian', levelReq: 5 },
    { name: 'Гнев горы', slug: 'mountain-wrath', description: 'Превращается в исполинского каменного голема', icon: '🗿', type: 'ultimate', school: 'nature', manaCost: 80, cooldown: 18, damage: 100, healing: 0, duration: 8, classSlug: 'stone-guardian', levelReq: 10 },
    { name: 'Каменное сердце', slug: 'stone-heart', description: 'Увеличивает максимальное здоровье', icon: '❤️', type: 'passive', school: 'physical', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'stone-guardian', levelReq: 6 },

    // Кровавый Охотник
    { name: 'Кровавый след', slug: 'blood-trail', description: 'Помечает врага, увеличивая урон по нему', icon: '🩸', type: 'active', school: 'physical', manaCost: 15, cooldown: 4, damage: 30, healing: 0, duration: 5, classSlug: 'blood-hunter', levelReq: 1 },
    { name: 'Рваная рана', slug: 'ragged-wound', description: 'Наносит глубокую рану, вызывающую кровотечение', icon: '🩹', type: 'active', school: 'physical', manaCost: 25, cooldown: 5, damage: 20, healing: 0, duration: 4, classSlug: 'blood-hunter', levelReq: 2 },
    { name: 'Жажда крови', slug: 'bloodlust', description: 'Впадает в ярость, увеличивая скорость атаки', icon: '😠', type: 'active', school: 'physical', manaCost: 30, cooldown: 8, damage: 0, healing: 0, duration: 5, classSlug: 'blood-hunter', levelReq: 4 },
    { name: 'Укус оборотня', slug: 'werewolf-bite', description: 'Кусает врага, восстанавливая здоровье от урона', icon: '🐺', type: 'active', school: 'physical', manaCost: 20, cooldown: 6, damage: 40, healing: 20, duration: 0, classSlug: 'blood-hunter', levelReq: 3 },
    { name: 'Кровавый шквал', slug: 'blood-storm', description: 'Неистовая серия ударов, пропитанных кровью', icon: '🌪️', type: 'ultimate', school: 'physical', manaCost: 70, cooldown: 15, damage: 120, healing: 30, duration: 0, classSlug: 'blood-hunter', levelReq: 10 },
    { name: 'Инстинкт хищника', slug: 'predator-instinct', description: 'Увеличивает шанс критического удара', icon: '👁️', type: 'passive', school: 'physical', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'blood-hunter', levelReq: 7 },

    // Дикий Оборотень
    { name: 'Оборот зверя', slug: 'beast-shift', description: 'Принимает звериную форму, увеличивая силу', icon: '🐺', type: 'active', school: 'nature', manaCost: 25, cooldown: 10, damage: 0, healing: 0, duration: 8, classSlug: 'wild-werewolf', levelReq: 1 },
    { name: 'Когти ярости', slug: 'rage-claws', description: 'Атакует когтями с огромной силой', icon: '🐾', type: 'active', school: 'physical', manaCost: 15, cooldown: 3, damage: 55, healing: 0, duration: 0, classSlug: 'wild-werewolf', levelReq: 2 },
    { name: 'Вой луны', slug: 'moon-howl', description: 'Издаёт вой, усиливающий себя и союзников-оборотней', icon: '🌙', type: 'active', school: 'nature', manaCost: 30, cooldown: 8, damage: 0, healing: 15, duration: 5, classSlug: 'wild-werewolf', levelReq: 3 },
    { name: 'Неукротимость', slug: 'unstoppable', description: 'Становится неуязвимым к контролю на короткое время', icon: '💥', type: 'active', school: 'physical', manaCost: 35, cooldown: 10, damage: 0, healing: 0, duration: 3, classSlug: 'wild-werewolf', levelReq: 5 },
    { name: 'Первобытный ужас', slug: 'primal-terror', description: 'Превращается в исполинского зверя, вселяя ужас', icon: '👹', type: 'ultimate', school: 'nature', manaCost: 80, cooldown: 18, damage: 140, healing: 0, duration: 6, classSlug: 'wild-werewolf', levelReq: 10 },
    { name: 'Звериная стойкость', slug: 'beast-endurance', description: 'Увеличивает регенерацию здоровья', icon: '💚', type: 'passive', school: 'nature', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'wild-werewolf', levelReq: 6 },

    // Тотемный Шаман
    { name: 'Тотем волка', slug: 'wolf-totem', description: 'Устанавливает тотем, увеличивающий скорость атаки', icon: '🐺', type: 'active', school: 'nature', manaCost: 30, cooldown: 8, damage: 0, healing: 10, duration: 8, classSlug: 'totem-shaman', levelReq: 1 },
    { name: 'Тотем медведя', slug: 'bear-totem', description: 'Устанавливает тотем, увеличивающий здоровье', icon: '🐻', type: 'active', school: 'nature', manaCost: 30, cooldown: 8, damage: 0, healing: 20, duration: 8, classSlug: 'totem-shaman', levelReq: 2 },
    { name: 'Тотем ворона', slug: 'raven-totem', description: 'Устанавливает тотем, восстанавливающий ману', icon: '🦅', type: 'active', school: 'nature', manaCost: 25, cooldown: 8, damage: 0, healing: 0, duration: 8, classSlug: 'totem-shaman', levelReq: 3 },
    { name: 'Духовная связь', slug: 'spirit-link', description: 'Связывает группу, разделяя урон между участниками', icon: '🔗', type: 'active', school: 'nature', manaCost: 40, cooldown: 10, damage: 0, healing: 0, duration: 6, classSlug: 'totem-shaman', levelReq: 5 },
    { name: 'Великий обряд духов', slug: 'grand-spirit-ritual', description: 'Призывает всех тотемных духов одновременно', icon: '🌀', type: 'ultimate', school: 'nature', manaCost: 90, cooldown: 20, damage: 60, healing: 50, duration: 10, classSlug: 'totem-shaman', levelReq: 10 },
    { name: 'Шаманское прозрение', slug: 'shamanic-insight', description: 'Увеличивает эффективность тотемов', icon: '👁️', type: 'passive', school: 'nature', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'totem-shaman', levelReq: 7 },

    // Пепельный Рыцарь
    { name: 'Пепельный щит', slug: 'ash-shield', description: 'Создаёт щит из пепла, поглощающий урон', icon: '🛡️', type: 'active', school: 'fire', manaCost: 20, cooldown: 5, damage: 0, healing: 0, duration: 4, classSlug: 'ash-knight', levelReq: 1 },
    { name: 'Кара пепла', slug: 'ash-judgment', description: 'Обрушивает на врага ливень горячего пепла', icon: '🔥', type: 'active', school: 'fire', manaCost: 30, cooldown: 5, damage: 50, healing: 0, duration: 0, classSlug: 'ash-knight', levelReq: 2 },
    { name: 'Стойкость пепла', slug: 'ash-fortitude', description: 'Увеличивает защиту и сопротивление огню', icon: '💪', type: 'active', school: 'fire', manaCost: 25, cooldown: 8, damage: 0, healing: 0, duration: 6, classSlug: 'ash-knight', levelReq: 3 },
    { name: 'Пепельная буря', slug: 'ash-storm', description: 'Создаёт вихрь пепла, ослепляющий врагов', icon: '🌪️', type: 'active', school: 'fire', manaCost: 35, cooldown: 7, damage: 30, healing: 0, duration: 4, classSlug: 'ash-knight', levelReq: 5 },
    { name: 'Воскрешение из пепла', slug: 'phoenix-rise', description: 'Возрождается после смертельного удара', icon: '🐦', type: 'ultimate', school: 'fire', manaCost: 100, cooldown: 30, damage: 80, healing: 100, duration: 0, classSlug: 'ash-knight', levelReq: 10 },
    { name: 'Доспех Катаклизма', slug: 'cataclysm-armor', description: 'Увеличивает броню при получении урона', icon: '⚔️', type: 'passive', school: 'fire', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'ash-knight', levelReq: 7 },

    // Огненный Маг
    { name: 'Огненный шар', slug: 'fireball', description: 'Выпускает сгусток пламени во врага', icon: '🔥', type: 'active', school: 'fire', manaCost: 25, cooldown: 3, damage: 60, healing: 0, duration: 0, classSlug: 'fire-mage', levelReq: 1 },
    { name: 'Огненная стена', slug: 'fire-wall', description: 'Создаёт стену огня, наносящую урон всем проходящим', icon: '🧱', type: 'active', school: 'fire', manaCost: 35, cooldown: 8, damage: 30, healing: 0, duration: 5, classSlug: 'fire-mage', levelReq: 3 },
    { name: 'Метеоритный дождь', slug: 'meteor-rain', description: 'Призывает дождь из огненных камней', icon: '☄️', type: 'active', school: 'fire', manaCost: 50, cooldown: 10, damage: 70, healing: 0, duration: 3, classSlug: 'fire-mage', levelReq: 5 },
    { name: 'Пылающая хватка', slug: 'burning-grasp', description: 'Поджигает врага, нанося持续ительный урон', icon: '✋', type: 'active', school: 'fire', manaCost: 20, cooldown: 4, damage: 15, healing: 0, duration: 5, classSlug: 'fire-mage', levelReq: 2 },
    { name: 'Катаклизм', slug: 'cataclysm', description: 'Вызывает мощнейший огненный взрыв огромной площади', icon: '🌋', type: 'ultimate', school: 'fire', manaCost: 100, cooldown: 20, damage: 150, healing: 0, duration: 0, classSlug: 'fire-mage', levelReq: 10 },
    { name: 'Пламя Катаклизма', slug: 'cataclysm-flame', description: 'Увеличивает урон от огненных заклинаний', icon: '🕯️', type: 'passive', school: 'fire', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'fire-mage', levelReq: 6 },

    // Бродячий Целитель
    { name: 'Исцеляющее касание', slug: 'healing-touch', description: 'Восстанавливает здоровье союзника', icon: '💚', type: 'active', school: 'holy', manaCost: 25, cooldown: 3, damage: 0, healing: 50, duration: 0, classSlug: 'wandering-healer', levelReq: 1 },
    { name: 'Очищение пеплом', slug: 'ash-purification', description: 'Снимает негативные эффекты с союзника', icon: '✨', type: 'active', school: 'holy', manaCost: 20, cooldown: 5, damage: 0, healing: 0, duration: 0, classSlug: 'wandering-healer', levelReq: 2 },
    { name: 'Благословение Пелла', slug: 'pell-blessing', description: 'Увеличивает восстановление здоровья группы', icon: '🌟', type: 'active', school: 'holy', manaCost: 40, cooldown: 10, damage: 0, healing: 25, duration: 8, classSlug: 'wandering-healer', levelReq: 4 },
    { name: 'Пепельное зелье', slug: 'ash-potion', description: 'Бросает лечебное зелье в область', icon: '🧪', type: 'active', school: 'holy', manaCost: 30, cooldown: 6, damage: 0, healing: 35, duration: 0, classSlug: 'wandering-healer', levelReq: 3 },
    { name: 'Чудо Пелла', slug: 'pell-miracle', description: 'Мощнейшее исцеление, способное поднять с ног', icon: '⭐', type: 'ultimate', school: 'holy', manaCost: 90, cooldown: 18, damage: 0, healing: 150, duration: 0, classSlug: 'wandering-healer', levelReq: 10 },
    { name: 'Милосердие странника', slug: 'wanderer-mercy', description: 'Увеличивает исцеление при низком здоровье цели', icon: '🤲', type: 'passive', school: 'holy', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'wandering-healer', levelReq: 7 },

    // Ткач Снов
    { name: 'Погружение в сон', slug: 'sleep-plunge', description: 'Усыпляет врага, погружая его в кошмар', icon: '💤', type: 'active', school: 'arcane', manaCost: 30, cooldown: 6, damage: 0, healing: 0, duration: 4, classSlug: 'dream-weaver', levelReq: 1 },
    { name: 'Кошмар', slug: 'nightmare', description: 'Наносит урон спящему врагу через кошмарные видения', icon: '😱', type: 'active', school: 'shadow', manaCost: 25, cooldown: 4, damage: 45, healing: 0, duration: 3, classSlug: 'dream-weaver', levelReq: 2 },
    { name: 'Сонная мгла', slug: 'dream-haze', description: 'Создаёт облако, усыпляющее всех в области', icon: '🌫️', type: 'active', school: 'arcane', manaCost: 40, cooldown: 8, damage: 15, healing: 0, duration: 4, classSlug: 'dream-weaver', levelReq: 4 },
    { name: 'Утешительный сон', slug: 'comforting-dream', description: 'Восстанавливает здоровье через приятные сновидения', icon: '😇', type: 'active', school: 'holy', manaCost: 30, cooldown: 6, damage: 0, healing: 40, duration: 5, classSlug: 'dream-weaver', levelReq: 3 },
    { name: 'Владыка сновидений', slug: 'dream-lord', description: 'Полностью контролирует разум всех врагов в области', icon: '👑', type: 'ultimate', school: 'arcane', manaCost: 90, cooldown: 20, damage: 60, healing: 30, duration: 6, classSlug: 'dream-weaver', levelReq: 10 },
    { name: 'Тонкая грань', slug: 'thin-veil', description: 'Увеличивает продолжительность эффектов контроля', icon: '🌀', type: 'passive', school: 'arcane', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'dream-weaver', levelReq: 6 },

    // Колючий Страж
    { name: 'Стена шипов', slug: 'thorn-wall', description: 'Выращивает стену из шипов, блокируя проход', icon: '🌹', type: 'active', school: 'nature', manaCost: 30, cooldown: 6, damage: 25, healing: 0, duration: 6, classSlug: 'thorn-guardian', levelReq: 1 },
    { name: 'Шипастая броня', slug: 'thorn-armor', description: 'Покрывает тело шипами, отражая часть урона', icon: '🦔', type: 'active', school: 'nature', manaCost: 25, cooldown: 8, damage: 10, healing: 0, duration: 8, classSlug: 'thorn-guardian', levelReq: 2 },
    { name: 'Захват корней', slug: 'root-grasp', description: 'Корни опутывают врага, обездвиживая его', icon: '🌱', type: 'active', school: 'nature', manaCost: 20, cooldown: 5, damage: 15, healing: 0, duration: 3, classSlug: 'thorn-guardian', levelReq: 3 },
    { name: 'Сить дерева', slug: 'tree-vitality', description: 'Поглощает силу дерева, восстанавливая здоровье', icon: '🌳', type: 'active', school: 'nature', manaCost: 30, cooldown: 7, damage: 0, healing: 50, duration: 0, classSlug: 'thorn-guardian', levelReq: 4 },
    { name: 'Гнев леса', slug: 'forest-wrath', description: 'Превращается в огромное дерево-титан', icon: '🌲', type: 'ultimate', school: 'nature', manaCost: 85, cooldown: 18, damage: 90, healing: 0, duration: 8, classSlug: 'thorn-guardian', levelReq: 10 },
    { name: 'Живой щит', slug: 'living-shield', description: 'Получает меньше урона от физических атак', icon: '🛡️', type: 'passive', school: 'nature', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'thorn-guardian', levelReq: 6 },

    // Ядочарница
    { name: 'Смертоносный поцелуй', slug: 'deadly-kiss', description: 'Наносит отравленную атаку с высоким начальным уроном', icon: '💋', type: 'active', school: 'nature', manaCost: 20, cooldown: 3, damage: 40, healing: 0, duration: 4, classSlug: 'venom-charmer', levelReq: 1 },
    { name: 'Облако яда', slug: 'venom-cloud', description: 'Выпускает облако токсичных паров', icon: '☁️', type: 'active', school: 'nature', manaCost: 35, cooldown: 7, damage: 25, healing: 0, duration: 5, classSlug: 'venom-charmer', levelReq: 3 },
    { name: 'Ослабляющий яд', slug: 'weakening-venom', description: 'Снижает силу и ловкость отравленного врага', icon: '💉', type: 'active', school: 'nature', manaCost: 25, cooldown: 5, damage: 15, healing: 0, duration: 5, classSlug: 'venom-charmer', levelReq: 2 },
    { name: 'Антидот', slug: 'antidote', description: 'Нейтрализует яды и восстанавливает здоровье', icon: '💊', type: 'active', school: 'holy', manaCost: 20, cooldown: 5, damage: 0, healing: 30, duration: 0, classSlug: 'venom-charmer', levelReq: 4 },
    { name: 'Царский яд', slug: 'royal-venom', description: 'Впрыскивает концентрированный яд, смертельный для любого существа', icon: '☠️', type: 'ultimate', school: 'nature', manaCost: 80, cooldown: 16, damage: 130, healing: 0, duration: 6, classSlug: 'venom-charmer', levelReq: 10 },
    { name: 'Иммунитет к ядам', slug: 'venom-immunity', description: 'Сопротивление негативным эффектам отравления', icon: '🧬', type: 'passive', school: 'nature', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'venom-charmer', levelReq: 7 },

    // Глубинный Сталкер
    { name: 'Удар из мрака', slug: 'darkness-strike', description: 'Атакует врага из абсолютной тьмы', icon: '⚫', type: 'active', school: 'shadow', manaCost: 20, cooldown: 3, damage: 55, healing: 0, duration: 0, classSlug: 'depth-stalker', levelReq: 1 },
    { name: 'Чувство бездны', slug: 'abyth-sense', description: 'Обнаруживает скрытых врагов в темноте', icon: '👁️', type: 'active', school: 'shadow', manaCost: 15, cooldown: 6, damage: 0, healing: 0, duration: 5, classSlug: 'depth-stalker', levelReq: 2 },
    { name: 'Захват щупальцем', slug: 'tentacle-grab', description: 'Выстреливает щупальцем, притягивая врага', icon: '🐙', type: 'active', school: 'shadow', manaCost: 25, cooldown: 5, damage: 35, healing: 0, duration: 2, classSlug: 'depth-stalker', levelReq: 3 },
    { name: 'Поглощение света', slug: 'light-devour', description: 'Создаёт зону абсолютной тьмы вокруг врага', icon: '🕳️', type: 'active', school: 'shadow', manaCost: 30, cooldown: 7, damage: 20, healing: 0, duration: 4, classSlug: 'depth-stalker', levelReq: 5 },
    { name: 'Авангард бездны', slug: 'abyss-vanguard', description: 'Высвобождает форму глубинного ужаса', icon: '👹', type: 'ultimate', school: 'shadow', manaCost: 85, cooldown: 18, damage: 130, healing: 0, duration: 6, classSlug: 'depth-stalker', levelReq: 10 },
    { name: 'Дитя мрака', slug: 'darkness-child', description: 'Увеличивает урон и уклонение в тёмных зонах', icon: '🌑', type: 'passive', school: 'shadow', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'depth-stalker', levelReq: 6 },

    // Кислотный Плеватель
    { name: 'Кислотный плевок', slug: 'acid-spit', description: 'Выплёвывает струю едкой кислоты', icon: '🧪', type: 'active', school: 'nature', manaCost: 20, cooldown: 3, damage: 45, healing: 0, duration: 3, classSlug: 'acid-spitter', levelReq: 1 },
    { name: 'Кислотная лужа', slug: 'acid-pool', description: 'Создаёт лужу кислоты, наносящую урон во времени', icon: '💦', type: 'active', school: 'nature', manaCost: 30, cooldown: 6, damage: 20, healing: 0, duration: 6, classSlug: 'acid-spitter', levelReq: 2 },
    { name: 'Разъедание брони', slug: 'armor-melt', description: 'Снижает броню врага кислотным воздействием', icon: '🛡️', type: 'active', school: 'nature', manaCost: 25, cooldown: 5, damage: 30, healing: 0, duration: 4, classSlug: 'acid-spitter', levelReq: 3 },
    { name: 'Токсичный газ', slug: 'toxic-gas', description: 'Выдыхает облако токсичных паров', icon: '💨', type: 'active', school: 'nature', manaCost: 35, cooldown: 8, damage: 25, healing: 0, duration: 5, classSlug: 'acid-spitter', levelReq: 5 },
    { name: 'Кислотный потоп', slug: 'acid-flood', description: 'Затапливает область концентрированной кислотой', icon: '🌊', type: 'ultimate', school: 'nature', manaCost: 90, cooldown: 18, damage: 120, healing: 0, duration: 5, classSlug: 'acid-spitter', levelReq: 10 },
    { name: 'Едкая кровь', slug: 'corrosive-blood', description: 'Наносит урон атакующим при получении урона', icon: '🩸', type: 'passive', school: 'nature', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'acid-spitter', levelReq: 7 },

    // Туннельный Берсерк
    { name: 'Туннельный удар', slug: 'tunnel-strike', description: 'Наносит мощный удар, пробивающий стены', icon: '👊', type: 'active', school: 'physical', manaCost: 15, cooldown: 3, damage: 55, healing: 0, duration: 0, classSlug: 'tunnel-berserker', levelReq: 1 },
    { name: 'Берсеркерская ярость', slug: 'berserker-rage', description: 'Впадает в ярость, увеличивая урон, но снижая защиту', icon: '😡', type: 'active', school: 'physical', manaCost: 20, cooldown: 8, damage: 0, healing: 0, duration: 6, classSlug: 'tunnel-berserker', levelReq: 2 },
    { name: 'Пробивание породы', slug: 'rock-bore', description: 'Пробивает скалу, создавая туннель и обрушивая камни на врагов', icon: '⛰️', type: 'active', school: 'physical', manaCost: 30, cooldown: 7, damage: 60, healing: 0, duration: 0, classSlug: 'tunnel-berserker', levelReq: 3 },
    { name: 'Веер разрушения', slug: 'destruction-fan', description: 'Наносит серию ударов по всем врагам вокруг', icon: '💥', type: 'active', school: 'physical', manaCost: 35, cooldown: 6, damage: 45, healing: 0, duration: 0, classSlug: 'tunnel-berserker', levelReq: 5 },
    { name: 'Землеройный кошмар', slug: 'burrowing-nightmare', description: 'Превращается в бур, проносящийся сквозь ряды врагов', icon: '🌪️', type: 'ultimate', school: 'physical', manaCost: 75, cooldown: 16, damage: 140, healing: 0, duration: 4, classSlug: 'tunnel-berserker', levelReq: 10 },
    { name: 'Глубинная ярость', slug: 'depth-rage', description: 'Увеличивает урон по мере снижения здоровья', icon: '💢', type: 'passive', school: 'physical', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'tunnel-berserker', levelReq: 6 },

    // ===== UNIVERSAL CLASS ABILITIES =====
    // Некромант
    { name: 'Поднятие мёртвых', slug: 'raise-dead', description: 'Поднимает павшего врага как скелета-слугу', icon: '💀', type: 'active', school: 'shadow', manaCost: 35, cooldown: 8, damage: 0, healing: 0, duration: 10, classSlug: 'necromancer', levelReq: 1 },
    { name: 'Жатва душ', slug: 'soul-harvest', description: 'Вытягивает жизненную силу из врагов', icon: '👻', type: 'active', school: 'shadow', manaCost: 30, cooldown: 5, damage: 40, healing: 20, duration: 0, classSlug: 'necromancer', levelReq: 2 },
    { name: 'Костяной щит', slug: 'bone-shield', description: 'Создаёт щит из костей павших', icon: '🦴', type: 'active', school: 'shadow', manaCost: 25, cooldown: 7, damage: 0, healing: 0, duration: 5, classSlug: 'necromancer', levelReq: 3 },
    { name: 'Чумное облако', slug: 'plague-cloud', description: 'Выпускает облако чумы, заражающее врагов', icon: '☣️', type: 'active', school: 'shadow', manaCost: 40, cooldown: 8, damage: 30, healing: 0, duration: 6, classSlug: 'necromancer', levelReq: 4 },
    { name: 'Армия мёртвых', slug: 'army-dead', description: 'Поднимает целую армию нежити', icon: '☠️', type: 'ultimate', school: 'shadow', manaCost: 100, cooldown: 25, damage: 80, healing: 0, duration: 12, classSlug: 'necromancer', levelReq: 10 },
    { name: 'Пустота смерти', slug: 'death-void', description: 'Увеличивает силу нежити и эффекты откачивания', icon: '🌑', type: 'passive', school: 'shadow', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'necromancer', levelReq: 7 },

    // Бард Скверны
    { name: 'Песнь проклятия', slug: 'curse-song', description: 'Проклинает врагов песней, снижая их характеристики', icon: '🎵', type: 'active', school: 'shadow', manaCost: 25, cooldown: 5, damage: 20, healing: 0, duration: 5, classSlug: 'blight-bard', levelReq: 1 },
    { name: 'Диссонанс', slug: 'dissonance', description: 'Разрушительная звуковая волна, наносящая урон', icon: '📢', type: 'active', school: 'arcane', manaCost: 30, cooldown: 4, damage: 45, healing: 0, duration: 0, classSlug: 'blight-bard', levelReq: 2 },
    { name: 'Гимн отчаяния', slug: 'despair-hymn', description: 'Снижает боевой дух врагов, уменьшая их урон', icon: '😟', type: 'active', school: 'shadow', manaCost: 35, cooldown: 8, damage: 0, healing: 0, duration: 6, classSlug: 'blight-bard', levelReq: 3 },
    { name: 'Мотив безумия', slug: 'madness-motif', description: 'Заставляет врагов атаковать друг друга', icon: '😵', type: 'active', school: 'arcane', manaCost: 40, cooldown: 10, damage: 0, healing: 0, duration: 4, classSlug: 'blight-bard', levelReq: 5 },
    { name: 'Реквием Скверны', slug: 'blight-requiem', description: 'Финальная песнь разрушения, поражающая всех врагов', icon: '🎶', type: 'ultimate', school: 'shadow', manaCost: 85, cooldown: 18, damage: 100, healing: 0, duration: 0, classSlug: 'blight-bard', levelReq: 10 },
    { name: 'Эхо бездны', slug: 'abyss-echo', description: 'Увеличивает продолжительность звуковых эффектов', icon: '🔊', type: 'passive', school: 'arcane', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'blight-bard', levelReq: 6 },

    // Мистик Пелла
    { name: 'Свет Пелла', slug: 'pell-light', description: 'Излучает святой свет, нанося урон нежити и исцеляя союзников', icon: '✨', type: 'active', school: 'holy', manaCost: 25, cooldown: 4, damage: 30, healing: 30, duration: 0, classSlug: 'pell-mystic', levelReq: 1 },
    { name: 'Очищающий луч', slug: 'purifying-ray', description: 'Луч света, снимающий проклятия и яды', icon: '🌟', type: 'active', school: 'holy', manaCost: 20, cooldown: 5, damage: 0, healing: 25, duration: 0, classSlug: 'pell-mystic', levelReq: 2 },
    { name: 'Аура защиты', slug: 'protection-aura', description: 'Создаёт ауру, увеличивающую защиту союзников', icon: '🛡️', type: 'active', school: 'holy', manaCost: 35, cooldown: 8, damage: 0, healing: 0, duration: 6, classSlug: 'pell-mystic', levelReq: 3 },
    { name: 'Священный круг', slug: 'holy-circle', description: 'Чертит круг на земле, исцеляющий внутри', icon: '⭕', type: 'active', school: 'holy', manaCost: 40, cooldown: 10, damage: 0, healing: 40, duration: 6, classSlug: 'pell-mystic', levelReq: 5 },
    { name: 'Божественное вмешательство', slug: 'divine-intervention', description: 'Мощнейшее заклинание Пелла, спасающее от смерти', icon: '🙏', type: 'ultimate', school: 'holy', manaCost: 100, cooldown: 25, damage: 50, healing: 120, duration: 0, classSlug: 'pell-mystic', levelReq: 10 },
    { name: 'Вера в Пелла', slug: 'pell-faith', description: 'Увеличивает эффективность святых заклинаний', icon: '💛', type: 'passive', school: 'holy', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'pell-mystic', levelReq: 7 },

    // Охотник за Головами
    { name: 'Метательный кинжал', slug: 'throwing-dagger', description: 'Бросает кинжал в цель с большой точностью', icon: '🔪', type: 'active', school: 'physical', manaCost: 15, cooldown: 3, damage: 50, healing: 0, duration: 0, classSlug: 'bounty-hunter', levelReq: 1 },
    { name: 'Сеть ловца', slug: 'catcher-net', description: 'Накидывает сеть, обездвиживая цель', icon: '🥅', type: 'active', school: 'physical', manaCost: 25, cooldown: 7, damage: 10, healing: 0, duration: 3, classSlug: 'bounty-hunter', levelReq: 2 },
    { name: 'Метка добычи', slug: 'prey-mark', description: 'Помечает цель, увеличивая урон по ней всем группой', icon: '🎯', type: 'active', school: 'physical', manaCost: 20, cooldown: 5, damage: 0, healing: 0, duration: 6, classSlug: 'bounty-hunter', levelReq: 3 },
    { name: 'Двойной выстрел', slug: 'double-shot', description: 'Стреляет двумя снарядами одновременно', icon: '🏹', type: 'active', school: 'physical', manaCost: 30, cooldown: 5, damage: 65, healing: 0, duration: 0, classSlug: 'bounty-hunter', levelReq: 4 },
    { name: 'Казнь', slug: 'execution', description: 'Наносит огромный урон помеченной цели с низким здоровьем', icon: '💀', type: 'ultimate', school: 'physical', manaCost: 70, cooldown: 15, damage: 150, healing: 0, duration: 0, classSlug: 'bounty-hunter', levelReq: 10 },
    { name: 'Опытный следопыт', slug: 'expert-tracker', description: 'Увеличивает урон по помеченным целям', icon: '👁️', type: 'passive', school: 'physical', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'bounty-hunter', levelReq: 7 },

    // Торговец Теней
    { name: 'Теневой контракт', slug: 'shadow-deal', description: 'Заключает сделку, усиливая союзника за золото', icon: '📝', type: 'active', school: 'shadow', manaCost: 20, cooldown: 5, damage: 0, healing: 0, duration: 5, classSlug: 'shadow-merchant', levelReq: 1 },
    { name: 'Контрабанда', slug: 'contraband', description: 'Бросает контрабандное оружие, наносящее урон', icon: '🎒', type: 'active', school: 'physical', manaCost: 25, cooldown: 4, damage: 40, healing: 0, duration: 0, classSlug: 'shadow-merchant', levelReq: 2 },
    { name: 'Дымовая бомба', slug: 'smoke-bomb', description: 'Бросает дымовую бомбу, скрывая группу', icon: '💨', type: 'active', school: 'shadow', manaCost: 30, cooldown: 8, damage: 0, healing: 0, duration: 4, classSlug: 'shadow-merchant', levelReq: 3 },
    { name: 'Теневой рынок', slug: 'shadow-market', description: 'Создаёт временный магазин с усилениями', icon: '🏪', type: 'active', school: 'shadow', manaCost: 40, cooldown: 10, damage: 0, healing: 15, duration: 6, classSlug: 'shadow-merchant', levelReq: 5 },
    { name: 'Монополия смерти', slug: 'death-monopoly', description: 'Скупает души врагов, нанося колоссальный урон', icon: '💰', type: 'ultimate', school: 'shadow', manaCost: 85, cooldown: 18, damage: 110, healing: 0, duration: 0, classSlug: 'shadow-merchant', levelReq: 10 },
    { name: 'Тёмная коммерция', slug: 'dark-commerce', description: 'Получает больше золота и лучшие скидки', icon: '🪙', type: 'passive', school: 'shadow', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'shadow-merchant', levelReq: 6 },

    // Странствующий Мечник
    { name: 'Быстрый выпад', slug: 'quick-thrust', description: 'Молниеносный удар мечом', icon: '⚔️', type: 'active', school: 'physical', manaCost: 15, cooldown: 2, damage: 45, healing: 0, duration: 0, classSlug: 'wandering-swordsman', levelReq: 1 },
    { name: 'Вихрь клинков', slug: 'blade-whirlwind', description: 'Крутится с мечами, поражая всех вокруг', icon: '🌀', type: 'active', school: 'physical', manaCost: 35, cooldown: 6, damage: 40, healing: 0, duration: 0, classSlug: 'wandering-swordsman', levelReq: 2 },
    { name: 'Контрудар', slug: 'counter-strike', description: 'Блокирует атаку и немедленно контратакует', icon: '🛡️', type: 'active', school: 'physical', manaCost: 20, cooldown: 5, damage: 55, healing: 0, duration: 0, classSlug: 'wandering-swordsman', levelReq: 3 },
    { name: 'Путь меча', slug: 'sword-path', description: 'Концентрируется, увеличивая урон следующих атак', icon: '🧘', type: 'active', school: 'physical', manaCost: 25, cooldown: 8, damage: 0, healing: 0, duration: 6, classSlug: 'wandering-swordsman', levelReq: 5 },
    { name: 'Иай-дзюцу: Лунный свет', slug: 'iai-moonlight', description: 'Мгновенное обнажение и удар невиданной силы', icon: '🌙', type: 'ultimate', school: 'physical', manaCost: 75, cooldown: 16, damage: 160, healing: 0, duration: 0, classSlug: 'wandering-swordsman', levelReq: 10 },
    { name: 'Странник дорог', slug: 'road-wanderer', description: 'Увеличивает скорость передвижения и восстановления', icon: '🚶', type: 'passive', school: 'physical', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'wandering-swordsman', levelReq: 7 },

    // Жрец Равновесия
    { name: 'Равновесие сил', slug: 'force-balance', description: 'Выравнивает здоровье группы, распределяя его поровну', icon: '⚖️', type: 'active', school: 'holy', manaCost: 30, cooldown: 6, damage: 0, healing: 35, duration: 0, classSlug: 'balance-priest', levelReq: 1 },
    { name: 'Антимагия', slug: 'anti-magic', description: 'Создаёт зону, нейтрализующую магию', icon: '🚫', type: 'active', school: 'arcane', manaCost: 35, cooldown: 8, damage: 0, healing: 0, duration: 4, classSlug: 'balance-priest', levelReq: 2 },
    { name: 'Уравновешивание', slug: 'equalize', description: 'Наносит урон врагу и исцеляет союзника одновременно', icon: '🔄', type: 'active', school: 'holy', manaCost: 30, cooldown: 5, damage: 30, healing: 30, duration: 0, classSlug: 'balance-priest', levelReq: 3 },
    { name: 'Щит гармонии', slug: 'harmony-shield', description: 'Создаёт щит, поглощающий урон и исцеляющий', icon: '🛡️', type: 'active', school: 'holy', manaCost: 35, cooldown: 7, damage: 0, healing: 15, duration: 5, classSlug: 'balance-priest', levelReq: 4 },
    { name: 'Абсолютный баланс', slug: 'absolute-balance', description: 'Устанавливает абсолютное равновесие, исцеляя союзников и уничтожая нежить', icon: '☯️', type: 'ultimate', school: 'holy', manaCost: 90, cooldown: 20, damage: 80, healing: 80, duration: 0, classSlug: 'balance-priest', levelReq: 10 },
    { name: 'Мудрость равновесия', slug: 'balance-wisdom', description: 'Увеличивает эффективность заклинаний равновесия', icon: '🔮', type: 'passive', school: 'holy', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'balance-priest', levelReq: 7 },

    // Алхимик Бездны
    { name: 'Эликсир бездны', slug: 'abyss-elixir', description: 'Бросает флакон с зельем, наносящим урон', icon: '🧪', type: 'active', school: 'arcane', manaCost: 20, cooldown: 3, damage: 45, healing: 0, duration: 3, classSlug: 'abyss-alchemist', levelReq: 1 },
    { name: 'Зелье исцеления', slug: 'healing-potion', description: 'Бросает лечебное зелье в область', icon: '💊', type: 'active', school: 'holy', manaCost: 25, cooldown: 5, damage: 0, healing: 40, duration: 0, classSlug: 'abyss-alchemist', levelReq: 2 },
    { name: 'Взрывной коктейль', slug: 'explosive-cocktail', description: 'Бросает взрывную смесь, наносящую урон по площади', icon: '💣', type: 'active', school: 'arcane', manaCost: 35, cooldown: 6, damage: 55, healing: 0, duration: 0, classSlug: 'abyss-alchemist', levelReq: 3 },
    { name: 'Мутагенный туман', slug: 'mutagenic-mist', description: 'Выпускает туман, мутирующий врагов', icon: '🌫️', type: 'active', school: 'arcane', manaCost: 30, cooldown: 7, damage: 20, healing: 0, duration: 5, classSlug: 'abyss-alchemist', levelReq: 4 },
    { name: 'Философский камень', slug: 'philosopher-stone', description: 'Трансмутирует реальность, создавая мощнейший взрыв', icon: '💎', type: 'ultimate', school: 'arcane', manaCost: 95, cooldown: 20, damage: 120, healing: 40, duration: 0, classSlug: 'abyss-alchemist', levelReq: 10 },
    { name: 'Безумный гений', slug: 'mad-genius', description: 'Увеличивает эффективность зелий и эффектов', icon: '🧠', type: 'passive', school: 'arcane', manaCost: 0, cooldown: 0, damage: 0, healing: 0, duration: 0, classSlug: 'abyss-alchemist', levelReq: 7 },
  ];

  // Create all abilities
  for (const ab of abilityData) {
    const cls = allClasses.find(c => c.slug === ab.classSlug);
    if (!cls) continue;
    await db.ability.create({
      data: {
        name: ab.name,
        slug: ab.slug,
        description: ab.description,
        icon: ab.icon,
        type: ab.type,
        school: ab.school,
        manaCost: ab.manaCost,
        cooldown: ab.cooldown,
        damage: ab.damage,
        healing: ab.healing,
        duration: ab.duration,
        classId: cls.id,
        levelReq: ab.levelReq,
      },
    });
  }

  // ===== LOCATIONS =====
  const locations = await Promise.all([
    db.location.create({
      data: {
        name: 'Пепельные Равнины',
        slug: 'ash-plains',
        description: 'Бескрайние выжженные земли, где дует вечный пепельный ветер. Когда-то здесь цвели сады, но Катаклизм превратил всё в серую пустошь.',
        icon: '🏜️',
        type: 'wild',
        dangerLevel: 3,
        parentLocId: null,
        races: 'ashborn-humans',
        lore: 'Пепельные Равнины — шрам мира, напоминание о Великом Катаклизме. Под слоем пепла лежат руины древних городов, а выжившие Люди Пепла строят новые поселения из обломков прошлого.',
        features: 'добыча пепла,руины,странствующие торговцы',
      },
    }),
    db.location.create({
      data: {
        name: 'Подземный Город Дроу',
        slug: 'drow-city',
        description: 'Величественный лабиринт из обсидиана и кристаллов, освещённый бледным свечением подземных грибов.',
        icon: '🏛️',
        type: 'town',
        dangerLevel: 4,
        parentLocId: null,
        races: 'dark-elves',
        lore: 'Подземный Город Дроу — чудо архитектуры глубин. Дома из обсидиана парят над бездонными провалами, а кристальные мосты соединяют уровни города. Интриги здесь — искусство, а предательство — добродетель.',
        features: 'торговля магией,интриги,кристальные сады',
      },
    }),
    db.location.create({
      data: {
        name: 'Кузнечные Горны',
        slug: 'forge-mountains',
        description: 'Вулканические шахты, где вечный огонь питает великие кузни гномов. Жар и грохот — музыка этого места.',
        icon: '🌋',
        type: 'town',
        dangerLevel: 5,
        parentLocId: null,
        races: 'forge-dwarves',
        lore: 'Кузнечные Горны — сердце индустрии мира. Раскалённые лавой кузни гномов никогда не остывают. Здесь рождаются легендарные клинки и механизмы, а горный хребет дрожит от ударов молотов.',
        features: 'кузни,вулканические шахты,торговля оружием',
      },
    }),
    db.location.create({
      data: {
        name: 'Теневой Лес',
        slug: 'shadow-forest',
        description: 'Мрачный лес, где деревья шепчутся во тьме, а лунный свет едва пробивается сквозь крону. Обиталище дриад и оборотней.',
        icon: '🌲',
        type: 'wild',
        dangerLevel: 6,
        parentLocId: null,
        races: 'shadow-dryads,skinwalkers',
        lore: 'Теневой Лес — живой организм, впитавший Скверну и превративший её в новую форму жизни. Деревья здесь ходят, корни опутывают путников, а шёпот листвы сводит с ума. Дриады и Оборотни — хозяева этого места.',
        features: 'ночные охотники,живые деревья,лунные ритуалы',
      },
    }),
    db.location.create({
      data: {
        name: 'Глубинные Тоннели',
        slug: 'depth-tunnels',
        description: 'Бесконечные катакомбы, уходящие в самые недра мира. Мрак здесь абсолютен, а обитатели — ужасающи.',
        icon: '🕳️',
        type: 'dungeon',
        dangerLevel: 8,
        parentLocId: null,
        races: 'deepspawn',
        lore: 'Глубинные Тоннели — лабиринт без начала и конца. Здесь обитают существа, которых не должен видеть свет. Дети Глубин адаптировались к этому безумию, но даже они боятся того, что лежит в самых глубоких туннелях.',
        features: 'мутанты,подземные реки,забытые святилища',
      },
    }),
    db.location.create({
      data: {
        name: 'Руины Старого Мира',
        slug: 'old-world-ruins',
        description: 'Останки великой цивилизации до Катаклизма. Развалины хранят тайны и опасности.',
        icon: '🏚️',
        type: 'dungeon',
        dangerLevel: 7,
        parentLocId: null,
        races: '',
        lore: 'Руины Старого Мира — молчаливые свидетели эпохи, предшествовавшей Катаклизму. Древние механизмы ещё работают, ловушки всё ещё смертоносны, а сокровища — всё ещё ждут смельчаков.',
        features: 'древние ловушки,артефакты,стражи руин',
      },
    }),
    db.location.create({
      data: {
        name: 'Оазис Пелла',
        slug: 'pell-oasis',
        description: 'Единственное место, где сила Пелла течёт свободно. Святая земля, защищённая от Скверны.',
        icon: '🌟',
        type: 'sanctuary',
        dangerLevel: 1,
        parentLocId: null,
        races: '',
        lore: 'Оазис Пелла — луч света во тьме. Здесь река Пелла выходит на поверхность, неся исцеление и надежду. Это нейтральная территория, где запрещено насилие, и даже враги могут найти здесь приют.',
        features: 'исцеление,медитация,святилище,торговля',
      },
    }),
    db.location.create({
      data: {
        name: 'Разлом Скверны',
        slug: 'blight-rift',
        description: 'Зияющая рана в ткани реальности, из которой сочится чистая Скверна. Место невыразимого ужаса.',
        icon: '👹',
        type: 'rift',
        dangerLevel: 10,
        parentLocId: null,
        races: '',
        lore: 'Разлом Скверны — источник всего зла в мире. Из этой раны в реальности изливается чистая порча, мутирующая и уничтожающая всё живое. Только безумцы или герои осмелятся подойти к нему.',
        features: 'порча,мутации,боссы Скверны,артефакты тьмы',
      },
    }),
    db.location.create({
      data: {
        name: 'Перекрёсток Судеб',
        slug: 'fate-crossroads',
        description: 'Нейтральная зона торговли и переговоров. Здесь сходятся пути всех рас.',
        icon: '⛩️',
        type: 'town',
        dangerLevel: 2,
        parentLocId: null,
        races: 'dark-elves,forge-dwarves,skinwalkers,ashborn-humans,shadow-dryads,deepspawn',
        lore: 'Перекрёсток Судеб — единственное место, где представители всех рас могут встретиться без страха. Древний договор запрещает насилие здесь, но интриги и шпионаж процветают.',
        features: 'торговля,переговоры,наёмники,аукцион',
      },
    }),
    db.location.create({
      data: {
        name: 'Башня Равновесия',
        slug: 'balance-tower',
        description: 'Величественная башня, устремлённая в небо. Центр баланса между Пеллом и Скверной.',
        icon: '🗼',
        type: 'sanctuary',
        dangerLevel: 3,
        parentLocId: null,
        races: '',
        lore: 'Башня Равновесия — древнее сооружение, построенное для поддержания баланса сил. Жрецы Равновесия неусыпно следят, чтобы ни свет, ни тьма не возобладали. Говорят, на вершине башни хранится артефакт, способный изменить мир.',
        features: 'медитация,обучение,хранилище артефактов,смотрители',
      },
    }),
  ]);

  return {
    message: 'Database seeded successfully',
    raceCount: races.length,
    classCount: allClasses.length,
    locationCount: locations.length,
  };
}

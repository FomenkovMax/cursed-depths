import { db } from './db';
import type { Prisma } from '@prisma/client';

// Источник истины: docs/cursed_depths_master.pdf (Библия мира, Фаза 0-1) и
// docs/cursed_depths_abilities.pdf (v2 — баланс, полный список способностей).
// 6 рас, 26 классов (по 4 на расу — 2 Путь Пепла + 2 Путь Скверны — кроме
// Людей: у них 6, по 3 на каждый Путь), ~180 способностей по 3 стадиям
// эволюции на класс.

// Идемпотентные upsert-хелперы по уникальному slug.
async function upsertRace(args: { data: Prisma.RaceCreateInput }) {
  return db.race.upsert({ where: { slug: args.data.slug }, create: args.data, update: args.data });
}

async function upsertClass(args: { data: Prisma.GameClassUncheckedCreateInput }) {
  return db.gameClass.upsert({ where: { slug: args.data.slug }, create: args.data, update: args.data });
}

async function upsertAbility(args: { data: Prisma.AbilityUncheckedCreateInput }) {
  return db.ability.upsert({ where: { slug: args.data.slug }, create: args.data, update: args.data });
}

// Модели Location в schema.prisma пока нет — данные сохранены как есть для
// будущей задачи (Фаза 2.1 мастер-документа: регионы Актов 1-6), в БД сейчас
// не пишутся.
export const LOCATIONS_SEED = [
  {
    name: 'Пепельные Врата',
    slug: 'ashen-gate',
    description: 'Руины человеческой цивилизации, последствия откровения Карсуса. Здесь игрок пробуждается без памяти и узнаёт о Падении.',
    icon: '🔥',
    type: 'region',
    dangerLevel: 1,
    parentLocId: null,
    races: 'humans',
    lore: 'Акт 1. Сожжённая деревня, Храм Велариона, Тракт Скорби, Пепельная крепость, Разлом Карсуса — первый вход в Глубь. Босс акта — Первый Свидетель.',
    features: 'обучение,первые бои,первый разлом',
  },
  {
    name: 'Корневая Роща',
    slug: 'root-grove',
    description: 'Умирающий лес эльфов, где оборвана Нить Жизни, а Мёртвый берег несёт Скверну из Глуби.',
    icon: '🌿',
    type: 'region',
    dangerLevel: 3,
    parentLocId: null,
    races: 'elves',
    lore: 'Акт 2. Внешняя роща, Мёртвый берег, Сердце Рощи (бывший храм Айлет), Тень-грибница, Корень Бездны. Босс акта — Эхо Айлет.',
    features: 'заражённый лес,корни-ловушки,храм Айлет',
  },
  {
    name: 'Каменный Чертог',
    slug: 'stone-hall',
    description: 'Разрушенные шахты гномов, потерянные руны и предательство основ.',
    icon: '🪨',
    type: 'region',
    dangerLevel: 4,
    parentLocId: null,
    races: 'dwarves',
    lore: 'Акт 3. Внешние шахты, Рунная мастерская, Зал Клятв, Великая Кузница, Разлом Основы. Босс акта — Сломанная Клятва.',
    features: 'рунные загадки,кузница Торнака,подземные тоннели',
  },
  {
    name: 'Драконье Горнило',
    slug: 'dragon-forge',
    description: 'Вулканическая земля драконорождённых — грань между силой и самоуничтожением.',
    icon: '🌋',
    type: 'region',
    dangerLevel: 5,
    parentLocId: null,
    races: 'dragonborn',
    lore: 'Акт 4. Пепельная пустошь, Гнёзда, Обсидиановый лабиринт, Жерло Игниры, Колыбель Пламени. Босс акта — Первый Дракон.',
    features: 'вулкан,горение,древние гнёзда',
  },
  {
    name: 'Гнилые Топи',
    slug: 'rotten-marshes',
    description: 'Болота нежити, где мёртвые не лежат спокойно — граница между жизнью и не-жизнью.',
    icon: '☠️',
    type: 'region',
    dangerLevel: 6,
    parentLocId: null,
    races: 'undead',
    lore: 'Акт 5. Внешние топи, Кладбище кораблей, Чумной лагерь, Костяной собор, Врата Мора — вход в Глубь. Босс акта — Первый Восставший.',
    features: 'ядовитые испарения,затонувший флот,храм из костей',
  },
  {
    name: 'Хребет Грумгара',
    slug: 'grumgar-ridge',
    description: 'Земли войны кланов орков — выживание сильнейшего, честь через кровь.',
    icon: '🩸',
    type: 'region',
    dangerLevel: 7,
    parentLocId: null,
    races: 'orcs',
    lore: 'Акт 6. Пограничье, Арена Крови, Крепость Грумгара, Тропа Черепов, Зев Бездны — самый большой разлом. Босс акта — Грумгар Нерождённый.',
    features: 'гладиаторские бои,столица орков,ритуальный путь',
  },
];

interface ClassSeed {
  name: string;
  slug: string;
  description: string;
  icon: string;
  raceSlug: string;
  path: 'ash' | 'blight';
  role: 'tank' | 'healer' | 'dps' | 'support' | 'antibuff';
  primaryStat: string;
}

interface AbilitySeed {
  name: string;
  slug: string;
  description: string;
  icon: string;
  classSlug: string;
  stage: 1 | 2 | 3;
  stageName: string;
  type: 'active' | 'passive';
  bossNote?: string;
}

export async function seedDatabase() {
  // ===== RACES =====
  // Базовые статы придуманы (в мастер-документе не заданы явные числа),
  // спроектированы по мотивам лора расы и суммарно равны (64 очка на расу)
  // ради грубого паритета.
  const races = await Promise.all([
    upsertRace({
      data: {
        name: 'Гномы',
        slug: 'dwarves',
        description: 'Хранитель камня — искра Торнака, услышанная в жиле руды',
        icon: '🪨',
        lore: 'Гномы несут искру Торнака через своего прародителя Торина Драккара — первого, кто услышал Песню камня в самой глубокой горе. Идущий Путём Пепла гном слушает камень и хранит клятвы, даже когда они ранят. Идущий Путём Скверны объявляет песню ложью и глушит её в себе и в других. Когда Глубь проснулась, гномы услышали не песню, а вой — и ушли из-под земли в горы, оставив внизу опустевшие чертоги.',
        baseStrength: 15,
        baseDexterity: 8,
        baseVitality: 14,
        baseIntellect: 8,
        baseWillpower: 10,
        baseInstinct: 9,
      },
    }),
    upsertRace({
      data: {
        name: 'Эльфы',
        slug: 'elves',
        description: 'Служитель леса — искра Айлет, живущая в Нити связи',
        icon: '🌿',
        lore: 'Эльфы несут искру Айлет через Сионаэль — первую целительницу, почувствовавшую боль другого существа как свою. Идущий Путём Пепла эльф чувствует боль другого как свою и делает связь добровольной. Идущий Путём Скверны чувствует связь как яд и пьёт искру других, чтобы «освободить» их.',
        baseStrength: 7,
        baseDexterity: 15,
        baseVitality: 8,
        baseIntellect: 11,
        baseWillpower: 14,
        baseInstinct: 9,
      },
    }),
    upsertRace({
      data: {
        name: 'Люди',
        slug: 'humans',
        description: 'Хранитель Воли — искра Велариона, зажжённая собственной волей',
        icon: '🔥',
        lore: 'Люди несут искру Велариона через Аэлариона — первого творца, зажёгшего огонь не от солнца, а от собственной воли. Идущий Путём Пепла человек понимает, что закон — тюрьма, и переписывает его. Идущий Путём Скверны решает, что строить — значит множить клетки, и сжигает города.',
        baseStrength: 10,
        baseDexterity: 10,
        baseVitality: 10,
        baseIntellect: 10,
        baseWillpower: 12,
        baseInstinct: 12,
      },
    }),
    upsertRace({
      data: {
        name: 'Драконорождённые',
        slug: 'dragonborn',
        description: 'Оплот пламени — искра Игниры, выкованной из огня и камня',
        icon: '🐉',
        lore: 'Драконорождённые несут искру Игниры — не рождённой, а выкованной Веларионом из огня и камня. Их мало: каждого выковывают, а не рождают. Идущий Путём Пепла превращает проклятие пламени в защитный барьер, жертвуя подвижностью ради брони. Идущий Путём Скверны поджигает себя, чтобы бить сильнее — чем меньше ХП, тем опаснее.',
        baseStrength: 15,
        baseDexterity: 8,
        baseVitality: 12,
        baseIntellect: 8,
        baseWillpower: 9,
        baseInstinct: 12,
      },
    }),
    upsertRace({
      data: {
        name: 'Нежить',
        slug: 'undead',
        description: 'Восставший — осколок Морвены, свобода ценой утраты',
        icon: '💀',
        lore: 'Нежить — осколки Морвены, сестры Сионаэль, которая разорвала свою искру Айлет, чтобы не отпустить умершую сестру, и ожила заново — свободной, но одинокой. Идущая Путём Пепла нежить хранит память о жизни и использует её для защиты других. Идущая Путём Скверны выбрала паразитизм — разрушает, крадёт баффы, опустошает.',
        baseStrength: 9,
        baseDexterity: 9,
        baseVitality: 13,
        baseIntellect: 13,
        baseWillpower: 11,
        baseInstinct: 9,
      },
    }),
    upsertRace({
      data: {
        name: 'Орки',
        slug: 'orcs',
        description: 'Воин клана — искра Грумгара, гнев как щит',
        icon: '🪓',
        lore: 'Орки несут искру Грумгара через первого стража, который не ударил первым, а понял: гнев — не оружие, а щит. Идущий Путём Пепла принимает удар вместо союзника — гнев становится защитой. Идущий Путём Скверны обращает гнев в разрушение: вампиризм, казнь, устрашение.',
        baseStrength: 16,
        baseDexterity: 10,
        baseVitality: 12,
        baseIntellect: 6,
        baseWillpower: 8,
        baseInstinct: 12,
      },
    }),
  ]);

  const raceBySlug = new Map(races.map(r => [r.slug, r]));

  // ===== CLASSES =====
  const classSeeds: ClassSeed[] = [
    // Гномы
    { name: 'Клятвенный', slug: 'oathkeeper', description: 'Несокрушимый страж, хранящий клятвы Торнака даже ценой собственной крови.', icon: '🛡️', raceSlug: 'dwarves', path: 'ash', role: 'tank', primaryStat: 'Стойкость' },
    { name: 'Рунный жнец', slug: 'rune-reaper', description: 'Кузнец рун, выжигающий огненные печати на оружии и врагах.', icon: '🔥', raceSlug: 'dwarves', path: 'ash', role: 'support', primaryStat: 'Разум' },
    { name: 'Обвальщик', slug: 'collapser', description: 'Разрушитель, обрушивающий чужие щиты и баффы каменной лавиной.', icon: '⛏️', raceSlug: 'dwarves', path: 'blight', role: 'antibuff', primaryStat: 'Сила' },
    { name: 'Могильный кузнец', slug: 'grave-smith', description: 'Кузнец, глушащий песнь камня и превращающий её в тишину смерти.', icon: '⚰️', raceSlug: 'dwarves', path: 'blight', role: 'antibuff', primaryStat: 'Разум' },
    // Эльфы
    { name: 'Хранитель нити', slug: 'thread-keeper', description: 'Целитель, плетущий Нить Айлет между собой и союзниками.', icon: '🌱', raceSlug: 'elves', path: 'ash', role: 'healer', primaryStat: 'Воля' },
    { name: 'Лунный стрелок', slug: 'moon-archer', description: 'Стрелок, меняющий лунные стойки — тень, кровь, яд.', icon: '🌙', raceSlug: 'elves', path: 'ash', role: 'dps', primaryStat: 'Ловкость' },
    { name: 'Пожиратель тепла', slug: 'heat-eater', description: 'Похититель тепла и жизни, замораживающий врагов изнутри.', icon: '❄️', raceSlug: 'elves', path: 'blight', role: 'antibuff', primaryStat: 'Разум' },
    { name: 'Разрыватель уз', slug: 'bond-breaker', description: 'Тот, кто рвёт нити лечения и связи, обрекая врага на тишину.', icon: '🕸️', raceSlug: 'elves', path: 'blight', role: 'antibuff', primaryStat: 'Воля' },
    // Люди (6 классов — по 3 на Путь)
    { name: 'Паладин', slug: 'paladin', description: 'Воин света, разящий нежить и идущих Путём Скверны именем Велариона.', icon: '⚔️', raceSlug: 'humans', path: 'ash', role: 'dps', primaryStat: 'Стойкость' },
    { name: 'Жрец', slug: 'priest', description: 'Служитель пепла, благословляющий оружие союзников священным огнём.', icon: '✨', raceSlug: 'humans', path: 'ash', role: 'healer', primaryStat: 'Воля' },
    { name: 'Воин', slug: 'warrior', description: 'Ветеран ближнего боя, наращивающий боевой темп с каждым ударом.', icon: '🗡️', raceSlug: 'humans', path: 'ash', role: 'dps', primaryStat: 'Сила' },
    { name: 'Плут', slug: 'rogue', description: 'Убийца из тени, чьи яды и казни не оставляют шанса.', icon: '🔪', raceSlug: 'humans', path: 'blight', role: 'dps', primaryStat: 'Ловкость' },
    { name: 'Чародей', slug: 'sorcerer', description: 'Маг тьмы, проклинающий врагов ценой собственной крови.', icon: '🌀', raceSlug: 'humans', path: 'blight', role: 'support', primaryStat: 'Разум' },
    { name: 'Следопыт', slug: 'ranger', description: 'Охотник, расставляющий ловушки и метящий добычу для стаи.', icon: '🏹', raceSlug: 'humans', path: 'blight', role: 'support', primaryStat: 'Инстинкт' },
    // Драконорождённые
    { name: 'Пламенный легат', slug: 'flame-legate', description: 'Легат огня, поджигающий врагов Горением и собственным дыханием.', icon: '🔥', raceSlug: 'dragonborn', path: 'ash', role: 'dps', primaryStat: 'Сила' },
    { name: 'Каменнокожий', slug: 'stoneskin', description: 'Танк с чешуёй твёрже камня, отражающий удары Зеркалом Торнака.', icon: '🗿', raceSlug: 'dragonborn', path: 'ash', role: 'tank', primaryStat: 'Стойкость' },
    { name: 'Пепельный гладиатор', slug: 'ash-gladiator', description: 'Гладиатор, платящий собственным ХП за колоссальный урон.', icon: '⚡', raceSlug: 'dragonborn', path: 'blight', role: 'dps', primaryStat: 'Сила' },
    { name: 'Обсидиановый воин', slug: 'obsidian-warrior', description: 'Воин чёрной чешуи, пробивающий любую броню.', icon: '🖤', raceSlug: 'dragonborn', path: 'blight', role: 'dps', primaryStat: 'Сила' },
    // Нежить
    { name: 'Чумной жнец', slug: 'plague-reaper', description: 'Жнец, поднимающий павших врагов и союзников из праха.', icon: '☠️', raceSlug: 'undead', path: 'ash', role: 'healer', primaryStat: 'Воля' },
    { name: 'Костяной страж', slug: 'bone-guardian', description: 'Страж из костей, переживающий смертельные удары силой воли.', icon: '🦴', raceSlug: 'undead', path: 'ash', role: 'tank', primaryStat: 'Стойкость' },
    { name: 'Алхимик распада', slug: 'decay-alchemist', description: 'Алхимик, плодящий яды, что усиливаются с каждым ходом.', icon: '🧪', raceSlug: 'undead', path: 'blight', role: 'dps', primaryStat: 'Разум' },
    { name: 'Пустотный вор', slug: 'void-thief', description: 'Вор, крадущий баффы и стирающий их из существования.', icon: '🌑', raceSlug: 'undead', path: 'blight', role: 'antibuff', primaryStat: 'Ловкость' },
    // Орки
    { name: 'Неистовый берсерк', slug: 'frenzied-berserker', description: 'Берсерк, чем меньше ХП — тем страшнее его ярость.', icon: '😡', raceSlug: 'orcs', path: 'ash', role: 'dps', primaryStat: 'Сила' },
    { name: 'Хранитель Стены', slug: 'wall-keeper', description: 'Страж, принимающий удар вместо союзников именем Грумгара.', icon: '🛡️', raceSlug: 'orcs', path: 'ash', role: 'tank', primaryStat: 'Стойкость' },
    { name: 'Кровавый охотник', slug: 'blood-hunter', description: 'Охотник, живущий вампиризмом и жаждой чужой крови.', icon: '🩸', raceSlug: 'orcs', path: 'blight', role: 'dps', primaryStat: 'Инстинкт' },
    { name: 'Вожак орды', slug: 'horde-leader', description: 'Вожак, ломающий защиту врагов рёвом и ведущий орду в натиск.', icon: '📯', raceSlug: 'orcs', path: 'blight', role: 'support', primaryStat: 'Инстинкт' },
  ];

  const classes = await Promise.all(
    classSeeds.map(c => {
      const race = raceBySlug.get(c.raceSlug);
      if (!race) throw new Error(`Unknown race slug: ${c.raceSlug}`);
      return upsertClass({
        data: {
          name: c.name,
          slug: c.slug,
          description: c.description,
          icon: c.icon,
          raceId: race.id,
          path: c.path,
          role: c.role,
          primaryStat: c.primaryStat,
        },
      });
    })
  );

  const classBySlug = new Map(classes.map(c => [c.slug, c]));

  // ===== ABILITIES =====
  // Иконка — простая эвристика по типу эффекта (заглушка; финальные иконки/
  // эффекты — отдельная задача дизайна, не код).
  const iconFor = (type: 'active' | 'passive', description: string): string => {
    if (type === 'passive') return '🔹';
    if (/исцел|восстанавлив|реген/i.test(description)) return '💚';
    if (/щит|блок|снижа.*урон/i.test(description)) return '🛡️';
    if (/яд|дебафф|снижа|блокир|замедл|обездвиж/i.test(description)) return '☠️';
    if (/призыва/i.test(description)) return '💀';
    if (/\+\d+%|бафф|усилив/i.test(description)) return '✨';
    return '⚔️';
  };

  const abilitySeeds: AbilitySeed[] = [
    // ===== ГНОМЫ =====
    // Клятвенный
    { name: 'Последний рубеж', slug: 'last-line', description: 'Снижает урон следующего удара врага на 40%.', classSlug: 'oathkeeper', stage: 1, stageName: 'Клятвенный', type: 'active', icon: '' },
    { name: 'Обет крови', slug: 'blood-oath', description: 'Накапливает щит за каждый пропущенный удар (макс. 3 стака, каждый = 8% макс. ХП).', classSlug: 'oathkeeper', stage: 1, stageName: 'Клятвенный', type: 'active', icon: '' },
    { name: 'Стойка камня', slug: 'stone-stance', description: '+20% брони на 3 хода, но -10% к скорости.', classSlug: 'oathkeeper', stage: 1, stageName: 'Клятвенный', type: 'active', icon: '' },
    { name: 'Несокрушимый', slug: 'unbreakable', description: '1 раз за бой при получении смертельного урона выживает с 1 ХП и получает щит 15% макс. ХП (КД 5 ходов после срабатывания).', classSlug: 'oathkeeper', stage: 2, stageName: 'Страж Предела', type: 'active', icon: '' },
    { name: 'Ответный молот', slug: 'retaliation-hammer', description: 'После блокировки удара наносит контрудар равный 40% поглощённого урона.', classSlug: 'oathkeeper', stage: 2, stageName: 'Страж Предела', type: 'active', icon: '' },
    { name: 'Стена Торнака', slug: 'tornak-wall', description: 'На 2 хода: перенаправляет на себя 20% урона, предназначенного одному союзнику (урон снижается на 25%).', classSlug: 'oathkeeper', stage: 3, stageName: 'Живой Закон', type: 'active', icon: '' },
    { name: 'Вечный обет', slug: 'eternal-vow', description: 'Пока ХП выше 50%, союзники в группе получают +10% брони.', classSlug: 'oathkeeper', stage: 3, stageName: 'Живой Закон', type: 'passive', icon: '' },

    // Рунный жнец
    { name: 'Выжженная руна', slug: 'burned-rune', description: 'Следующая атака наносит дополнительный урон огнём равный 50% силы атаки.', classSlug: 'rune-reaper', stage: 1, stageName: 'Рунный жнец', type: 'active', icon: '' },
    { name: 'Печать предела', slug: 'seal-of-limit', description: 'Усиливает собственную броню на 30% на 2 хода.', classSlug: 'rune-reaper', stage: 1, stageName: 'Рунный жнец', type: 'active', icon: '' },
    { name: 'Рунический удар', slug: 'runic-strike', description: 'Атака, оставляющая руну: следующий удар по этому врагу любым союзником наносит +25% урона.', classSlug: 'rune-reaper', stage: 1, stageName: 'Рунный жнец', type: 'active', icon: '' },
    { name: 'Огненная печать', slug: 'fire-brand', description: 'Помечает врага: 3 хода любой урон по нему становится огненным (игнорирует сопротивление).', classSlug: 'rune-reaper', stage: 2, stageName: 'Меченый', type: 'active', icon: '' },
    { name: 'Руническая броня', slug: 'runic-armor', description: 'Каждый 3-й полученный удар восстанавливает 5% ХП.', classSlug: 'rune-reaper', stage: 2, stageName: 'Меченый', type: 'passive', icon: '' },
    { name: 'Перековать судьбу', slug: 'reforge-fate', description: 'Снимает один дебафф с себя или союзника и превращает его в бафф (+15% к случайной характеристике на 2 хода).', classSlug: 'rune-reaper', stage: 3, stageName: 'Кузнец Судьбы', type: 'active', icon: '' },
    { name: 'Руна конца', slug: 'rune-of-ending', description: 'Наносит огромный урон одному врагу; если враг выживает — получает «Горение» на 3 хода (8% ХП/ход).', classSlug: 'rune-reaper', stage: 3, stageName: 'Кузнец Судьбы', type: 'active', icon: '' },

    // Обвальщик
    { name: 'Трещина', slug: 'crack', description: 'Игнорирует 15% брони цели на 2 хода.', classSlug: 'collapser', stage: 1, stageName: 'Обвальщик', type: 'active', icon: '' },
    { name: 'Обрушение', slug: 'cave-in', description: 'Снимает щит с врага, наносит урон равный 60% от снятого.', classSlug: 'collapser', stage: 1, stageName: 'Обвальщик', type: 'active', icon: '' },
    { name: 'Удар изнутри', slug: 'strike-within', description: 'Атака, наносящая доп. урон за каждый дебафф на враге (+10% за дебафф).', classSlug: 'collapser', stage: 1, stageName: 'Обвальщик', type: 'active', icon: '' },
    { name: 'Разрыв основы', slug: 'foundation-break', description: 'Снимает с врага один бафф и наносит урон равный 40% от его силы.', classSlug: 'collapser', stage: 2, stageName: 'Ломатель Клятв', type: 'active', icon: '' },
    { name: 'Дробитель', slug: 'crusher', description: 'Атаки по врагам со щитом наносят +30% урона.', classSlug: 'collapser', stage: 2, stageName: 'Ломатель Клятв', type: 'passive', icon: '' },
    { name: 'Переплавка', slug: 'smelting', description: 'Уничтожает один бафф врага и превращает его в щит для себя (равный 50% силы баффа).', classSlug: 'collapser', stage: 3, stageName: 'Длань Кузницы', type: 'active', icon: '' },
    { name: 'Косой удар', slug: 'slant-strike', description: 'Мощная атака: игнорирует 25% брони, либо если у врага нет щита — +50% урона (без игнора брони).', classSlug: 'collapser', stage: 3, stageName: 'Длань Кузницы', type: 'active', icon: '' },

    // Могильный кузнец
    { name: 'Мёртвая жила', slug: 'dead-vein', description: 'Блокирует пассивную регенерацию врага на 3 хода.', classSlug: 'grave-smith', stage: 1, stageName: 'Могильный кузнец', type: 'active', icon: '' },
    { name: 'Печать немоты', slug: 'seal-of-silence', description: 'Снижает точность врага на 30% и снимает один активный бафф.', classSlug: 'grave-smith', stage: 1, stageName: 'Могильный кузнец', type: 'active', icon: '' },
    { name: 'Холод горна', slug: 'forge-chill', description: 'Снижает скорость врага на 20% на 2 хода.', classSlug: 'grave-smith', stage: 1, stageName: 'Могильный кузнец', type: 'active', icon: '' },
    { name: 'Печать бессилия', slug: 'seal-of-weakness', description: 'Снижает урон врага на 25% на 3 хода.', classSlug: 'grave-smith', stage: 2, stageName: 'Глушитель', type: 'active', bossNote: 'Боссы: 15% вместо 25%.', icon: '' },
    { name: 'Мёртвый металл', slug: 'dead-metal', description: 'Враги под дебаффами Могильного кузнеца получают +15% урона от всех источников.', classSlug: 'grave-smith', stage: 2, stageName: 'Глушитель', type: 'passive', bossNote: 'Боссы: +8% на боссов.', icon: '' },
    { name: 'Вырвать искру', slug: 'tear-out-spark', description: 'Снимает с врага все баффы и наносит урон за каждый снятый (20% от силы баффа за штуку).', classSlug: 'grave-smith', stage: 3, stageName: 'Пожиратель Основ', type: 'active', bossNote: 'Боссы: Снимает максимум 2 баффа.', icon: '' },
    { name: 'Тишина глубин', slug: 'depth-silence', description: 'Враги в радиусе не могут получать исцеление выше 50% от базового значения.', classSlug: 'grave-smith', stage: 3, stageName: 'Пожиратель Основ', type: 'passive', bossNote: 'Боссы: Выше 75% от базового значения на боссах.', icon: '' },

    // ===== ЭЛЬФЫ =====
    // Хранитель нити
    { name: 'Живая нить', slug: 'living-thread', description: 'Восстанавливает 15% ХП себе или союзнику + реген на 3 хода (3% ХП/ход).', classSlug: 'thread-keeper', stage: 1, stageName: 'Хранитель нити', type: 'active', icon: '' },
    { name: 'Семя Айлет', slug: 'ailet-seed', description: 'При получении смертельного удара 1 раз за бой выживает с 1 ХП и восстанавливает 25% ХП.', classSlug: 'thread-keeper', stage: 1, stageName: 'Хранитель нити', type: 'active', icon: '' },
    { name: 'Переплетение', slug: 'interweaving', description: 'Связывает себя с одним союзником: исцеление одного на 30% исцеляет и другого.', classSlug: 'thread-keeper', stage: 1, stageName: 'Хранитель нити', type: 'active', icon: '' },
    { name: 'Корни-щиты', slug: 'root-shields', description: 'Опутывает себя или союзника корнями: поглощает следующий удар полностью.', classSlug: 'thread-keeper', stage: 2, stageName: 'Дитя Рощи', type: 'active', icon: '' },
    { name: 'Шёпот леса', slug: 'forest-whisper', description: 'Вне боя восстанавливает 5% ХП и маны группе за каждый ход.', classSlug: 'thread-keeper', stage: 2, stageName: 'Дитя Рощи', type: 'passive', icon: '' },
    { name: 'Древесный покров', slug: 'woodland-cover', description: 'На 2 хода все союзники в группе получают реген 5% ХП/ход и +20% сопротивления к дебаффам.', classSlug: 'thread-keeper', stage: 3, stageName: 'Голос Айлет', type: 'active', icon: '' },
    { name: 'Возвращение к корням', slug: 'return-to-roots', description: 'Воскрешает одного павшего союзника с 20% ХП (1 раз за бой).', classSlug: 'thread-keeper', stage: 3, stageName: 'Голос Айлет', type: 'active', icon: '' },

    // Лунный стрелок
    { name: 'Серебряная стрела', slug: 'silver-arrow', description: 'Точная атака с шансом замедления врага на 20% скорости (2 хода).', classSlug: 'moon-archer', stage: 1, stageName: 'Лунный стрелок', type: 'active', icon: '' },
    { name: 'Цикл луны', slug: 'moon-cycle', description: 'Игрок ВЫБИРАЕТ стойку каждые 3 хода: Тень (+20% уклонение) / Кровь (+25% крит) / Яд (6% ХП/ход на 3 хода).', classSlug: 'moon-archer', stage: 1, stageName: 'Лунный стрелок', type: 'active', icon: '' },
    { name: 'Залп', slug: 'volley', description: 'Выпускает 3 стрелы по одному врагу, каждая с шансом крита +10%.', classSlug: 'moon-archer', stage: 1, stageName: 'Лунный стрелок', type: 'active', icon: '' },
    { name: 'Стрела тишины', slug: 'silence-arrow', description: 'Выстрел, который прерывает подготовку врага и блокирует его следующую атаку.', classSlug: 'moon-archer', stage: 2, stageName: 'Ночной охотник', type: 'active', icon: '' },
    { name: 'Лунная тень', slug: 'moon-shadow', description: 'В стойке Тени атаки из невидимости наносят +25% урона.', classSlug: 'moon-archer', stage: 2, stageName: 'Ночной охотник', type: 'passive', icon: '' },
    { name: 'Затмение', slug: 'eclipse', description: 'На 2 хода: враг теряет 15% точности, Дитя Затмения получает +30% крита.', classSlug: 'moon-archer', stage: 3, stageName: 'Дитя Затмения', type: 'active', icon: '' },
    { name: 'Серебряный дождь', slug: 'silver-rain', description: 'Обрушивает град стрел на одного врага: 5 ударов по 40% силы атаки каждый, каждый с шансом «Горения» от серебряного света (4% ХП/ход на 2 хода).', classSlug: 'moon-archer', stage: 3, stageName: 'Дитя Затмения', type: 'active', icon: '' },

    // Пожиратель тепла
    { name: 'Холодные пальцы', slug: 'cold-fingers', description: 'Наносит урон и крадёт реген здоровья врага на 2 хода.', classSlug: 'heat-eater', stage: 1, stageName: 'Пожиратель тепла', type: 'active', icon: '' },
    { name: 'Опустошение', slug: 'desolation', description: 'Наносит урон и снимает один активный бафф с врага.', classSlug: 'heat-eater', stage: 1, stageName: 'Пожиратель тепла', type: 'active', icon: '' },
    { name: 'Морозный укус', slug: 'frost-bite', description: 'Атака, снижающая скорость врага на 15% и крадущая 5% его макс. ХП как исцеление себе.', classSlug: 'heat-eater', stage: 1, stageName: 'Пожиратель тепла', type: 'active', icon: '' },
    { name: 'Ледяная хватка', slug: 'icy-grip', description: 'Обездвиживает врага на 1 ход и крадёт 10% его брони на 2 хода.', classSlug: 'heat-eater', stage: 2, stageName: 'Истощитель', type: 'active', bossNote: 'Боссы: Замедление 30% на 1 ход вместо обездвиживания.', icon: '' },
    { name: 'Пустое место', slug: 'empty-space', description: 'Каждый снятый бафф с врага даёт +5% к урону (макс. 3 стака).', classSlug: 'heat-eater', stage: 2, stageName: 'Истощитель', type: 'passive', icon: '' },
    { name: 'Вакуум', slug: 'vacuum', description: 'Снимает максимум 2 баффа с одного врага и наносит урон за каждый (15% от силы баффа).', classSlug: 'heat-eater', stage: 3, stageName: 'Эхо Пустоты', type: 'active', icon: '' },
    { name: 'Поглощение тепла', slug: 'heat-absorption', description: 'Каждый ход крадёт 2% ХП у текущего врага и передаёт себе.', classSlug: 'heat-eater', stage: 3, stageName: 'Эхо Пустоты', type: 'passive', icon: '' },

    // Разрыватель уз
    { name: 'Обрыв нити', slug: 'thread-severance', description: 'Снимает с врага все эффекты лечения и регена, наносит урон равный 30% снятого.', classSlug: 'bond-breaker', stage: 1, stageName: 'Разрыватель уз', type: 'active', bossNote: 'Боссы: Снимает один эффект, урон 15%.', icon: '' },
    { name: 'Немая связь', slug: 'mute-bond', description: 'Блокирует один случайный скилл врага на 2 хода.', classSlug: 'bond-breaker', stage: 1, stageName: 'Разрыватель уз', type: 'active', bossNote: 'Боссы: На 1 ход.', icon: '' },
    { name: 'Разрыв', slug: 'rupture', description: 'Атака, наносящая доп. урон за каждый активный бафф на враге (+15% за бафф).', classSlug: 'bond-breaker', stage: 1, stageName: 'Разрыватель уз', type: 'active', bossNote: 'Боссы: +8% за бафф на боссах.', icon: '' },
    { name: 'Пустая чаша', slug: 'empty-cup', description: 'Враг не может получать баффы 2 хода.', classSlug: 'bond-breaker', stage: 2, stageName: 'Отрёкшийся', type: 'active', bossNote: 'Боссы: 1 ход на боссах.', icon: '' },
    { name: 'Глушащий удар', slug: 'silencing-strike', description: 'Атака, которая заглушает врага на 1 ход.', classSlug: 'bond-breaker', stage: 2, stageName: 'Отрёкшийся', type: 'active', bossNote: 'Боссы: Увеличивает стоимость скиллов на 30% на 1 ход вместо заглушения.', icon: '' },
    { name: 'Тишина Айлет', slug: 'ailet-silence', description: 'На 3 хода текущий враг не может получать исцеление и баффы.', classSlug: 'bond-breaker', stage: 3, stageName: 'Безмолвный', type: 'active', bossNote: 'Боссы: Исцеление и баффы снижены на 50% на 2 хода.', icon: '' },
    { name: 'Последний обрыв', slug: 'final-severance', description: 'Если враг под действием Немой связи погибает, способность перезаряжается мгновенно.', classSlug: 'bond-breaker', stage: 3, stageName: 'Безмолвный', type: 'passive', icon: '' },

    // ===== ЛЮДИ =====
    // Паладин
    { name: 'Удар светом', slug: 'strike-of-light', description: 'Урон + исцеление себя на 20% от урона.', classSlug: 'paladin', stage: 1, stageName: 'Паладин', type: 'active', icon: '' },
    { name: 'Щит веры', slug: 'shield-of-faith', description: 'Блокирует следующую атаку.', classSlug: 'paladin', stage: 1, stageName: 'Паладин', type: 'active', icon: '' },
    { name: 'Клятва', slug: 'the-oath', description: 'Постоянный бонус: мести (+15% урон), защиты (+15% броня), искупления (+15% исцеление).', classSlug: 'paladin', stage: 1, stageName: 'Паладин', type: 'passive', icon: '' },
    { name: 'Суд света', slug: 'judgment-of-light', description: 'Мощная атака: урон х2, если враг — нежить или идёт Путём Скверны.', classSlug: 'paladin', stage: 2, stageName: 'Клятвенник', type: 'active', icon: '' },
    { name: 'Священная аура', slug: 'sacred-aura', description: 'Союзники в группе получают +10% к исцелению.', classSlug: 'paladin', stage: 2, stageName: 'Клятвенник', type: 'passive', icon: '' },
    { name: 'Очищающий огонь', slug: 'cleansing-fire', description: 'Снимает все дебаффы с себя и одного союзника, наносит доп. урон текущему врагу за каждый снятый дебафф.', classSlug: 'paladin', stage: 3, stageName: 'Очиститель', type: 'active', icon: '' },
    { name: 'Несокрушимая воля', slug: 'unbreakable-will', description: 'При ХП ниже 30% — иммунитет к контролю и +20% к исцелению.', classSlug: 'paladin', stage: 3, stageName: 'Очиститель', type: 'passive', icon: '' },

    // Жрец
    { name: 'Благословение оружия', slug: 'weapon-blessing', description: 'Союзник получает огненный урон на 3 хода.', classSlug: 'priest', stage: 1, stageName: 'Жрец', type: 'active', icon: '' },
    { name: 'Очистительная аура', slug: 'purifying-aura', description: 'Наносит урон нежити и идущим Путём Скверны.', classSlug: 'priest', stage: 1, stageName: 'Жрец', type: 'active', icon: '' },
    { name: 'Молитва', slug: 'the-prayer', description: 'Все союзники в группе +20% к урону на 2 хода.', classSlug: 'priest', stage: 1, stageName: 'Жрец', type: 'active', icon: '' },
    { name: 'Огненное причастие', slug: 'fire-communion', description: 'Союзник получает щит, поглощающий 30% урона и отражающий 10% обратно атакующему.', classSlug: 'priest', stage: 2, stageName: 'Служитель пепла', type: 'active', icon: '' },
    { name: 'Пламенная проповедь', slug: 'fiery-sermon', description: 'Каждое исцеление имеет шанс 20% снять один дебафф с цели.', classSlug: 'priest', stage: 2, stageName: 'Служитель пепла', type: 'passive', icon: '' },
    { name: 'Великая молитва', slug: 'great-prayer', description: 'Все союзники в группе восстанавливают 25% ХП и получают +30% к урону на 2 хода.', classSlug: 'priest', stage: 3, stageName: 'Пастырь пламени', type: 'active', icon: '' },
    { name: 'Пламя Велариона', slug: 'flame-of-veralion', description: 'Союзник с благословением оружия поджигает врага при ударе (4% ХП/ход на 2 хода).', classSlug: 'priest', stage: 3, stageName: 'Пастырь пламени', type: 'passive', icon: '' },

    // Воин
    { name: 'Точный удар', slug: 'precise-strike', description: 'Атака с +20% точностью и шансом крита.', classSlug: 'warrior', stage: 1, stageName: 'Воин', type: 'active', icon: '' },
    { name: 'Боевой темп', slug: 'battle-tempo', description: 'Каждые 2 удара следующая атака наносит +40% урона.', classSlug: 'warrior', stage: 1, stageName: 'Воин', type: 'active', icon: '' },
    { name: 'Второй ветер', slug: 'second-wind', description: 'Самоисцеление 15% ХП.', classSlug: 'warrior', stage: 1, stageName: 'Воин', type: 'active', icon: '' },
    { name: 'Рассекающий удар', slug: 'rending-strike', description: 'Мощная атака по одному врагу: если убивает — следующий удар +50% урона.', classSlug: 'warrior', stage: 2, stageName: 'Ветеран', type: 'active', icon: '' },
    { name: 'Боевая стойка', slug: 'battle-stance', description: 'Каждый 3-й удар гарантированный крит.', classSlug: 'warrior', stage: 2, stageName: 'Ветеран', type: 'passive', icon: '' },
    { name: 'Зов битвы', slug: 'call-to-battle', description: 'Все союзники в группе получают +25% к урону и +15% к скорости на 3 хода.', classSlug: 'warrior', stage: 3, stageName: 'Маршал Пепла', type: 'active', icon: '' },
    { name: 'Неутомимый', slug: 'tireless', description: 'При убийстве врага восстанавливает 10% ХП и снимает один дебафф с себя.', classSlug: 'warrior', stage: 3, stageName: 'Маршал Пепла', type: 'passive', icon: '' },
    { name: 'Пробивной удар', slug: 'piercing-blow', description: 'Игнорирует 20% брони + гарантированный крит (КД 3 хода).', classSlug: 'warrior', stage: 3, stageName: 'Маршал Пепла', type: 'active', icon: '' },

    // Плут
    { name: 'Удар из тени', slug: 'strike-from-shadow', description: 'Тройной урон из невидимости.', classSlug: 'rogue', stage: 1, stageName: 'Плут', type: 'active', icon: '' },
    { name: 'Обезоруживание', slug: 'disarm', description: 'Снижает урон врага на 25% на 2 хода.', classSlug: 'rogue', stage: 1, stageName: 'Плут', type: 'active', bossNote: 'Боссы: 15% вместо 25%.', icon: '' },
    { name: 'Побег', slug: 'escape', description: 'Полное уклонение, выход из боя.', classSlug: 'rogue', stage: 1, stageName: 'Плут', type: 'active', icon: '' },
    { name: 'Отравленный клинок', slug: 'poisoned-blade', description: 'Атаки накладывают яд: 5% ХП/ход на 3 хода.', classSlug: 'rogue', stage: 2, stageName: 'Тень', type: 'active', icon: '' },
    { name: 'Теневой шаг', slug: 'shadow-step', description: 'Телепорт за спину врага, следующая атака +50% крита.', classSlug: 'rogue', stage: 2, stageName: 'Тень', type: 'active', icon: '' },
    { name: 'Казнь из тени', slug: 'shadow-execution', description: 'Если у врага ниже 20% ХП — мгновенная казнь (PvE: порог 25%, казнь только не-боссов; PvP: порог 20%, урон 150% вместо казни).', classSlug: 'rogue', stage: 3, stageName: 'Фантом', type: 'active', bossNote: 'Боссы: 20% от макс. ХП босса, КД 3 хода.', icon: '' },
    { name: 'Бесплотный', slug: 'incorporeal', description: '25% шанс полностью уклониться от любой атаки.', classSlug: 'rogue', stage: 3, stageName: 'Фантом', type: 'passive', icon: '' },

    // Чародей
    { name: 'Луч распада', slug: 'ray-of-decay', description: 'Урон тьмой сквозь броню.', classSlug: 'sorcerer', stage: 1, stageName: 'Чародей', type: 'active', icon: '' },
    { name: 'Проклятие', slug: 'curse', description: 'Снижает случайную характеристику врага на 25% на 3 хода.', classSlug: 'sorcerer', stage: 1, stageName: 'Чародей', type: 'active', bossNote: 'Боссы: 15% на боссах.', icon: '' },
    { name: 'Пакт', slug: 'the-pact', description: 'Мощная атака ценой 15% собственного ХП.', classSlug: 'sorcerer', stage: 1, stageName: 'Чародей', type: 'active', icon: '' },
    { name: 'Кольцо тьмы', slug: 'ring-of-darkness', description: 'Урон тьмой по текущему врагу + замедление 20% на 2 хода.', classSlug: 'sorcerer', stage: 2, stageName: 'Падший', type: 'active', icon: '' },
    { name: 'Договор', slug: 'the-covenant', description: 'Если ХП ниже 50%, все заклинания тьмы наносят +20% урона.', classSlug: 'sorcerer', stage: 2, stageName: 'Падший', type: 'passive', icon: '' },
    { name: 'Бездна', slug: 'the-abyss', description: 'Проклятие на одного врага: -20% ко всем характеристикам на 2 хода + Владыка получает 20% от урона, нанесённого этому врагу, как исцеление.', classSlug: 'sorcerer', stage: 3, stageName: 'Владыка теней', type: 'active', bossNote: 'Боссы: -10% характеристик на 2 хода на боссах.', icon: '' },
    { name: 'Тень Глуби', slug: 'shadow-of-the-deep', description: 'Каждый раз, когда враг получает урон от проклятий, восстанавливает 3% маны.', classSlug: 'sorcerer', stage: 3, stageName: 'Владыка теней', type: 'passive', icon: '' },

    // Следопыт
    { name: 'Меткий выстрел', slug: 'accurate-shot', description: 'Повышенный урон + шанс замедления.', classSlug: 'ranger', stage: 1, stageName: 'Следопыт', type: 'active', icon: '' },
    { name: 'Ловушка', slug: 'the-trap', description: 'Урон + замедление 40% на 2 хода.', classSlug: 'ranger', stage: 1, stageName: 'Следопыт', type: 'active', bossNote: 'Боссы: Замедление 25% на 2 хода на боссах.', icon: '' },
    { name: 'Маскировка', slug: 'camouflage', description: 'Невидимость на 1 ход.', classSlug: 'ranger', stage: 1, stageName: 'Следопыт', type: 'active', icon: '' },
    { name: 'Двойная ловушка', slug: 'double-trap', description: 'Ставит 2 ловушки: активируются автоматически в начале хода врага — урон + замедление 20% на 2 хода.', classSlug: 'ranger', stage: 2, stageName: 'Охотник', type: 'active', icon: '' },
    { name: 'След крови', slug: 'trail-of-blood', description: 'Атаки по замедленным или обездвиженным врагам наносят +25% урона.', classSlug: 'ranger', stage: 2, stageName: 'Охотник', type: 'passive', icon: '' },
    { name: 'Смертельный маршрут', slug: 'deadly-route', description: 'Помечает врага: все атаки союзников по нему +30% точности и +20% крита на 3 хода.', classSlug: 'ranger', stage: 3, stageName: 'Око мрака', type: 'active', icon: '' },
    { name: 'Ночной охотник', slug: 'ranger-night-hunter', description: 'Из маскировки первая атака всегда критическая.', classSlug: 'ranger', stage: 3, stageName: 'Око мрака', type: 'passive', icon: '' },

    // ===== ДРАКОНОРОЖДЁННЫЕ =====
    // Пламенный легат
    { name: 'Рассекающий жар', slug: 'rending-heat', description: 'Атака огнём + «Горение» на 3 хода (5% ХП/ход).', classSlug: 'flame-legate', stage: 1, stageName: 'Пламенный легат', type: 'active', icon: '' },
    { name: 'Ярость огня', slug: 'fury-of-fire', description: 'При активном «Горении» на враге все атаки наносят +20% урона.', classSlug: 'flame-legate', stage: 1, stageName: 'Пламенный легат', type: 'passive', icon: '' },
    { name: 'Огненный вдох', slug: 'fire-breath-prep', description: 'Поджигает собственное оружие: следующие 2 атаки наносят огненный урон.', classSlug: 'flame-legate', stage: 1, stageName: 'Пламенный легат', type: 'active', icon: '' },
    { name: 'Огненный вихрь', slug: 'fire-whirl', description: 'Мощная атака огнём по одному врагу: если у врага уже «Горение» — урон х2.', classSlug: 'flame-legate', stage: 2, stageName: 'Опалённый', type: 'active', icon: '' },
    { name: 'Жар крови', slug: 'blood-heat', description: 'При получении урона шанс 20% поджечь атакующего (4% ХП/ход на 2 хода).', classSlug: 'flame-legate', stage: 2, stageName: 'Опалённый', type: 'passive', icon: '' },
    { name: 'Пламя возрождения', slug: 'flame-of-rebirth', description: 'Поджигает себя: теряет 8% ХП/ход, но все атаки наносят +50% огненного урона; союзники в группе получают реген 5% ХП/ход.', classSlug: 'flame-legate', stage: 3, stageName: 'Жрец Игниры', type: 'active', icon: '' },
    { name: 'Дыхание дракона', slug: 'dragon-breath', description: 'Раз в 5 ходов следующая атака автоматически становится огненной с +60% урона.', classSlug: 'flame-legate', stage: 3, stageName: 'Жрец Игниры', type: 'passive', icon: '' },

    // Каменнокожий
    { name: 'Базальтовая шкура', slug: 'basalt-hide', description: 'Снижает урон следующего удара на 25%.', classSlug: 'stoneskin', stage: 1, stageName: 'Каменнокожий', type: 'active', icon: '' },
    { name: 'Зеркало Торнака', slug: 'tornak-mirror', description: '20% шанс отразить физический урон обратно врагу.', classSlug: 'stoneskin', stage: 1, stageName: 'Каменнокожий', type: 'passive', icon: '' },
    { name: 'Удар хвостом', slug: 'tail-swipe', description: 'Отбрасывает врага (прерывает подготовку) и снижает скорость на 15% на 2 хода.', classSlug: 'stoneskin', stage: 1, stageName: 'Каменнокожий', type: 'active', icon: '' },
    { name: 'Каменный панцирь', slug: 'stone-carapace', description: 'На 2 хода +30% брони, но -15% скорости.', classSlug: 'stoneskin', stage: 2, stageName: 'Каменный легат', type: 'active', icon: '' },
    { name: 'Колосс', slug: 'colossus', description: 'При ХП выше 70% получает доп. +10% брони.', classSlug: 'stoneskin', stage: 2, stageName: 'Каменный легат', type: 'passive', icon: '' },
    { name: 'Живая крепость', slug: 'living-fortress', description: 'На 3 хода перенаправляет 40% урона, получаемого одним союзником, на себя (урон снижается на 15%).', classSlug: 'stoneskin', stage: 3, stageName: 'Нерушимый', type: 'active', icon: '' },
    { name: 'Основа Торнака', slug: 'tornak-foundation', description: 'При блокировании удара восстанавливает 3% ХП.', classSlug: 'stoneskin', stage: 3, stageName: 'Нерушимый', type: 'passive', icon: '' },

    // Пепельный гладиатор
    { name: 'Метеоритный удар', slug: 'meteor-strike', description: 'Тратит 10% собственного ХП, наносит 200% урона.', classSlug: 'ash-gladiator', stage: 1, stageName: 'Пепельный гладиатор', type: 'active', icon: '' },
    { name: 'Драконья кровь', slug: 'dragon-blood', description: 'Восстанавливает ХП равное 40% от урона огнём за ход.', classSlug: 'ash-gladiator', stage: 1, stageName: 'Пепельный гладиатор', type: 'passive', icon: '' },
    { name: 'Пепельный клинок', slug: 'ash-blade', description: 'Атака: чем меньше ХП у гладиатора, тем выше урон (+5% за каждый недостающий 10% ХП).', classSlug: 'ash-gladiator', stage: 1, stageName: 'Пепельный гладиатор', type: 'active', icon: '' },
    { name: 'Испытание огнём', slug: 'trial-by-fire', description: 'Поджигает себя на 2 хода (3% ХП/ход), но атаки наносят +50% урона.', classSlug: 'ash-gladiator', stage: 2, stageName: 'Выживший', type: 'active', icon: '' },
    { name: 'Живучесть', slug: 'tenacity', description: 'При ХП ниже 25% регенерация +10% ХП/ход.', classSlug: 'ash-gladiator', stage: 2, stageName: 'Выживший', type: 'passive', icon: '' },
    { name: 'Извержение', slug: 'eruption', description: 'Тратит 25% ХП, наносит колоссальный урон огнём одному врагу + «Горение» 8% ХП/ход на 3 хода.', classSlug: 'ash-gladiator', stage: 3, stageName: 'Воплощение Пепла', type: 'active', icon: '' },
    { name: 'Феникс', slug: 'phoenix', description: '1 раз за бой при смерти восстанавливается с 40% ХП.', classSlug: 'ash-gladiator', stage: 3, stageName: 'Воплощение Пепла', type: 'passive', icon: '' },

    // Обсидиановый воин
    { name: 'Чёрное жало', slug: 'black-sting', description: 'Атака, игнорирующая 40% брони.', classSlug: 'obsidian-warrior', stage: 1, stageName: 'Обсидиановый воин', type: 'active', icon: '' },
    { name: 'Раскалённая чешуя', slug: 'molten-scale', description: 'При получении урона наносит урон огнём атакующему (1 раз за ход).', classSlug: 'obsidian-warrior', stage: 1, stageName: 'Обсидиановый воин', type: 'passive', icon: '' },
    { name: 'Обсидиановый панцирь', slug: 'obsidian-plating', description: 'Снижает следующий получаемый урон на 25%, но следующая атака наносит -15% урона.', classSlug: 'obsidian-warrior', stage: 1, stageName: 'Обсидиановый воин', type: 'active', icon: '' },
    { name: 'Пробивание брони', slug: 'armor-breach', description: 'Следующая атака игнорирует 60% брони цели.', classSlug: 'obsidian-warrior', stage: 2, stageName: 'Тёмный легат', type: 'active', bossNote: 'Боссы: 40% на боссах.', icon: '' },
    { name: 'Осколочная чешуя', slug: 'shard-scale', description: 'Шанс 30% при получении удара — атакующий получает «Осколки» (5% ХП/ход на 2 хода).', classSlug: 'obsidian-warrior', stage: 2, stageName: 'Тёмный легат', type: 'passive', icon: '' },
    { name: 'Чёрный метеор', slug: 'black-meteor', description: 'Атака: игнорирует 50% брони + доп. урон за каждый дебафф на враге (+15% за дебафф).', classSlug: 'obsidian-warrior', stage: 3, stageName: 'Испепелитель', type: 'active', bossNote: 'Боссы: +8% за дебафф на боссах.', icon: '' },
    { name: 'Плавка', slug: 'smelt', description: 'Враги под «Осколками» или «Горением» получают +20% физического урона от Испепелителя.', classSlug: 'obsidian-warrior', stage: 3, stageName: 'Испепелитель', type: 'passive', icon: '' },

    // ===== НЕЖИТЬ =====
    // Чумной жнец
    { name: 'Гнилая рана', slug: 'rotting-wound', description: 'Накладывает яд: 8% ХП/ход на 4 хода.', classSlug: 'plague-reaper', stage: 1, stageName: 'Чумной жнец', type: 'active', bossNote: 'Боссы: 5% ХП/ход на боссах.', icon: '' },
    { name: 'Восстание мёртвых', slug: 'rise-of-the-dead', description: 'Поднимает павшего врага как скелета-союзника на 3 хода (50% ХП и урона оригинала).', classSlug: 'plague-reaper', stage: 1, stageName: 'Чумной жнец', type: 'active', bossNote: 'Боссы: Не работает, вместо этого — яд 10% ХП/ход на 2 хода.', icon: '' },
    { name: 'Сбор душ', slug: 'soul-harvest', description: 'Каждый убитый враг даёт +3% к урону и +2% к исцелению (стакается до 5 раз за бой).', classSlug: 'plague-reaper', stage: 1, stageName: 'Чумной жнец', type: 'passive', icon: '' },
    { name: 'Рой мертвецов', slug: 'swarm-of-the-dead', description: 'Призывает 2 скелетов (существуют 2 хода, 40% ХП и урона; если нет павших врагов — призываются из пустоты с 30% ХП/урона).', classSlug: 'plague-reaper', stage: 2, stageName: 'Некромант', type: 'active', icon: '' },
    { name: 'Могильная связь', slug: 'grave-bond', description: 'Скелеты-союзники при смерти наносят урон текущему врагу (10% от ХП мертвеца).', classSlug: 'plague-reaper', stage: 2, stageName: 'Некромант', type: 'passive', icon: '' },
    { name: 'Легион праха', slug: 'legion-of-ash', description: 'Призывает 3 скелетов из пустоты (25% ХП/урона, существуют 1 ход).', classSlug: 'plague-reaper', stage: 3, stageName: 'Владыка Мора', type: 'active', bossNote: 'Боссы: Вместо призыва — яд 8% ХП/ход на 3 хода, либо разовый урон 30% от макс. ХП босса.', icon: '' },
    { name: 'Пепельная жатва', slug: 'ashen-harvest', description: 'Если на поле боя есть скелеты-союзники, Владыка Мора регенерирует 5% ХП в ход.', classSlug: 'plague-reaper', stage: 3, stageName: 'Владыка Мора', type: 'passive', icon: '' },

    // Костяной страж
    { name: 'Истлевшая плоть', slug: 'decayed-flesh', description: 'Снижает входящий урон на 20% на 3 хода.', classSlug: 'bone-guardian', stage: 1, stageName: 'Костяной страж', type: 'active', icon: '' },
    { name: 'Последняя воля', slug: 'final-will', description: '1 раз за бой при смертельном ударе выживает с 1 ХП и восстанавливает 15% ХП.', classSlug: 'bone-guardian', stage: 1, stageName: 'Костяной страж', type: 'active', icon: '' },
    { name: 'Костяной щит', slug: 'bone-shield', description: 'Создаёт щит из костей: поглощает урон равный 20% макс. ХП.', classSlug: 'bone-guardian', stage: 1, stageName: 'Костяной страж', type: 'active', icon: '' },
    { name: 'Костяной шип', slug: 'bone-spike', description: 'При блокировании удара атакующий получает урон равный 15% от поглощённого.', classSlug: 'bone-guardian', stage: 2, stageName: 'Вечный солдат', type: 'passive', icon: '' },
    { name: 'Неупокоенный', slug: 'restless', description: 'При ХП ниже 40% входящий урон снижается на доп. 15%.', classSlug: 'bone-guardian', stage: 2, stageName: 'Вечный солдат', type: 'passive', icon: '' },
    { name: 'Костяная крепость', slug: 'bone-fortress', description: 'На 2 хода: весь входящий урон снижается на 40%, Несломленный провоцирует текущего врага атаковать его.', classSlug: 'bone-guardian', stage: 3, stageName: 'Несломленный', type: 'active', icon: '' },
    { name: 'Вечный страж', slug: 'eternal-guardian', description: 'После выживания со смертельного удара (Последняя воля) получает +30% к урону на 2 хода.', classSlug: 'bone-guardian', stage: 3, stageName: 'Несломленный', type: 'passive', icon: '' },

    // Алхимик распада
    { name: 'Гниющий знак', slug: 'rotting-mark', description: 'Все последующие дебаффы на враге сильнее на 20%.', classSlug: 'decay-alchemist', stage: 1, stageName: 'Алхимик распада', type: 'active', bossNote: 'Боссы: 10% на боссах.', icon: '' },
    { name: 'Двойной мор', slug: 'double-plague', description: 'Накладывает 2 яда одновременно (каждый 5% ХП/ход на 3 хода).', classSlug: 'decay-alchemist', stage: 1, stageName: 'Алхимик распада', type: 'active', bossNote: 'Боссы: 3% ХП/ход на боссах.', icon: '' },
    { name: 'Гнилостная бомба', slug: 'rot-bomb', description: 'Бросает в текущего врага: яд 4% ХП/ход на 3 хода + снижает броню на 10% на 2 хода.', classSlug: 'decay-alchemist', stage: 1, stageName: 'Алхимик распада', type: 'active', icon: '' },
    { name: 'Заражение', slug: 'infection', description: 'Яд распространяется: если в бою несколько врагов, следующий враг тоже получает яд (50% силы оригинала; в 1v1 — яд усиливается на 20% каждый ход).', classSlug: 'decay-alchemist', stage: 2, stageName: 'Чумной апостол', type: 'active', icon: '' },
    { name: 'Усиление заразы', slug: 'plague-amplification', description: 'Каждый ход действия яда на враге увеличивает его силу на 1% (макс. +5%).', classSlug: 'decay-alchemist', stage: 2, stageName: 'Чумной апостол', type: 'passive', icon: '' },
    { name: 'Чума', slug: 'the-plague', description: 'Текущий враг получает мощный яд 6% ХП/ход на 4 хода + исцеление снижается на 50%.', classSlug: 'decay-alchemist', stage: 3, stageName: 'Архилич', type: 'active', bossNote: 'Боссы: Яд 4% ХП/ход, исцеление снижено на 25%.', icon: '' },
    { name: 'Распад реальности', slug: 'reality-decay', description: 'Враги с 3+ дебаффами теряют 5% макс. ХП каждый ход.', classSlug: 'decay-alchemist', stage: 3, stageName: 'Архилич', type: 'passive', bossNote: 'Боссы: 3% на боссах.', icon: '' },

    // Пустотный вор
    { name: 'Угасание', slug: 'fading', description: 'Наносит урон и снимает один бафф с врага.', classSlug: 'void-thief', stage: 1, stageName: 'Пустотный вор', type: 'active', icon: '' },
    { name: 'Рука Морвены', slug: 'hand-of-morvena', description: 'Блокирует случайный скилл врага на 2 хода.', classSlug: 'void-thief', stage: 1, stageName: 'Пустотный вор', type: 'active', bossNote: 'Боссы: На 1 ход.', icon: '' },
    { name: 'Теневой обход', slug: 'shadow-flank', description: 'Телепорт за спину врага, следующая атака +25% урона.', classSlug: 'void-thief', stage: 1, stageName: 'Пустотный вор', type: 'active', icon: '' },
    { name: 'Похищение силы', slug: 'power-theft', description: 'Крадёт один бафф с врага и накладывает на себя.', classSlug: 'void-thief', stage: 2, stageName: 'Опустошитель', type: 'active', icon: '' },
    { name: 'Пустая тень', slug: 'empty-shadow', description: 'После уклонения следующая атака снимает бафф гарантированно.', classSlug: 'void-thief', stage: 2, stageName: 'Опустошитель', type: 'passive', icon: '' },
    { name: 'Полное угасание', slug: 'total-fading', description: 'Снимает все баффы с врага, наносит урон за каждый (15% от силы баффа) и блокирует 2 случайных скилла на 2 хода.', classSlug: 'void-thief', stage: 3, stageName: 'Безмолвный жнец', type: 'active', bossNote: 'Боссы: Снимает максимум 2 баффа, блокирует 1 скилл на 1 ход.', icon: '' },
    { name: 'Тишина смерти', slug: 'silence-of-death', description: 'Враги без активных баффов получают +20% урона от Безмолвного жнеца.', classSlug: 'void-thief', stage: 3, stageName: 'Безмолвный жнец', type: 'passive', icon: '' },

    // ===== ОРКИ =====
    // Неистовый берсерк
    { name: 'Безрассудный взмах', slug: 'reckless-swing', description: 'Огромный урон, тратит 10% собственного ХП.', classSlug: 'frenzied-berserker', stage: 1, stageName: 'Неистовый берсерк', type: 'active', icon: '' },
    { name: 'Жажда крови', slug: 'bloodlust', description: 'Следующая атака лечит орка на 50% от урона.', classSlug: 'frenzied-berserker', stage: 1, stageName: 'Неистовый берсерк', type: 'active', icon: '' },
    { name: 'Яростный рёв', slug: 'furious-roar', description: '+25% к урону на 2 хода, но -15% к броне.', classSlug: 'frenzied-berserker', stage: 1, stageName: 'Неистовый берсерк', type: 'active', icon: '' },
    { name: 'Расчленение', slug: 'dismemberment', description: 'Атака: если убивает врага, восстанавливает 20% ХП и следующий удар +50% урона.', classSlug: 'frenzied-berserker', stage: 2, stageName: 'Кровавый палач', type: 'active', icon: '' },
    { name: 'Берсерк', slug: 'berserk-passive', description: 'При ХП ниже 50% — +20% к урону и +10% к скорости.', classSlug: 'frenzied-berserker', stage: 2, stageName: 'Кровавый палач', type: 'passive', icon: '' },
    { name: 'Резня', slug: 'the-slaughter', description: 'Серия из 3 ударов по одному врагу, каждый следующий +30% урона; если враг погибает — перезаряжается мгновенно.', classSlug: 'frenzied-berserker', stage: 3, stageName: 'Бог Войны', type: 'active', icon: '' },
    { name: 'Неистовые', slug: 'the-frenzied', description: 'При убийстве врага союзники-орки в группе получают +15% к урону на 2 хода.', classSlug: 'frenzied-berserker', stage: 3, stageName: 'Бог Войны', type: 'passive', icon: '' },

    // Хранитель Стены
    { name: 'Стойкость Грумгара', slug: 'grumgar-resilience', description: 'Снижает урон следующего удара на 50%.', classSlug: 'wall-keeper', stage: 1, stageName: 'Хранитель Стены', type: 'active', icon: '' },
    { name: 'Ответный удар', slug: 'counter-blow', description: 'После блока наносит урон равный 60% поглощённого.', classSlug: 'wall-keeper', stage: 1, stageName: 'Хранитель Стены', type: 'active', icon: '' },
    { name: 'Боевой строй', slug: 'battle-formation', description: 'Союзник в группе получает +15% брони.', classSlug: 'wall-keeper', stage: 1, stageName: 'Хранитель Стены', type: 'active', icon: '' },
    { name: 'Живой щит', slug: 'orc-living-shield', description: 'На 2 хода перенаправляет на себя весь урон, предназначенный одному союзнику (урон снижается на 25%).', classSlug: 'wall-keeper', stage: 2, stageName: 'Страж рубежа', type: 'active', icon: '' },
    { name: 'Непоколебимость', slug: 'steadfastness', description: 'Не может быть отброшен или обездвижен.', classSlug: 'wall-keeper', stage: 2, stageName: 'Страж рубежа', type: 'passive', icon: '' },
    { name: 'Стена Грумгара', slug: 'grumgar-wall', description: 'На 3 хода: урон по одному выбранному союзнику снижается на 30%, Железный Страж получает 50% этого урона.', classSlug: 'wall-keeper', stage: 3, stageName: 'Железный Страж', type: 'active', icon: '' },
    { name: 'Последний оплот', slug: 'last-bastion', description: 'При защите союзника собственная броня +20%.', classSlug: 'wall-keeper', stage: 3, stageName: 'Железный Страж', type: 'passive', icon: '' },

    // Кровавый охотник
    { name: 'Клык', slug: 'the-fang', description: 'Быстрая атака с вампиризмом 30%.', classSlug: 'blood-hunter', stage: 1, stageName: 'Кровавый охотник', type: 'active', icon: '' },
    { name: 'Отрицание смерти', slug: 'denial-of-death', description: 'При падении ниже 15% ХП получает +50% к урону на 2 хода.', classSlug: 'blood-hunter', stage: 1, stageName: 'Кровавый охотник', type: 'passive', icon: '' },
    { name: 'Запах крови', slug: 'scent-of-blood', description: 'Помечает врага: атаки по нему +15% точности и крита.', classSlug: 'blood-hunter', stage: 1, stageName: 'Кровавый охотник', type: 'active', icon: '' },
    { name: 'Вскрытие', slug: 'the-incision', description: 'Атака: наносит доп. урон за каждый дебафф на враге (+10% за дебафф) + вампиризм 40%.', classSlug: 'blood-hunter', stage: 2, stageName: 'Рубака', type: 'active', icon: '' },
    { name: 'Жажда', slug: 'thirst', description: 'Каждое убийство восстанавливает 8% ХП.', classSlug: 'blood-hunter', stage: 2, stageName: 'Рубака', type: 'passive', icon: '' },
    { name: 'Казнь', slug: 'the-execution', description: 'Если у врага ниже 25% ХП — мгновенная казнь.', classSlug: 'blood-hunter', stage: 3, stageName: 'Палач Богов', type: 'active', bossNote: 'Боссы: 20% от макс. ХП босса, 1 раз за бой.', icon: '' },
    { name: 'Охотник на божеств', slug: 'godslayer-hunter', description: 'Атаки по врагам с активными баффами наносят +25% урона и снимают один бафф.', classSlug: 'blood-hunter', stage: 3, stageName: 'Палач Богов', type: 'passive', bossNote: 'Боссы: +15% урона на боссах, снимает бафф с шансом 30%.', icon: '' },

    // Вожак орды
    { name: 'Боевой рёв', slug: 'battle-roar', description: 'Снижает защиту врага на 25% на 3 хода.', classSlug: 'horde-leader', stage: 1, stageName: 'Вожак орды', type: 'active', bossNote: 'Боссы: 15% на боссах.', icon: '' },
    { name: 'Устрашение', slug: 'intimidation', description: 'С шансом 35% враг пропускает следующий ход.', classSlug: 'horde-leader', stage: 1, stageName: 'Вожак орды', type: 'active', bossNote: 'Боссы: Шанс 15%.', icon: '' },
    { name: 'Зов добычи', slug: 'call-of-prey', description: 'Помечает врага: все союзники получают +10% урона по цели.', classSlug: 'horde-leader', stage: 1, stageName: 'Вожак орды', type: 'active', icon: '' },
    { name: 'Натиск', slug: 'the-onslaught', description: 'Все союзники в группе получают +20% к скорости на 2 хода.', classSlug: 'horde-leader', stage: 2, stageName: 'Зовущий в бой', type: 'active', icon: '' },
    { name: 'Вожак', slug: 'the-leader', description: 'Союзники рядом получают +10% к урону.', classSlug: 'horde-leader', stage: 2, stageName: 'Зовущий в бой', type: 'passive', icon: '' },
    { name: 'Разгром', slug: 'rout', description: 'Мощнейшая атака: огромный урон + враг теряет 15% брони на 2 хода.', classSlug: 'horde-leader', stage: 3, stageName: 'Крушитель Черепов', type: 'active', bossNote: 'Боссы: 10% на боссах.', icon: '' },
    { name: 'Диктат силы', slug: 'dictate-of-strength', description: 'Враги с пониженной защитой получают +10% урона от всех источников.', classSlug: 'horde-leader', stage: 3, stageName: 'Крушитель Черепов', type: 'passive', bossNote: 'Боссы: +5% на боссов.', icon: '' },
  ];

  for (const ab of abilitySeeds) {
    const cls = classBySlug.get(ab.classSlug);
    if (!cls) continue;
    await upsertAbility({
      data: {
        name: ab.name,
        slug: ab.slug,
        description: ab.description,
        icon: iconFor(ab.type, ab.description),
        classId: cls.id,
        stage: ab.stage,
        stageName: ab.stageName,
        type: ab.type,
        bossNote: ab.bossNote ?? null,
      },
    });
  }

  return {
    message: 'Database seeded successfully',
    raceCount: races.length,
    classCount: classes.length,
    abilityCount: abilitySeeds.length,
  };
}

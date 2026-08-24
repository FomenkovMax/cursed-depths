import { rollDice } from '@/lib/dice';

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

/** Значения 6 характеристик игрока (с учётом экипировки) — ровно то, что нужно resolveEventChoice
 * для проверок d20+модификатор vs СЛ, как в BG3, вместо чистого Math.random(). */
export interface CheckStats {
  strength: number;
  dexterity: number;
  vitality: number;
  intellect: number;
  willpower: number;
  instinct: number;
}

export interface CheckRollResult {
  statLabel: string;
  roll: number;
  modifier: number;
  total: number;
  dc: number;
  success: boolean;
}

const STAT_LABELS: Record<keyof CheckStats, string> = {
  strength: 'Сила', dexterity: 'Ловкость', vitality: 'Стойкость',
  intellect: 'Разум', willpower: 'Воля', instinct: 'Инстинкт',
};

/** d20 + модификатор характеристики против Сложности (СЛ) — та же формула, что и в D&D/BG3:
 * модификатор растёт вдвое медленнее самой характеристики, чтобы даже низкий стат оставлял
 * шанс на успех, а высокий не гарантировал его полностью. */
export function rollStatCheck(stat: keyof CheckStats, stats: CheckStats, dc: number): CheckRollResult {
  const statValue = stats[stat];
  const modifier = Math.floor(statValue / 2);
  const roll = 1 + Math.floor(Math.random() * 20);
  const total = roll + modifier;
  return { statLabel: STAT_LABELS[stat], roll, modifier, total, dc, success: total >= dc };
}

function checkPrefix(r: CheckRollResult): string {
  return `🎲 ${r.statLabel}: ${r.roll}${r.modifier >= 0 ? '+' : ''}${r.modifier}=${r.total} (СЛ ${r.dc}) — ${r.success ? 'успех!' : 'провал.'} `;
}

// Мини-развилки для /api/explore — разбавляют чистый RNG-цикл "исследовать → бой/золото"
// хотя бы минимальным выбором с последствиями. Исход каждого выбора считается в момент
// РЕЗОЛВА (resolveEventChoice), а не при показе события — так не нужно хранить
// промежуточное состояние между двумя запросами.
export const EXPLORATION_EVENTS: ExplorationEvent[] = [
  {
    id: 'old_chest',
    icon: '📦',
    textRu: 'Вы находите старый кованый сундук, наполовину вросший в землю. Крышка слегка приоткрыта.',
    choices: [
      { id: 'open', label: 'Открыть сундук', hint: 'проверка Ловкости (СЛ 12)' },
      { id: 'ignore', label: 'Пройти мимо', hint: 'безопасно' },
    ],
  },
  {
    id: 'wounded_traveler',
    icon: '🧍',
    textRu: 'На обочине тропы лежит раненый путник и просит о помощи.',
    choices: [
      { id: 'help', label: 'Помочь', hint: 'награда за доброту' },
      { id: 'rob', label: 'Обыскать карманы', hint: 'проверка Ловкости (СЛ 13)' },
      { id: 'leave', label: 'Пройти мимо', hint: 'безопасно' },
    ],
  },
  {
    id: 'mysterious_altar',
    icon: '🗿',
    textRu: 'Среди камней стоит древний алтарь, покрытый выцветшими рунами.',
    choices: [
      { id: 'pray', label: 'Помолиться', hint: 'восстановить силы' },
      { id: 'desecrate', label: 'Осквернить алтарь', hint: 'проверка Воли (СЛ 14)' },
      { id: 'ignore', label: 'Не трогать', hint: 'безопасно' },
    ],
  },
  {
    id: 'illusory_merchant',
    icon: '🧙',
    textRu: 'Странный торговец соткан из тумана — он предлагает купить нечто "особенное" за 30 золота.',
    choices: [
      { id: 'buy', label: 'Купить за 30 золота', hint: 'проверка Инстинкта (СЛ 12)' },
      { id: 'refuse', label: 'Отказаться', hint: 'безопасно' },
    ],
  },
  {
    id: 'pit_trap',
    icon: '🕳️',
    textRu: 'Тропа впереди перекрыта странно ровной ямой — похоже на ловушку.',
    choices: [
      { id: 'jump', label: 'Перепрыгнуть', hint: 'проверка Ловкости (СЛ 11)' },
      { id: 'around', label: 'Обойти', hint: 'безопасно' },
    ],
  },
  {
    id: 'restless_spirit',
    icon: '👻',
    textRu: 'Полупрозрачная фигура преграждает путь, шепча что-то на давно забытом языке.',
    choices: [
      { id: 'talk', label: 'Заговорить с духом', hint: 'проверка Воли (СЛ 13)' },
      { id: 'attack', label: 'Атаковать', hint: 'начнётся бой' },
      { id: 'flee', label: 'Убежать', hint: 'безопасно' },
    ],
  },
  {
    id: 'rune_door',
    icon: '🚪',
    textRu: 'Дверь покрыта вращающимися рунными кольцами — древний замок, который поддаётся скорее пониманию, чем силе.',
    choices: [
      { id: 'decipher', label: 'Разгадать руны', hint: 'проверка Разума (СЛ 13)' },
      { id: 'force', label: 'Выломать силой', hint: 'проверка Силы (СЛ 14)' },
      { id: 'leave', label: 'Уйти', hint: 'безопасно' },
    ],
  },
  {
    id: 'sleeping_guardian',
    icon: '🐾',
    textRu: 'Огромный зверь дремлет посреди прохода, разлёгшись на груде чужих костей. За ним поблёскивает что-то ценное.',
    choices: [
      { id: 'sneak', label: 'Прокрасться мимо', hint: 'проверка Ловкости (СЛ 12)' },
      { id: 'retreat', label: 'Отступить', hint: 'безопасно' },
    ],
  },

  // ===== Расширение доли ветвящихся check-событий (аудит 3, BG3-референс: "ветвящиеся текстовые
  // последствия проверки") — те же 6 характеристик игрока, что и выше, включая Стойкость, для
  // которой раньше не было ни одного check-события в этом списке. =====
  {
    id: 'crumbling_bridge',
    icon: '🌉',
    textRu: 'Мост через пропасть шатается и сыплется под ногами при каждом шаге — здесь нужна не ловкость, а простая выносливость.',
    choices: [
      { id: 'cross', label: 'Перейти напрямик', hint: 'проверка Стойкости (СЛ 13)' },
      { id: 'around', label: 'Обойти долгой тропой', hint: 'безопасно' },
    ],
  },
  {
    id: 'whispering_well',
    icon: '⛲',
    textRu: 'У полуразрушенного колодца слышен тихий шёпот — не всякое ухо различит в нём слова.',
    choices: [
      { id: 'listen', label: 'Прислушаться', hint: 'проверка Инстинкта (СЛ 12)' },
      { id: 'ignore', label: 'Пройти мимо', hint: 'безопасно' },
    ],
  },
  {
    id: 'bound_prisoner',
    icon: '⛓️',
    textRu: 'Скованный цепями человек молит освободить его — но клеймо на его лбу вам незнакомо.',
    choices: [
      { id: 'free', label: 'Освободить', hint: 'проверка Воли (СЛ 14)' },
      { id: 'leave', label: 'Обойти стороной', hint: 'безопасно' },
    ],
  },
  {
    id: 'frozen_shrine',
    icon: '❄️',
    textRu: 'Иней покрывает забытое святилище Кессары — знаки под ним складываются в фразу, если прочесть верно.',
    choices: [
      { id: 'decipher', label: 'Разгадать надпись', hint: 'проверка Разума (СЛ 13)' },
      { id: 'ignore', label: 'Не трогать', hint: 'безопасно' },
    ],
  },
  {
    id: 'collapsed_tunnel',
    icon: '⛏️',
    textRu: 'Ход завален камнями — за ними явно что-то есть, но путь придётся расчищать силой.',
    choices: [
      { id: 'clear', label: 'Разобрать завал', hint: 'проверка Силы (СЛ 12)' },
      { id: 'leave', label: 'Уйти', hint: 'безопасно' },
    ],
  },
  {
    id: 'market_thief',
    icon: '🏃',
    textRu: 'Мимо проносится воришка со срезанным кошельком — вашим собственным.',
    choices: [
      { id: 'chase', label: 'Догнать', hint: 'проверка Ловкости (СЛ 13)' },
      { id: 'shrug', label: 'Смириться с потерей', hint: 'теряете немного золота' },
    ],
  },

  // ===== Лор-загадки — проверка не характеристики, а того, что игрок УЗНАЛ из Лор-кодекса
  // (lib/codex.ts) и описаний рас/классов. Неверный ответ не наказывает — читать кодекс не
  // обязательно, чтобы играть, — но верный вознаграждает ощутимо и связывает мифологию
  // с сиюминутным исследованием, а не оставляет её только в отдельной вкладке. =====
  {
    id: 'rift_riddle',
    icon: '🌀',
    textRu: 'Из трещины доносится голос, не дожидающийся ответа: «Я не бог, но меня услышали все народы. Я не создал расу, но от меня пошли два Пути. Кто я?»',
    choices: [
      { id: 'karsus', label: 'Карсус', hint: '?' },
      { id: 'velarion', label: 'Веларион', hint: '?' },
      { id: 'kessara', label: 'Кессара', hint: '?' },
      { id: 'tornak', label: 'Торнак', hint: '?' },
    ],
  },
  {
    id: 'pillar_riddle',
    icon: '🗿',
    textRu: 'На потрескавшейся плите высечены четыре имени и один вопрос: «Кто из нас — Тьма, а не Свет?»',
    choices: [
      { id: 'kessara', label: 'Кессара', hint: '?' },
      { id: 'ailet', label: 'Айлет', hint: '?' },
      { id: 'tornak', label: 'Торнак', hint: '?' },
      { id: 'velarion', label: 'Веларион', hint: '?' },
    ],
  },
  {
    id: 'ancestor_riddle',
    icon: '🛡️',
    textRu: 'Резьба на камне изображает воина со щитом: «Я не ударил первым — я дождался удара. Так я понял: гнев — не оружие. Кто я?»',
    choices: [
      { id: 'grumgar', label: 'Грумгар', hint: '?' },
      { id: 'torin', label: 'Торин Драккар', hint: '?' },
      { id: 'sionael', label: 'Сионаэль', hint: '?' },
      { id: 'morvena', label: 'Морвена', hint: '?' },
    ],
  },
  {
    id: 'origin_riddle',
    icon: '☯️',
    textRu: 'Шёпот из ниоткуда повторяет одно и то же: «До всего были мы. Из нашего столкновения родился первый звук — не слово, не песня. Что это было?»',
    choices: [
      { id: 'gul', label: 'Гул', hint: '?' },
      { id: 'karsus_ans', label: 'Карсус', hint: '?' },
      { id: 'ash', label: 'Пепел', hint: '?' },
      { id: 'blight', label: 'Скверна', hint: '?' },
    ],
  },
  {
    id: 'path_riddle',
    icon: '⚖️',
    textRu: 'Две тропы расходятся у обгорелого столба с надписью: «Один путь сгорает в правде и возрождается честнее. Как он называется?»',
    choices: [
      { id: 'ash', label: 'Путь Пепла', hint: '?' },
      { id: 'blight', label: 'Путь Скверны', hint: '?' },
      { id: 'both', label: 'Оба пути', hint: '?' },
      { id: 'neither', label: 'Ни один', hint: '?' },
    ],
  },
];

export interface EventResolution {
  message: string;
  goldDelta: number;
  hpDeltaPercent: number; // доля от maxHp, может быть отрицательной; финальный hp никогда не опускается до 0 от событий
  mpDeltaPercent: number;
  xpDelta: number;
  itemRarity: 'common' | 'uncommon' | null;
  startCombat: boolean;
  /** Заполнено только для выборов с проверкой характеристики — детали броска для прозрачного
   * отображения (как видимый бросок кости в BG3), а не скрытого Math.random(). */
  checkResult?: CheckRollResult;
}

function noEffect(message: string): EventResolution {
  return { message, goldDelta: 0, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false };
}

/** Натуральная 1 на проверке характеристики — не просто провал, а критический провал (тот же
 * принцип, что и в D&D/BG3): исход внезапно ухудшается сверх обычного штрафа события. Единая
 * эскалация "из-за шума набегают враги" применяется ко ВСЕМ проверкам сразу постфактум, а не
 * точечно к 1-2 событиям — иначе натуральная 1 значила бы что-то только в части случаев, что
 * ощущалось бы как баг, а не как читаемое правило. Событие, которое и так уводит в бой при
 * провале (sleeping_guardian:sneak), не трогаем — эскалировать уже нечего.
 */
export function resolveEventChoice(eventId: string, choiceId: string, playerLevel: number, stats: CheckStats): EventResolution | null {
  const result = resolveEventChoiceRaw(eventId, choiceId, playerLevel, stats);
  if (result?.checkResult && result.checkResult.roll === 1 && !result.checkResult.success && !result.startCombat) {
    return { ...result, startCombat: true, message: `${result.message} А на шум из темноты выходит кое-кто ещё...` };
  }
  return result;
}

function resolveEventChoiceRaw(eventId: string, choiceId: string, playerLevel: number, stats: CheckStats): EventResolution | null {
  switch (`${eventId}:${choiceId}`) {
    case 'old_chest:open': {
      const check = rollStatCheck('dexterity', stats, 12);
      if (check.success) {
        const gold = rollDice('3d6') * playerLevel;
        return { message: `${checkPrefix(check)}Замок поддаётся без единого щелчка — внутри ${gold} золота!`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: Math.random() < 0.3 ? 'common' : null, startCombat: false, checkResult: check };
      }
      return { message: `${checkPrefix(check)}Сундук оказался с ловушкой — острые шипы ранят вас!`, goldDelta: 0, hpDeltaPercent: -0.1, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
    }
    case 'old_chest:ignore':
      return noEffect('Вы благоразумно проходите мимо — мало ли что там.');

    case 'wounded_traveler:help':
      return { message: 'Путник благодарит вас и делится опытом выживания в этих землях.', goldDelta: 0, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 15 * playerLevel, itemRarity: null, startCombat: false };
    case 'wounded_traveler:rob': {
      const check = rollStatCheck('dexterity', stats, 13);
      if (check.success) {
        const gold = rollDice('2d6') * playerLevel;
        return { message: `${checkPrefix(check)}Вы обшариваете карманы путника и находите ${gold} золота.`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
      }
      return { message: `${checkPrefix(check)}"Путник" оказался ловушкой — из-под лохмотьев блеснул клинок!`, goldDelta: 0, hpDeltaPercent: -0.08, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
    }
    case 'wounded_traveler:leave':
      return noEffect('Вы проходите мимо, оставляя путника его судьбе.');

    case 'mysterious_altar:pray':
      return { message: 'Тепло разливается по телу — силы восстановлены.', goldDelta: 0, hpDeltaPercent: 0.2, mpDeltaPercent: 0.2, xpDelta: 0, itemRarity: null, startCombat: false };
    case 'mysterious_altar:desecrate': {
      const check = rollStatCheck('willpower', stats, 14);
      if (check.success) {
        const gold = rollDice('4d6') * playerLevel;
        return { message: `${checkPrefix(check)}Алтарь рассыпается, открывая тайник — ${gold} золота!`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
      }
      return { message: `${checkPrefix(check)}Проклятие алтаря обжигает вас изнутри!`, goldDelta: 0, hpDeltaPercent: -0.12, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
    }
    case 'mysterious_altar:ignore':
      return noEffect('Вы решаете не тревожить древние руны.');

    case 'illusory_merchant:buy': {
      const goldDelta = -30;
      const check = rollStatCheck('instinct', stats, 12);
      if (check.success) {
        return { message: `${checkPrefix(check)}Торговец настоящий — он вручает вам предмет и растворяется в тумане.`, goldDelta, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: Math.random() < 0.4 ? 'uncommon' : 'common', startCombat: false, checkResult: check };
      }
      return { message: `${checkPrefix(check)}Едва вы отдали золото, торговец и его товар растаяли в воздухе — обман!`, goldDelta, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
    }
    case 'illusory_merchant:refuse':
      return noEffect('Вы качаете головой и уходите — мираж растворяется.');

    case 'pit_trap:jump': {
      const check = rollStatCheck('dexterity', stats, 11);
      if (check.success) {
        return { message: `${checkPrefix(check)}Лёгкий прыжок — и вы уже на другой стороне, довольные собой.`, goldDelta: 0, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 5 * playerLevel, itemRarity: null, startCombat: false, checkResult: check };
      }
      return { message: `${checkPrefix(check)}Нога срывается с края — вы падаете на дно ямы!`, goldDelta: 0, hpDeltaPercent: -0.1, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
    }
    case 'pit_trap:around':
      return noEffect('Вы обходите яму стороной, потеряв немного времени.');

    case 'restless_spirit:talk': {
      const check = rollStatCheck('willpower', stats, 13);
      if (check.success) {
        const gold = rollDice('2d8') * playerLevel;
        return { message: `${checkPrefix(check)}Дух указывает на тайник в стене и растворяется в воздухе. Вы находите ${gold} золота.`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
      }
      return { message: `${checkPrefix(check)}Дух гневно вскрикивает — от его прикосновения веет ледяным холодом.`, goldDelta: 0, hpDeltaPercent: -0.05, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
    }
    case 'restless_spirit:attack':
      return { message: 'Дух с воем бросается на вас!', goldDelta: 0, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: true };
    case 'restless_spirit:flee':
      return noEffect('Вы поспешно отступаете, не желая испытывать судьбу.');

    case 'rune_door:decipher': {
      const check = rollStatCheck('intellect', stats, 13);
      if (check.success) {
        const gold = rollDice('3d8') * playerLevel;
        return { message: `${checkPrefix(check)}Кольца встают на место с тихим щелчком — дверь открывается сама. За ней ${gold} золота.`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 10 * playerLevel, itemRarity: Math.random() < 0.35 ? 'uncommon' : null, startCombat: false, checkResult: check };
      }
      return { message: `${checkPrefix(check)}Кольца проворачиваются неверно — руны вспыхивают резкой болью в голове.`, goldDelta: 0, hpDeltaPercent: -0.05, mpDeltaPercent: -0.1, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
    }
    case 'rune_door:force': {
      const check = rollStatCheck('strength', stats, 14);
      if (check.success) {
        const gold = rollDice('3d8') * playerLevel;
        return { message: `${checkPrefix(check)}Камень трескается под ударом — дверь распахивается настежь. За ней ${gold} золота.`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 10 * playerLevel, itemRarity: Math.random() < 0.35 ? 'uncommon' : null, startCombat: false, checkResult: check };
      }
      return { message: `${checkPrefix(check)}Дверь не поддаётся — отдача от удара прокатывается по всему телу.`, goldDelta: 0, hpDeltaPercent: -0.08, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
    }
    case 'rune_door:leave':
      return noEffect('Вы решаете, что дверь того не стоит, и уходите.');

    case 'sleeping_guardian:sneak': {
      const check = rollStatCheck('dexterity', stats, 12);
      if (check.success) {
        const gold = rollDice('4d6') * playerLevel;
        return { message: `${checkPrefix(check)}Ни единого звука — вы забираете добычу и уходите так же тихо. ${gold} золота.`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 8 * playerLevel, itemRarity: null, startCombat: false, checkResult: check };
      }
      return { message: `${checkPrefix(check)}Под ногой хрустит кость — зверь распахивает глаза и поднимается.`, goldDelta: 0, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: true, checkResult: check };
    }
    case 'sleeping_guardian:retreat':
      return noEffect('Вы тихо отступаете, оставляя зверя спать дальше.');

    case 'crumbling_bridge:cross': {
      const check = rollStatCheck('vitality', stats, 13);
      if (check.success) {
        const gold = rollDice('3d6') * playerLevel;
        return { message: `${checkPrefix(check)}Мост держится ровно до последнего шага — на той стороне вы находите ${gold} золота.`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 6 * playerLevel, itemRarity: null, startCombat: false, checkResult: check };
      }
      return { message: `${checkPrefix(check)}Доска проламывается — вы срываетесь и едва цепляетесь за край.`, goldDelta: 0, hpDeltaPercent: -0.1, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
    }
    case 'crumbling_bridge:around':
      return noEffect('Вы выбираете долгую, но надёжную тропу в обход.');

    case 'whispering_well:listen': {
      const check = rollStatCheck('instinct', stats, 12);
      if (check.success) {
        const gold = rollDice('2d8') * playerLevel;
        return { message: `${checkPrefix(check)}В шёпоте вы различаете направление к тайнику — ${gold} золота.`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
      }
      return { message: `${checkPrefix(check)}Шёпот сплетается в бессмыслицу, от которой звенит в ушах.`, goldDelta: 0, hpDeltaPercent: 0, mpDeltaPercent: -0.1, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
    }
    case 'whispering_well:ignore':
      return noEffect('Вы предпочитаете не вслушиваться в голоса из колодца.');

    case 'bound_prisoner:free': {
      const check = rollStatCheck('willpower', stats, 14);
      if (check.success) {
        const gold = rollDice('3d6') * playerLevel;
        return { message: `${checkPrefix(check)}Освобождённый оказывается благодарен по-настоящему — он оставляет вам ${gold} золота на прощание.`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 10 * playerLevel, itemRarity: Math.random() < 0.3 ? 'common' : null, startCombat: false, checkResult: check };
      }
      return { message: `${checkPrefix(check)}Клеймо вспыхивает — это была не жертва, а приманка Скверны.`, goldDelta: 0, hpDeltaPercent: -0.1, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
    }
    case 'bound_prisoner:leave':
      return noEffect('Что-то в этом клейме заставляет вас пройти мимо.');

    case 'frozen_shrine:decipher': {
      const check = rollStatCheck('intellect', stats, 13);
      if (check.success) {
        const gold = rollDice('3d8') * playerLevel;
        return { message: `${checkPrefix(check)}Фраза складывается верно — иней осыпается, открывая подношения. ${gold} золота.`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 10 * playerLevel, itemRarity: Math.random() < 0.3 ? 'uncommon' : null, startCombat: false, checkResult: check };
      }
      return { message: `${checkPrefix(check)}Неверное слово — святилище обдаёт вас ледяным дыханием.`, goldDelta: 0, hpDeltaPercent: -0.08, mpDeltaPercent: -0.05, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
    }
    case 'frozen_shrine:ignore':
      return noEffect('Вы решаете не тревожить замёрзшее святилище.');

    case 'collapsed_tunnel:clear': {
      const check = rollStatCheck('strength', stats, 12);
      if (check.success) {
        const gold = rollDice('3d6') * playerLevel;
        return { message: `${checkPrefix(check)}Камни поддаются один за другим — за завалом ${gold} золота.`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 8 * playerLevel, itemRarity: Math.random() < 0.25 ? 'common' : null, startCombat: false, checkResult: check };
      }
      return { message: `${checkPrefix(check)}Завал сдвигается не туда — камни осыпаются вам на ноги.`, goldDelta: 0, hpDeltaPercent: -0.09, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
    }
    case 'collapsed_tunnel:leave':
      return noEffect('Вы решаете, что завал того не стоит, и уходите.');

    case 'market_thief:chase': {
      const check = rollStatCheck('dexterity', stats, 13);
      if (check.success) {
        const gold = rollDice('2d6') * playerLevel;
        return { message: `${checkPrefix(check)}Вы настигаете воришку в переулке — кошелёк возвращён, и с ним ещё ${gold} золота.`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 5 * playerLevel, itemRarity: null, startCombat: false, checkResult: check };
      }
      return { message: `${checkPrefix(check)}Воришка ныряет в толпу — погоня оборачивается разбитой в кровь ладонью о стену.`, goldDelta: 0, hpDeltaPercent: -0.04, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false, checkResult: check };
    }
    case 'market_thief:shrug': {
      const lost = rollDice('1d4') * playerLevel;
      return { message: `Вы пожимаете плечами — ${lost} золота того не стоят.`, goldDelta: -lost, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false };
    }

    case 'rift_riddle:karsus': return riddleResolution(true, 'Карсус', playerLevel);
    case 'rift_riddle:velarion': return riddleResolution(false, 'Карсус', playerLevel);
    case 'rift_riddle:kessara': return riddleResolution(false, 'Карсус', playerLevel);
    case 'rift_riddle:tornak': return riddleResolution(false, 'Карсус', playerLevel);

    case 'pillar_riddle:kessara': return riddleResolution(true, 'Кессара', playerLevel);
    case 'pillar_riddle:ailet': return riddleResolution(false, 'Кессара', playerLevel);
    case 'pillar_riddle:tornak': return riddleResolution(false, 'Кессара', playerLevel);
    case 'pillar_riddle:velarion': return riddleResolution(false, 'Кессара', playerLevel);

    case 'ancestor_riddle:grumgar': return riddleResolution(true, 'Грумгар', playerLevel);
    case 'ancestor_riddle:torin': return riddleResolution(false, 'Грумгар', playerLevel);
    case 'ancestor_riddle:sionael': return riddleResolution(false, 'Грумгар', playerLevel);
    case 'ancestor_riddle:morvena': return riddleResolution(false, 'Грумгар', playerLevel);

    case 'origin_riddle:gul': return riddleResolution(true, 'Гул', playerLevel);
    case 'origin_riddle:karsus_ans': return riddleResolution(false, 'Гул', playerLevel);
    case 'origin_riddle:ash': return riddleResolution(false, 'Гул', playerLevel);
    case 'origin_riddle:blight': return riddleResolution(false, 'Гул', playerLevel);

    case 'path_riddle:ash': return riddleResolution(true, 'Путь Пепла', playerLevel);
    case 'path_riddle:blight': return riddleResolution(false, 'Путь Пепла', playerLevel);
    case 'path_riddle:both': return riddleResolution(false, 'Путь Пепла', playerLevel);
    case 'path_riddle:neither': return riddleResolution(false, 'Путь Пепла', playerLevel);

    default:
      return null;
  }
}

/** Верный ответ вознаграждает ощутимо (золото + опыт), неверный не наказывает — только
 * называет правильный ответ, чтобы в следующий раз игрок уже знал. Не привязана к
 * характеристикам: это проверка того, что игрок УЗНАЛ из Лор-кодекса, а не того, кем он играет. */
function riddleResolution(isCorrect: boolean, correctAnswerRu: string, playerLevel: number): EventResolution {
  if (isCorrect) {
    const gold = rollDice('3d8') * playerLevel;
    return { message: `Верно! Ответ — ${correctAnswerRu}. ${gold} золота и толика мудрости в награду.`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 12 * playerLevel, itemRarity: null, startCombat: false };
  }
  return { message: `Неверно. Правильный ответ — ${correctAnswerRu}. Что ж, теперь вы знаете.`, goldDelta: 0, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 2 * playerLevel, itemRarity: null, startCombat: false };
}

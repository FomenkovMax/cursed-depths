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
      { id: 'open', label: 'Открыть сундук', hint: 'рискованно' },
      { id: 'ignore', label: 'Пройти мимо', hint: 'безопасно' },
    ],
  },
  {
    id: 'wounded_traveler',
    icon: '🧍',
    textRu: 'На обочине тропы лежит раненый путник и просит о помощи.',
    choices: [
      { id: 'help', label: 'Помочь', hint: 'награда за доброту' },
      { id: 'rob', label: 'Обыскать карманы', hint: 'рискованно' },
      { id: 'leave', label: 'Пройти мимо', hint: 'безопасно' },
    ],
  },
  {
    id: 'mysterious_altar',
    icon: '🗿',
    textRu: 'Среди камней стоит древний алтарь, покрытый выцветшими рунами.',
    choices: [
      { id: 'pray', label: 'Помолиться', hint: 'восстановить силы' },
      { id: 'desecrate', label: 'Осквернить алтарь', hint: 'рискованно' },
      { id: 'ignore', label: 'Не трогать', hint: 'безопасно' },
    ],
  },
  {
    id: 'illusory_merchant',
    icon: '🧙',
    textRu: 'Странный торговец соткан из тумана — он предлагает купить нечто "особенное" за 30 золота.',
    choices: [
      { id: 'buy', label: 'Купить за 30 золота', hint: 'случайный результат' },
      { id: 'refuse', label: 'Отказаться', hint: 'безопасно' },
    ],
  },
  {
    id: 'pit_trap',
    icon: '🕳️',
    textRu: 'Тропа впереди перекрыта странно ровной ямой — похоже на ловушку.',
    choices: [
      { id: 'jump', label: 'Перепрыгнуть', hint: 'проверка ловкости' },
      { id: 'around', label: 'Обойти', hint: 'безопасно' },
    ],
  },
  {
    id: 'restless_spirit',
    icon: '👻',
    textRu: 'Полупрозрачная фигура преграждает путь, шепча что-то на давно забытом языке.',
    choices: [
      { id: 'talk', label: 'Заговорить с духом', hint: 'мирный исход' },
      { id: 'attack', label: 'Атаковать', hint: 'начнётся бой' },
      { id: 'flee', label: 'Убежать', hint: 'безопасно' },
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
}

function noEffect(message: string): EventResolution {
  return { message, goldDelta: 0, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false };
}

export function resolveEventChoice(eventId: string, choiceId: string, playerLevel: number): EventResolution | null {
  switch (`${eventId}:${choiceId}`) {
    case 'old_chest:open': {
      if (Math.random() < 0.65) {
        const gold = rollDice('3d6') * playerLevel;
        return { message: `Внутри сундука оказалось ${gold} золота!`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: Math.random() < 0.3 ? 'common' : null, startCombat: false };
      }
      return { message: 'Сундук оказался с ловушкой — острые шипы ранят вас!', goldDelta: 0, hpDeltaPercent: -0.1, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false };
    }
    case 'old_chest:ignore':
      return noEffect('Вы благоразумно проходите мимо — мало ли что там.');

    case 'wounded_traveler:help':
      return { message: 'Путник благодарит вас и делится опытом выживания в этих землях.', goldDelta: 0, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 15 * playerLevel, itemRarity: null, startCombat: false };
    case 'wounded_traveler:rob': {
      if (Math.random() < 0.5) {
        const gold = rollDice('2d6') * playerLevel;
        return { message: `Вы обшариваете карманы путника и находите ${gold} золота.`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false };
      }
      return { message: '"Путник" оказался ловушкой — из-под лохмотьев блеснул клинок!', goldDelta: 0, hpDeltaPercent: -0.08, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false };
    }
    case 'wounded_traveler:leave':
      return noEffect('Вы проходите мимо, оставляя путника его судьбе.');

    case 'mysterious_altar:pray':
      return { message: 'Тепло разливается по телу — силы восстановлены.', goldDelta: 0, hpDeltaPercent: 0.2, mpDeltaPercent: 0.2, xpDelta: 0, itemRarity: null, startCombat: false };
    case 'mysterious_altar:desecrate': {
      if (Math.random() < 0.5) {
        const gold = rollDice('4d6') * playerLevel;
        return { message: `Алтарь рассыпается, открывая тайник — ${gold} золота!`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false };
      }
      return { message: 'Проклятие алтаря обжигает вас изнутри!', goldDelta: 0, hpDeltaPercent: -0.12, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false };
    }
    case 'mysterious_altar:ignore':
      return noEffect('Вы решаете не тревожить древние руны.');

    case 'illusory_merchant:buy': {
      const goldDelta = -30;
      if (Math.random() < 0.5) {
        return { message: 'Торговец вручает вам предмет и растворяется в тумане.', goldDelta, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: Math.random() < 0.4 ? 'uncommon' : 'common', startCombat: false };
      }
      return { message: 'Едва вы отдали золото, торговец и его товар растаяли в воздухе — обман!', goldDelta, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false };
    }
    case 'illusory_merchant:refuse':
      return noEffect('Вы качаете головой и уходите — мираж растворяется.');

    case 'pit_trap:jump': {
      if (Math.random() < 0.65) {
        return { message: 'Лёгкий прыжок — и вы уже на другой стороне, довольные собой.', goldDelta: 0, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 5 * playerLevel, itemRarity: null, startCombat: false };
      }
      return { message: 'Нога срывается с края — вы падаете на дно ямы!', goldDelta: 0, hpDeltaPercent: -0.1, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false };
    }
    case 'pit_trap:around':
      return noEffect('Вы обходите яму стороной, потеряв немного времени.');

    case 'restless_spirit:talk': {
      if (Math.random() < 0.7) {
        const gold = rollDice('2d8') * playerLevel;
        return { message: `Дух указывает на тайник в стене и растворяется в воздухе. Вы находите ${gold} золота.`, goldDelta: gold, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false };
      }
      return { message: 'Дух гневно вскрикивает — от его прикосновения веет ледяным холодом.', goldDelta: 0, hpDeltaPercent: -0.05, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: false };
    }
    case 'restless_spirit:attack':
      return { message: 'Дух с воем бросается на вас!', goldDelta: 0, hpDeltaPercent: 0, mpDeltaPercent: 0, xpDelta: 0, itemRarity: null, startCombat: true };
    case 'restless_spirit:flee':
      return noEffect('Вы поспешно отступаете, не желая испытывать судьбу.');

    default:
      return null;
  }
}

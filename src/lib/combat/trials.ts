/**
 * Испытания — ветвящийся аналог обычных данжей (lib/dungeons.ts), по образцу Trial of the
 * Sekhemas из Path of Exile 2: сеть развилок вместо линейного коридора, на каждой развилке
 * видно ТИП обеих соседних комнат (награда/ловушка/враг) ДО выбора — решение осознанное,
 * а не слепое, — и раскладка развилок ФИКСИРОВАНА в данных (не рероллится каждый забег),
 * так что маршрут можно реально запомнить и планировать при повторном прохождении.
 *
 * Технически переиспользует ТЕ ЖЕ поля Player, что и обычный данж (dungeonId/dungeonRoom/
 * inCombat/enemyId/...) — см. combat/action.ts: findDungeon(dungeonId) сначала проверяет
 * обычные данжи, при null пробует findTrial(dungeonId). dungeonRoom здесь означает "сколько
 * развилок уже пройдено" (0..junctions.length), а не индекс линейной комнаты. Игрок находится
 * "на развилке" (ожидает выбора направления), когда dungeonId указывает на испытание, а
 * inCombat === false — в этот момент бой ещё не начат, комната ещё не выбрана.
 */

export type TrialRoomType = 'monster' | 'reward' | 'trap';

export interface TrialRoomOption {
  direction: 'left' | 'right';
  type: TrialRoomType;
  /** Показывается ДО выбора — тип комнаты виден заранее, как в PoE2. */
  label: string;
  /** Только для type: 'monster'. */
  enemyId?: string;
  /** Только для type: 'reward' — золото = goldMult * playerLevel, шанс предмета ниже. */
  goldMult?: number;
  itemRarity?: 'common' | 'uncommon';
  /** Только для type: 'trap' — доля от maxHp (отрицательная). */
  hpDamagePercent?: number;
  /** Флейвор-строка, показанная при резолве этой комнаты. */
  narrativeRu: string;
}

export interface TrialJunction {
  options: [TrialRoomOption, TrialRoomOption];
}

export interface Trial {
  id: string;
  nameRu: string;
  icon: string;
  descriptionRu: string;
  locationId: string;
  minLevel: number;
  junctions: TrialJunction[];
  bossEnemyId: string;
  completionReward: { xp: number; gold: number; items?: string[] };
  completionLoreRu: string;
}

export const TRIALS: Trial[] = [
  {
    id: 'greying_paths',
    nameRu: 'Испытание Сереющих Троп',
    icon: '🌿',
    descriptionRu: 'Роща разветвляется на десяток одинаковых с виду троп. Скверна метит их по-разному — нужно читать метки, а не идти напролом.',
    locationId: 'outer_grove',
    minLevel: 3,
    junctions: [
      {
        options: [
          { direction: 'left', type: 'monster', enemyId: 'thorn_wolf', label: '🐺 Волчья тропа', narrativeRu: 'Тропа петляет между колючих зарослей — впереди рычание.' },
          { direction: 'right', type: 'reward', goldMult: 3, label: '🍄 Грибной круг', narrativeRu: 'Кольцо грибов светится слабым золотистым светом — под ним что-то спрятано.' },
        ],
      },
      {
        options: [
          { direction: 'left', type: 'trap', hpDamagePercent: -0.08, label: '🕸️ Паутина корней', narrativeRu: 'Корни под ногами внезапно сжимаются, как силки.' },
          { direction: 'right', type: 'monster', enemyId: 'withering_dryad', label: '🧚 Поляна дриады', narrativeRu: 'На поляне вас встречает дриада — увядшая, но всё ещё опасная.' },
        ],
      },
      {
        options: [
          { direction: 'left', type: 'monster', enemyId: 'blighted_treant', label: '🌳 Заражённая роща', narrativeRu: 'Деревья вокруг шевелятся сами — одно из них встаёт на пути.' },
          { direction: 'right', type: 'reward', goldMult: 2, hpDamagePercent: 0.1, label: '💧 Чистый родник', narrativeRu: 'Родник, ещё не тронутый Скверной — вода лечит и оставляет немного золота на дне.' },
        ],
      },
      {
        options: [
          { direction: 'left', type: 'reward', goldMult: 5, itemRarity: 'uncommon', label: '🌿 Нетронутый уголок', narrativeRu: 'Последний клочок рощи, куда Скверна ещё не дотянулась.' },
          { direction: 'right', type: 'trap', hpDamagePercent: -0.14, label: '🌑 Сгусток Скверны', narrativeRu: 'Плотный сгусток тьмы лопается прямо у вас на пути.' },
        ],
      },
    ],
    bossEnemyId: 'lost_grove_soul',
    completionReward: { xp: 350, gold: 150, items: ['ailet_tear'] },
    completionLoreRu: 'Пленённая душа Рощи растворяется — на миг между деревьями проступает то, чем роща была до Скверны. Потом видение гаснет, но тропа за спиной больше не выглядит одинаковой.',
  },
];

export function findTrial(id: string): Trial | null {
  return TRIALS.find(t => t.id === id) ?? null;
}

export function trialForLocation(locationId: string): Trial | null {
  return TRIALS.find(t => t.locationId === locationId) ?? null;
}

/**
 * Квестовые цепочки — в отличие от ежедневных заданий (lib/quests.ts), это постоянная
 * последовательность из нескольких шагов с нарастающей наградой. Следующий шаг выдаётся
 * только после того, как предыдущий получен (claimed) — так на экране всегда виден только
 * ОДИН активный шаг цепочки, а не все сразу.
 *
 * Переиспользует тот же PlayerQuest.type ('kill'/'explore'/'craft'), что и ежедневные квесты —
 * incrementQuestProgress уже продвигает ЛЮБОЙ активный квест нужного типа, отдельного хука не
 * требуется.
 */

export interface QuestChainStep {
  type: 'kill' | 'explore' | 'craft';
  target: number;
  reward: { xp: number; gold: number; items?: string[] };
  /** Заголовок финального шага — отличает "Путь Пепла"-версию от "Путь Скверны"-версии
   * одной и той же цепочки, см. finaleBranch ниже. */
  titleSuffix?: string;
  /** Нарративная затравка перед механическим "Победите N врагов." — цепочка становится
   * маленьким сюжетом об охоте/картографии/ремесле, привязанным к мифологии (codex.ts:
   * Карсус, Торнак, распространение Скверны), а не только числами прогрессии. */
  narrativeRu: string;
}

/** Финал цепочки РЕАЛЬНО ветвится по Пути класса игрока (ash/blight, уже выбранному при
 * создании персонажа, см. Player.class.path) — два игрока в одной цепочке получают на
 * последнем шаге разный квест: другую цель, другую награду, другой текст. Это и есть
 * "нелинейная генерация" — не просто разные числа, а структурно разный финал. */
export interface QuestChainBranch {
  ash: QuestChainStep;
  blight: QuestChainStep;
}

export interface QuestChain {
  id: string;
  nameRu: string;
  icon: string;
  descriptionRu: string;
  /** Общие для всех игроков шаги 0..N-1 — линейные, как раньше. */
  steps: QuestChainStep[];
  /** Шаг N (последний) — ветвится по Пути, см. QuestChainBranch. */
  finaleBranch: QuestChainBranch;
}

export const QUEST_CHAINS: QuestChain[] = [
  {
    id: 'ash_hunter',
    nameRu: 'Пепельный охотник',
    icon: '⚔️',
    descriptionRu: 'С той ночи, как в ваших ушах впервые прозвучал голос Карсуса, вы чувствуете зов — что-то в проклятых глубинах отвечает на каждый ваш шаг.',
    steps: [
      {
        type: 'kill', target: 5, reward: { xp: 40, gold: 20 },
        narrativeRu: 'Первые твари, тронутые Скверной, слышат тот же зов, что и вы — но откликаются на него иначе: яростью, а не любопытством.',
      },
      {
        type: 'kill', target: 15, reward: { xp: 90, gold: 50 },
        narrativeRu: 'Чем больше вы убиваете, тем яснее слышите: зов идёт не от них. Они лишь эхо чего-то большего, что шевелится глубже.',
      },
      {
        type: 'kill', target: 30, reward: { xp: 160, gold: 100, items: ['health_potion'] },
        narrativeRu: 'Тридцать смертей спустя вы понимаете: это не охота. Это разговор — просто ваш собеседник ещё не заговорил словами.',
      },
    ],
    finaleBranch: {
      ash: {
        type: 'kill', target: 60, reward: { xp: 320, gold: 180, items: ['shadow_dagger'] }, titleSuffix: 'Путь Пепла',
        narrativeRu: 'Правда обожгла вас и не оставила иллюзий: зов — это Карсус, всё ещё пытающийся докричаться. Вы больше не бежите от него — вы идёте ему навстречу, честнее, чем были.',
      },
      blight: {
        type: 'kill', target: 50, reward: { xp: 300, gold: 220, items: ['shadow_dagger'] }, titleSuffix: 'Путь Скверны',
        narrativeRu: 'Правда открылась вам, и вы приняли её иначе: если Карсус кричит в пустоту, пусть пустота научится кричать в ответ. Вы строите себя заново из того, что он оставил.',
      },
    },
  },
  {
    id: 'deep_cartographer',
    nameRu: 'Картограф Глубин',
    icon: '🗺️',
    descriptionRu: 'Уцелевший картограф в Пепельных Вратах платит за подробные вести с каждой пройденной пяди проклятого мира — говорит, что карта нужна не для дороги домой, а чтобы понять, куда расползается Скверна.',
    steps: [
      {
        type: 'explore', target: 10, reward: { xp: 30, gold: 25 },
        narrativeRu: 'Первые заметки на полях старой карты — где безопасно, где нет, где земля просто перестаёт быть землёй.',
      },
      {
        type: 'explore', target: 30, reward: { xp: 70, gold: 60 },
        narrativeRu: 'Карта разрастается быстрее, чем вы успеваете её читать. Границы Скверны на ней уже не линия — они пятно, и пятно растёт.',
      },
      {
        type: 'explore', target: 75, reward: { xp: 150, gold: 120, items: ['mana_potion'] },
        narrativeRu: 'Картограф больше не спрашивает, что вы видели. Он спрашивает, сколько ещё осталось того, что можно нанести на карту, прежде чем карта перестанет иметь смысл.',
      },
    ],
    finaleBranch: {
      ash: {
        type: 'explore', target: 150, reward: { xp: 260, gold: 180, items: ['elven_bow'] }, titleSuffix: 'Путь Пепла',
        narrativeRu: 'Вы наносите последний рубеж на карту и понимаете правду: границ больше нет, есть только то, что вы прошли сами. Карта закончена — и честна об этом.',
      },
      blight: {
        type: 'explore', target: 120, reward: { xp: 280, gold: 240, items: ['elven_bow'] }, titleSuffix: 'Путь Скверны',
        narrativeRu: 'Вы прекращаете наносить границы — Скверна не признаёт их, и вы тоже перестаёте. Карта, которую вы оставляете, показывает не мир как он был, а мир как он есть.',
      },
    },
  },
  {
    id: 'master_artisan',
    nameRu: 'Мастер-ремесленник',
    icon: '⚒️',
    descriptionRu: 'В Великой Кузнице ещё горит что-то в глубине остывших горнов. Гномы верят: если выковать достаточно — Торнак услышит и снова даст форме предел.',
    steps: [
      {
        type: 'craft', target: 3, reward: { xp: 35, gold: 30 },
        narrativeRu: 'Первые изделия выходят кривыми — руки помнят ремесло, но горн отвык от жара.',
      },
      {
        type: 'craft', target: 8, reward: { xp: 80, gold: 70 },
        narrativeRu: 'Работа выравнивается. Каждый удар молота — не просто ремесло, а попытка вспомнить, каким мир был до того, как форма перестала держаться.',
      },
      {
        type: 'craft', target: 15, reward: { xp: 160, gold: 140, items: ['iron_ore'] },
        narrativeRu: 'Пятнадцать изделий спустя вы куёте не для продажи — вы куёте, чтобы доказать себе: форма всё ещё возможна.',
      },
    ],
    finaleBranch: {
      ash: {
        type: 'craft', target: 25, reward: { xp: 280, gold: 200, items: ['steel_sword'] }, titleSuffix: 'Путь Пепла',
        narrativeRu: 'Правда о Торнаке проста и обжигает: закон бога умер вместе с ним, но клятва ремесла — нет. Вы куёте предел заново, честно, своими руками.',
      },
      blight: {
        type: 'craft', target: 20, reward: { xp: 320, gold: 260, items: ['steel_sword'] }, titleSuffix: 'Путь Скверны',
        narrativeRu: 'Вы перестаёте ковать по старым чертежам. Если старый закон рухнул, пусть новый выйдет из того, что уцелело — не идеальным, но вашим.',
      },
    },
  },
];

/** questId конкретного шага цепочки — конвенция для issue/advance/claim в lib/quests.ts.
 * Финальный ветвящийся шаг получает суффикс _ash/_blight, чтобы questId однозначно отражал,
 * какую именно ветку получил конкретный игрок (два игрока в одной цепочке на одном номере
 * шага могут иметь РАЗНЫЕ questId). */
export function chainStepQuestId(chainId: string, stepIndex: number, branch?: 'ash' | 'blight'): string {
  return branch ? `chain_${chainId}_${stepIndex}_${branch}` : `chain_${chainId}_${stepIndex}`;
}

/** Обратное к chainStepQuestId — извлекает { chainId, stepIndex, branch }, или null, если это
 * не шаг цепочки. branch — null для обычных (не финальных) шагов. */
export function parseChainStepQuestId(questId: string): { chainId: string; stepIndex: number; branch: 'ash' | 'blight' | null } | null {
  const match = questId.match(/^chain_(.+)_(\d+)(?:_(ash|blight))?$/);
  if (!match) return null;
  return { chainId: match[1], stepIndex: parseInt(match[2], 10), branch: (match[3] as 'ash' | 'blight' | undefined) ?? null };
}

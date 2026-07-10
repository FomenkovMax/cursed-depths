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
    descriptionRu: 'Победите врагов проклятых глубин',
    steps: [
      { type: 'kill', target: 5, reward: { xp: 40, gold: 20 } },
      { type: 'kill', target: 15, reward: { xp: 90, gold: 50 } },
      { type: 'kill', target: 30, reward: { xp: 160, gold: 100, items: ['health_potion'] } },
    ],
    finaleBranch: {
      ash: { type: 'kill', target: 60, reward: { xp: 320, gold: 180, items: ['shadow_dagger'] }, titleSuffix: 'Путь Пепла' },
      blight: { type: 'kill', target: 50, reward: { xp: 300, gold: 220, items: ['shadow_dagger'] }, titleSuffix: 'Путь Скверны' },
    },
  },
  {
    id: 'deep_cartographer',
    nameRu: 'Картограф Глубин',
    icon: '🗺️',
    descriptionRu: 'Исследуйте как можно больше локаций',
    steps: [
      { type: 'explore', target: 10, reward: { xp: 30, gold: 25 } },
      { type: 'explore', target: 30, reward: { xp: 70, gold: 60 } },
      { type: 'explore', target: 75, reward: { xp: 150, gold: 120, items: ['mana_potion'] } },
    ],
    finaleBranch: {
      ash: { type: 'explore', target: 150, reward: { xp: 260, gold: 180, items: ['elven_bow'] }, titleSuffix: 'Путь Пепла' },
      blight: { type: 'explore', target: 120, reward: { xp: 280, gold: 240, items: ['elven_bow'] }, titleSuffix: 'Путь Скверны' },
    },
  },
  {
    id: 'master_artisan',
    nameRu: 'Мастер-ремесленник',
    icon: '⚒️',
    descriptionRu: 'Скрафтите множество предметов',
    steps: [
      { type: 'craft', target: 3, reward: { xp: 35, gold: 30 } },
      { type: 'craft', target: 8, reward: { xp: 80, gold: 70 } },
      { type: 'craft', target: 15, reward: { xp: 160, gold: 140, items: ['iron_ore'] } },
    ],
    finaleBranch: {
      ash: { type: 'craft', target: 25, reward: { xp: 280, gold: 200, items: ['steel_sword'] }, titleSuffix: 'Путь Пепла' },
      blight: { type: 'craft', target: 20, reward: { xp: 320, gold: 260, items: ['steel_sword'] }, titleSuffix: 'Путь Скверны' },
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

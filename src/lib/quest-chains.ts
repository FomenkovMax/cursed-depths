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
}

export interface QuestChain {
  id: string;
  nameRu: string;
  icon: string;
  descriptionRu: string;
  steps: QuestChainStep[];
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
      { type: 'kill', target: 60, reward: { xp: 300, gold: 200, items: ['shadow_dagger'] } },
    ],
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
      { type: 'explore', target: 150, reward: { xp: 280, gold: 220, items: ['elven_bow'] } },
    ],
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
      { type: 'craft', target: 25, reward: { xp: 300, gold: 250, items: ['steel_sword'] } },
    ],
  },
];

/** questId конкретного шага цепочки — конвенция для issue/advance/claim в lib/quests.ts. */
export function chainStepQuestId(chainId: string, stepIndex: number): string {
  return `chain_${chainId}_${stepIndex}`;
}

/** Обратное к chainStepQuestId — извлекает { chainId, stepIndex }, или null, если это не шаг цепочки. */
export function parseChainStepQuestId(questId: string): { chainId: string; stepIndex: number } | null {
  const match = questId.match(/^chain_(.+)_(\d+)$/);
  if (!match) return null;
  return { chainId: match[1], stepIndex: parseInt(match[2], 10) };
}

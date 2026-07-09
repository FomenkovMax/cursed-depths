/**
 * Выдача и отслеживание ежедневных квестов.
 *
 * Схема (PlayerQuest), GET /api/quests и POST /api/quests/claim, и QuestsTab.tsx
 * были полностью готовы, но ни один код в проекте никогда не создавал ни одной
 * строки PlayerQuest и не продвигал progress — вкладка «Квесты» была пустой
 * навсегда для любого игрока. Этот модуль — единственное место, которое выдаёт
 * квесты (issueDailyQuests) и продвигает их прогресс (incrementQuestProgress).
 */

import { db } from '@/lib/db';

type QuestClient = { playerQuest: typeof db.playerQuest };

interface DailyQuestSeed {
  questId: string;
  type: string;
  title: string;
  description: string;
  target: number;
  reward: { xp: number; gold: number; items?: string[] };
}

const DAILY_QUEST_IDS = ['daily_kill', 'daily_explore', 'daily_craft', 'daily_collect'];

/** Тип "принеси предмет"-квеста для конкретного itemId — единая конвенция для issueDailyQuests,
 * inventory-utils.ts (продвигает прогресс, когда предмет попадает в инвентарь) и quests/claim
 * (понимает, какой предмет нужно списать при сдаче квеста). */
export function collectQuestType(itemId: string): string {
  return `collect_${itemId}`;
}

/** Обратное к collectQuestType — извлекает itemId из quest.type, или null, если это не "принеси предмет"-квест. */
export function collectQuestItemId(questType: string): string | null {
  return questType.startsWith('collect_') ? questType.slice('collect_'.length) : null;
}

// ancient_map/cursed_locket (type: 'quest' в ITEMS) были полными карточками без единого
// способа их сдать — прогресс/квест-система (см. заголовок файла) не поддерживала квестов
// "принеси предмет" вообще. Чередуем предмет по дню месяца, чтобы оба стали осмысленными.
const COLLECT_TARGETS: Record<string, { title: string; description: string; reward: { xpMult: number; goldMult: number } }> = {
  ancient_map: {
    title: 'Находка на память',
    description: 'Принесите Древнюю карту — скупщик реликвий заплатит за неё.',
    reward: { xpMult: 35, goldMult: 25 },
  },
  cursed_locket: {
    title: 'Опасная находка',
    description: 'Принесите Проклятый медальон — с такими вещами лучше не задерживаться.',
    reward: { xpMult: 40, goldMult: 15 },
  },
};

function buildDailyQuests(level: number): DailyQuestSeed[] {
  const collectItemId = new Date().getUTCDate() % 2 === 0 ? 'ancient_map' : 'cursed_locket';
  const collect = COLLECT_TARGETS[collectItemId];

  return [
    { questId: 'daily_kill', type: 'kill', title: 'Охота', description: 'Победите 3 врагов в бою.', target: 3, reward: { xp: 30 * level, gold: 15 * level } },
    { questId: 'daily_explore', type: 'explore', title: 'Исследователь', description: 'Исследуйте локацию 5 раз.', target: 5, reward: { xp: 20 * level, gold: 10 * level } },
    { questId: 'daily_craft', type: 'craft', title: 'Подмастерье', description: 'Скрафтите 1 предмет.', target: 1, reward: { xp: 25 * level, gold: 12 * level, items: ['health_potion'] } },
    { questId: 'daily_collect', type: collectQuestType(collectItemId), title: collect.title, description: collect.description, target: 1, reward: { xp: collect.reward.xpMult * level, gold: collect.reward.goldMult * level } },
  ];
}

/** Заменяет прежний набор ежедневных квестов игрока свежим, отмасштабированным под текущий уровень. */
export async function issueDailyQuests(client: QuestClient, playerId: string, level: number): Promise<void> {
  await client.playerQuest.deleteMany({ where: { playerId, questId: { in: DAILY_QUEST_IDS } } });
  const seeds = buildDailyQuests(Math.max(1, level));
  await client.playerQuest.createMany({
    data: seeds.map(s => ({
      playerId,
      questId: s.questId,
      type: s.type,
      title: s.title,
      description: s.description,
      target: s.target,
      reward: JSON.stringify(s.reward),
    })),
  });
}

/** Продвигает прогресс всех незавершённых квестов игрока данного типа ("kill"/"explore"/"craft"). */
export async function incrementQuestProgress(client: QuestClient, playerId: string, type: string, amount = 1): Promise<void> {
  const active = await client.playerQuest.findMany({ where: { playerId, type, completed: false } });
  for (const quest of active) {
    const newProgress = Math.min(quest.target, quest.progress + amount);
    await client.playerQuest.update({
      where: { id: quest.id },
      data: { progress: newProgress, completed: newProgress >= quest.target },
    });
  }
}

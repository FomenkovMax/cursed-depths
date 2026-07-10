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
import { QUEST_CHAINS, chainStepQuestId, parseChainStepQuestId } from '@/lib/quest-chains';

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

function chainStepTitle(chain: { nameRu: string; icon: string }, stepIndex: number, totalSteps: number): string {
  return `${chain.icon} ${chain.nameRu} (${stepIndex + 1}/${totalSteps})`;
}

const CHAIN_TYPE_VERB: Record<string, string> = { kill: 'Победите', explore: 'Исследуйте локацию', craft: 'Скрафтите' };
const CHAIN_TYPE_NOUN: Record<string, string> = { kill: 'врагов', explore: 'раз', craft: 'предметов' };

function chainStepDescription(step: { type: string; target: number }): string {
  return `${CHAIN_TYPE_VERB[step.type]} ${step.target} ${CHAIN_TYPE_NOUN[step.type]}.`;
}

/** Выдаёт первый шаг каждой цепочки, которую игрок ещё не начинал (нет ни одной строки
 * PlayerQuest ни по одному её шагу — ни активной, ни уже полученной). Вызывается один раз
 * при создании персонажа; повторный вызов безопасен и ничего не задублирует. */
export async function issueChainQuests(client: QuestClient, playerId: string): Promise<void> {
  for (const chain of QUEST_CHAINS) {
    const anyStep = await client.playerQuest.findFirst({
      where: { playerId, questId: { in: chain.steps.map((_, i) => chainStepQuestId(chain.id, i)) } },
    });
    if (anyStep) continue;

    const step = chain.steps[0];
    await client.playerQuest.create({
      data: {
        playerId,
        questId: chainStepQuestId(chain.id, 0),
        type: step.type,
        title: chainStepTitle(chain, 0, chain.steps.length),
        description: chainStepDescription(step),
        target: step.target,
        reward: JSON.stringify(step.reward),
      },
    });
  }
}

/** Если claimedQuestId — шаг цепочки и в цепочке есть следующий шаг, выдаёт его. Вызывается
 * после успешной выдачи награды за квест в /api/quests/claim. */
export async function advanceChainOnClaim(client: QuestClient, playerId: string, claimedQuestId: string): Promise<void> {
  const parsed = parseChainStepQuestId(claimedQuestId);
  if (!parsed) return;
  const chain = QUEST_CHAINS.find(c => c.id === parsed.chainId);
  if (!chain) return;
  const nextIndex = parsed.stepIndex + 1;
  if (nextIndex >= chain.steps.length) return;

  const step = chain.steps[nextIndex];
  await client.playerQuest.create({
    data: {
      playerId,
      questId: chainStepQuestId(chain.id, nextIndex),
      type: step.type,
      title: chainStepTitle(chain, nextIndex, chain.steps.length),
      description: chainStepDescription(step),
      target: step.target,
      reward: JSON.stringify(step.reward),
    },
  });
}

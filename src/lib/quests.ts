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

const DAILY_QUEST_IDS = [
  'daily_collect',
  'daily_pool_kill_small', 'daily_pool_kill_big', 'daily_pool_explore_small', 'daily_pool_explore_big',
  'daily_pool_craft_small', 'daily_pool_craft_big', 'daily_pool_dungeon', 'daily_pool_pvp', 'daily_pool_temper',
];

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

// Пул ежедневных заданий — раньше это были 4 ЖЁСТКО ФИКСИРОВАННЫХ квеста каждый день (только
// числа масштабировались по уровню), из-за чего игра ощущалась предсказуемой. Теперь каждый
// день выдаётся собранная-в-момент-выдачи (collect) + 3 СЛУЧАЙНЫЕ из этого пула — набор реально
// разный изо дня в день. Три новых типа (dungeon/pvp_win/temper) завязаны на системы, добавленные
// позже в эту сессию — incrementQuestProgress для них вызывается в combat/action.ts (завершение
// данжа), pvp/challenge/route.ts (победа на арене) и craft/temper/route.ts (успешная закалка).
interface DailyPoolTemplate {
  questId: string;
  type: string;
  title: string;
  description: string;
  target: number;
  reward: (level: number) => { xp: number; gold: number; items?: string[] };
}

const DAILY_POOL: DailyPoolTemplate[] = [
  { questId: 'daily_pool_kill_small', type: 'kill', title: 'Охота', description: 'Победите 3 врагов в бою.', target: 3, reward: level => ({ xp: 30 * level, gold: 15 * level }) },
  { questId: 'daily_pool_kill_big', type: 'kill', title: 'Большая охота', description: 'Победите 8 врагов в бою.', target: 8, reward: level => ({ xp: 70 * level, gold: 35 * level }) },
  { questId: 'daily_pool_explore_small', type: 'explore', title: 'Исследователь', description: 'Исследуйте локацию 5 раз.', target: 5, reward: level => ({ xp: 20 * level, gold: 10 * level }) },
  { questId: 'daily_pool_explore_big', type: 'explore', title: 'Картограф', description: 'Исследуйте локацию 12 раз.', target: 12, reward: level => ({ xp: 45 * level, gold: 22 * level }) },
  { questId: 'daily_pool_craft_small', type: 'craft', title: 'Подмастерье', description: 'Скрафтите 1 предмет.', target: 1, reward: level => ({ xp: 25 * level, gold: 12 * level, items: ['health_potion'] }) },
  { questId: 'daily_pool_craft_big', type: 'craft', title: 'Ремесленник', description: 'Скрафтите 3 предмета.', target: 3, reward: level => ({ xp: 55 * level, gold: 28 * level }) },
  { questId: 'daily_pool_dungeon', type: 'dungeon', title: 'Зачистка', description: 'Пройдите данж целиком 1 раз.', target: 1, reward: level => ({ xp: 60 * level, gold: 30 * level }) },
  { questId: 'daily_pool_pvp', type: 'pvp_win', title: 'Дуэлянт', description: 'Победите на арене 1 раз.', target: 1, reward: level => ({ xp: 50 * level, gold: 25 * level }) },
  { questId: 'daily_pool_temper', type: 'temper', title: 'Кузнец удачи', description: 'Успешно закалите предмет 1 раз.', target: 1, reward: level => ({ xp: 40 * level, gold: 20 * level }) },
];

const DAILY_POOL_PICK_COUNT = 3;

function pickRandomPoolQuests(): DailyPoolTemplate[] {
  const shuffled = [...DAILY_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, DAILY_POOL_PICK_COUNT);
}

function buildDailyQuests(level: number): DailyQuestSeed[] {
  const collectItemId = new Date().getUTCDate() % 2 === 0 ? 'ancient_map' : 'cursed_locket';
  const collect = COLLECT_TARGETS[collectItemId];

  const picked = pickRandomPoolQuests();
  const seeds: DailyQuestSeed[] = picked.map(t => ({
    questId: t.questId, type: t.type, title: t.title, description: t.description, target: t.target, reward: t.reward(level),
  }));
  seeds.push({
    questId: 'daily_collect', type: collectQuestType(collectItemId), title: collect.title, description: collect.description,
    target: 1, reward: { xp: collect.reward.xpMult * level, gold: collect.reward.goldMult * level },
  });
  return seeds;
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

// Общее число "видимых" шагов = линейные + 1 финальный (ветвящийся) — для счётчика "N/M" в
// заголовке, независимо от того, какая именно ветка (ash/blight) досталась игроку.
function totalVisibleSteps(chain: { steps: unknown[] }): number {
  return chain.steps.length + 1;
}

function chainStepTitle(chain: { nameRu: string; icon: string }, stepIndex: number, totalSteps: number, titleSuffix?: string): string {
  const suffix = titleSuffix ? ` — ${titleSuffix}` : '';
  return `${chain.icon} ${chain.nameRu} (${stepIndex + 1}/${totalSteps})${suffix}`;
}

const CHAIN_TYPE_VERB: Record<string, string> = { kill: 'Победите', explore: 'Исследуйте локацию', craft: 'Скрафтите' };
const CHAIN_TYPE_NOUN: Record<string, string> = { kill: 'врагов', explore: 'раз', craft: 'предметов' };

function chainStepDescription(step: { type: string; target: number; narrativeRu: string }): string {
  return `${step.narrativeRu} ${CHAIN_TYPE_VERB[step.type]} ${step.target} ${CHAIN_TYPE_NOUN[step.type]}.`;
}

/** Все questId, которые цепочка МОГЛА когда-либо выдать этому игроку — линейные шаги плюс обе
 * возможные ветки финала (реально досталась только одна, но на момент проверки "начинал ли
 * игрок эту цепочку" мы не знаем, какая). */
function allPossibleChainQuestIds(chain: { id: string; steps: unknown[] }): string[] {
  const linear = chain.steps.map((_, i) => chainStepQuestId(chain.id, i));
  const finaleIndex = chain.steps.length;
  return [...linear, chainStepQuestId(chain.id, finaleIndex, 'ash'), chainStepQuestId(chain.id, finaleIndex, 'blight')];
}

/** Выдаёт первый шаг каждой цепочки, которую игрок ещё не начинал (нет ни одной строки
 * PlayerQuest ни по одному её шагу — ни активной, ни уже полученной). Вызывается один раз
 * при создании персонажа; повторный вызов безопасен и ничего не задублирует. */
export async function issueChainQuests(client: QuestClient, playerId: string): Promise<void> {
  for (const chain of QUEST_CHAINS) {
    const anyStep = await client.playerQuest.findFirst({
      where: { playerId, questId: { in: allPossibleChainQuestIds(chain) } },
    });
    if (anyStep) continue;

    const step = chain.steps[0];
    await client.playerQuest.create({
      data: {
        playerId,
        questId: chainStepQuestId(chain.id, 0),
        type: step.type,
        title: chainStepTitle(chain, 0, totalVisibleSteps(chain)),
        description: chainStepDescription(step),
        target: step.target,
        reward: JSON.stringify(step.reward),
      },
    });
  }
}

/** Если claimedQuestId — шаг цепочки и в цепочке есть следующий шаг, выдаёт его. На последнем
 * линейном шаге выдаёт ФИНАЛ, ветвящийся по Пути игрока (path — 'ash'|'blight', см.
 * Player.class.path) — два игрока в одной цепочке получают структурно разный следующий квест,
 * не просто другие числа. Вызывается после успешной выдачи награды за квест в /api/quests/claim. */
export async function advanceChainOnClaim(client: QuestClient, playerId: string, claimedQuestId: string, path: string): Promise<void> {
  const parsed = parseChainStepQuestId(claimedQuestId);
  if (!parsed) return;
  const chain = QUEST_CHAINS.find(c => c.id === parsed.chainId);
  if (!chain) return;

  const branchKey: 'ash' | 'blight' = path === 'ash' ? 'ash' : 'blight';
  const nextIndex = parsed.stepIndex + 1;

  if (nextIndex < chain.steps.length) {
    // Ещё линейный шаг.
    const step = chain.steps[nextIndex];
    await client.playerQuest.create({
      data: {
        playerId,
        questId: chainStepQuestId(chain.id, nextIndex),
        type: step.type,
        title: chainStepTitle(chain, nextIndex, totalVisibleSteps(chain)),
        description: chainStepDescription(step),
        target: step.target,
        reward: JSON.stringify(step.reward),
      },
    });
  } else if (nextIndex === chain.steps.length && parsed.branch === null) {
    // Последний линейный шаг только что сдан — выдаём ветвящийся финал по Пути игрока.
    const step = chain.finaleBranch[branchKey];
    await client.playerQuest.create({
      data: {
        playerId,
        questId: chainStepQuestId(chain.id, nextIndex, branchKey),
        type: step.type,
        title: chainStepTitle(chain, nextIndex, totalVisibleSteps(chain), step.titleSuffix),
        description: chainStepDescription(step),
        target: step.target,
        reward: JSON.stringify(step.reward),
      },
    });
  }
  // parsed.branch !== null означает, что сдан сам финал — цепочка завершена, дальше выдавать нечего.
}

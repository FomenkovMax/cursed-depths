export interface Achievement {
  id: string;
  nameRu: string;
  descriptionRu: string;
  icon: string;
  /** Порог для отображения прогресса на фронте (не обязателен — только для числовых условий). */
  target?: number;
  getProgress?: (ctx: AchievementContext) => number;
  check: (ctx: AchievementContext) => boolean;
}

/** Снимок игрока, нужный ачивкам для проверки условий — считается один раз на
 * GET /api/achievements и передаётся в каждую check()/getProgress(). */
export interface AchievementContext {
  level: number;
  gold: number;
  totalKills: number;
  totalExplores: number;
  totalCrafts: number;
  questsCompleted: number;
  partyWins: number;
  inventoryCount: number;
  hasLegendaryOrBetter: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'level_5', nameRu: 'Начинающий искатель', descriptionRu: 'Достигните 5 уровня', icon: '🔰',
    target: 5, getProgress: ctx => ctx.level, check: ctx => ctx.level >= 5,
  },
  {
    id: 'level_10', nameRu: 'Опытный искатель', descriptionRu: 'Достигните 10 уровня', icon: '⭐',
    target: 10, getProgress: ctx => ctx.level, check: ctx => ctx.level >= 10,
  },
  {
    id: 'level_20', nameRu: 'Легенда глубин', descriptionRu: 'Достигните 20 уровня', icon: '🌟',
    target: 20, getProgress: ctx => ctx.level, check: ctx => ctx.level >= 20,
  },
  {
    id: 'kills_10', nameRu: 'Первая кровь', descriptionRu: 'Победите 10 врагов', icon: '🗡️',
    target: 10, getProgress: ctx => ctx.totalKills, check: ctx => ctx.totalKills >= 10,
  },
  {
    id: 'kills_50', nameRu: 'Охотник', descriptionRu: 'Победите 50 врагов', icon: '⚔️',
    target: 50, getProgress: ctx => ctx.totalKills, check: ctx => ctx.totalKills >= 50,
  },
  {
    id: 'kills_200', nameRu: 'Гроза подземелий', descriptionRu: 'Победите 200 врагов', icon: '💀',
    target: 200, getProgress: ctx => ctx.totalKills, check: ctx => ctx.totalKills >= 200,
  },
  {
    id: 'explores_50', nameRu: 'Следопыт', descriptionRu: 'Исследуйте локации 50 раз', icon: '🔍',
    target: 50, getProgress: ctx => ctx.totalExplores, check: ctx => ctx.totalExplores >= 50,
  },
  {
    id: 'explores_200', nameRu: 'Картограф', descriptionRu: 'Исследуйте локации 200 раз', icon: '🗺️',
    target: 200, getProgress: ctx => ctx.totalExplores, check: ctx => ctx.totalExplores >= 200,
  },
  {
    id: 'gold_1000', nameRu: 'Зажиточный', descriptionRu: 'Накопите 1000 золота', icon: '💰',
    target: 1000, getProgress: ctx => ctx.gold, check: ctx => ctx.gold >= 1000,
  },
  {
    id: 'gold_10000', nameRu: 'Богач Проклятых Глубин', descriptionRu: 'Накопите 10000 золота', icon: '👑',
    target: 10000, getProgress: ctx => ctx.gold, check: ctx => ctx.gold >= 10000,
  },
  {
    id: 'crafts_10', nameRu: 'Ремесленник', descriptionRu: 'Скрафтите 10 предметов', icon: '⚒️',
    target: 10, getProgress: ctx => ctx.totalCrafts, check: ctx => ctx.totalCrafts >= 10,
  },
  {
    id: 'quests_20', nameRu: 'Добросовестный', descriptionRu: 'Выполните 20 заданий', icon: '📜',
    target: 20, getProgress: ctx => ctx.questsCompleted, check: ctx => ctx.questsCompleted >= 20,
  },
  {
    id: 'party_win_1', nameRu: 'Плечом к плечу', descriptionRu: 'Победите босса в составе пати', icon: '🤝',
    check: ctx => ctx.partyWins >= 1,
  },
  {
    id: 'hoarder_30', nameRu: 'Хомяк', descriptionRu: 'Соберите 30 разных предметов в инвентаре', icon: '🎒',
    target: 30, getProgress: ctx => ctx.inventoryCount, check: ctx => ctx.inventoryCount >= 30,
  },
  {
    id: 'legendary_owner', nameRu: 'Коллекционер легенд', descriptionRu: 'Получите предмет легендарной редкости или выше', icon: '✨',
    check: ctx => ctx.hasLegendaryOrBetter,
  },
];

export function checkNewlyUnlocked(ctx: AchievementContext, alreadyUnlockedIds: Set<string>): Achievement[] {
  return ACHIEVEMENTS.filter(a => !alreadyUnlockedIds.has(a.id) && a.check(ctx));
}

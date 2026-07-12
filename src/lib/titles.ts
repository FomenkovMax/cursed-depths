/**
 * Титулы — премиум-эксклюзивная витринная механика: статический каталог, "разблокирован"
 * вычисляется лениво по уже существующей статистике игрока (уровень, киллы, PvP, Бездна,
 * трофеи, достижения, питомцы, гильдия, история покупок) — без отдельной таблицы владения и без
 * хуков в бой, никакого риска для боевых маршрутов. Никакого бонуса к статам — чистая витрина
 * (Player.activeTitleId), доступная только с активным премиумом целиком: без премиума нельзя ни
 * посмотреть каталог, ни экипировать титул, даже если требование давно выполнено.
 */

export interface TitleRequirementContext {
  level: number;
  totalKills: number;
  pvpWins: number;
  pvpRating: number;
  bestAbyssDepth: number;
  trophyCount: number;
  achievementCount: number;
  petCount: number;
  everPurchasedShards: boolean;
  isGuildLeader: boolean;
  premiumActive: boolean;
}

export interface Title {
  id: string;
  nameRu: string;
  icon: string;
  colorClass: string;
  descriptionRu: string;
  check: (ctx: TitleRequirementContext) => boolean;
}

export const TITLE_CATALOG: Title[] = [
  { id: 'ashen_wanderer', nameRu: 'Пепельный Странник', icon: '🚶', colorClass: 'text-muted-foreground',
    descriptionRu: 'Достигните 5 уровня.', check: ctx => ctx.level >= 5 },
  { id: 'deep_veteran', nameRu: 'Ветеран Глубин', icon: '⚔️', colorClass: 'text-foreground',
    descriptionRu: 'Достигните 15 уровня.', check: ctx => ctx.level >= 15 },
  { id: 'ashen_legend', nameRu: 'Легенда Пепельного Края', icon: '👑', colorClass: 'text-gold',
    descriptionRu: 'Достигните 25 уровня.', check: ctx => ctx.level >= 25 },
  { id: 'slayer', nameRu: 'Истребитель', icon: '💀', colorClass: 'text-foreground',
    descriptionRu: 'Победите 100 врагов.', check: ctx => ctx.totalKills >= 100 },
  { id: 'blood_harvest', nameRu: 'Кровавая Жатва', icon: '🩸', colorClass: 'text-destructive',
    descriptionRu: 'Победите 500 врагов.', check: ctx => ctx.totalKills >= 500 },
  { id: 'arena_champion', nameRu: 'Чемпион Арены', icon: '🏅', colorClass: 'text-uncommon',
    descriptionRu: 'Одержите 20 побед на Арене.', check: ctx => ctx.pvpWins >= 20 },
  { id: 'arena_elite', nameRu: 'Элита Арены', icon: '⚡', colorClass: 'text-epic',
    descriptionRu: 'Наберите 1400 рейтинга Арены.', check: ctx => ctx.pvpRating >= 1400 },
  { id: 'abyss_conqueror', nameRu: 'Покоритель Бездны', icon: '🕳️', colorClass: 'text-rare',
    descriptionRu: 'Достигните 10 глубины Бездонного Разлома.', check: ctx => ctx.bestAbyssDepth >= 10 },
  { id: 'abyss_lord', nameRu: 'Владыка Бездны', icon: '🌌', colorClass: 'text-legendary',
    descriptionRu: 'Достигните 25 глубины Бездонного Разлома.', check: ctx => ctx.bestAbyssDepth >= 25 },
  { id: 'trophy_hunter', nameRu: 'Охотник за Трофеями', icon: '🎖️', colorClass: 'text-uncommon',
    descriptionRu: 'Соберите 6 боссов в Комнате трофеев.', check: ctx => ctx.trophyCount >= 6 },
  { id: 'trophy_legend', nameRu: 'Легендарный Коллекционер', icon: '🏆', colorClass: 'text-gold',
    descriptionRu: 'Соберите всех 12 боссов в Комнате трофеев.', check: ctx => ctx.trophyCount >= 12 },
  { id: 'achievement_collector', nameRu: 'Собиратель Достижений', icon: '📜', colorClass: 'text-rare',
    descriptionRu: 'Откройте 8 достижений.', check: ctx => ctx.achievementCount >= 8 },
  { id: 'pet_master', nameRu: 'Повелитель Питомцев', icon: '🐾', colorClass: 'text-epic',
    descriptionRu: 'Соберите 8 питомцев-компаньонов.', check: ctx => ctx.petCount >= 8 },
  { id: 'patron', nameRu: 'Покровитель', icon: '💎', colorClass: 'text-gold',
    descriptionRu: 'Купите хотя бы один набор Осколков Короны.', check: ctx => ctx.everPurchasedShards },
  { id: 'clan_chief', nameRu: 'Вождь Клана', icon: '🏰', colorClass: 'text-foreground',
    descriptionRu: 'Станьте лидером гильдии.', check: ctx => ctx.isGuildLeader },
  { id: 'voice_of_karsus', nameRu: 'Голос Карсуса', icon: '🗣️', colorClass: 'text-destructive',
    descriptionRu: 'Просто имейте активный премиум-статус.', check: ctx => ctx.premiumActive },
];

export function findTitle(id: string | null | undefined): Title | null {
  if (!id) return null;
  return TITLE_CATALOG.find(t => t.id === id) ?? null;
}

export function isTitleUnlocked(titleId: string, ctx: TitleRequirementContext): boolean {
  const title = findTitle(titleId);
  return !!title && title.check(ctx);
}

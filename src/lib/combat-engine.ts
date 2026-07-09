/**
 * Боевой движок под новую систему (docs/cursed_depths_master.pdf, Фаза 1).
 *
 * Способности в БД хранятся как флейвор-текст с процентами эффекта
 * ("Атака: наносит 40% доп. урона"), а не как структурированные игровые
 * данные — сами проценты и характер эффекта (урон/лечение/щит/дебафф)
 * извлекаются здесь эвристикой по ключевым словам и первому числу с "%".
 * Это осознанное упрощение первой версии движка: resolveAbility() ниже
 * предполагает, что КАЖДАЯ активная способность — это "сделай X прямо
 * сейчас, по клику игрока". Пассивные способности разрешаются отдельным
 * эвристическим движком той же природы — см. lib/passive-engine.ts.
 * Способности с условным/отложенным триггером ("1 раз за бой при
 * смертельном ударе выживает...", "снижает урон СЛЕДУЮЩЕГО удара врага")
 * не соответствуют этому предположению и разрешаются ДО того, как
 * combat/action/route.ts вообще вызовет resolveAbility() — см.
 * lib/conditional-ability-engine.ts.
 *
 * Баффы/дебаффы/щиты теперь настоящие многоходовые эффекты (см.
 * lib/combat-effects.ts), а не одноходовые заменители урона — эта функция
 * лишь извлекает их магнитуду/длительность из текста, применяет их
 * combat/action/route.ts.
 */

export type EffectKind = 'damage' | 'heal' | 'shield' | 'debuff' | 'buff' | 'armor' | 'speed' | 'dot' | 'summon' | 'utility';

export interface PlayerCombatStats {
  strength: number;
  dexterity: number;
  vitality: number;
  intellect: number;
  willpower: number;
  instinct: number;
  level: number;
  primaryStat: string; // 'Сила' | 'Ловкость' | 'Стойкость' | 'Разум' | 'Воля' | 'Инстинкт'
}

const STAT_RU_TO_FIELD: Record<string, keyof PlayerCombatStats> = {
  'Сила': 'strength',
  'Ловкость': 'dexterity',
  'Стойкость': 'vitality',
  'Разум': 'intellect',
  'Воля': 'willpower',
  'Инстинкт': 'instinct',
};

/** Уровень, на котором открывается стадия эволюции класса (Фаза 1.1). */
export function stageUnlockLevel(stage: number): number {
  if (stage <= 1) return 3;
  if (stage === 2) return 5;
  return 7;
}

/** Базовое значение приоритетной характеристики класса игрока. */
export function primaryStatValue(stats: PlayerCombatStats): number {
  const field = STAT_RU_TO_FIELD[stats.primaryStat] ?? 'strength';
  return stats[field] as number;
}

/** Урон базовой атаки (0 маны, всегда доступна). */
export function basicAttackDamage(attacker: PlayerCombatStats): number {
  return Math.round(primaryStatValue(attacker) * 2 + attacker.level * 3);
}

/** Смягчение урона защитой (диминишинг-формула — чем больше Стойкость, тем меньше прирост). */
export function mitigateDamage(rawDamage: number, defenderVitality: number): number {
  const reduction = defenderVitality / (defenderVitality + 100);
  return Math.max(1, Math.round(rawDamage * (1 - reduction)));
}

/** Стоимость маны за использование способности по стадии эволюции (Фаза 1.3). */
export function manaCostForStage(stage: number): number {
  if (stage <= 1) return 20;
  if (stage === 2) return 35;
  return 50;
}

const PERCENT_RE = /(\d+)%/;

/** Извлекает первое число с "%" из описания способности — величина эффекта. */
export function extractEffectPercent(description: string): number {
  const match = description.match(PERCENT_RE);
  return match ? parseInt(match[1], 10) / 100 : 0.3;
}

/**
 * Ability.bossNote — авторский баланс-текст ("Боссы: 15% вместо 25%.", "Боссы: 15%
 * на боссах.") на 35 способностях, который до этой функции нигде не читался: против
 * боссов все дебаффы/баффы били с полной PvE-силой, хотя дизайн explicitly требовал
 * ослабленную версию. Формат везде единообразен — новое значение указано ПЕРВЫМ
 * числом с "%" в самой заметке, поэтому та же простая эвристика, что и
 * extractEffectPercent(), здесь безопасна (в отличие от описаний способностей, где
 * первый процент не всегда релевантен).
 */
export function extractBossOverridePercent(bossNote: string | null | undefined): number | null {
  if (!bossNote) return null;
  const match = bossNote.match(PERCENT_RE);
  return match ? parseInt(match[1], 10) / 100 : null;
}

/**
 * "Блокирует (один/N) случайный(ых) скилл(а) врага на N ход(а/ов)" — три способности
 * (mute-bond, hand-of-morvena, total-fading) с идентичной по смыслу формулировкой.
 * Возвращает null, если способность вообще не про блокировку скиллов (большинство).
 * Счётчик по умолчанию 1, если явного числа нет (напр. "один случайный скилл").
 */
function extractBlockSkillCountTurns(text: string): { count: number; turns: number } | null {
  const match = text.match(/блокир[а-яё]*\s*(\d+|один|одна|одного)?\s*(?:случайн[а-яё]*\s*)?скилл[а-яё]*[^.]*?на\s*(\d+)\s*ход/i);
  if (!match) return null;
  const countRaw = match[1];
  const count = !countRaw || /один|одна|одного/i.test(countRaw) ? 1 : parseInt(countRaw, 10);
  const turns = parseInt(match[2], 10);
  return { count, turns };
}

/**
 * "Заглушает врага на N ход(а/ов)" — единственная способность с такой формулировкой
 * (silencing-strike). Отдельно от extractBlockSkillCountTurns() — там речь про N СЛУЧАЙНЫХ
 * скиллов, здесь про полное молчание (все доступные скиллы разом), см. использование ниже
 * (ALL_MECHANICS_SENTINEL).
 */
function extractSilenceTurns(text: string): number | null {
  const match = text.match(/заглуша[а-яё]*\s*врага\s*на\s*(\d+)\s*ход/i);
  return match ? parseInt(match[1], 10) : null;
}

/** У BlockableMechanic всего 4 варианта (см. lib/boss-mechanics.ts) — любое количество не
 * меньше этого гарантированно блокирует ВСЕ доступные у врага периодические механики разом. */
const ALL_MECHANICS_SENTINEL = 99;

/**
 * "Воскрешает [одного] [павшего] союзника" — единственная способность с таким текстом
 * (return-to-roots). Структурно требует павшего СОЮЗНИКА, которого в строго одиночном
 * 1v1-бою этого движка никогда не бывает (если падает сам игрок — бой уже проигран). Без
 * этой проверки kind классифицировался бы как 'utility' и проваливался в generic default
 * ветку switch, которая трактует "нераспознанный эффект" как обычную атаку — способность
 * поддержки/воскрешения молча превращалась в полноценный урон по врагу.
 */
function requiresFallenAlly(description: string): boolean {
  return /воскреша[а-яё]*[^.]*?союзник/i.test(description);
}

/**
 * "+N% к урону" где-то в тексте СВЕРХ основного эффекта другого kind (напр. great-prayer:
 * "восстанавливают 25% ХП И получают +30% к урону" — heal ЗАБИРАЕТ kind первым по
 * приоритету классификатора, буст урона иначе терялся бы целиком; flame-of-rebirth: "но все
 * атаки наносят +50% огненного урона" — тоже перехватывается heal-веткой по слову "реген" в
 * соседнем предложении про союзников). `\s*` перед "урон" — иначе прилагательное между %
 * и словом ("огненного урона") ломает совпадение. НЕ применяется, если kind уже 'buff' (там
 * тот же бонус уже посчитан основной buff-веткой) — иначе просто дублирует то же число.
 */
function extractSecondaryDamageBuff(description: string): number | null {
  const match = description.match(/\+(\d+)%\s*(к\s*)?[а-яё]*\s*урон/i);
  return match ? parseInt(match[1], 10) / 100 : null;
}

/**
 * "как исцеление(себе)" / "исцеление себя на N% от урона" — лайфстил-побочка атаки/дебаффа,
 * не самостоятельный хил. "исцеление снижается/блокируется" — дебафф на ЧУЖОЕ исцеление,
 * тоже не свой хил. Без этого guard'а heal-проверка ниже (единственная СТРОГО ПЕРВАЯ
 * проверка) перехватывала такие способности раньше debuff/damage — напр. frost-bite
 * ("Атака, снижающая скорость врага... и крадущая 5% ХП как исцеление себе") превращалась
 * ЦЕЛИКОМ в чистый heal без единого урона врагу; the-plague (яд + "исцеление снижается
 * на 50%") — в heal вместо яда.
 *
 * Та же ловушка есть и для "регенерации"/"лечения" ВРАГА — отдельный корень слова
 * ("регенерац.../реген", "лечени...") не покрывался словом "исцел" выше вообще, хотя смысл
 * тот же: способность УБИРАЕТ/БЛОКИРУЕТ/КРАДЁТ что-то у ВРАГА, а не лечит игрока. Без этого
 * dead-vein ("Блокирует пассивную регенерацию врага") и ailet-silence ("враг не может
 * получать исцеление") превращались в самолечение на ровном месте; thread-severance
 * ("Снимает... эффекты лечения и регена, наносит урон...") и cold-fingers ("Наносит урон и
 * крадёт реген здоровья врага...") — что хуже — теряли СВОЙ РЕАЛЬНЫЙ УРОН по врагу целиком
 * (оба текста прямо говорят "наносит урон", но heal-ветка перехватывала их первой).
 */
function isLifestealOrEnemyHealDebuff(description: string): boolean {
  return /как исцел/i.test(description)
    || /исцелени[ея]\s+(себя\s+)?на\s*\d+\s*%\s*от\s*урона/i.test(description)
    || /исцелени[ея]\s+(снижа|блокир|запрещ)/i.test(description)
    || /(снима|блокир|краде[тш]|крадё[тш]|не может получать)[а-яё]*[^.]*?(регенерац[а-яё]*|реген\b|лечени[ея]|исцелени[ея])/i.test(description)
    || /(регенерац[а-яё]*|реген)\s*(здоровья\s*)?врага/i.test(description);
}

/** Грубая классификация эффекта способности по ключевым словам описания. */
export function classifyEffect(description: string): EffectKind {
  if (/восстанавлив|исцел|реген/i.test(description) && !isLifestealOrEnemyHealDebuff(description)) return 'heal';
  // Негативный lookbehind на "за" — иначе "снижает ЗАЩИТу врага" ложно матчился бы
  // по "щит" внутри "защиту" и способность превращалась в щит ИГРОКУ вместо
  // дебаффа на врага (напр. battle-roar). Второй lookbehind "нет " — slant-strike:
  // "...если у врага НЕТ ЩИТА — +50% урона..." описывает УСЛОВИЕ (у противника нет щита),
  // а не создание щита себе — без исключения "Мощная атака" целиком превращалась в щит
  // ИГРОКУ ценой 0 урона по врагу (у врагов в этом движке вообще нет щита как ресурса вне
  // boss-mechanics.ts shieldMax, так что условие тут декоративно, но это не повод отбирать
  // урон у атаки).
  if (/(?<!за)(?<!нет )щит|поглощ/i.test(description)) return 'shield';
  // "Яд N% ХП/ход на M ходов" — периодический урон врагу (lib/combat-effects.ts enemy_dot,
  // уже реально тикает в combat/action/route.ts, до этой ветки использовался только для
  // контр-ожога от пассивок). Должна идти РАНЬШЕ общего debuff — иначе "яд" ловится общей
  // веткой ниже и трактуется как снижение урона ВРАГА, а не периодический урон ЕМУ.
  // "ВЫБИРАЕТ" исключён отдельно — способности с выбором одного из нескольких вариантов
  // стойки (напр. moon-cycle: "Тень (+20% уклонение) / Кровь (+25% крит) / Яд (6% ХП/ход)")
  // движок не умеет разрешать вообще (нет способа передать выбор игрока при касте) — без
  // этого исключения extractEffectPercent() брал бы ПЕРВЫЙ процент во всей строке (20%,
  // от совсем другого варианта стойки), а не корректные 6% для варианта "Яд".
  if (/яд[а-яё]*[^.]*?\d+\s*%\s*(хп|здоровья)/i.test(description) && !/выбирает/i.test(description)) return 'dot';
  // "Призывает N скелетов"/"Поднимает ... как скелета-союзника" — саммон, а не разовая
  // атака. Должна идти РАНЬШЕ damage-ветки ниже — иначе "50% ХП и урона оригинала"
  // содержит голое "урон" и способность превращалась бы в обычный удар по врагу.
  if (/(призыва[а-яё]*|поднимает)[^.]*скелет/i.test(description)) return 'summon';
  // "\bяд\b" ниже НЕ работал для кириллицы — JS \b строится на \w, который не распознаёт
  // кириллические буквы, так что граница слова вокруг "яд" никогда не находилась (тот же
  // класс бага, что \w в passive-engine.ts в начале сессии). Заменено на явный guard без
  // границ слова: "яд" не как часть другого слова (напр. "ядерный" — таких в игре нет, но
  // на всякий случай исключаем непосредственно смежные кириллические буквы).
  if (/снижа|блокир|замедл|обездвиж|(?<![а-яё])яд(?![а-яё])|дебафф|молчани|заглуш|характеристик/i.test(description)) return 'debuff';
  // "+N% к скорости" на несколько ходов без урона рядом — единственная способность, где
  // "скорость" не сопровождает уже работающий урон/броню/дебафф (см. lib/combat-effects.ts
  // player_dodge_buff) — трактуем как бафф уклонения, а не как generic buff-паттерн ниже
  // (иначе "+20% к скорости" ложно читалось бы как +20% к УРОНУ игрока, напр. the-onslaught).
  if (/\+\d+%\s*(к\s*)?скорост/i.test(description) && !/урон/i.test(description)) return 'speed';
  // "+N% к урону"/"усиливает урон" с длительностью ("на N ход") — бафф урона на
  // несколько ходов, а не разовая атака. Без этой проверки жадный /урон/i ниже
  // ловил бы такие способности (напр. "+25% к урону на 2 хода") как обычный урон.
  if (/\+\d+%\s*(к\s*)?урон|усилив.*урон/i.test(description) && /на\s*\d+\s*ход/i.test(description) && !/следующ|каждые|цел[ьи]/i.test(description)) return 'buff';
  if (/урон/i.test(description)) return 'damage';
  // Собственная броня ("+X% брони", "усиливает свою броню") на несколько ходов —
  // защитная стойка: снижает входящий урон, а не увеличивает исходящий (в отличие
  // от generic buff-паттерна ниже). "Игнорирует X% брони цели" — дебафф на броню
  // ВРАГА, отдельный случай (разрешается как armed-эффект в conditional-ability-engine.ts).
  if (/брон/i.test(description) && !/игнориру/i.test(description)) return 'armor';
  if (/\+\d+%|усилив|бафф/i.test(description)) return 'buff';
  return 'utility';
}

/** Стандартная длительность баффов/дебаффов/щитов от активных способностей. */
export const EFFECT_DURATION_TURNS = 3;

export interface AbilityResolution {
  kind: EffectKind;
  /** Урон, нанесённый цели (после смягчения защитой), если kind === 'damage'. */
  damage: number;
  /** Восстановленное здоровье атакующему, если kind === 'heal'. */
  heal: number;
  /** Щит — сколько будущего входящего урона поглощается (в очках ХП), если kind === 'shield'. */
  shield: number;
  /** Насколько ослаблен урон врага (доля 0-1) на debuffTurns ходов, если kind === 'debuff'. */
  enemyDamageReduction: number;
  /** Насколько усилен урон игрока (доля 0-1) на buffTurns ходов, если kind === 'buff'. */
  playerDamageBonus: number;
  /** Насколько усилен шанс уклонения игрока (доля 0-1) на effectTurns ходов, если kind === 'speed'. */
  dodgeBonus: number;
  /** Периодический урон врагу (доля 0-1 от макс. ХП врага за ход) на effectTurns ходов, если kind === 'dot'. */
  enemyDotPercent: number;
  /** Суммарный урон врагу за ход ото ВСЕХ призванных существ вместе (уже умножено на их
   * количество), фиксированное число ХП, если kind === 'summon' — см. resolveAbility(). */
  summonDamage: number;
  /** Сколько ходов действует бафф/дебафф (0, если способность не создаёт длящийся эффект). */
  effectTurns: number;
  /** Сколько случайных "скиллов" врага (периодических механик босса — см. lib/boss-mechanics.ts)
   * блокируется этим кастом. 0, если способность не про блокировку скиллов. Извлекается
   * НЕЗАВИСИМО от kind — блокировка может быть побочным эффектом способности другого typa
   * (напр. total-fading — debuff со своим уроном И блокировкой 2 скиллов). */
  blockSkillCount: number;
  /** Сколько ходов действует блокировка скиллов (см. blockSkillCount). */
  blockSkillTurns: number;
  /** true, если способность структурно требует другого игрока-союзника (напр. "воскрешает
   * павшего союзника"), которого в текущем движке (строго одиночный 1v1) никогда не бывает —
   * все посчитанные выше поля обнулены, это честный no-op, а не "спрятанная атака". */
  noAllyToTarget: boolean;
}

/**
 * Разрешает эффект активной способности относительно базовой атаки атакующего.
 * Урон/лечение считаются как (процент из описания) от урона базовой атаки —
 * простая, но единообразная точка отсчёта для всех ~140 активных способностей.
 * Щит/бафф/дебафф больше не превращаются в разовый урон — это настоящие
 * многоходовые эффекты (EFFECT_DURATION_TURNS ходов), которые combat/action/route.ts
 * добавляет в персистентный список активных эффектов боя (lib/combat-effects.ts).
 */
export function resolveAbility(
  description: string,
  attacker: PlayerCombatStats,
  defenderVitality: number,
  bossContext?: { isBoss: boolean; bossNote?: string | null }
): AbilityResolution {
  const percent = extractEffectPercent(description);
  const kind = classifyEffect(description);
  const base = basicAttackDamage(attacker);
  // См. extractBossOverridePercent() — применяется к debuff/armor/dot, т.к. в этих кейсах
  // bossNote просто масштабирует то же самое число. 'summon' намеренно исключён — там
  // bossNote подменяет эффект целиком, а не масштабирует (см. case 'summon' ниже).
  // Блокировка скиллов врага — см. extractBlockSkillCountTurns() и блок после switch ниже.
  const bossOverride = bossContext?.isBoss ? extractBossOverridePercent(bossContext.bossNote) : null;
  const effectivePercent = bossOverride ?? percent;

  const result: AbilityResolution = {
    kind, damage: 0, heal: 0, shield: 0, enemyDamageReduction: 0, playerDamageBonus: 0, dodgeBonus: 0, enemyDotPercent: 0, summonDamage: 0, effectTurns: 0,
    blockSkillCount: 0, blockSkillTurns: 0, noAllyToTarget: false,
  };

  switch (kind) {
    case 'damage': {
      // extractEffectPercent() берёт ПЕРВЫЙ процент в тексте — для slant-strike ("Мощная
      // атака: игнорирует 25% брони, либо ... — +50% урона...") это 25% (величина игнора
      // брони, не связанная с этой веткой урона вообще), а не заявленные +50%. Тот же
      // приоритет явного "+N% урона", что уже используется в case 'buff' выше и в
      // extractSecondaryDamageBuff — если он есть, это и есть настоящая сила атаки.
      const explicitBonus = extractSecondaryDamageBuff(description);
      const damagePercent = explicitBonus ?? percent;
      result.damage = mitigateDamage(Math.round(base * (1 + damagePercent)), defenderVitality);
      break;
    }
    case 'heal':
      result.heal = Math.round(base * percent) + Math.round(attacker.willpower);
      break;
    case 'shield':
      result.shield = Math.round(base * (0.5 + percent));
      break;
    case 'debuff':
      result.enemyDamageReduction = Math.min(0.75, effectivePercent);
      result.effectTurns = EFFECT_DURATION_TURNS;
      // дебафф почти всегда сопровождается небольшим прямым уроном от самой атаки
      result.damage = mitigateDamage(Math.round(base * 0.5), defenderVitality);
      break;
    case 'buff': {
      // extractEffectPercent() берёт ПЕРВЫЙ процент в тексте — для "Поджигает себя
      // на 2 хода (3% ХП/ход), но атаки наносят +50% урона." это 3% (урон самоподжога),
      // а не заявленные +50% бонуса. Если рядом с "урон" есть число с явным "+",
      // предпочитаем его — это и есть величина самого баффа урона.
      const buffMatch = description.match(/\+(\d+)%\s*(к\s*)?[а-яё]*урон/i);
      const buffPercent = buffMatch ? parseInt(buffMatch[1], 10) / 100 : percent;
      result.playerDamageBonus = Math.min(0.75, buffPercent);
      result.effectTurns = EFFECT_DURATION_TURNS;
      break;
    }
    case 'armor':
      // Защитная стойка: снижает входящий урон врага, как дебафф, но без
      // сопутствующего "разового" урона от атаки — это не атака, а стойка.
      result.enemyDamageReduction = Math.min(0.75, effectivePercent);
      result.effectTurns = EFFECT_DURATION_TURNS;
      break;
    case 'speed':
      // "скорость" не имеет буквального смысла в строго чередующемся 1v1-бою (нет
      // очередности хода, которую можно было бы менять) — трактуем как шанс уклониться
      // от следующих ударов врага (см. lib/combat-effects.ts player_dodge_buff).
      result.dodgeBonus = Math.min(0.5, effectivePercent);
      result.effectTurns = EFFECT_DURATION_TURNS;
      break;
    case 'dot':
      // Яд — периодический урон врагу, а не разовый удар (см. lib/combat-effects.ts
      // enemy_dot, тикает в combat/action/route.ts). Без сопутствующего "разового" урона —
      // это наложение эффекта, не атака.
      result.enemyDotPercent = Math.min(0.5, effectivePercent);
      result.effectTurns = EFFECT_DURATION_TURNS;
      break;
    case 'summon': {
      // Скелеты-союзники — упрощённая модель: не отдельная сущность со своим ХП/атакой
      // (усложнило бы движок, строго заточенный на 1v1), а фиксированный ежеходный урон
      // врагу, пока существо "живо" (тот же generic activeEffects-механизм, что и enemy_dot,
      // но фиксированная величина, не доля от макс. ХП врага). "N% ХП и урона ОРИГИНАЛА"
      // (текст подразумевает статы поднятого/призванного существа) на практике трактуем как
      // % от БАЗОВОЙ АТАКИ ИГРОКА — единообразно с тем, как весь остальной резолвер уже
      // трактует "процент" везде (a не вводим третий источник статов, которого сам резолвер
      // не имеет — сюда передаются только PlayerCombatStats, не enemyTemplate).
      //
      // Длительность своя для каждой способности (1/2/3 хода — НЕ общая EFFECT_DURATION_TURNS).
      const durationMatch = description.match(/(?:на|существу[а-яё]*)\s*(\d+)\s*ход/i);
      const turns = durationMatch ? parseInt(durationMatch[1], 10) : EFFECT_DURATION_TURNS;

      // swarm-of-the-dead: "40% ХП и урона; ЕСЛИ НЕТ павших врагов — из пустоты с 30%" —
      // движок строго 1v1, "павших врагов" в момент каста никогда не бывает, так что
      // ВСЕГДА срабатывает fallback-ветка — предпочитаем её процент, если он есть.
      // Намеренно НЕ effectivePercent/bossOverride: у rise-of-the-dead/legion-of-ash
      // bossNote не масштабирует число, а подменяет саммон ДРУГИМ эффектом целиком
      // ("Не работает, вместо этого — яд...") — extractBossOverridePercent тут взял бы
      // число из совершенно другого эффекта и дал бы саммону ложную силу. Такая полная
      // замена типа эффекта — отдельная, более крупная задача; саммон просто работает
      // одинаково и против боссов, bossNote для этих двух способностей игнорируется.
      const fallbackMatch = description.match(/если нет[^%]*?(\d+)\s*%/i);
      const summonPercent = fallbackMatch ? parseInt(fallbackMatch[1], 10) / 100 : percent;

      const countMatch = description.match(/(\d+)\s*скелет/i);
      const count = countMatch ? parseInt(countMatch[1], 10) : 1;

      result.summonDamage = Math.round(base * Math.min(0.75, summonPercent)) * count;
      result.effectTurns = turns;
      break;
    }
    default:
      result.damage = mitigateDamage(base, defenderVitality);
  }

  // "Воскрешает павшего союзника" — структурный no-op в одиночном бою (см.
  // requiresFallenAlly). Обнуляем ВСЁ, что успел насчитать switch выше (для return-to-roots
  // это damage=32 от default-ветки, т.к. её kind — 'utility') — честный "нечего делать",
  // а не спрятанная атака.
  if (requiresFallenAlly(description)) {
    result.damage = 0;
    result.heal = 0;
    result.shield = 0;
    result.enemyDamageReduction = 0;
    result.playerDamageBonus = 0;
    result.dodgeBonus = 0;
    result.enemyDotPercent = 0;
    result.summonDamage = 0;
    result.effectTurns = 0;
    result.noAllyToTarget = true;
  }

  // Вторичный бафф урона поверх heal-эффекта (great-prayer, flame-of-rebirth — см.
  // extractSecondaryDamageBuff). Специально сужено до kind === 'heal' (а не "любой kind
  // кроме buff") — иначе ловит ложные срабатывания на способностях со СВОЕЙ, другой
  // семантикой "+N% урона": условные одноразовые бонусы ("следующий удар +50%", "если
  // убивает — ..."), периодические триггеры ("каждые 2 удара") и т.п. — те же слова-
  // исключения, что и в основной buff-ветке классификатора выше, здесь тоже обязательны.
  if (kind === 'heal' && result.playerDamageBonus === 0 && !/следующ|каждые|цел[ьи]/i.test(description)) {
    const secondaryBuff = extractSecondaryDamageBuff(description);
    if (secondaryBuff !== null) {
      result.playerDamageBonus = Math.min(0.75, secondaryBuff);
      result.effectTurns = EFFECT_DURATION_TURNS;
    }
  }

  // Блокировка скиллов врага — независимо от kind (может быть побочкой другого эффекта,
  // напр. total-fading — debuff со своим уроном И блокировкой 2 скиллов одновременно).
  // У обычных (не-boss) врагов нет "скиллов" вообще, только базовая атака — combat/action/route.ts
  // применяет это только к периодическим механикам босса (см. lib/boss-mechanics.ts), для
  // рядового врага эффект будет декоративным (заблокировать нечего).
  const baseBlockSkill = extractBlockSkillCountTurns(description);
  if (baseBlockSkill) {
    let count = baseBlockSkill.count;
    let turns = baseBlockSkill.turns;
    if (bossContext?.isBoss && bossContext.bossNote) {
      // Полный оверрайд (напр. total-fading: "Снимает максимум 2 баффа, блокирует 1 скилл
      // на 1 ход.") — своё количество И своя длительность.
      const bossOverrideFull = extractBlockSkillCountTurns(bossContext.bossNote);
      if (bossOverrideFull) {
        count = bossOverrideFull.count;
        turns = bossOverrideFull.turns;
      } else {
        // Оверрайд только длительности (mute-bond/hand-of-morvena: "Боссы: На 1 ход." — без
        // явного упоминания скилла/количества, число скиллов остаётся как в PvE).
        const turnsOnlyMatch = bossContext.bossNote.match(/на\s*(\d+)\s*ход/i);
        if (turnsOnlyMatch) turns = parseInt(turnsOnlyMatch[1], 10);
      }
    }
    result.blockSkillCount = count;
    result.blockSkillTurns = turns;
  }

  // "Заглушает врага на N ход" (silencing-strike) — единственная способность с этим
  // паттерном. Без этой ветки текст ловится общей debuff-веткой ВЫШЕ по ключевому слову
  // "заглуш" и (за неимением явного % в тексте) получает МНИМЫЙ дебафф — extractEffectPercent
  // молча подставляет дефолтные 30% на стандартные EFFECT_DURATION_TURNS=3 хода, хотя текст
  // вообще не описывает снижение урона врага, а описывает статус-эффект молчания на 1 ход.
  // Здесь глушим этот побочный псевдо-дебафф и заменяем настоящим молчанием: блокировкой
  // ВСЕХ доступных периодических механик врага сразу (ALL_MECHANICS_SENTINEL) — переиспользуем
  // ту же инфраструктуру, что и mute-bond/hand-of-morvena/total-fading. "Атака, которая..." —
  // прямой урон debuff-ветки (result.damage) оставляем как есть, это не отменяется.
  const silenceTurns = extractSilenceTurns(description);
  if (silenceTurns !== null) {
    result.enemyDamageReduction = 0;
    if (bossContext?.isBoss && bossContext.bossNote) {
      // "Увеличивает стоимость скиллов на 30%" — механики стоимости скиллов у врагов в этом
      // движке не существует (mana/costs моделируются только для игрока), буквально
      // применить нечего — та же ситуация, что с summon-bossNote у rise-of-the-dead/
      // legion-of-ash. Вместо полного молчания на боссах (тривиализировало бы боссовые
      // механики) — тот же ослабленный паттерн, что у mute-bond/hand-of-morvena: блокируется
      // 1 случайный скилл, а не все разом.
      result.blockSkillCount = 1;
      const turnsOnlyMatch = bossContext.bossNote.match(/на\s*(\d+)\s*ход/i);
      result.blockSkillTurns = turnsOnlyMatch ? parseInt(turnsOnlyMatch[1], 10) : silenceTurns;
    } else {
      result.blockSkillCount = ALL_MECHANICS_SENTINEL;
      result.blockSkillTurns = silenceTurns;
    }
  }

  return result;
}

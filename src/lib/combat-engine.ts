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

export type EffectKind = 'damage' | 'heal' | 'shield' | 'debuff' | 'buff' | 'armor' | 'speed' | 'dot' | 'utility';

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
 * "как исцеление(себе)" / "исцеление себя на N% от урона" — лайфстил-побочка атаки/дебаффа,
 * не самостоятельный хил. "исцеление снижается/блокируется" — дебафф на ЧУЖОЕ исцеление,
 * тоже не свой хил. Без этого guard'а heal-проверка ниже (единственная СТРОГО ПЕРВАЯ
 * проверка) перехватывала такие способности раньше debuff/damage — напр. frost-bite
 * ("Атака, снижающая скорость врага... и крадущая 5% ХП как исцеление себе") превращалась
 * ЦЕЛИКОМ в чистый heal без единого урона врагу; the-plague (яд + "исцеление снижается
 * на 50%") — в heal вместо яда.
 */
function isLifestealOrEnemyHealDebuff(description: string): boolean {
  return /как исцел/i.test(description)
    || /исцелени[ея]\s+(себя\s+)?на\s*\d+\s*%\s*от\s*урона/i.test(description)
    || /исцелени[ея]\s+(снижа|блокир|запрещ)/i.test(description);
}

/** Грубая классификация эффекта способности по ключевым словам описания. */
export function classifyEffect(description: string): EffectKind {
  if (/восстанавлив|исцел|реген/i.test(description) && !isLifestealOrEnemyHealDebuff(description)) return 'heal';
  // Негативный lookbehind на "за" — иначе "снижает ЗАЩИТу врага" ложно матчился бы
  // по "щит" внутри "защиту" и способность превращалась в щит ИГРОКУ вместо
  // дебаффа на врага (напр. battle-roar).
  if (/(?<!за)щит|поглощ/i.test(description)) return 'shield';
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
  /** Сколько ходов действует бафф/дебафф (0, если способность не создаёт длящийся эффект). */
  effectTurns: number;
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
  // См. extractBossOverridePercent() — применяется к debuff/armor/dot, т.к. это кейсы
  // в 35 bossNote-способностях, где базовый эффект уже реально работает через этот
  // резолвер (остальные — саммоны/блок скиллов врага — не реализованы вообще, либо
  // разрешаются в conditional-ability-engine.ts).
  const bossOverride = bossContext?.isBoss ? extractBossOverridePercent(bossContext.bossNote) : null;
  const effectivePercent = bossOverride ?? percent;

  const result: AbilityResolution = {
    kind, damage: 0, heal: 0, shield: 0, enemyDamageReduction: 0, playerDamageBonus: 0, dodgeBonus: 0, enemyDotPercent: 0, effectTurns: 0,
  };

  switch (kind) {
    case 'damage':
      result.damage = mitigateDamage(Math.round(base * (1 + percent)), defenderVitality);
      break;
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
    default:
      result.damage = mitigateDamage(base, defenderVitality);
  }

  return result;
}

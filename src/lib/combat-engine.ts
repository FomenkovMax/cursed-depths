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

export type EffectKind = 'damage' | 'heal' | 'shield' | 'debuff' | 'buff' | 'armor' | 'utility';

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

/** Грубая классификация эффекта способности по ключевым словам описания. */
export function classifyEffect(description: string): EffectKind {
  if (/восстанавлив|исцел|реген/i.test(description)) return 'heal';
  if (/щит|поглощ/i.test(description)) return 'shield';
  if (/снижа|блокир|замедл|обездвиж|\bяд\b|дебафф|молчани|заглуш/i.test(description)) return 'debuff';
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
  defenderVitality: number
): AbilityResolution {
  const percent = extractEffectPercent(description);
  const kind = classifyEffect(description);
  const base = basicAttackDamage(attacker);

  const result: AbilityResolution = {
    kind, damage: 0, heal: 0, shield: 0, enemyDamageReduction: 0, playerDamageBonus: 0, effectTurns: 0,
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
      result.enemyDamageReduction = Math.min(0.75, percent);
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
      result.enemyDamageReduction = Math.min(0.75, percent);
      result.effectTurns = EFFECT_DURATION_TURNS;
      break;
    default:
      result.damage = mitigateDamage(base, defenderVitality);
  }

  return result;
}

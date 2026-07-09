/**
 * Пассивные способности — эвристический разбор свободного текста, той же
 * природы, что и combat-engine.ts для активных способностей (никакой
 * структурированной игровой механики в БД нет — только description).
 *
 * До этого модуля пассивки хранились в БД и отдавались через /api/abilities,
 * но НИКАК не влияли на бой — combat/action/route.ts их вообще не читал.
 * Из 53 пассивок в игре этот парсер уверенно распознаёт и реализует 40,
 * укладывающихся в составные примитивы ниже.
 *
 * Часть "союзники"/"группа"-пассивок (eternal-vow, sacred-aura, the-leader,
 * last-bastion, forest-whisper) сознательно трактуется как бонус САМОМУ
 * игроку — в игре нет группового/пати-режима, а буквальный смысл "эффект
 * применяется к нулю целей" оставлял бы их decorative навсегда. В оригинальном
 * дизайне процент указан НА ОДНОГО получателя ауры, так что self-применение
 * не завышает силу пассивки относительно замысла — просто сужает круг
 * получателей до одного (самого носителя, что для боевых аур и так обычно
 * подразумевается). Три действия из описаний тоже заменены на ближайшие
 * реальные: "при защите союзника" (last-bastion) → собственное действие
 * "защита"; "из маскировки" (ranger-night-hunter) → первая атака в бою;
 * "вне боя ... за ход" (forest-whisper) → вызов /api/explore, единственный
 * в игре реальный аналог "хода вне боя".
 *
 * Сознательно НЕ распознаются (регекспы просто не сработают, эффект
 * останется декоративным) — перепроверено ещё раз, у каждого пункта нет
 * реального аналога в движке даже с учётом уже добавленных выше приближений:
 * - flame-of-veralion, the-frenzied — завязаны на ДРУГОГО союзника с
 *   конкретным состоянием (баффом, расой) — self-подстановка невозможна,
 *   в отличие от аур выше, где получатель условен.
 * - Стойки и стелс как СОСТОЯНИЕ, а не разовое событие (moon-shadow —
 *   "в стойке Тени" требует одновременно стойки И невидимости; в отличие от
 *   ranger-night-hunter здесь нет события вроде "первая атака" на замену).
 * - Кулдауны способностей не существуют как механика (final-severance).
 * - Призванные существа-союзники не существуют как атакующие/защищающиеся
 *   игровые сущности (grave-bond, ashen-harvest) — в отличие от boss'ов,
 *   у которых summonStacks лишь абстрактный счётчик урона, не сущность.
 * - Снятие баффа с врага, которых у врагов не бывает НИКОГДА (empty-space,
 *   empty-shadow, godslayer-hunter) — даже там, где триггер теперь
 *   реален (empty-shadow: "после уклонения" отслеживается через
 *   dodge_chance), само действие остаётся неопределённым, а в тексте нет
 *   запасного числового значения, чтобы заменить его на что-то другое.
 * - eternal-guardian зависит от "Последняя воля" — АКТИВНОЙ способности с
 *   тем же изъяном на уровне combat-engine.ts (условие "при смертельном
 *   ударе" не проверяется резолвером активных способностей вообще, она
 *   резолвится как обычное ручное лечение) — типовая проблема более
 *   широкого класса, не решается на уровне одной пассивки.
 * - Урон отдельно "проклятием" (shadow-of-the-deep) и отдельно "огнём"
 *   (dragon-blood), эскалация силы яда по ходам (plague-amplification) —
 *   все три требуют типизации урона по стихии/источнику, которой в
 *   combat-engine.ts нет вообще (весь урон общий, без подтипов).
 */

export type PassiveEffect =
  | { kind: 'hp_threshold'; below: boolean; thresholdPercent: number; damageMultBonus: number; incomingReductionPercent: number; healingBonusPercent: number; defenseMultBonus: number; regenPercent: number }
  | { kind: 'on_victory_heal'; healPercent: number }
  | { kind: 'on_victory_damage_buff'; damageMultBonus: number; healingBonusPercent: number }
  | { kind: 'per_turn_lifesteal_from_enemy'; percent: number }
  | { kind: 'per_turn_regen'; percent: number }
  | { kind: 'crit_every_n_hits'; n: number }
  | { kind: 'hits_taken_every_n_heal'; n: number; healPercent: number }
  | { kind: 'dodge_chance'; chancePercent: number }
  | { kind: 'reflect_chance'; chancePercent: number }
  | { kind: 'counter_burn_chance'; chancePercent: number; dotPercent: number; turns: number }
  | { kind: 'counter_damage_flat'; percent: number }
  | { kind: 'turn_interval_empowered_attack'; everyTurns: number; damageMultBonus: number }
  | { kind: 'damage_vs_debuffed_enemy'; damageMultBonus: number }
  | { kind: 'unconditional_damage_buff'; damageMultBonus: number }
  | { kind: 'unconditional_triple_buff'; damageMultBonus: number; defenseMultBonus: number; healingBonusPercent: number }
  | { kind: 'death_save'; healPercent: number }
  | { kind: 'root_immune' }
  | { kind: 'enemy_debuff_stack_drain'; minStacks: number; percentMaxHpPerTurn: number }
  | { kind: 'damage_vs_reduced_defense_enemy'; damageMultBonus: number }
  | { kind: 'damage_vs_shielded_enemy'; damageMultBonus: number }
  | { kind: 'unconditional_healing_buff'; healingBonusPercent: number }
  | { kind: 'on_defend_bonus_defense'; defenseMultBonus: number }
  | { kind: 'first_attack_guaranteed_crit' }
  | { kind: 'on_block_heal'; healPercent: number }
  | { kind: 'on_block_counter_percent_absorbed'; percent: number }
  | { kind: 'heal_chance_cleanse_curse'; chancePercent: number }
  | { kind: 'enemy_heal_cap'; capPercent: number }
  | { kind: 'out_of_combat_regen'; hpPercent: number; mpPercent: number };

const PCT = '(\\d+)\\s*%';

function pct(match: RegExpMatchArray | null, group = 1): number {
  return match ? parseInt(match[group], 10) / 100 : 0;
}

/** Разбирает описание одной пассивки в один распознанный эффект (или null, если не распознана). */
export function parsePassiveEffect(description: string): PassiveEffect | null {
  const d = description;

  // "Пока ХП выше N%, союзники получают +X% брони" — трактуем как бонус самому носителю (см. заголовок файла).
  {
    const m = d.match(/пока хп выше (\d+)\s*%[^.]*союзники[^.]*получают\s*\+(\d+)\s*%\s*(брон|защит)/i);
    if (m) {
      return {
        kind: 'hp_threshold', below: false, thresholdPercent: parseInt(m[1], 10),
        damageMultBonus: 0, incomingReductionPercent: 0, healingBonusPercent: 0,
        defenseMultBonus: parseInt(m[2], 10) / 100, regenPercent: 0,
      };
    }
  }

  // "Союзники получают +X% к исцелению" — самому носителю, безусловно.
  {
    const m = d.match(/союзники[^.]*получают\s*\+(\d+)\s*%\s*к исцелению/i);
    if (m) return { kind: 'unconditional_healing_buff', healingBonusPercent: parseInt(m[1], 10) / 100 };
  }

  // "Союзники получают +X% к урону" — самому носителю, но только безусловные ауры,
  // не триггерные с длительностью (те требуют другого союзника-получателя по смыслу, напр. the-frenzied).
  if (!/убийств/i.test(d) && !/на \d+\s*ход/i.test(d)) {
    const m = d.match(/союзники[^.]*получают\s*\+(\d+)\s*%\s*к урону/i);
    if (m) return { kind: 'unconditional_damage_buff', damageMultBonus: parseInt(m[1], 10) / 100 };
  }

  // "При защите союзника собственная броня +X%" — ближайшая реальная замена: собственное действие "защита".
  {
    const m = d.match(/при защите[^.]*собственная брон[а-яё]*\s*\+(\d+)\s*%/i);
    if (m) return { kind: 'on_defend_bonus_defense', defenseMultBonus: parseInt(m[1], 10) / 100 };
  }

  // "Вне боя восстанавливает N% ХП и маны группе за ход" — реального тика "вне боя" по группе нет,
  // но у каждого игрока есть реальный аналог "хода вне боя": вызов /api/explore. Трактуем как self-тик.
  {
    const m = d.match(/вне боя восстанавлива[а-яё]+\s*(\d+)\s*%\s*хп и маны/i);
    if (m) return { kind: 'out_of_combat_regen', hpPercent: parseInt(m[1], 10) / 100, mpPercent: parseInt(m[1], 10) / 100 };
  }

  // Остальные "союзники"/"группа"-эффекты требуют другого участника по смыслу — не парсим.
  // "группе\b"/"группы\b" ниже — JS \b строится на \w, который не распознаёт кириллицу
  // (тот же класс бага, что и "\bяд\b" в combat-engine.ts), так что \b после кириллической
  // буквы никогда не совпадает — эти два варианта были мёртвым кодом. Пока не имело
  // последствий (все 4 "групп"-пассивки в игре уже ловятся словом "союзник" или "в группе"
  // выше, либо своим отдельным regex'ом раньше по коду), но на новые формулировки в будущем
  // эта защита молча не сработала бы — заменено на явную проверку без \b.
  if (/союзник|в группе|группе|группы/i.test(d)) return null;

  // Постоянный тройной бонус (Клятва): урон/защита/исцеление одновременно.
  if (/постоянный бонус/i.test(d)) {
    const dmg = pct(d.match(new RegExp(`\\+${PCT}\\s*урон`, 'i')));
    const def = pct(d.match(new RegExp(`\\+${PCT}\\s*брон`, 'i')));
    const heal = pct(d.match(new RegExp(`\\+${PCT}\\s*исцелен`, 'i')));
    if (dmg || def || heal) {
      return { kind: 'unconditional_triple_buff', damageMultBonus: dmg, defenseMultBonus: def, healingBonusPercent: heal };
    }
  }

  // Воскрешение раз за бой.
  // [^%]* обязан быть нежадным — иначе он захватывает и сами цифры процента,
  // оставляя \d+ откусывать от них только последний символ (напр. "40%" → matched "0").
  {
    const m = d.match(new RegExp(`при смерти восстанавливается[^%]*?${PCT}\\s*хп`, 'i'));
    if (m) return { kind: 'death_save', healPercent: pct(m) };
  }

  // Иммунитет к обездвиживанию.
  if (/не может быть.*(отброшен|обездвижен)/i.test(d)) {
    return { kind: 'root_immune' };
  }

  // Порог ХП (ниже/выше) с одним из нескольких возможных эффектов.
  {
    const m = d.match(new RegExp(`при (хп|падении)\\s*(ниже|выше)\\s*${PCT}|хп\\s*(ниже|выше)\\s*${PCT}`, 'i'));
    if (m) {
      const below = /ниже/i.test(m[0]);
      const threshold = parseInt(m[3] ?? m[5], 10);
      const dmgM = d.match(new RegExp(`\\+${PCT}\\s*к?\\s*урон`, 'i'));
      const incomingM = d.match(new RegExp(`входящий урон снижа[а-яё]+.*?${PCT}`, 'i'));
      const healM = d.match(new RegExp(`\\+${PCT}\\s*к исцелению`, 'i'));
      const defM = d.match(new RegExp(`\\+${PCT}\\s*(брон|защит)`, 'i'));
      const regenM = d.match(new RegExp(`регенерац[а-яё]+\\s*\\+?${PCT}`, 'i'));
      const effect = {
        kind: 'hp_threshold' as const,
        below,
        thresholdPercent: threshold,
        damageMultBonus: pct(dmgM),
        incomingReductionPercent: pct(incomingM),
        healingBonusPercent: pct(healM),
        defenseMultBonus: pct(defM),
        regenPercent: pct(regenM),
      };
      if (effect.damageMultBonus || effect.incomingReductionPercent || effect.healingBonusPercent || effect.defenseMultBonus || effect.regenPercent) {
        return effect;
      }
    }
  }

  // Что-то происходит при убийстве врага (в этом движке — раз за бой, т.к. бой заканчивается со смертью врага).
  if (/при убийств[а-яё]+|каждое убийство|каждый убит[а-яё]+ враг/i.test(d)) {
    const healM = d.match(new RegExp(`восстанавлива[а-яё]+\\s*${PCT}\\s*хп`, 'i'));
    const dmgM = d.match(new RegExp(`\\+${PCT}\\s*к урону`, 'i'));
    const healBonusM = d.match(new RegExp(`\\+${PCT}\\s*к исцелению`, 'i'));
    if (dmgM || healBonusM) {
      return { kind: 'on_victory_damage_buff', damageMultBonus: pct(dmgM), healingBonusPercent: pct(healBonusM) };
    }
    if (healM) {
      return { kind: 'on_victory_heal', healPercent: pct(healM) };
    }
  }

  // Раз в N ходов усиленная атака.
  {
    const m = d.match(new RegExp(`раз в (\\d+) ход[а-яё]*[^.]*\\+${PCT}\\s*урон`, 'i'));
    if (m) return { kind: 'turn_interval_empowered_attack', everyTurns: parseInt(m[1], 10), damageMultBonus: pct(m, 2) };
  }

  // Каждый N-й удар — гарантированный крит.
  {
    const m = d.match(/каждый (\d+)-?й удар[^.]*крит/i);
    if (m) return { kind: 'crit_every_n_hits', n: parseInt(m[1], 10) };
  }

  // Каждый N-й полученный удар — самоисцеление.
  {
    const m = d.match(new RegExp(`каждый (\\d+)-?й получ[а-яё]*\\s*удар[а-яё]*[^.]*восстанавлива[а-яё]+\\s*${PCT}`, 'i'));
    if (m) return { kind: 'hits_taken_every_n_heal', n: parseInt(m[1], 10), healPercent: pct(m, 2) };
  }

  // Шанс полностью уклониться.
  {
    const m = d.match(new RegExp(`${PCT}\\s*шанс[^.]*уклон`, 'i'));
    if (m) return { kind: 'dodge_chance', chancePercent: pct(m) };
  }

  // Шанс отразить урон.
  {
    const m = d.match(new RegExp(`${PCT}\\s*шанс[^.]*отраз`, 'i'));
    if (m) return { kind: 'reflect_chance', chancePercent: pct(m) };
  }

  // Шанс поджечь/наложить ДоТ на атакующего при получении удара.
  // "шанс N%" и "при получении удара/урона" встречаются в тексте в обоих порядках
  // (blood-heat: получение раньше шанса; shard-scale: шанс раньше получения),
  // поэтому ищем оба куска независимо, а не одним строго упорядоченным регекспом.
  if (/шанс\s*\d+\s*%/i.test(d) && /при получении (удара|урона)/i.test(d)) {
    const chanceM = d.match(new RegExp(`шанс\\s*${PCT}`, 'i'));
    const dotM = d.match(new RegExp(`\\(${PCT}\\s*хп[^\\d]*на (\\d+) ход`, 'i'));
    if (chanceM && dotM) {
      return { kind: 'counter_burn_chance', chancePercent: pct(chanceM), dotPercent: pct(dotM, 1), turns: parseInt(dotM[2], 10) };
    }
  }

  // Плоский контр-урон при получении удара (без шанса, без ДоТа).
  if (/при получении урона наносит урон/i.test(d)) {
    const m = d.match(new RegExp(PCT));
    return { kind: 'counter_damage_flat', percent: m ? pct(m) : 0.15 };
  }

  // Кража ХП у врага каждый ход.
  {
    const m = d.match(new RegExp(`каждый ход крадёт\\s*${PCT}\\s*хп`, 'i'));
    if (m) return { kind: 'per_turn_lifesteal_from_enemy', percent: pct(m) };
  }

  // Общее самовосстановление за ход (не завязанное на конкретное условие выше).
  {
    const m = d.match(new RegExp(`восстанавлива[а-яё]+[^.]*${PCT}[^.]*хп[^.]*за ход`, 'i'));
    if (m) return { kind: 'per_turn_regen', percent: pct(m) };
  }

  // Урон по врагам под конкретными дебаффами/состояниями (не "с баффами" — это другое).
  if (/враги под|атак[а-яё]+ по (замедленным|обездвиженным)|при активном.*на враге/i.test(d) && !/враги (с|без) активных баффов/i.test(d)) {
    const m = d.match(new RegExp(`\\+${PCT}[^.]*урон`, 'i'));
    if (m) return { kind: 'damage_vs_debuffed_enemy', damageMultBonus: pct(m) };
  }

  // Враги без баффов получают бонусный урон — в этом движке враги никогда не баффаются, эффект безусловен.
  {
    const m = d.match(new RegExp(`враги без активных баффов получают\\s*\\+${PCT}[^.]*урон`, 'i'));
    if (m) return { kind: 'unconditional_damage_buff', damageMultBonus: pct(m) };
  }

  // Атаки по врагам со щитом (у части боссов есть реальный shieldHp — boss-mechanics.ts).
  {
    const m = d.match(new RegExp(`враг[а-яё]*.*?со? щит[а-яё]*.*?\\+${PCT}[^.]*урон`, 'i'));
    if (m) return { kind: 'damage_vs_shielded_enemy', damageMultBonus: pct(m) };
  }

  // Враги с пониженной защитой получают бонусный урон.
  {
    const m = d.match(new RegExp(`враги с понижен[а-яё]+ защит[а-яё]+ получают\\s*\\+${PCT}[^.]*урон`, 'i'));
    if (m) return { kind: 'damage_vs_reduced_defense_enemy', damageMultBonus: pct(m) };
  }

  // Враги с N+ дебаффами теряют % макс. ХП за ход.
  // Хвост фразы содержит "макс." (со своей точкой) — [^.]* тут не годится, нужен .*? без ограничения на точку.
  {
    const m = d.match(new RegExp(`враги с (\\d+)\\+?\\s*дебафф[а-яё]*.*?теря[а-яё]+\\s*${PCT}.*?ход`, 'i'));
    if (m) return { kind: 'enemy_debuff_stack_drain', minStacks: parseInt(m[1], 10), percentMaxHpPerTurn: pct(m, 2) };
  }

  // "Из маскировки первая атака всегда критическая" — маскировки как состояния нет, но у каждого
  // боя есть естественный аналог: самая первая атака игрока в этом бою.
  if (/маскировк[а-яё]*[^.]*первая атака[^.]*всегда крит/i.test(d)) {
    return { kind: 'first_attack_guaranteed_crit' };
  }

  // "При блокировании удара восстанавливает N% ХП" — блок как отдельная механика отсутствует,
  // но действие "защита" уже реально снижает входящий урон, так что это его естественный аналог.
  {
    const m = d.match(new RegExp(`при блокировани[а-яё]*[^.]*восстанавлива[а-яё]+\\s*${PCT}`, 'i'));
    if (m) return { kind: 'on_block_heal', healPercent: pct(m) };
  }

  // "При блокировании удара атакующий получает урон равный N% от поглощённого" — тот же аналог "защиты".
  {
    const m = d.match(new RegExp(`при блокировани[а-яё]*[^.]*атакующий получает урон[^.]*?${PCT}`, 'i'));
    if (m) return { kind: 'on_block_counter_percent_absorbed', percent: pct(m) };
  }

  // "Каждое исцеление имеет шанс N% снять дебафф с цели" — единственный реально отслеживаемый
  // "дебафф на игроке" в движке — стаки проклятия от лечения-с-проклятием боссов (curseStacks).
  {
    const m = d.match(new RegExp(`каждое исцелени[а-яё]*[^.]*шанс\\s*${PCT}[^.]*снять[^.]*дебафф`, 'i'));
    if (m) return { kind: 'heal_chance_cleanse_curse', chancePercent: pct(m) };
  }

  // "Враги не могут получать исцеление выше N% от базового значения" — ограничивает самоисцеление босса.
  {
    const m = d.match(new RegExp(`не могут получать исцелени[а-яё]*\\s*выше\\s*${PCT}`, 'i'));
    if (m) return { kind: 'enemy_heal_cap', capPercent: pct(m) };
  }

  return null;
}

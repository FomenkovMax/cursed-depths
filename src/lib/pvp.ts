/**
 * PvP-арена — фаза 7, отвечает на самый крупный пробел из конкурентного анализа сессии
 * ("Зов Теней" имеет лиги/еженедельный рейтинг, у нас не было вообще никакого PvP).
 *
 * У игры нет realtime-инфры (см. обоснование в party-combat — только поллинг), а синхронный
 * PvP между двумя реальными игроками требовал бы гарантированно одновременного онлайна с
 * обеих сторон, чего для небольшой аудитории Telegram Mini App не обеспечить. Поэтому арена —
 * асинхронный "призрачный бой": вызов снимка чужого билда, бой мгновенно симулируется целиком
 * за один запрос, реальные HP/MP защищающегося не трогаются (только рейтинг/статистика) — тот
 * же паттерн, что у мобильных PvP-лиг (Clash Royale/AFK Arena и т.п.), а не попытка выдать это
 * за живой синхронный бой.
 *
 * Симуляция сознательно ПРОЩЕ, чем движок combat-engine.ts + boss-mechanics.ts: использует
 * только базовые примитивы (basicAttackDamage/mitigateDamage/resolveAbility), БЕЗ проклятий/
 * адаптивного резиста/пассивного офенс-бонуса от crit'ов и conditional-ability-engine.ts —
 * та инфраструктура целиком заточена под бой с боссом (PvE-специфичные резисты/фазы), а не
 * под симметричный игрок-против-игрока. Честный компромисс ради предсказуемого объёма
 * работы, не попытка притвориться полной копией solo-движка.
 */

import { basicAttackDamage, mitigateDamage, resolveAbility, manaCostForStage, type PlayerCombatStats } from './combat-engine';

export interface PvpAbility {
  description: string;
  stage: number;
}

export interface PvpCombatant {
  playerId: string;
  name: string;
  stats: PlayerCombatStats;
  maxHp: number;
  maxMp: number;
  weaponBonus: number; // бонус атаки от экипировки (attack), прибавляется к базовой атаке
  armorBonus: number; // бонус защиты от экипировки (defense), вычитается из входящего урона
  abilities: PvpAbility[];
}

export interface PvpFightResult {
  winnerId: string;
  loserId: string;
  log: string[];
  turnsTaken: number;
}

const MAX_TURNS = 40;
const ABILITY_USE_CHANCE = 0.5;

interface SimSide {
  combatant: PvpCombatant;
  hp: number;
  mp: number;
  shieldHp: number;
}

function pickAction(side: SimSide): PvpAbility | null {
  const affordable = side.combatant.abilities.filter(a => side.mp >= manaCostForStage(a.stage));
  if (affordable.length === 0 || Math.random() >= ABILITY_USE_CHANCE) return null;
  return affordable[Math.floor(Math.random() * affordable.length)];
}

function applyIncomingDamage(defender: SimSide, rawDamage: number): number {
  const afterArmor = Math.max(1, Math.round(rawDamage - defender.combatant.armorBonus));
  const fromShield = Math.min(defender.shieldHp, afterArmor);
  defender.shieldHp -= fromShield;
  const toHp = afterArmor - fromShield;
  defender.hp = Math.max(0, defender.hp - toHp);
  return toHp;
}

/** Симулирует бой целиком за один вызов — детерминированный терминатор (MAX_TURNS), никакого
 * ожидания живого хода второй стороны. Первый ход — случайно (в бою по ходам первый удар даёт
 * заметное преимущество даже при равных статах — без рандомизации у challenger'а был бы
 * структурный перевес независимо от билда, что несправедливо для рейтинговой системы). */
export function simulatePvpFight(a: PvpCombatant, b: PvpCombatant): PvpFightResult {
  const sideA: SimSide = { combatant: a, hp: a.maxHp, mp: a.maxMp, shieldHp: 0 };
  const sideB: SimSide = { combatant: b, hp: b.maxHp, mp: b.maxMp, shieldHp: 0 };
  const log: string[] = [`⚔️ ${a.name} вызывает ${b.name} на бой!`];

  let turn = 0;
  let actor = Math.random() < 0.5 ? sideA : sideB;
  let defender = actor === sideA ? sideB : sideA;

  while (turn < MAX_TURNS && sideA.hp > 0 && sideB.hp > 0) {
    turn++;
    actor.mp = Math.min(actor.combatant.maxMp, actor.mp + 10);

    const ability = pickAction(actor);
    if (ability) {
      actor.mp -= manaCostForStage(ability.stage);
      const resolution = resolveAbility(ability.description, actor.combatant.stats, defender.combatant.stats.vitality);
      if (resolution.damage > 0) {
        const dealt = applyIncomingDamage(defender, resolution.damage);
        log.push(`${actor.combatant.name} применяет способность — урон ${dealt}. (${defender.combatant.name}: ${defender.hp}/${defender.combatant.maxHp} ХП)`);
      }
      if (resolution.heal > 0) {
        actor.hp = Math.min(actor.combatant.maxHp, actor.hp + resolution.heal);
        log.push(`${actor.combatant.name} исцеляется на ${resolution.heal} ХП.`);
      }
      if (resolution.shield > 0) {
        actor.shieldHp += resolution.shield;
        log.push(`${actor.combatant.name} получает щит на ${resolution.shield} ХП.`);
      }
      if (resolution.damage === 0 && resolution.heal === 0 && resolution.shield === 0) {
        log.push(`${actor.combatant.name} использует способность без немедленного эффекта.`);
      }
    } else {
      const rawDamage = basicAttackDamage(actor.combatant.stats) + actor.combatant.weaponBonus;
      const mitigated = mitigateDamage(rawDamage, defender.combatant.stats.vitality);
      const dealt = applyIncomingDamage(defender, mitigated);
      log.push(`${actor.combatant.name} атакует — урон ${dealt}. (${defender.combatant.name}: ${defender.hp}/${defender.combatant.maxHp} ХП)`);
    }

    if (defender.hp <= 0) break;
    [actor, defender] = [defender, actor];
  }

  let winnerSide: SimSide;
  let loserSide: SimSide;
  if (sideA.hp <= 0) {
    winnerSide = sideB; loserSide = sideA;
  } else if (sideB.hp <= 0) {
    winnerSide = sideA; loserSide = sideB;
  } else {
    // Лимит ходов исчерпан без нокаута — побеждает у кого больше % ХП, ничья уходит защищающемуся.
    const aPct = sideA.hp / sideA.combatant.maxHp;
    const bPct = sideB.hp / sideB.combatant.maxHp;
    winnerSide = aPct > bPct ? sideA : sideB;
    loserSide = winnerSide === sideA ? sideB : sideA;
  }

  log.push(`🏆 Победа: ${winnerSide.combatant.name}!`);
  return { winnerId: winnerSide.combatant.playerId, loserId: loserSide.combatant.playerId, log, turnsTaken: turn };
}

// ===== РЕЙТИНГ (Elo) И ЛИГИ =====

const ELO_K = 32;
const MIN_RATING = 100;

/** Изменение рейтинга атакующего после боя (симметрично вычитается у защищающегося). */
export function eloDelta(ratingWinner: number, ratingLoser: number): number {
  const expectedWinner = 1 / (1 + Math.pow(10, (ratingLoser - ratingWinner) / 400));
  return Math.max(1, Math.round(ELO_K * (1 - expectedWinner)));
}

export function clampRating(rating: number): number {
  return Math.max(MIN_RATING, rating);
}

export interface PvpLeague {
  id: string;
  nameRu: string;
  minRating: number;
  icon: string;
}

// Названия лиг — по образцу турнирной лестницы "Зов Теней" (Птенцы → Премьер), переименовано
// под нашу тематику Пепла/Скверны вместо буквального копирования.
export const PVP_LEAGUES: PvpLeague[] = [
  { id: 'ash_fledgling', nameRu: 'Пепельный птенец', minRating: 0, icon: '🐣' },
  { id: 'ash_disciple', nameRu: 'Пепельный ученик', minRating: 1000, icon: '🔥' },
  { id: 'tempered', nameRu: 'Закалённый', minRating: 1150, icon: '⚔️' },
  { id: 'depth_veteran', nameRu: 'Ветеран Глубин', minRating: 1300, icon: '🛡️' },
  { id: 'rift_legend', nameRu: 'Легенда Разлома', minRating: 1450, icon: '🌀' },
  { id: 'first_blade', nameRu: 'Первый Клинок', minRating: 1600, icon: '👑' },
];

export function leagueForRating(rating: number): PvpLeague {
  let current = PVP_LEAGUES[0];
  for (const league of PVP_LEAGUES) {
    if (rating >= league.minRating) current = league;
  }
  return current;
}

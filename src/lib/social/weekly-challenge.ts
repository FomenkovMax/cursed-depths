/**
 * Испытание недели — горизонтальный endgame-контент (аудит #2, топ-10 #6): весь остальной PvE
 * вертикален (пройти один раз и вверх по уровню), Fortress/GuildRaidBoss дают еженедельный ритм
 * только гильдиям. Это solo, бесплатно, без гильдии — детерминированно выбранный по неделе босс,
 * одна попытка на игрока за неделю.
 *
 * Симуляция сознательно ПРОЩЕ, чем движок combat-engine.ts + boss-mechanics.ts — использует
 * только базовые примитивы (basicAttackDamage/mitigateDamage/resolveAbility), без фаз/щитов/
 * адаптивного резиста босса. Тот же компромисс, что и у PvP-арены (lib/combat/pvp.ts) — честный
 * ради предсказуемого объёма работы, не попытка притвориться полной копией solo-движка.
 */

import { basicAttackDamage, mitigateDamage, resolveAbility, manaCostForStage, type PlayerCombatStats } from '@/lib/combat/combat-engine';
import { rollDice } from '@/lib/dice';
import { ENEMIES, type EnemyTemplate } from '@/lib/game-data';
import { heatLevelEffect } from '@/lib/combat/dungeon-modifiers';

export interface WeeklyChallengeAbility {
  description: string;
  stage: number;
}

export interface WeeklyChallengeCombatant {
  playerId: string;
  name: string;
  stats: PlayerCombatStats;
  maxHp: number;
  maxMp: number;
  weaponBonus: number;
  armorBonus: number;
  abilities: WeeklyChallengeAbility[];
}

export interface WeeklyChallengeResult {
  won: boolean;
  log: string[];
  turnsTaken: number;
  hpPercentRemaining: number;
}

const MAX_TURNS = 40;
const ABILITY_USE_CHANCE = 0.5;
/** Фиксированный heat-уровень испытания (0-5, см. dungeon-modifiers.ts) — "Пожар Скверны":
 * заметно сложнее рядового данжа, но не максимальный "Гнев Карсуса", чтобы оставаться
 * проходимым для широкого диапазона уровней, а не только топовых билдов. */
const CHALLENGE_HEAT_LEVEL = 3;

/** Детерминированный выбор босса недели — простой хэш weekId в индекс списка боссов, без
 * отдельного собственного списка "боссов недели" и без внешнего состояния/рандома. */
export function pickWeeklyEnemy(weekId: string): EnemyTemplate {
  const bosses = ENEMIES.filter(e => e.isBoss);
  let hash = 0;
  for (let i = 0; i < weekId.length; i++) hash = (hash * 31 + weekId.charCodeAt(i)) >>> 0;
  return bosses[hash % bosses.length];
}

/** Симулирует бой целиком за один вызов, как и PvP-арена — никакого ожидания живого хода,
 * никакой многоходовой interactive-сессии поверх Player.inCombat. */
export function simulateWeeklyChallenge(player: WeeklyChallengeCombatant, enemy: EnemyTemplate): WeeklyChallengeResult {
  const effect = heatLevelEffect(CHALLENGE_HEAT_LEVEL);
  const enemyMaxHp = Math.round(enemy.hp * effect.enemyHpMult);

  let playerHp = player.maxHp;
  let playerMp = player.maxMp;
  let enemyHp = enemyMaxHp;

  const log: string[] = [`🕯️ Испытание недели: ${player.name} против ${enemy.nameRu}!`];

  let turn = 0;
  while (turn < MAX_TURNS && playerHp > 0 && enemyHp > 0) {
    turn++;
    playerMp = Math.min(player.maxMp, playerMp + 10);

    const affordable = player.abilities.filter(a => playerMp >= manaCostForStage(a.stage));
    const useAbility = affordable.length > 0 && Math.random() < ABILITY_USE_CHANCE;

    let dealt: number;
    if (useAbility) {
      const ability = affordable[Math.floor(Math.random() * affordable.length)];
      playerMp -= manaCostForStage(ability.stage);
      const resolution = resolveAbility(ability.description, player.stats, enemy.ac);
      dealt = resolution.damage;
      if (resolution.heal > 0) {
        playerHp = Math.min(player.maxHp, playerHp + resolution.heal);
        log.push(`${player.name} исцеляется на ${resolution.heal} ХП.`);
      }
      if (dealt > 0) {
        enemyHp = Math.max(0, enemyHp - dealt);
        log.push(`${player.name} применяет способность — урон ${dealt}. (${enemy.nameRu}: ${enemyHp}/${enemyMaxHp} ХП)`);
      }
    } else {
      const raw = basicAttackDamage(player.stats) + player.weaponBonus;
      dealt = mitigateDamage(raw, enemy.ac);
      enemyHp = Math.max(0, enemyHp - dealt);
      log.push(`${player.name} атакует — урон ${dealt}. (${enemy.nameRu}: ${enemyHp}/${enemyMaxHp} ХП)`);
    }

    if (enemyHp <= 0) break;

    const rawEnemyDamage = rollDice(enemy.damage) * effect.enemyDamageMult;
    const enemyDealt = Math.max(1, Math.round(mitigateDamage(rawEnemyDamage, player.stats.vitality) - player.armorBonus));
    playerHp = Math.max(0, playerHp - enemyDealt);
    log.push(`${enemy.nameRu} атакует — урон ${enemyDealt}. (${player.name}: ${playerHp}/${player.maxHp} ХП)`);
  }

  const won = enemyHp <= 0 && playerHp > 0;
  log.push(won ? `🏆 Победа! ${enemy.nameRu} повержен.` : `💀 Поражение — ${enemy.nameRu} оказался сильнее.`);

  return {
    won,
    log,
    turnsTaken: turn,
    hpPercentRemaining: Math.round((playerHp / player.maxHp) * 100),
  };
}

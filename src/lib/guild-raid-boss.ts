/**
 * Гильд-рейд-босс — еженедельная КООП-цель ОДНОЙ гильдии, премиум-эксклюзив (в отличие от
 * lib/world-boss.ts, общего для ВСЕХ игроков разом, и lib/fortress.ts, соревнования гильдия-
 * против-гильдии). HP масштабируется от размера гильдии — маленькую гильдию не наказываем тем
 * же пулом HP, что тридцатичеловечную. Недельный цикл переиспользует currentWeekId из
 * fortress.ts (та же ISO-неделя). В отличие от WorldBoss босс НЕ респавнится сразу после
 * убийства — до конца недели остаётся повержен, следующий появляется только на новой неделе.
 */

import { basicAttackDamage, type PlayerCombatStats } from './combat-engine';
import { currentWeekId } from './fortress';
import { db } from './db';

export const RAID_BOSS_NAME = 'Разлом Стонущей Плоти';
export const RAID_BOSS_LORE = 'Там, где гильдии разбивают лагерь надолго, Голос Карсуса находит трещину и просачивается в неё — родится существо, слепленное из отчаяния целого отряда. Убить его в одиночку невозможно по замыслу.';

/** Премиум-эксклюзив: лок на саму возможность наносить урон (не просто больше попыток, как у
 * WorldBoss) — тот же принцип, что у Экспедиций/Доски контрактов. Единый лимит на всех
 * премиум-игроков, второй "премиумной" планки здесь не нужно. */
export const RAID_BOSS_DAILY_ATTACK_CAP = 3;

const BASE_HP = 3000;
const HP_PER_MEMBER = 600;

export function maxHpForGuild(memberCount: number): number {
  return BASE_HP + HP_PER_MEMBER * Math.max(1, memberCount);
}

type PrismaClientLike = {
  guildRaidBoss: typeof db.guildRaidBoss;
  guildRaidContribution: typeof db.guildRaidContribution;
};

/** Лениво создаёт/перекатывает босса гильдии на текущую ISO-неделю. Если неделя не сменилась —
 * возвращает как есть (даже если hp уже 0, то есть повержен — ждём следующей недели). */
export async function resolveGuildRaidBossIfNeeded(client: PrismaClientLike, guildId: string, memberCount: number) {
  const week = currentWeekId();
  const existing = await client.guildRaidBoss.findUnique({ where: { guildId } });

  if (!existing) {
    try {
      const maxHp = maxHpForGuild(memberCount);
      return await client.guildRaidBoss.create({ data: { guildId, cycleId: week, hp: maxHp, maxHp } });
    } catch {
      // Гонка: параллельный запрос от другого члена гильдии успел создать синглтон первым.
      const created = await client.guildRaidBoss.findUnique({ where: { guildId } });
      if (!created) throw new Error('GUILD_RAID_BOSS_SPAWN_RACE');
      return created;
    }
  }

  if (existing.cycleId === week) return existing;

  await client.guildRaidContribution.deleteMany({ where: { bossId: existing.id, cycleId: existing.cycleId } });
  const maxHp = maxHpForGuild(memberCount);
  return client.guildRaidBoss.update({
    where: { guildId },
    data: { cycleId: week, hp: maxHp, maxHp, spawnedAt: new Date() },
  });
}

/** Урон одного удара — та же формула, что у мирового босса и штурма Крепости (basicAttack +
 * бонус оружия), переиспользуется намеренно: все три измеряют "боевую мощь одного удара" одинаково. */
export function raidBossAttackDamage(stats: PlayerCombatStats, weaponBonus: number): number {
  return basicAttackDamage(stats) + weaponBonus;
}

const KILL_REWARD_GOLD = 1500;
const KILL_REWARD_XP = 1200;
const MIN_SHARE_GOLD = 20;
const MIN_SHARE_XP = 10;

export function rewardForRaidShare(damageShare: number): { gold: number; xp: number } {
  return {
    gold: Math.max(MIN_SHARE_GOLD, Math.round(KILL_REWARD_GOLD * damageShare)),
    xp: Math.max(MIN_SHARE_XP, Math.round(KILL_REWARD_XP * damageShare)),
  };
}

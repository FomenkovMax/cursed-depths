/**
 * Крепость — гильдия-против-гильдии territory control (фаза 10, последний оставшийся пробел:
 * "Подземелья Колодца" имеют еженедельные гильд-войны за замки/реликвии с постоянными баффами
 * победившей гильдии, у нас до этой фазы гильдии были декоративны, а lib/world-boss.ts — общий
 * КООП для всех игроков, не соревнование между гильдиями. Крепость закрывает именно этот пробел.
 *
 * Недельный цикл (ISO-неделя): гильдия с наибольшей суммой очков штурма коронуется контролирующей,
 * её участники получают +10% золота с любого боя (см. combat/action.ts) до конца следующего
 * цикла. Лениво резолвится на каждый GET/assault (тот же паттерн, что season rewards/world boss).
 */

import { basicAttackDamage, type PlayerCombatStats } from '@/lib/combat/combat-engine';
import { db } from '@/lib/db';

export const FORTRESS_ID = 'current';
export const FORTRESS_NAME = 'Забытая Цитадель';
/** Ничья крепость без модели Fortress.name/lore в схеме — константа для отображения,
 * не требует миграции. Объясняет, ЗА ЧТО дерутся гильдии, не только "+10% золота". */
export const FORTRESS_LORE = 'Ни одна хроника не помнит, кто её построил. Гильдии бьются за право удерживать её не ради истории, а ради того, что она даёт удерживающим — пока флаг держится.';
export const ASSAULT_DAILY_CAP = 3;
export const CONTROL_GOLD_BONUS = 0.1;

/** ISO 8601 номер недели — "2026-W28". Стабильный ключ цикла, не зависящий от календарного
 * месяца (в отличие от lib/seasons.ts currentSeasonId, который специально месячный). */
export function currentWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Очки одного штурма — та же формула, что урон по мировому боссу (basicAttack + бонус оружия),
 * переиспользуется намеренно: оба измеряют "боевую мощь одного удара" одинаково. */
export function assaultPoints(stats: PlayerCombatStats, weaponBonus: number): number {
  return basicAttackDamage(stats) + weaponBonus;
}

type PrismaClientLike = {
  fortress: typeof db.fortress;
  fortressContribution: typeof db.fortressContribution;
};

export async function ensureFortressSpawned(client: PrismaClientLike) {
  const existing = await client.fortress.findUnique({ where: { id: FORTRESS_ID } });
  if (existing) return existing;
  try {
    return await client.fortress.create({ data: { id: FORTRESS_ID, cycleId: currentWeekId(), controllingGuildId: null } });
  } catch {
    const created = await client.fortress.findUnique({ where: { id: FORTRESS_ID } });
    if (!created) throw new Error('FORTRESS_SPAWN_RACE');
    return created;
  }
}

/** Если текущая ISO-неделя отличается от fortress.cycleId — коронует гильдию с максимальной
 * суммой очков за завершившийся цикл, чистит вклады, переводит на новый cycleId. Если за цикл
 * никто не штурмовал (вклады пусты) — контроль остаётся у прежнего владельца. */
export async function resolveFortressCycleIfNeeded(client: PrismaClientLike) {
  const fortress = await ensureFortressSpawned(client);
  const week = currentWeekId();
  if (fortress.cycleId === week) return fortress;

  const contributions = await client.fortressContribution.findMany({ where: { cycleId: fortress.cycleId } });
  const byGuild = new Map<string, number>();
  for (const c of contributions) byGuild.set(c.guildId, (byGuild.get(c.guildId) ?? 0) + c.points);

  let winner: string | null = fortress.controllingGuildId;
  let best = -1;
  for (const [guildId, points] of byGuild) {
    if (points > best) { best = points; winner = guildId; }
  }

  await client.fortressContribution.deleteMany({ where: { cycleId: fortress.cycleId } });
  return client.fortress.update({ where: { id: FORTRESS_ID }, data: { cycleId: week, controllingGuildId: winner } });
}

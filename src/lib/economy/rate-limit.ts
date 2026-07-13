import { Prisma, PrismaClient } from '@prisma/client';

/** Минимальный интервал между "тяжёлыми" игровыми действиями — не полноценный rate limiter (для
 * него нужна внешняя стораджа вроде Upstash Redis, которую проект сознательно не тянет — тот же
 * принцип, что у party-combat-engine.ts "нет ни WebSocket, ни платных realtime-сервисов"), а
 * простой серверный guard против скриптового фарма голды/предметов через тесный цикл запросов
 * к /api/explore, /api/combat/action и т.п. (аудит: "прямая дыра при паблик-релизе"). Человек
 * физически не тапает чаще, чем раз в MIN_ACTION_INTERVAL_MS; скрипт — может. UI и так блокирует
 * кнопку на время запроса (loading state), это тривиально обходится прямым вызовом API — реальная
 * защита должна быть на сервере. */
export const MIN_ACTION_INTERVAL_MS = 400;

export class ActionCooldownError extends Error {
  constructor() { super('ACTION_TOO_FAST'); }
}

/** Атомарная проверка+запись через ту же схему conditional-updateMany-guard, что уже
 * используется для gold/quantity guard'ов в этой кодовой базе (craft/shop/quests и т.п.) —
 * реальная защита от гонки не в снимке "до", а в WHERE-условии самого UPDATE. Бросает
 * ActionCooldownError, если предыдущее действие было МЕНЕЕ MIN_ACTION_INTERVAL_MS назад.
 * Вызывать как можно раньше в хендлере — до дорогих вычислений (RNG лута, резолва боя). */
export async function enforceActionCooldown(
  client: Prisma.TransactionClient | PrismaClient,
  playerId: string,
): Promise<void> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - MIN_ACTION_INTERVAL_MS);
  const result = await client.player.updateMany({
    where: {
      id: playerId,
      OR: [{ lastActionAt: null }, { lastActionAt: { lt: cutoff } }],
    },
    data: { lastActionAt: now },
  });
  if (result.count === 0) throw new ActionCooldownError();
}

/**
 * Быстрое перемещение — премиум-эксклюзивная альтернатива обычному перемещению (POST /api/travel,
 * бесплатному и мгновенному, но ограниченному соседними локациями по графу connections):
 * телепорт напрямую в любую локацию, которую игрок уже посещал. Основа — VisitedLocation,
 * отметки ставятся лениво при каждом успешном перемещении/при создании персонажа, а не отдельным
 * действием игрока.
 */

import { db } from './db';

type PrismaClientLike = { visitedLocation: typeof db.visitedLocation };

/** Идемпотентно отмечает локацию как посещённую — безопасно вызывать при каждом визите, даже
 * повторном (upsert без изменений при повторе). */
export async function markLocationVisited(client: PrismaClientLike, playerId: string, locationId: string) {
  await client.visitedLocation.upsert({
    where: { playerId_locationId: { playerId, locationId } },
    update: {},
    create: { playerId, locationId },
  });
}

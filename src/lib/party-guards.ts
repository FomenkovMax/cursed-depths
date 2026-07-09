/**
 * PartyCombat — параллельная система относительно Player.inCombat (см. prisma/schema.prisma,
 * комментарий у модели PartyCombat): бой пати никогда не трогает Player.inCombat/enemyId/
 * enemyHp/bossState, у него своя собственная строка состояния. Из-за этого roзреза
 * маршруты, которые уже блокируют конфликт с СОЛО-боем через player.inCombat (travel, rest,
 * explore, party/combat/start), ничего не знали про ПАТИ-бой — игрок мог сбежать из активного
 * боя пати в город, бесплатно вылечиться через /rest и вернуться с полным ХП (AFK-автозащита
 * пати-движка тем временем закрывала его ходы), или начать отдельный соло-бой параллельно с
 * пати-боем — оба независимо пишут Player.hp, портя состояние друг друга.
 */
import { db } from './db';

/** Состоит ли игрок в пати, которая СЕЙЧАС активно сражается (party.status === 'in_combat'). */
export async function isInActivePartyCombat(playerId: string): Promise<boolean> {
  const member = await db.partyMember.findUnique({
    where: { playerId },
    include: { party: { select: { status: true } } },
  });
  return member?.party.status === 'in_combat';
}

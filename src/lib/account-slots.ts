import { Prisma, PrismaClient } from '@prisma/client';

export const MAX_CHARACTER_SLOTS = 2;

/** Детерминированный placeholder telegramId неактивного слота — см. комментарий у
 * Player.accountId в schema.prisma. Не хранится нигде отдельно: всегда пересчитывается из
 * accountId + slotNumber, поэтому переключение туда-обратно возвращает тот же самый placeholder. */
export function inactiveSlotTelegramId(accountId: string, slotNumber: number): string {
  return `${accountId}__slot${slotNumber}`;
}

type Tx = Prisma.TransactionClient | PrismaClient;

/** Атомарно делает `targetPlayerId` активным персонажем аккаунта (получает настоящий
 * telegramId = accountId), а текущего активного — неактивным (получает детерминированный
 * placeholder). Все 80+ роутов, ищущие игрока по telegramId из заголовка авторизации, не
 * меняются вообще — после свапа они находят ровно того персонажа, что теперь активен. Порядок
 * трёх обновлений важен: сначала освобождаем настоящий telegramId у текущего активного
 * (временным значением), иначе второй UPDATE упёрся бы в @unique-конфликт с ещё не
 * освобождённым значением. */
export async function switchActiveCharacter(
  tx: Tx,
  accountId: string,
  activePlayerId: string,
  activeSlotNumber: number,
  targetPlayerId: string,
): Promise<void> {
  const tempId = `${accountId}__swap_tmp_${Date.now()}`;
  await tx.player.update({ where: { id: activePlayerId }, data: { telegramId: tempId } });
  await tx.player.update({ where: { id: targetPlayerId }, data: { telegramId: accountId } });
  await tx.player.update({
    where: { id: activePlayerId },
    data: { telegramId: inactiveSlotTelegramId(accountId, activeSlotNumber) },
  });
}

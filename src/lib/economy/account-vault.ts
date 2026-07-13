import { Prisma, PrismaClient } from '@prisma/client';

/** Общий сейф на аккаунт (см. schema.prisma AccountVault) — предметный лимит, отдельный от
 * личного хранилища каждого слота (STASH_CAPACITY). Один вместимость на оба персонажа сразу,
 * поэтому чуть выше личного, но не безлимитный. */
export const VAULT_ITEM_CAPACITY = 40;

type Tx = Prisma.TransactionClient | PrismaClient;

/** Гарантирует существование AccountVault для accountId, не трогая уже имеющиеся значения —
 * vault заводится лениво при первом обращении (первый депозит золота/осколков/предмета), а не
 * сразу при создании второго слота, чтобы не плодить пустые строки для аккаунтов, которые
 * сейфом ни разу не воспользовались. */
export async function getOrCreateVault(tx: Tx, accountId: string) {
  return tx.accountVault.upsert({
    where: { accountId },
    create: { accountId },
    update: {},
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { getOrCreateVault, VAULT_ITEM_CAPACITY } from '@/lib/economy/account-vault';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { inventoryId } = await req.json();
    if (!inventoryId) return NextResponse.json({ error: 'Укажите inventoryId' }, { status: 400 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { inventory: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!player.accountId) {
      return NextResponse.json({ error: 'Общий сейф доступен после создания второго персонажа' }, { status: 400 });
    }

    const item = player.inventory.find(i => i.id === inventoryId);
    if (!item) return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
    if (item.equipped) return NextResponse.json({ error: 'Сначала снимите предмет' }, { status: 400 });

    const vault = await getOrCreateVault(db, player.accountId);
    const vaultCount = await db.accountVaultItem.count({ where: { vaultId: vault.id } });
    if (vaultCount >= VAULT_ITEM_CAPACITY) {
      return NextResponse.json({ error: `Общий сейф заполнен (${VAULT_ITEM_CAPACITY} слотов)` }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      const deleted = await tx.inventory.deleteMany({ where: { id: item.id } });
      if (deleted.count === 0) throw new Error('ALREADY_MOVED');

      await tx.accountVaultItem.create({
        data: {
          vaultId: vault.id,
          itemId: item.itemId,
          name: item.name,
          type: item.type,
          rarity: item.rarity,
          stats: item.stats,
          icon: item.icon,
          itemLevel: item.itemLevel,
          affixTier: item.affixTier,
          affixes: item.affixes,
          enhancementLevel: item.enhancementLevel,
          quantity: item.quantity,
        },
      });
    });

    return NextResponse.json({ message: `${item.name} убран в общий сейф` });
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_MOVED') {
      return NextResponse.json({ error: 'Предмет уже был перемещён' }, { status: 409 });
    }
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

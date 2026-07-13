import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { addItemToInventory } from '@/lib/economy/inventory-utils';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { vaultItemId } = await req.json();
    if (!vaultItemId) return NextResponse.json({ error: 'Укажите vaultItemId' }, { status: 400 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!player.accountId) {
      return NextResponse.json({ error: 'Общий сейф доступен после создания второго персонажа' }, { status: 400 });
    }

    const item = await db.accountVaultItem.findUnique({ where: { id: vaultItemId }, include: { vault: true } });
    if (!item || item.vault.accountId !== player.accountId) {
      return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      const deleted = await tx.accountVaultItem.deleteMany({ where: { id: vaultItemId } });
      if (deleted.count === 0) throw new Error('ALREADY_RETRIEVED');

      await addItemToInventory({
        playerId: player.id,
        itemId: item.itemId,
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        stats: item.stats,
        icon: item.icon,
        quantity: item.quantity,
        itemLevel: item.itemLevel,
        affixTier: item.affixTier,
        affixes: item.affixes,
        enhancementLevel: item.enhancementLevel,
      }, tx);
    });

    return NextResponse.json({ message: `${item.name} возвращён в инвентарь` });
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_RETRIEVED') {
      return NextResponse.json({ error: 'Предмет уже был извлечён' }, { status: 409 });
    }
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

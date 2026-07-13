import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { getOrCreateVault } from '@/lib/economy/account-vault';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { amount } = await req.json();
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Неверное количество' }, { status: 400 });
    }

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!player.accountId) {
      return NextResponse.json({ error: 'Общий сейф доступен после создания второго персонажа' }, { status: 400 });
    }

    try {
      await db.$transaction(async (tx) => {
        const dec = await tx.player.updateMany({
          where: { id: player.id, crownShards: { gte: amount } },
          data: { crownShards: { decrement: amount } },
        });
        if (dec.count === 0) throw new Error('NOT_ENOUGH_SHARDS');

        await getOrCreateVault(tx, player.accountId!);
        await tx.accountVault.update({
          where: { accountId: player.accountId! },
          data: { crownShards: { increment: amount } },
        });
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'NOT_ENOUGH_SHARDS') {
        return NextResponse.json({ error: 'Недостаточно Осколков Короны' }, { status: 400 });
      }
      throw e;
    }

    const updated = await db.player.findUnique({
      where: { id: player.id },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({ message: `+${amount} 👑 в общий сейф`, player: updated });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

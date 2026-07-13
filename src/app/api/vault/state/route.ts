import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { VAULT_ITEM_CAPACITY } from '@/lib/economy/account-vault';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    if (!player.accountId) {
      return NextResponse.json({ available: false, gold: 0, crownShards: 0, items: [], capacity: VAULT_ITEM_CAPACITY });
    }

    const vault = await db.accountVault.findUnique({
      where: { accountId: player.accountId },
      include: { items: true },
    });

    return NextResponse.json({
      available: true,
      gold: vault?.gold ?? 0,
      crownShards: vault?.crownShards ?? 0,
      items: vault?.items ?? [],
      capacity: VAULT_ITEM_CAPACITY,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

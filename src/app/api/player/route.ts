import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  const player = await db.player.findUnique({
    where: { telegramId },
    include: { inventory: true, quests: true, creation: true },
  });

  if (!player) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({ exists: true, player });
}

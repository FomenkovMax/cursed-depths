import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    let player = await db.player.findUnique({
      where: { telegramId },
      include: { inventory: true, quests: true, creation: true },
    });

    if (!player) {
      // Auto-migration: if no player found for this Telegram ID,
      // but a test_dev_123 player exists, migrate it to this real ID.
      // This handles the case where the game was tested before Telegram auth was set up.
      if (telegramId !== 'test_dev_123') {
        const testPlayer = await db.player.findUnique({
          where: { telegramId: 'test_dev_123' },
        });
        if (testPlayer) {
          console.log('[API] Auto-migrating test_dev_123 player to real Telegram ID:', telegramId);
          try {
            player = await db.player.update({
              where: { id: testPlayer.id },
              data: { telegramId },
              include: { inventory: true, quests: true, creation: true },
            });
            console.log('[API] Migration successful for player:', player.name);
          } catch (migrationErr) {
            console.error('[API] Migration failed:', migrationErr);
            // If migration fails, just return exists: false so user can create a new character
          }
        }
      }

      if (!player) {
        return NextResponse.json({ exists: false });
      }
    }

    return NextResponse.json({ exists: true, player });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

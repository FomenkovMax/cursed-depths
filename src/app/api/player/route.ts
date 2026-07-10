import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { issueChainQuests } from '@/lib/quests';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    let player = await db.player.findUnique({
      where: { telegramId },
      include: {
        inventory: true,
        quests: true,
        creation: true,
        race: true,
        class: { include: { abilities: true } },
      },
    });

    if (!player) {
      return NextResponse.json({ exists: false });
    }

    // Бэкфилл квестовых цепочек для персонажей, созданных до появления этой фичи — дешёвая
    // проверка на уже загруженном player.quests, без лишних запросов для всех остальных.
    if (!player.quests.some(q => q.questId.startsWith('chain_'))) {
      await issueChainQuests(db, player.id);
      player = await db.player.findUnique({
        where: { telegramId },
        include: {
          inventory: true,
          quests: true,
          creation: true,
          race: true,
          class: { include: { abilities: true } },
        },
      });
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

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const players = await db.player.findMany({
      orderBy: [{ level: 'desc' }, { xp: 'desc' }],
      take: 10,
      select: {
        name: true,
        race: true,
        class: true,
        level: true,
        xp: true,
        gold: true,
      },
    });

    return NextResponse.json({ leaderboard: players });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

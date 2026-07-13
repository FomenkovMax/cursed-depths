import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { currentWeekId } from '@/lib/social/fortress';
import { pickWeeklyEnemy } from '@/lib/social/weekly-challenge';

const LEADERBOARD_SIZE = 10;

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const weekId = currentWeekId();
    const enemy = pickWeeklyEnemy(weekId);

    const [myResult, leaderboard] = await Promise.all([
      db.weeklyChallengeResult.findUnique({ where: { weekId_playerId: { weekId, playerId: player.id } } }),
      db.weeklyChallengeResult.findMany({
        where: { weekId, won: true },
        orderBy: [{ turnsTaken: 'asc' }, { hpPercentRemaining: 'desc' }],
        take: LEADERBOARD_SIZE,
        include: { player: { select: { name: true } } },
      }),
    ]);

    return NextResponse.json({
      weekId,
      target: { enemyId: enemy.id, nameRu: enemy.nameRu, icon: enemy.icon, hp: enemy.hp },
      attempted: !!myResult,
      myResult: myResult ? { won: myResult.won, turnsTaken: myResult.turnsTaken, hpPercentRemaining: myResult.hpPercentRemaining } : null,
      leaderboard: leaderboard.map(r => ({ name: r.player.name, turnsTaken: r.turnsTaken, hpPercentRemaining: r.hpPercentRemaining })),
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

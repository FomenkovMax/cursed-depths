import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { leagueForRating } from '@/lib/pvp';

const OPPONENT_COUNT = 8;

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    // SQLite/libsql через Prisma не умеет ORDER BY ABS(rating - X) — при небольшом числе
    // игроков в этой игре проще и надёжнее вытянуть кандидатов и отсортировать в JS, чем
    // городить сырой SQL ради этой одной выборки.
    const candidates = await db.player.findMany({
      where: { id: { not: player.id } },
      select: { id: true, name: true, level: true, pvpRating: true, pvpWins: true, pvpLosses: true, class: { select: { name: true, icon: true } } },
    });

    const opponents = candidates
      .sort((a, b) => Math.abs(a.pvpRating - player.pvpRating) - Math.abs(b.pvpRating - player.pvpRating))
      .slice(0, OPPONENT_COUNT)
      .map(c => ({
        id: c.id,
        name: c.name,
        level: c.level,
        pvpRating: c.pvpRating,
        pvpWins: c.pvpWins,
        pvpLosses: c.pvpLosses,
        league: leagueForRating(c.pvpRating),
        class: c.class,
      }));

    return NextResponse.json({
      opponents,
      myRating: player.pvpRating,
      myLeague: leagueForRating(player.pvpRating),
      myWins: player.pvpWins,
      myLosses: player.pvpLosses,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

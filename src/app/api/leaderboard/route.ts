import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SEASON_REWARDS, currentSeasonId, previousSeasonId } from '@/lib/social/seasons';

/** Раздаёт награду за прошлый сезон, если она ещё не выдана — вызывается на каждый GET, но
 * реально что-то делает не чаще раза в месяц (после первого успешного запуска SeasonReward
 * для этого сезона уже существуют, и функция сразу выходит). Тот же ленивый паттерн, что и
 * бэкфилл квестовых цепочек/ачивок — никакой cron-инфраструктуры не требуется. */
async function distributePreviousSeasonRewardIfNeeded() {
  const season = previousSeasonId();
  const already = await db.seasonReward.findFirst({ where: { season } });
  if (already) return;

  const topPlayers = await db.player.findMany({
    orderBy: [{ level: 'desc' }, { xp: 'desc' }],
    take: SEASON_REWARDS.length,
  });
  if (topPlayers.length === 0) return;

  for (let i = 0; i < topPlayers.length; i++) {
    const tier = SEASON_REWARDS[i];
    const player = topPlayers[i];

    let newXp = player.xp + tier.xp;
    let newLevel = player.level;
    let newXpToNext = player.xpToNext;
    let newStatPoints = player.statPoints;
    let newMaxHp = player.maxHp;
    let leveledUp = false;
    while (newXp >= newXpToNext) {
      newXp -= newXpToNext;
      newLevel++;
      newXpToNext = newLevel * 100;
      newStatPoints += 2;
      newMaxHp += 10;
      leveledUp = true;
    }

    // findFirst выше — это защита от гонки на уровне "сезон уже обработан", но между ним и
    // этой записью два параллельных запроса всё ещё теоретически могли пройти проверку оба —
    // @@unique([season, rank]) на SeasonReward делает повторную запись невозможной атомарно,
    // create() второго конкурента просто упадёт, ловим и игнорируем.
    try {
      await db.$transaction(async (tx) => {
        await tx.seasonReward.create({
          data: { season, rank: tier.rank, playerId: player.id, rewardGold: tier.gold, rewardXp: tier.xp },
        });
        await tx.player.update({
          where: { id: player.id },
          data: {
            gold: { increment: tier.gold },
            xp: newXp,
            ...(leveledUp ? { level: newLevel, xpToNext: newXpToNext, statPoints: newStatPoints, maxHp: newMaxHp } : {}),
          },
        });
      });
    } catch {
      // Уникальный индекс (season, rank) уже занят — награду за это место кто-то уже выдал.
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    await distributePreviousSeasonRewardIfNeeded();

    // По умолчанию — рейтинг по уровню, как и раньше. sort=abyss переключает на рекорд глубины
    // Бездонного Разлома (bestAbyssDepth, lib/combat/abyss.ts) — отдельный endgame-контент со
    // своей метрикой прогресса, которая раньше нигде не сравнивалась между игроками.
    const sortBy = req.nextUrl.searchParams.get('sort') === 'abyss' ? 'abyss' : 'level';

    const players = await db.player.findMany({
      orderBy: sortBy === 'abyss'
        ? [{ bestAbyssDepth: 'desc' }, { level: 'desc' }]
        : [{ level: 'desc' }, { xp: 'desc' }],
      take: 10,
      select: {
        id: true,
        name: true,
        race: { select: { name: true, icon: true } },
        class: { select: { name: true, icon: true } },
        level: true,
        xp: true,
        gold: true,
        activeTitleId: true,
        bestAbyssDepth: true,
      },
    });

    const previousSeasonWinners = await db.seasonReward.findMany({
      where: { season: previousSeasonId() },
      orderBy: { rank: 'asc' },
      include: { player: { select: { name: true, class: { select: { icon: true } } } } },
    });

    return NextResponse.json({
      leaderboard: players,
      currentSeason: currentSeasonId(),
      previousSeason: previousSeasonId(),
      previousSeasonWinners,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

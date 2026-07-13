import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { leagueForRating } from '@/lib/combat/pvp';
import { currentPvpSeasonId, previousPvpSeasonId, daysUntilPvpSeasonEnd, softResetRating, leagueScore, PVP_SEASON_TOP_N } from '@/lib/social/pvp-season';

const OPPONENT_COUNT = 8;

/** Раздаёт награду за прошлый сезон Арены и мягко сбрасывает рейтинг ВСЕХ игроков — вызывается
 * на каждый GET, но реально что-то делает не чаще раза в ~7 недель (после первого успешного
 * запуска для этого сезона PvpSeasonReward уже существуют, функция сразу выходит). Тот же
 * ленивый паттерн, что у distributePreviousSeasonRewardIfNeeded в api/leaderboard/route.ts —
 * НО с одним важным отличием: здесь есть побочный эффект (сброс рейтинга ВСЕХ игроков), а не
 * только начисление топ-N, поэтому гонка двух параллельных запросов гейтится ЖЁСТКО через
 * создание ИМЕННО записи за 1-е место — если она не удалась (кто-то её уже создал), выходим
 * сразу же, не трогая рейтинги вообще. Без этого гейта два одновременных запроса на границе
 * сезона применили бы сжатие рейтинга дважды подряд.
 */
async function distributePreviousPvpSeasonRewardIfNeeded() {
  const season = previousPvpSeasonId();
  const already = await db.pvpSeasonReward.findFirst({ where: { season } });
  if (already) return;

  // Ранжируем по leagueScore (pvpRating + PvE-очки сезона), не по чистому pvpRating — см.
  // комментарий в lib/social/pvp-season.ts. SQLite/libsql через Prisma не умеет ORDER BY по
  // сумме двух колонок — сортируем в JS, тот же приём, что и ниже для подбора соперников.
  const allPlayers = (await db.player.findMany({
    select: { id: true, pvpRating: true, leagueBonusScore: true },
  })).sort((a, b) => leagueScore(b.pvpRating, b.leagueBonusScore) - leagueScore(a.pvpRating, a.leagueBonusScore));
  if (allPlayers.length === 0) return;

  const topPlayers = allPlayers.slice(0, PVP_SEASON_TOP_N);

  try {
    await db.pvpSeasonReward.create({
      data: { season, rank: 1, playerId: topPlayers[0].id, ratingAtEnd: topPlayers[0].pvpRating },
    });
  } catch {
    return; // Кто-то уже выиграл гонку за этот сезон — рейтинги не трогаем.
  }

  for (let i = 1; i < topPlayers.length; i++) {
    await db.pvpSeasonReward.create({
      data: { season, rank: i + 1, playerId: topPlayers[i].id, ratingAtEnd: topPlayers[i].pvpRating },
    }).catch(() => {});
  }

  for (const p of allPlayers) {
    const newRating = softResetRating(p.pvpRating);
    // leagueBonusScore обнуляется целиком (не смягчается, в отличие от рейтинга) — это очки
    // ЗА ТЕКУЩИЙ сезон, у следующего сезона свой набор PvE-активности с нуля.
    if (newRating !== p.pvpRating || p.leagueBonusScore !== 0) {
      await db.player.update({
        where: { id: p.id },
        data: { pvpRating: newRating, leagueBonusScore: 0 },
      }).catch(() => {});
    }
  }
}

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    await distributePreviousPvpSeasonRewardIfNeeded();

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

    const previousSeasonTop3 = await db.pvpSeasonReward.findMany({
      where: { season: previousPvpSeasonId() },
      orderBy: { rank: 'asc' },
      include: { player: { select: { name: true, class: { select: { icon: true } } } } },
    });

    // Живая таблица ТЕКУЩЕГО сезона (не сохраняется — пересчитывается на каждый запрос) —
    // в отличие от previousSeasonTop3 (заморожена в конце сезона), тут видно, как PvE-очки
    // (данжи/испытания/экспедиции) двигают место в лиге прямо сейчас, посреди сезона.
    const seasonStandings = (await db.player.findMany({
      select: { id: true, name: true, pvpRating: true, leagueBonusScore: true, class: { select: { icon: true } } },
    }))
      .sort((a, b) => leagueScore(b.pvpRating, b.leagueBonusScore) - leagueScore(a.pvpRating, a.leagueBonusScore))
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        name: p.name,
        class: p.class,
        pvpRating: p.pvpRating,
        leagueBonusScore: p.leagueBonusScore,
        leagueScore: leagueScore(p.pvpRating, p.leagueBonusScore),
      }));

    return NextResponse.json({
      opponents,
      myRating: player.pvpRating,
      myLeagueBonusScore: player.leagueBonusScore,
      myLeagueScore: leagueScore(player.pvpRating, player.leagueBonusScore),
      myLeague: leagueForRating(player.pvpRating),
      myWins: player.pvpWins,
      myLosses: player.pvpLosses,
      seasonId: currentPvpSeasonId(),
      daysUntilSeasonEnd: daysUntilPvpSeasonEnd(),
      previousSeasonTop3,
      seasonStandings,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

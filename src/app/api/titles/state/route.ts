import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { TITLE_CATALOG, type TitleRequirementContext } from '@/lib/titles';
import { isPremiumActive } from '@/lib/premium-shop';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({
      where: { telegramId: auth.telegramId },
      include: { guildMember: { include: { guild: true } } },
    });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const premiumActive = isPremiumActive(player.premiumUntil);
    if (!premiumActive) {
      return NextResponse.json({ premiumActive: false, titles: [], activeTitleId: null });
    }

    const [trophyCount, achievementCount, petCount, starPurchaseCount] = await Promise.all([
      db.playerBossTrophy.count({ where: { playerId: player.id, killCount: { gt: 0 } } }),
      db.playerAchievement.count({ where: { playerId: player.id } }),
      db.playerPet.count({ where: { playerId: player.id } }),
      db.starPurchase.count({ where: { playerId: player.id } }),
    ]);

    const ctx: TitleRequirementContext = {
      level: player.level,
      totalKills: player.totalKills,
      pvpWins: player.pvpWins,
      pvpRating: player.pvpRating,
      bestAbyssDepth: player.bestAbyssDepth,
      trophyCount,
      achievementCount,
      petCount,
      everPurchasedShards: starPurchaseCount > 0,
      isGuildLeader: !!player.guildMember && player.guildMember.guild.leaderId === player.id,
      premiumActive,
    };

    const titles = TITLE_CATALOG.map(t => ({
      id: t.id,
      nameRu: t.nameRu,
      icon: t.icon,
      colorClass: t.colorClass,
      descriptionRu: t.descriptionRu,
      unlocked: t.check(ctx),
      equipped: player.activeTitleId === t.id,
    }));

    return NextResponse.json({ premiumActive: true, titles, activeTitleId: player.activeTitleId });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

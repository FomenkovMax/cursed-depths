import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { findTitle, type TitleRequirementContext } from '@/lib/social/titles';
import { isPremiumActive } from '@/lib/premium/premium-shop';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { titleId } = await req.json(); // titleId === null снимает активный титул

    const player = await db.player.findUnique({
      where: { telegramId: auth.telegramId },
      include: { guildMember: { include: { guild: true } } },
    });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!isPremiumActive(player.premiumUntil)) {
      return NextResponse.json({ error: 'Титулы доступны только с активным премиум-статусом' }, { status: 403 });
    }

    if (titleId !== null) {
      const title = findTitle(titleId);
      if (!title) return NextResponse.json({ error: 'Титул не найден' }, { status: 404 });

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
        premiumActive: true,
      };
      if (!title.check(ctx)) {
        return NextResponse.json({ error: 'Условие для этого титула ещё не выполнено' }, { status: 400 });
      }
    }

    const updated = await db.player.update({
      where: { telegramId: auth.telegramId },
      data: { activeTitleId: titleId },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({
      message: titleId ? `Активный титул: ${findTitle(titleId)?.nameRu}` : 'Титул снят',
      player: updated,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

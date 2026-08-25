import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { resolveFortressCycleIfNeeded, ASSAULT_DAILY_CAP, FORTRESS_NAME, FORTRESS_LORE } from '@/lib/social/fortress';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({
      where: { telegramId: auth.telegramId },
      include: {
        guildMember: { include: { guild: { select: { id: true, name: true, tag: true } } } },
        dailyLimits: true,
      },
    });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const fortress = await resolveFortressCycleIfNeeded(db);

    const controllingGuild = fortress.controllingGuildId
      ? await db.guild.findUnique({ where: { id: fortress.controllingGuildId }, select: { id: true, name: true, tag: true } })
      : null;

    const contributions = await db.fortressContribution.findMany({
      where: { fortressId: fortress.id, cycleId: fortress.cycleId },
      include: { guild: { select: { name: true, tag: true } } },
    });
    const byGuild = new Map<string, { name: string; tag: string; points: number }>();
    for (const c of contributions) {
      const existing = byGuild.get(c.guildId);
      if (existing) existing.points += c.points;
      else byGuild.set(c.guildId, { name: c.guild.name, tag: c.guild.tag, points: c.points });
    }
    const standings = Array.from(byGuild.entries())
      .map(([guildId, v]) => ({ guildId, ...v }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    const today = new Date().toISOString().split('T')[0];
    const assaultsToday = player.dailyLimits?.fortressAssaultDate === today ? player.dailyLimits.fortressAssaultsToday : 0;

    return NextResponse.json({
      name: FORTRESS_NAME,
      lore: FORTRESS_LORE,
      cycleId: fortress.cycleId,
      controllingGuild,
      standings,
      myGuildId: player.guildMember?.guild.id ?? null,
      assaultsLeftToday: Math.max(0, ASSAULT_DAILY_CAP - assaultsToday),
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

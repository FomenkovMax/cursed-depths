import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { guildMember: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!player.guildMember) return NextResponse.json({ guild: null });

    const guild = await db.guild.findUnique({
      where: { id: player.guildMember.guildId },
      include: {
        members: {
          include: { player: { include: { class: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        upgrades: { select: { upgradeId: true } },
      },
    });

    return NextResponse.json({ guild });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

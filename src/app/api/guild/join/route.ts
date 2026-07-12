import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';

const MAX_GUILD_SIZE = 30;

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const guildId = body?.guildId;
    if (!guildId) return NextResponse.json({ error: 'Укажите ID гильдии' }, { status: 400 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { guildMember: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.guildMember) return NextResponse.json({ error: 'Вы уже состоите в гильдии' }, { status: 400 });

    const guild = await db.guild.findUnique({ where: { id: guildId }, include: { members: true } });
    if (!guild) return NextResponse.json({ error: 'Гильдия не найдена' }, { status: 404 });
    if (guild.members.length >= MAX_GUILD_SIZE) return NextResponse.json({ error: 'Гильдия уже заполнена' }, { status: 400 });

    await db.guildMember.create({ data: { guildId: guild.id, playerId: player.id } });

    const updated = await db.guild.findUnique({
      where: { id: guild.id },
      include: {
        members: { include: { player: { include: { class: true } } }, orderBy: { joinedAt: 'asc' } },
        upgrades: { select: { upgradeId: true } },
      },
    });
    return NextResponse.json({ guild: updated });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

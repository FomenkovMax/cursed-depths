import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';

const NAME_RE = /^[\p{L}0-9 '-]{3,24}$/u;
const TAG_RE = /^[A-Za-zА-Яа-яЁё0-9]{2,6}$/u;

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = String(body?.name ?? '').trim();
    const tag = String(body?.tag ?? '').trim().toUpperCase();

    if (!NAME_RE.test(name)) {
      return NextResponse.json({ error: 'Название гильдии: 3-24 символа (буквы, цифры, пробел, дефис)' }, { status: 400 });
    }
    if (!TAG_RE.test(tag)) {
      return NextResponse.json({ error: 'Тег гильдии: 2-6 букв/цифр' }, { status: 400 });
    }

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { guildMember: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.guildMember) return NextResponse.json({ error: 'Вы уже состоите в гильдии' }, { status: 400 });

    const nameTaken = await db.guild.findUnique({ where: { name } });
    if (nameTaken) return NextResponse.json({ error: 'Это название уже занято' }, { status: 400 });

    const guild = await db.guild.create({
      data: {
        name,
        tag,
        leaderId: player.id,
        members: { create: { playerId: player.id } },
      },
      include: {
        members: { include: { player: { include: { class: true } } }, orderBy: { joinedAt: 'asc' } },
        upgrades: { select: { upgradeId: true } },
      },
    });

    return NextResponse.json({ guild });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

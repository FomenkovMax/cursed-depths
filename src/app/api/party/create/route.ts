import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { partyMember: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.partyMember) return NextResponse.json({ error: 'Вы уже состоите в пати' }, { status: 400 });

    const party = await db.party.create({
      data: {
        leaderId: player.id,
        members: { create: { playerId: player.id } },
      },
      include: { members: { include: { player: { include: { class: true } } } }, combat: true },
    });

    return NextResponse.json({ party });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

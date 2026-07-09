import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';

const MAX_PARTY_SIZE = 6;

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const partyId = body?.partyId;
    if (!partyId) return NextResponse.json({ error: 'Укажите ID пати' }, { status: 400 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { partyMember: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.partyMember) return NextResponse.json({ error: 'Вы уже состоите в пати' }, { status: 400 });

    const party = await db.party.findUnique({ where: { id: partyId }, include: { members: true } });
    if (!party) return NextResponse.json({ error: 'Пати не найдена' }, { status: 404 });
    if (party.status !== 'forming') return NextResponse.json({ error: 'В эту пати нельзя вступить сейчас' }, { status: 400 });
    if (party.members.length >= MAX_PARTY_SIZE) return NextResponse.json({ error: 'Пати уже заполнена' }, { status: 400 });

    await db.partyMember.create({ data: { partyId: party.id, playerId: player.id } });

    const updated = await db.party.findUnique({
      where: { id: party.id },
      include: { members: { include: { player: { include: { class: true } } } }, combat: true },
    });
    return NextResponse.json({ party: updated });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

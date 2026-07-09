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
    if (!player.partyMember) return NextResponse.json({ error: 'Вы не состоите в пати' }, { status: 400 });

    const party = await db.party.findUnique({ where: { id: player.partyMember.partyId }, include: { members: true } });
    if (!party) return NextResponse.json({ error: 'Пати не найдена' }, { status: 404 });
    if (party.status === 'in_combat') {
      return NextResponse.json({ error: 'Нельзя покинуть пати во время боя — сначала сбегите из боя' }, { status: 400 });
    }

    await db.partyMember.delete({ where: { playerId: player.id } });

    const remaining = party.members.filter(m => m.playerId !== player.id);
    if (remaining.length === 0) {
      await db.party.update({ where: { id: party.id }, data: { status: 'disbanded' } });
    } else if (party.leaderId === player.id) {
      // Лидер вышел — передаём лидерство самому давнему оставшемуся участнику.
      const next = remaining.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0];
      await db.party.update({ where: { id: party.id }, data: { leaderId: next.playerId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

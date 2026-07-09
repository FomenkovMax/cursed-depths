import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { ENEMIES } from '@/lib/game-data';
import { type PartyFightState, currentActingPlayerId } from '@/lib/party-combat-engine';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { partyMember: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!player.partyMember) return NextResponse.json({ error: 'Вы не состоите в пати' }, { status: 400 });

    const party = await db.party.findUnique({
      where: { id: player.partyMember.partyId },
      include: { combat: true },
    });
    if (!party || !party.combat) return NextResponse.json({ combat: null });
    const combat = party.combat;

    let state: PartyFightState | null = null;
    try {
      state = JSON.parse(combat.state);
    } catch {
      state = null;
    }

    const memberRows = state
      ? await db.player.findMany({
          where: { id: { in: state.turnOrder } },
          select: { id: true, name: true, hp: true, maxHp: true, level: true, class: { select: { name: true, icon: true } } },
        })
      : [];

    const enemyTemplate = ENEMIES.find(e => e.id === combat.enemyId);

    return NextResponse.json({
      combat,
      state,
      members: memberRows,
      currentActingPlayerId: state ? currentActingPlayerId(state) : null,
      enemy: enemyTemplate ? { id: enemyTemplate.id, nameRu: enemyTemplate.nameRu, icon: enemyTemplate.icon, ac: enemyTemplate.ac, damage: enemyTemplate.damage } : null,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

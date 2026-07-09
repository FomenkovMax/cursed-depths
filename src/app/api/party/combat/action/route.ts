import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { resolvePartyAction } from '@/lib/party-combat-resolver';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, abilityId } = body;

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, select: { id: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const outcome = await resolvePartyAction(player.id, action, abilityId);
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });

    return NextResponse.json({
      combat: outcome.combat,
      combatOver: outcome.combatOver,
      partyWon: outcome.partyWon,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

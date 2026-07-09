import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { ENEMIES } from '@/lib/game-data';
import { type PartyFightState, currentActingPlayerId, AFK_TIMEOUT_MS } from '@/lib/party-combat-engine';
import { resolvePartyAction } from '@/lib/party-combat-resolver';

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
    let combat = party.combat;

    // Автопропуск "отошедшего" (AFK) хода — своего крона в serverless-деплое нет, поэтому эту
    // проверку делает GET-состояние, которое и так поллят все участники каждые ~2с, пока идёт
    // бой: если текущий actor не действовал дольше AFK_TIMEOUT_MS, за него резолвится 'defend'
    // тем же путём, что и обычный клик (см. resolvePartyAction в party-combat-resolver.ts), и
    // очередь передаётся дальше. Ограничение числа итераций — на случай, если несколько
    // участников подряд отошли одновременно; resolvePartyAction сам безопасен при гонке
    // нескольких одновременных GET-запросов, поскольку каждый раз заново проверяет по свежим
    // данным из БД, что actingPlayerId всё ещё реально ходит — если очередь уже сдвинул кто-то
    // другой, вызов просто вернёт ok:false, и цикл ниже тихо остановится.
    const AFK_SKIP_ITERATION_LIMIT = 6; // с запасом даже для макс. пати из 6 участников
    for (let i = 0; i < AFK_SKIP_ITERATION_LIMIT && combat.status === 'active'; i++) {
      let liveState: PartyFightState | null = null;
      try { liveState = JSON.parse(combat.state); } catch { break; }
      if (!liveState) break;
      const startedAt = liveState.turnStartedAt ?? Date.now();
      if (Date.now() - startedAt <= AFK_TIMEOUT_MS) break;
      const actingId = currentActingPlayerId(liveState);
      if (!actingId) break;
      const outcome = await resolvePartyAction(actingId, 'defend', undefined, true);
      if (!outcome.ok) break;
      combat = outcome.combat;
      if (combat.status !== 'active') break;
    }

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
      enemy: enemyTemplate
        ? {
            id: enemyTemplate.id,
            nameRu: enemyTemplate.nameRu,
            icon: enemyTemplate.icon,
            ac: enemyTemplate.ac,
            damage: enemyTemplate.damage,
            isBoss: !!enemyTemplate.isBoss,
            shieldMax: enemyTemplate.mechanics?.shieldMax ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

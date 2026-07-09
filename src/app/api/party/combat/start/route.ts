import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { ENEMIES } from '@/lib/game-data';
import { initPartyFightState, scaleEnemyHpForPartySize } from '@/lib/party-combat-engine';

export async function POST(req: NextRequest) {
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
      include: { members: { orderBy: { joinedAt: 'asc' } } },
    });
    if (!party) return NextResponse.json({ error: 'Пати не найдена' }, { status: 404 });
    if (party.leaderId !== player.id) return NextResponse.json({ error: 'Начать бой может только лидер пати' }, { status: 403 });
    if (party.status !== 'forming') return NextResponse.json({ error: 'Пати уже в бою' }, { status: 400 });

    // Враг выбирается из локации ЛИДЕРА, не требует физического совпадения locationId у всех
    // участников — как и в большинстве кооп-игр, вступление в общий бой само "телепортирует"
    // всю пати в общий инстанс. Пул и шанс босса — те же 15%, что и у одиночного /api/explore
    // (см. его же логику), чтобы пати-бой не был ни строго легче, ни отдельным особым режимом.
    const locationEnemies = ENEMIES.filter(e => e.locationId === player.locationId);
    if (locationEnemies.length === 0) {
      return NextResponse.json({ error: 'В этой локации нет подходящих врагов для группового боя' }, { status: 400 });
    }
    const bossPool = locationEnemies.filter(e => e.isBoss);
    const regularPool = locationEnemies.filter(e => !e.isBoss);
    const pool = regularPool.length === 0
      ? bossPool
      : (bossPool.length > 0 && Math.random() < 0.15 ? bossPool : regularPool);
    const enemy = pool[Math.floor(Math.random() * pool.length)];
    const scaledMaxHp = scaleEnemyHpForPartySize(enemy.hp + Math.floor(Math.random() * 5), party.members.length);

    const fightState = initPartyFightState(party.members.map(m => m.playerId), enemy.mechanics);

    // upsert, не create — PartyCombat.partyId уникален (1:1 с Party), а пати сражается не один
    // раз за всю жизнь: после победы/поражения статус возвращается в 'forming' (см.
    // combat/action/route.ts), и следующий бой переиспользует ту же строку, а не заводит новую.
    const combat = await db.$transaction(async (tx) => {
      const created = await tx.partyCombat.upsert({
        where: { partyId: party.id },
        create: {
          partyId: party.id,
          enemyId: enemy.id,
          enemyHp: scaledMaxHp,
          enemyMaxHp: scaledMaxHp,
          state: JSON.stringify(fightState),
          status: 'active',
        },
        update: {
          enemyId: enemy.id,
          enemyHp: scaledMaxHp,
          enemyMaxHp: scaledMaxHp,
          state: JSON.stringify(fightState),
          status: 'active',
        },
      });
      await tx.party.update({ where: { id: party.id }, data: { status: 'in_combat' } });
      return created;
    });

    return NextResponse.json({ combat });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ENEMIES } from '@/lib/game-data';
import { validateTelegramRequest } from '@/lib/auth';
import { initBossState } from '@/lib/combat/boss-mechanics';
import { isInActivePartyCombat } from '@/lib/combat/party-guards';
import { ABYSS_LOCATION_ID, ABYSS_MIN_LEVEL, abyssEnemyIdForDepth, abyssScaling } from '@/lib/combat/abyss';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.inCombat) return NextResponse.json({ error: 'Вы уже в бою' }, { status: 400 });
    if (player.hp <= 0) return NextResponse.json({ error: 'Вы мертвы. Отдохните в таверне.' }, { status: 400 });
    if (player.dungeonId) return NextResponse.json({ error: 'Вы уже в данже' }, { status: 400 });
    if (await isInActivePartyCombat(player.id)) {
      return NextResponse.json({ error: 'Нельзя спуститься в Разлом во время боя пати' }, { status: 400 });
    }
    if (player.locationId !== ABYSS_LOCATION_ID) {
      return NextResponse.json({ error: 'Бездонный Разлом доступен только из Верхней Глуби' }, { status: 400 });
    }
    if (player.level < ABYSS_MIN_LEVEL) {
      return NextResponse.json({ error: `Нужен ${ABYSS_MIN_LEVEL} уровень` }, { status: 400 });
    }

    const depth = 1;
    const enemyId = abyssEnemyIdForDepth(depth);
    const enemy = enemyId ? ENEMIES.find(e => e.id === enemyId) : null;
    if (!enemy) return NextResponse.json({ error: 'Ошибка Разлома: враг не найден' }, { status: 500 });

    const scaling = abyssScaling(depth);
    const enemyHp = Math.round((enemy.hp + Math.floor(Math.random() * 5)) * scaling.hpMult);

    const updated = await db.player.update({
      where: { telegramId: auth.telegramId },
      data: {
        inCombat: true,
        enemyId: enemy.id,
        enemyHp,
        enemyMaxHp: enemyHp,
        enemyIsElite: false, // у Разлома своя элита — isEliteDepth, не эта
        combatLog: JSON.stringify([{ text: `Вы спускаетесь в Бездонный Разлом. Глубина ${depth}: ${enemy.nameRu}!`, turn: 0 }]),
        bossState: JSON.stringify(initBossState(enemy.mechanics)),
        abyssDepth: depth,
        bestAbyssDepth: Math.max(player.bestAbyssDepth, depth),
      },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({
      type: 'combat',
      message: `Вы спускаетесь в Бездонный Разлом!`,
      enemy: { ...enemy, hp: enemyHp, maxHp: enemyHp },
      player: updated,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

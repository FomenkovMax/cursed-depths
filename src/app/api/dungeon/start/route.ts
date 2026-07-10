import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ENEMIES } from '@/lib/game-data';
import { validateTelegramRequest } from '@/lib/auth';
import { initBossState } from '@/lib/boss-mechanics';
import { isInActivePartyCombat } from '@/lib/party-guards';
import { findDungeon } from '@/lib/dungeons';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { dungeonId } = await req.json();
    const dungeon = dungeonId ? findDungeon(dungeonId) : null;
    if (!dungeon) return NextResponse.json({ error: 'Данж не найден' }, { status: 404 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.inCombat) return NextResponse.json({ error: 'Вы уже в бою' }, { status: 400 });
    if (player.hp <= 0) return NextResponse.json({ error: 'Вы мертвы. Отдохните в таверне.' }, { status: 400 });
    if (player.dungeonId) return NextResponse.json({ error: 'Вы уже в данже' }, { status: 400 });
    if (await isInActivePartyCombat(player.id)) {
      return NextResponse.json({ error: 'Нельзя начать данж во время боя пати' }, { status: 400 });
    }
    if (player.locationId !== dungeon.locationId) {
      return NextResponse.json({ error: 'Этот данж недоступен в текущей локации' }, { status: 400 });
    }
    if (player.level < dungeon.minLevel) {
      return NextResponse.json({ error: `Нужен ${dungeon.minLevel} уровень` }, { status: 400 });
    }

    const firstEnemyId = dungeon.regularEnemyIds[0];
    const enemy = ENEMIES.find(e => e.id === firstEnemyId);
    if (!enemy) return NextResponse.json({ error: 'Ошибка данжа: враг не найден' }, { status: 500 });

    const enemyHp = enemy.hp + Math.floor(Math.random() * 5);
    const updated = await db.player.update({
      where: { telegramId: auth.telegramId },
      data: {
        inCombat: true,
        enemyId: enemy.id,
        enemyHp,
        enemyMaxHp: enemyHp,
        combatLog: JSON.stringify([{ text: `Вы входите в ${dungeon.nameRu}. Комната 1/${dungeon.roomCount}: ${enemy.nameRu}!`, turn: 0 }]),
        bossState: JSON.stringify(initBossState(enemy.mechanics)),
        dungeonId: dungeon.id,
        dungeonRoom: 0,
      },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({
      type: 'combat',
      message: `Вы входите в ${dungeon.nameRu}!`,
      enemy: { ...enemy, hp: enemyHp, maxHp: enemyHp },
      player: updated,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

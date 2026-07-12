import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { isInActivePartyCombat } from '@/lib/combat/party-guards';
import { findTrial } from '@/lib/combat/trials';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { trialId } = await req.json();
    const trial = trialId ? findTrial(trialId) : null;
    if (!trial) return NextResponse.json({ error: 'Испытание не найдено' }, { status: 404 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.inCombat) return NextResponse.json({ error: 'Вы уже в бою' }, { status: 400 });
    if (player.hp <= 0) return NextResponse.json({ error: 'Вы мертвы. Отдохните в таверне.' }, { status: 400 });
    if (player.dungeonId) return NextResponse.json({ error: 'Вы уже в данже или испытании' }, { status: 400 });
    if (await isInActivePartyCombat(player.id)) {
      return NextResponse.json({ error: 'Нельзя начать испытание во время боя пати' }, { status: 400 });
    }
    if (player.locationId !== trial.locationId) {
      return NextResponse.json({ error: 'Это испытание недоступно в текущей локации' }, { status: 400 });
    }
    if (player.level < trial.minLevel) {
      return NextResponse.json({ error: `Нужен ${trial.minLevel} уровень` }, { status: 400 });
    }

    const updated = await db.player.update({
      where: { telegramId: auth.telegramId },
      data: { dungeonId: trial.id, dungeonRoom: 0 },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({
      type: 'junction',
      message: `Вы входите в ${trial.nameRu}.`,
      trialJunction: {
        options: trial.junctions[0].options.map(o => ({ direction: o.direction, type: o.type, label: o.label })),
      },
      player: updated,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

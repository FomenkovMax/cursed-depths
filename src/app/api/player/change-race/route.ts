import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { RACE_CHANGE_COST_SHARDS } from '@/lib/premium/premium-shop';

const STAT_FIELDS = ['strength', 'dexterity', 'vitality', 'intellect', 'willpower', 'instinct'] as const;
type StatField = typeof STAT_FIELDS[number];

const RACE_BASE_FIELD: Record<StatField, 'baseStrength' | 'baseDexterity' | 'baseVitality' | 'baseIntellect' | 'baseWillpower' | 'baseInstinct'> = {
  strength: 'baseStrength',
  dexterity: 'baseDexterity',
  vitality: 'baseVitality',
  intellect: 'baseIntellect',
  willpower: 'baseWillpower',
  instinct: 'baseInstinct',
};

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { raceSlug, classSlug } = await req.json();
    if (!raceSlug || !classSlug) {
      return NextResponse.json({ error: 'Укажите новую расу и класс' }, { status: 400 });
    }

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { race: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.inCombat) return NextResponse.json({ error: 'Нельзя менять расу во время боя' }, { status: 400 });
    if (player.crownShards < RACE_CHANGE_COST_SHARDS) {
      return NextResponse.json({ error: `Недостаточно Осколков Короны (нужно ${RACE_CHANGE_COST_SHARDS})` }, { status: 400 });
    }

    const newRace = await db.race.findUnique({ where: { slug: raceSlug } });
    const newClass = await db.gameClass.findUnique({ where: { slug: classSlug } });
    if (!newRace || !newClass) return NextResponse.json({ error: 'Неверная раса или класс' }, { status: 400 });
    if (newClass.raceId !== newRace.id) {
      return NextResponse.json({ error: 'Этот класс недоступен для выбранной расы' }, { status: 400 });
    }
    if (newRace.id === player.raceId && newClass.id === player.classId) {
      return NextResponse.json({ error: 'Вы уже эта раса и класс' }, { status: 400 });
    }

    const oldRace = player.race;

    // Сохраняем вложенные очки характеристик (allocate-stat/route.ts использует ту же формулу
    // "текущий стат минус базовый расовый" для 60%-капа) — раса меняет БАЗУ, а не то, что игрок
    // накопил левел-апами и распределением очков.
    const statUpdate: Record<string, number> = {};
    for (const field of STAT_FIELDS) {
      const oldBase = oldRace[RACE_BASE_FIELD[field]];
      const newBase = newRace[RACE_BASE_FIELD[field]];
      const allocated = Math.max(0, player[field] - oldBase);
      statUpdate[field] = newBase + allocated;
    }

    // maxHp/maxMp у игрока не пересчитываются с нуля из статов каждый раз (см. комментарий в
    // allocate-stat/route.ts) — переносим ровно разницу расовых баз в оба пула, как это уже
    // делает allocate-stat при вложении очка в Стойкость/Волю.
    const vitalityDelta = newRace.baseVitality - oldRace.baseVitality;
    const willpowerDelta = newRace.baseWillpower - oldRace.baseWillpower;
    const newMaxHp = Math.max(1, player.maxHp + vitalityDelta * 5);
    const newMaxMp = Math.max(0, player.maxMp + willpowerDelta * 2);

    const updated = await db.player.update({
      where: { telegramId: auth.telegramId },
      data: {
        raceId: newRace.id,
        classId: newClass.id,
        ...statUpdate,
        maxHp: newMaxHp,
        hp: Math.min(player.hp, newMaxHp),
        maxMp: newMaxMp,
        mp: Math.min(player.mp, newMaxMp),
        crownShards: { decrement: RACE_CHANGE_COST_SHARDS },
      },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({ message: `Раса изменена на ${newRace.name} (${newClass.name})`, player: updated });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { createCharacter } from '@/lib/character-creation';

export async function POST(req: NextRequest) {
  try {
    const auth = validateTelegramRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
    }
    const telegramId = auth.telegramId;

    const body = await req.json();
    const { name, race, className } = body;

    if (!name || !race || !className) {
      return NextResponse.json({ error: 'Укажите все обязательные поля' }, { status: 400 });
    }

    // Check if player already exists
    const existing = await db.player.findUnique({ where: { telegramId } });
    if (existing) {
      return NextResponse.json({ error: 'Персонаж уже существует' }, { status: 400 });
    }

    const raceData = await db.race.findUnique({ where: { slug: race } });
    const classData = await db.gameClass.findUnique({ where: { slug: className } });

    if (!raceData || !classData) {
      return NextResponse.json({ error: 'Неверная раса или класс' }, { status: 400 });
    }
    if (classData.raceId !== raceData.id) {
      return NextResponse.json({ error: 'Этот класс недоступен для выбранной расы' }, { status: 400 });
    }

    // Wrap player creation + starting inventory in a transaction
    const player = await db.$transaction(async (tx) => {
      const created = await createCharacter(tx, {
        telegramId,
        name,
        raceId: raceData.id,
        classId: classData.id,
        baseStrength: raceData.baseStrength,
        baseDexterity: raceData.baseDexterity,
        baseVitality: raceData.baseVitality,
        baseIntellect: raceData.baseIntellect,
        baseWillpower: raceData.baseWillpower,
        baseInstinct: raceData.baseInstinct,
      });

      // Re-fetch player with inventory, quests, race and class included
      return tx.player.findUnique({
        where: { id: created.id },
        include: {
          inventory: true,
          quests: true,
          race: true,
          class: { include: { abilities: true } },
        },
      });
    });

    return NextResponse.json({ success: true, player });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

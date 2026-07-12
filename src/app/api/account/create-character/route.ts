import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { createCharacter } from '@/lib/character-creation';
import { inactiveSlotTelegramId, MAX_CHARACTER_SLOTS } from '@/lib/account-slots';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, race, className } = body;
    if (!name || !race || !className) {
      return NextResponse.json({ error: 'Укажите все обязательные поля' }, { status: 400 });
    }

    const active = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!active) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const accountId = active.accountId ?? active.telegramId;
    const existingSlots = await db.player.count({ where: { accountId } });
    // Пока у первого слота нет accountId (самый частый случай — второй персонаж ещё ни разу не
    // создавался), count вернёт 0 — считаем это за 1 (сам active), а не как пустой аккаунт.
    const slotsUsed = active.accountId ? existingSlots : 1;
    if (slotsUsed >= MAX_CHARACTER_SLOTS) {
      return NextResponse.json({ error: `Максимум ${MAX_CHARACTER_SLOTS} персонажа на аккаунт` }, { status: 400 });
    }

    const raceData = await db.race.findUnique({ where: { slug: race } });
    const classData = await db.gameClass.findUnique({ where: { slug: className } });
    if (!raceData || !classData) {
      return NextResponse.json({ error: 'Неверная раса или класс' }, { status: 400 });
    }
    if (classData.raceId !== raceData.id) {
      return NextResponse.json({ error: 'Этот класс недоступен для выбранной расы' }, { status: 400 });
    }

    const newSlotNumber = slotsUsed + 1;

    const created = await db.$transaction(async (tx) => {
      // Первое создание второго слота — только теперь у первого слота появляется accountId
      // (самоссылка на его же telegramId, см. Player.accountId в schema.prisma).
      if (!active.accountId) {
        await tx.player.update({ where: { id: active.id }, data: { accountId } });
      }

      // Новый слот создаётся НЕактивным — с placeholder telegramId, а не настоящим. Игрок
      // переключается на него явно (POST /api/account/switch-character), а не автоматически:
      // резкая подмена всего игрового состояния сразу после создания была бы неожиданной.
      return createCharacter(tx, {
        telegramId: inactiveSlotTelegramId(accountId, newSlotNumber),
        name,
        raceId: raceData.id,
        classId: classData.id,
        baseStrength: raceData.baseStrength,
        baseDexterity: raceData.baseDexterity,
        baseVitality: raceData.baseVitality,
        baseIntellect: raceData.baseIntellect,
        baseWillpower: raceData.baseWillpower,
        baseInstinct: raceData.baseInstinct,
        accountId,
        slotNumber: newSlotNumber,
      });
    });

    return NextResponse.json({ message: `Персонаж «${created.name}» создан во втором слоте`, characterId: created.id });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

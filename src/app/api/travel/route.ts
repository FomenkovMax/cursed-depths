import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LOCATIONS } from '@/lib/game-data';
import { validateTelegramRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const { locationId } = await req.json();
    if (!locationId) return NextResponse.json({ error: 'Укажите locationId' }, { status: 400 });

    const player = await db.player.findUnique({ where: { telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.inCombat) return NextResponse.json({ error: 'Нельзя путешествовать во время боя' }, { status: 400 });

    const currentLocation = LOCATIONS.find(l => l.id === player.locationId);
    const targetLocation = LOCATIONS.find(l => l.id === locationId);

    if (!targetLocation) return NextResponse.json({ error: 'Локация не найдена' }, { status: 404 });
    if (!currentLocation?.connections.includes(locationId)) {
      return NextResponse.json({ error: 'Нельзя попасть туда из текущей локации' }, { status: 400 });
    }

    if (targetLocation.level > player.level + 2) {
      return NextResponse.json({ error: `Нужен уровень ${targetLocation.level - 2}+ для путешествия сюда` }, { status: 400 });
    }

    const updated = await db.player.update({
      where: { telegramId },
      data: { locationId },
    });

    return NextResponse.json({
      message: `Вы отправились в ${targetLocation.nameRu}`,
      location: targetLocation,
      player: updated,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

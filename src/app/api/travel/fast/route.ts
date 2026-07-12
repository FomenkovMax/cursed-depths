import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LOCATIONS } from '@/lib/game-data';
import { validateTelegramRequest } from '@/lib/auth';
import { isInActivePartyCombat } from '@/lib/combat/party-guards';
import { isPremiumActive } from '@/lib/premium/premium-shop';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { locationId } = await req.json();
    if (!locationId) return NextResponse.json({ error: 'Укажите locationId' }, { status: 400 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { visitedLocations: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!isPremiumActive(player.premiumUntil)) {
      return NextResponse.json({ error: 'Быстрое перемещение доступно только с активным премиум-статусом' }, { status: 403 });
    }
    if (player.inCombat) return NextResponse.json({ error: 'Нельзя путешествовать во время боя' }, { status: 400 });
    if (await isInActivePartyCombat(player.id)) {
      return NextResponse.json({ error: 'Нельзя путешествовать во время боя пати' }, { status: 400 });
    }

    const targetLocation = LOCATIONS.find(l => l.id === locationId);
    if (!targetLocation) return NextResponse.json({ error: 'Локация не найдена' }, { status: 404 });
    if (!player.visitedLocations.some(v => v.locationId === locationId)) {
      return NextResponse.json({ error: 'Вы ещё не бывали в этой локации — сначала доберитесь туда обычным путешествием' }, { status: 400 });
    }

    const updated = await db.player.update({
      where: { telegramId: auth.telegramId },
      data: { locationId },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({
      message: `Вы телепортировались в ${targetLocation.nameRu}`,
      location: targetLocation,
      player: updated,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

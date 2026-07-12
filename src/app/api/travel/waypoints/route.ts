import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { LOCATIONS } from '@/lib/game-data';
import { isPremiumActive } from '@/lib/premium/premium-shop';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { visitedLocations: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const premiumActive = isPremiumActive(player.premiumUntil);
    if (!premiumActive) {
      return NextResponse.json({ premiumActive: false, waypoints: [], currentLocationId: player.locationId });
    }

    const waypoints = player.visitedLocations
      .map(v => LOCATIONS.find(l => l.id === v.locationId))
      .filter((l): l is typeof LOCATIONS[0] => !!l && l.id !== player.locationId)
      .map(l => ({ id: l.id, nameRu: l.nameRu, icon: l.icon }));

    return NextResponse.json({ premiumActive: true, waypoints, currentLocationId: player.locationId });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

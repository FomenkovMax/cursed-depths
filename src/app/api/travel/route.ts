import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LOCATIONS } from '@/lib/game-data';

export async function POST(req: NextRequest) {
  const telegramId = req.headers.get('x-telegram-id');
  if (!telegramId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { locationId } = await req.json();
  if (!locationId) return NextResponse.json({ error: 'Missing locationId' }, { status: 400 });

  const player = await db.player.findUnique({ where: { telegramId } });
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  if (player.inCombat) return NextResponse.json({ error: 'Cannot travel during combat' }, { status: 400 });

  const currentLocation = LOCATIONS.find(l => l.id === player.locationId);
  const targetLocation = LOCATIONS.find(l => l.id === locationId);

  if (!targetLocation) return NextResponse.json({ error: 'Invalid location' }, { status: 404 });
  if (!currentLocation?.connections.includes(locationId)) {
    return NextResponse.json({ error: 'Cannot travel there from current location' }, { status: 400 });
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
}

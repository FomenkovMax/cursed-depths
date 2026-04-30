import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const telegramId = req.headers.get('x-telegram-id');
  if (!telegramId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const player = await db.player.findUnique({ where: { telegramId } });
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  if (player.locationId !== 'town') return NextResponse.json({ error: 'Must be in town to rest' }, { status: 400 });
  if (player.inCombat) return NextResponse.json({ error: 'Cannot rest during combat' }, { status: 400 });

  const updated = await db.player.update({
    where: { telegramId },
    data: { hp: player.maxHp, mp: player.maxMp },
  });

  return NextResponse.json({ message: 'Вы отдохнули в таверне. HP и MP полностью восстановлены!', player: updated });
}

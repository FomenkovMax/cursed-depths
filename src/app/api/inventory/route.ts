import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const telegramId = req.headers.get('x-telegram-id');
  if (!telegramId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const player = await db.player.findUnique({
    where: { telegramId },
    include: { inventory: true },
  });

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  return NextResponse.json({ inventory: player.inventory });
}

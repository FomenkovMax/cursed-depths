import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const players = await db.player.findMany({
    orderBy: [{ level: 'desc' }, { xp: 'desc' }],
    take: 10,
    select: {
      name: true,
      race: true,
      class: true,
      level: true,
      xp: true,
      gold: true,
    },
  });

  return NextResponse.json({ leaderboard: players });
}

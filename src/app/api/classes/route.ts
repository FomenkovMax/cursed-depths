import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const raceId = searchParams.get('raceId');
    const role = searchParams.get('role');

    const where: Record<string, unknown> = {};
    if (raceId) {
      where.raceId = raceId;
    }
    if (raceId === 'universal') {
      where.isUniversal = true;
      delete where.raceId;
    }
    if (role) {
      where.role = role;
    }

    const classes = await db.gameClass.findMany({
      where,
      include: { abilities: true, race: true },
      orderBy: [{ isUniversal: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(classes);
  } catch (error) {
    console.error('Failed to fetch classes:', error);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}

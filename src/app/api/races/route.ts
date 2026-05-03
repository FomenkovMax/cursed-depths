import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const races = await db.race.findMany({
      include: { classes: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(races);
  } catch (error) {
    console.error('Failed to fetch races:', error);
    return NextResponse.json({ error: 'Failed to fetch races' }, { status: 500 });
  }
}

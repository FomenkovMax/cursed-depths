import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    const where: Record<string, unknown> = {};
    if (classId) {
      where.classId = classId;
    }

    const abilities = await db.ability.findMany({
      where,
      orderBy: [{ levelReq: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(abilities);
  } catch (error) {
    console.error('Failed to fetch abilities:', error);
    return NextResponse.json({ error: 'Failed to fetch abilities' }, { status: 500 });
  }
}

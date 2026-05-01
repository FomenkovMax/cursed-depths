import { NextResponse } from 'next/server';
import { LOCATIONS } from '@/lib/game-data';
import { getCached, setCached, CACHE_TTL } from '@/lib/cache';

export async function GET() {
  try {
    const cacheKey = 'locations:all';
    let locations = getCached<typeof LOCATIONS>(cacheKey);
    if (!locations) {
      locations = LOCATIONS;
      setCached(cacheKey, locations, CACHE_TTL);
    }

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

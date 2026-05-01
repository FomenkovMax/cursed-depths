import { NextResponse } from 'next/server';
import { LOCATIONS } from '@/lib/game-data';

export async function GET() {
  return NextResponse.json({ locations: LOCATIONS });
}

import { NextRequest, NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed-data';

const SEED_SECRET = process.env.SEED_SECRET;

async function handleSeed(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!SEED_SECRET || secret !== SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await seedDatabase();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to seed database:', error);
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}

// GET is accepted alongside POST so this one-off admin operation can be
// triggered by just opening the URL in a browser (e.g. from a phone), not
// just via curl/Postman-style tooling.
export async function GET(req: NextRequest) {
  return handleSeed(req);
}

export async function POST(req: NextRequest) {
  return handleSeed(req);
}

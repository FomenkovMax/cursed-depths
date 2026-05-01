import { NextResponse } from "next/server";

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 25) || 'NOT SET',
      hasTursoUrl: !!process.env.TURSO_URL,
      tursoUrlPrefix: process.env.TURSO_URL?.substring(0, 25) || 'NOT SET',
      hasDatabaseAuthToken: !!process.env.DATABASE_AUTH_TOKEN,
      nodeEnv: process.env.NODE_ENV,
    }
  };

  try {
    const { db } = await import('@/lib/db');
    const enemyCount = await db.enemy.count();
    const playerCount = await db.player.count();
    diagnostics.database = {
      connected: true,
      playerCount,
      enemyCount,
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    const errName = error instanceof Error ? error.constructor.name : 'Unknown';
    diagnostics.database = {
      connected: false,
      errorType: errName,
      error: errMessage.substring(0, 500),
    };
  }

  return NextResponse.json(diagnostics);
}

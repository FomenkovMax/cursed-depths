import { NextResponse } from "next/server";

export async function GET() {
  // Diagnostic: check database connection
  const diagnostics: Record<string, unknown> = {
    message: "Hello, world!",
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) || 'NOT SET',
      hasTursoUrl: !!process.env.TURSO_URL,
      tursoUrlPrefix: process.env.TURSO_URL?.substring(0, 20) || 'NOT SET',
      hasDatabaseAuthToken: !!process.env.DATABASE_AUTH_TOKEN,
      nodeEnv: process.env.NODE_ENV,
    }
  };

  try {
    const { db } = await import('@/lib/db');
    const playerCount = await db.player.count();
    const enemyCount = await db.enemy.count();
    diagnostics.database = {
      connected: true,
      playerCount,
      enemyCount,
    };
  } catch (error: unknown) {
    diagnostics.database = {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return NextResponse.json(diagnostics);
}
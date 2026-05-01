import { NextResponse } from "next/server";

export async function GET() {
  // Diagnostic: check database connection step by step
  const diagnostics: Record<string, unknown> = {
    message: "Hello, world!",
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) || 'NOT SET',
      hasTursoUrl: !!process.env.TURSO_URL,
      tursoUrlPrefix: process.env.TURSO_URL?.substring(0, 30) || 'NOT SET',
      hasDatabaseAuthToken: !!process.env.DATABASE_AUTH_TOKEN,
      nodeEnv: process.env.NODE_ENV,
    }
  };

  try {
    const { db } = await import('@/lib/db');
    diagnostics.prismaCreated = true;
    
    // Try a simple query
    const enemyCount = await db.enemy.count();
    diagnostics.database = {
      connected: true,
      enemyCount,
    };
  } catch (error: unknown) {
    diagnostics.prismaCreated = true;
    const errMessage = error instanceof Error ? error.message : String(error);
    const errName = error instanceof Error ? error.constructor.name : 'Unknown';
    diagnostics.database = {
      connected: false,
      errorType: errName,
      error: errMessage.substring(0, 500),
    };
    
    // Also try direct LibSQL connection to verify Turso is reachable
    try {
      const tursoUrl = process.env.TURSO_URL;
      if (tursoUrl) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createClient } = require('@libsql/client');
        const libsql = createClient({
          url: tursoUrl,
          authToken: process.env.DATABASE_AUTH_TOKEN || '',
        });
        const result = await libsql.execute('SELECT COUNT(*) as count FROM Enemy');
        diagnostics.tursoDirect = {
          connected: true,
          enemyCount: result.rows[0]?.count,
        };
      }
    } catch (tursoError: unknown) {
      diagnostics.tursoDirect = {
        connected: false,
        error: tursoError instanceof Error ? tursoError.message.substring(0, 300) : String(tursoError).substring(0, 300),
      };
    }
  }

  return NextResponse.json(diagnostics);
}
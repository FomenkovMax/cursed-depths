import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || 'file:./db/custom.db';
  // TURSO_URL takes priority — it's the actual libsql:// connection URL
  const tursoUrl = process.env.TURSO_URL;

  // If Turso URL is configured, use the LibSQL adapter for remote DB
  if (tursoUrl) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client');
    const libsql = createClient({
      url: tursoUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN || '',
    });
    const adapter = new PrismaLibSql(libsql);
    // Override datasourceUrl to satisfy Prisma schema validation
    // The adapter handles the real Turso connection
    return new PrismaClient({
      adapter,
      datasourceUrl: databaseUrl,
    });
  }

  // Also support DATABASE_URL being a libsql:// URL directly (legacy)
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('https://')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client');
    const libsql = createClient({
      url: databaseUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN || '',
    });
    const adapter = new PrismaLibSql(libsql);
    return new PrismaClient({
      adapter,
      datasourceUrl: 'file:./db/custom.db',
    });
  }

  // Local SQLite - use standard Prisma client
  return new PrismaClient();
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export default db;

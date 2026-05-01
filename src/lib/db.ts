import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || 'file:./db/custom.db';
  const tursoUrl = process.env.TURSO_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN || '';

  // If TURSO_URL is set, connect to Turso via LibSQL adapter
  if (tursoUrl) {
    const libsql = createClient({
      url: tursoUrl,
      authToken,
    });
    const adapter = new PrismaLibSql(libsql);
    // Provide a valid SQLite file: URL for Prisma schema validation
    // The adapter handles the actual Turso connection
    return new PrismaClient({
      adapter,
      datasourceUrl: 'file:./db/custom.db',
    });
  }

  // If DATABASE_URL is a libsql:// URL, use it directly (legacy support)
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('https://')) {
    const libsql = createClient({
      url: databaseUrl,
      authToken,
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

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // TURSO_URL is the actual Turso connection URL (libsql://)
  // DATABASE_URL must be a valid SQLite file: URL for Prisma schema validation
  const tursoUrl = process.env.TURSO_URL;
  const databaseUrl = process.env.DATABASE_URL || 'file:./db/custom.db';

  // If Turso URL is configured, use the LibSQL adapter
  if (tursoUrl) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client');
    const libsql = createClient({
      url: tursoUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN || '',
    });
    const adapter = new PrismaLibSql(libsql);
    return new PrismaClient({
      adapter,
    });
  }

  // Local SQLite - use standard Prisma client
  return new PrismaClient();
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export default db;

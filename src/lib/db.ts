import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || 'file:./db/custom.db';
  const tursoUrl = process.env.TURSO_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN || '';

  // If TURSO_URL is set, connect to Turso via LibSQL adapter
  // This is the production path on Vercel
  if (tursoUrl) {
    console.log('[DB] Using Turso adapter, URL:', tursoUrl.substring(0, 40) + '...');
    const adapter = new PrismaLibSql({
      url: tursoUrl,
      authToken,
    });
    return new PrismaClient({
      adapter,
    });
  }

  // If DATABASE_URL is a libsql:// URL (legacy support), use LibSQL adapter
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('https://')) {
    console.log('[DB] Using DATABASE_URL as Turso, URL:', databaseUrl.substring(0, 40) + '...');
    const adapter = new PrismaLibSql({
      url: databaseUrl,
      authToken,
    });
    return new PrismaClient({
      adapter,
    });
  }

  // Local SQLite - use standard Prisma client
  console.log('[DB] Using local SQLite:', databaseUrl);
  return new PrismaClient();
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export default db;

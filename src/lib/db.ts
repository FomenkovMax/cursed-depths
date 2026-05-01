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
  // This is the production path on Vercel
  if (tursoUrl) {
    console.log('[DB] Connecting to Turso:', tursoUrl.substring(0, 30) + '...');
    const libsql = createClient({
      url: tursoUrl,
      authToken,
    });
    const adapter = new PrismaLibSql(libsql);
    // With adapter, Prisma delegates ALL queries to the adapter
    // We must NOT pass datasourceUrl - the adapter replaces the connection entirely
    return new PrismaClient({
      adapter,
    });
  }

  // If DATABASE_URL is a libsql:// URL (legacy support), use LibSQL adapter
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('https://')) {
    console.log('[DB] Connecting to Turso via DATABASE_URL:', databaseUrl.substring(0, 30) + '...');
    const libsql = createClient({
      url: databaseUrl,
      authToken,
    });
    const adapter = new PrismaLibSql(libsql);
    return new PrismaClient({
      adapter,
    });
  }

  // Local SQLite - use standard Prisma client
  console.log('[DB] Connecting to local SQLite:', databaseUrl);
  return new PrismaClient();
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export default db;

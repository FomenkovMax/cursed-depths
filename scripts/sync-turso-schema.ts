/**
 * Синхронизирует боевую Turso-базу со схемой prisma/schema.prisma — только аддитивно (ALTER
 * TABLE ADD COLUMN / CREATE TABLE / CREATE INDEX), никогда не удаляет и не меняет существующие
 * колонки/таблицы.
 *
 * Родился из реального инцидента: после мёржа PR с новыми полями Player (dailyStreak/
 * lastActionAt/lastReminderSentDate) их забыли перенести на Turso, из-за чего ВСЕ
 * возвращающиеся игроки не могли загрузить персонажа ("no such column: main.Player.dailyStreak").
 * Раньше это чинилось разовыми scratch-скриптами вручную — теперь это постоянный, проверяемый
 * инструмент, чтобы дрейф ловился командой, а не багрепортом от игрока.
 *
 * prisma db push/migrate CLI не умеют напрямую работать с libsql:// без driverAdapters +
 * prisma.config.ts (которых в проекте сознательно нет, см. src/lib/db.ts) — поэтому берём
 * каноничный DDL диффом от пустой схемы и применяем недостающие куски сами через @libsql/client.
 *
 * Использование:
 *   npm run db:sync-turso            — только показать план (dry-run, ничего не меняет)
 *   npm run db:sync-turso -- --apply — реально применить план к TURSO_URL
 *
 * Требует TURSO_URL и DATABASE_AUTH_TOKEN в окружении — НЕ читает их из .env/.env.local
 * автоматически, чтобы случайно не задеть прод при обычном локальном запуске без явного
 * намерения (передавайте через `env TURSO_URL=... DATABASE_AUTH_TOKEN=... npm run db:sync-turso`
 * или `dotenv -e .env.turso.local -- npm run db:sync-turso`).
 */
import { createClient } from '@libsql/client';
import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const TMP_DB_PATH = './db/.sync-turso-dummy.db';

const TURSO_URL = process.env.TURSO_URL;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

if (!TURSO_URL || !DATABASE_AUTH_TOKEN) {
  console.error('Нужны TURSO_URL и DATABASE_AUTH_TOKEN в окружении (см. .env.example) — намеренно не читаются из .env автоматически.');
  process.exit(1);
}

interface TableSpec {
  name: string;
  createStatement: string;
  columns: { name: string; def: string }[];
  indexes: string[];
}

function canonicalDdl(): string {
  try {
    return execSync(
      `DATABASE_URL="file:${TMP_DB_PATH}" npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`,
      { encoding: 'utf8' },
    );
  } finally {
    if (existsSync(TMP_DB_PATH)) unlinkSync(TMP_DB_PATH);
  }
}

function parseDdl(ddl: string): TableSpec[] {
  const tables: TableSpec[] = [];
  const tableBlocks = [...ddl.matchAll(/CREATE TABLE "(\w+)" \(([\s\S]*?)\n\);/g)];
  for (const [full, name, body] of tableBlocks) {
    const lines = body.split('\n').map(l => l.trim().replace(/,$/, '')).filter(Boolean);
    const columns = lines
      .filter(l => l.startsWith('"'))
      .map(l => ({ name: l.match(/^"(\w+)"/)![1], def: l }));
    tables.push({ name, createStatement: full, columns, indexes: [] });
  }
  const indexLines = [...ddl.matchAll(/^(CREATE (?:UNIQUE )?INDEX "[^"]+" ON "(\w+)"\([^)]*\);)$/gm)];
  for (const [, stmt, tableName] of indexLines) {
    const table = tables.find(t => t.name === tableName);
    if (table) table.indexes.push(stmt);
  }
  return tables;
}

async function main() {
  const client = createClient({ url: TURSO_URL!, authToken: DATABASE_AUTH_TOKEN! });

  console.log('Генерирую каноничный DDL из текущей schema.prisma...');
  const tables = parseDdl(canonicalDdl());

  const existingTables = new Set(
    (await client.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(r => String(r.name)),
  );

  const statements: string[] = [];

  for (const table of tables) {
    if (!existingTables.has(table.name)) {
      statements.push(table.createStatement);
      statements.push(...table.indexes);
      continue;
    }
    const liveCols = new Set(
      (await client.execute(`PRAGMA table_info("${table.name}")`)).rows.map(r => String(r.name)),
    );
    for (const col of table.columns) {
      if (!liveCols.has(col.name)) {
        if (/PRIMARY KEY/.test(col.def)) {
          console.warn(`  ПРОПУЩЕНО (нельзя ADD COLUMN c PRIMARY KEY): ${table.name}.${col.name}`);
          continue;
        }
        statements.push(`ALTER TABLE "${table.name}" ADD COLUMN ${col.def};`);
      }
    }
  }

  if (statements.length === 0) {
    console.log('Дрейфа нет — Turso полностью соответствует текущей схеме.');
    return;
  }

  console.log(`\nПлан (${statements.length} стейтментов, чисто аддитивно):\n`);
  statements.forEach(s => console.log('  ' + s.replace(/\n/g, '\n  ')));

  if (!APPLY) {
    console.log('\nЭто dry-run. Чтобы реально применить: npm run db:sync-turso -- --apply');
    return;
  }

  console.log('\nПрименяю...');
  for (const [i, sql] of statements.entries()) {
    await client.execute(sql);
    console.log(`  [${i + 1}/${statements.length}] OK`);
  }
  console.log('\nГотово.');
}

main().catch(e => { console.error(e); process.exit(1); });

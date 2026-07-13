import { NextRequest, NextResponse } from 'next/server';
import { gzipSync } from 'zlib';
import { db } from '@/lib/db';

const BOT_TOKEN = process.env.BOT_TOKEN;
const BACKUP_CHAT_ID = process.env.BACKUP_CHAT_ID;

// Telegram Bot API sendDocument допускает файлы до 50 МБ — при текущем размере игры
// (несколько игроков, сотни строк инвентаря) это огромный запас, но проверяем явно, а не
// падаем молча где-то внутри fetch с непонятной ошибкой.
const TELEGRAM_DOCUMENT_LIMIT_BYTES = 45 * 1024 * 1024;

/** Резервная копия боевой БД — аудит: "ни экспорта, ни point-in-time recovery, ни даже README
 * нигде в коде/конфиге... при реальных деньгах (Stars-покупки) это риск не техдолга, а прямых
 * финансовых потерь при инциденте". Вызывается еженедельно через Vercel Cron (vercel.json).
 *
 * Целиком read-only относительно БД (только SELECT) — не может повредить прод-данные. Дамп
 * отправляется документом в Telegram-чат владельца через уже существующего бота — без новых
 * платных сервисов (тот же принцип, что и у остальных решений в проекте, см.
 * party-combat-engine.ts "нет ни WebSocket, ни платных realtime-сервисов").
 *
 * Восстановление (не автоматизировано этим PR, сознательно — за рамками "просто заведи бэкапы"):
 * скачать .json.gz, распаковать, для каждой таблицы прогнать DELETE FROM + построчный INSERT
 * через тот же db.$executeRawUnsafe (или создать новую Turso-базу и импортировать в неё).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secretParam = req.nextUrl.searchParams.get('secret');
  const expected = process.env.CRON_SECRET;
  const authorized = !!expected && (authHeader === `Bearer ${expected}` || secretParam === expected);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!BOT_TOKEN || !BACKUP_CHAT_ID) {
    return NextResponse.json({ error: 'BOT_TOKEN/BACKUP_CHAT_ID not set' }, { status: 500 });
  }

  const tables = await db.$queryRawUnsafe<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_prisma%' ESCAPE '\\'",
  );

  const dump: Record<string, unknown[]> = {};
  for (const { name } of tables) {
    dump[name] = await db.$queryRawUnsafe(`SELECT * FROM "${name}"`);
  }

  const json = JSON.stringify({ takenAt: new Date().toISOString(), tables: dump });
  const gzipped = gzipSync(Buffer.from(json, 'utf8'));

  if (gzipped.byteLength > TELEGRAM_DOCUMENT_LIMIT_BYTES) {
    console.error('[Backup] Dump exceeds Telegram document size limit:', gzipped.byteLength);
    return NextResponse.json({ error: 'Дамп превысил лимит размера документа Telegram' }, { status: 500 });
  }

  const filename = `cursed-depths-backup-${new Date().toISOString().slice(0, 10)}.json.gz`;
  const form = new FormData();
  form.append('chat_id', BACKUP_CHAT_ID);
  form.append('document', new Blob([new Uint8Array(gzipped)], { type: 'application/gzip' }), filename);
  form.append('caption', `📦 Бэкап БД Cursed Depths — ${new Date().toISOString()} (${tables.length} таблиц, ${gzipped.byteLength} байт сжато)`);

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();

  if (!data.ok) {
    console.error('[Backup] Telegram sendDocument failed:', data);
    return NextResponse.json({ error: 'Не удалось отправить бэкап в Telegram', telegram: data }, { status: 502 });
  }

  return NextResponse.json({ ok: true, tables: tables.length, sizeBytes: gzipped.byteLength });
}

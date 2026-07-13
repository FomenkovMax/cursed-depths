import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const BOT_TOKEN = process.env.BOT_TOKEN;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Проактивное push-напоминание — единственный способ вернуть игрока, не дожидаясь, пока он сам
 * откроет бота (аудит: "циклы удержания реализованы, но игра никогда не зовёт игрока обратно").
 * Вызывается раз в день через Vercel Cron (vercel.json). Шлём только тем, кто ещё не забрал
 * сегодняшнюю daily-награду (lastDailyReward !== today) — не спамим тех, кто уже заходил.
 * lastReminderSentDate защищает от дублей, если cron сработает дважды за день.
 *
 * Числовой telegramId отсеивает неактивные слоты второго персонажа (D1/D3, account-slots.ts) —
 * у них telegramId — placeholder `${accountId}__slotN`, живого Telegram-чата за ним нет.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secretParam = req.nextUrl.searchParams.get('secret');
  const expected = process.env.CRON_SECRET;
  const authorized = !!expected && (authHeader === `Bearer ${expected}` || secretParam === expected);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'BOT_TOKEN not set' }, { status: 500 });
  }

  const today = todayStr();
  const WEBAPP_URL = process.env.WEBAPP_URL || 'https://cursed-depths.vercel.app';

  // lastDailyReward/lastReminderSentDate ещё NULL у игрока, который ни разу не совершал
  // соответствующее действие — "NULL <> today" в SQL даёт NULL (не true), поэтому голый
  // { not: today } молча исключил бы таких игроков. Тот же паттерн, что в api/daily/route.ts.
  const candidates = await db.player.findMany({
    where: {
      AND: [
        { OR: [{ lastDailyReward: null }, { lastDailyReward: { not: today } }] },
        { OR: [{ lastReminderSentDate: null }, { lastReminderSentDate: { not: today } }] },
      ],
    },
    select: { id: true, telegramId: true },
  });

  const realPlayers = candidates.filter(p => /^\d+$/.test(p.telegramId));

  let sent = 0;
  let failed = 0;
  for (const player of realPlayers) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: player.telegramId,
          text: '🕯️ Пепел не остывает — тебя ждёт сегодняшняя награда в Проклятых Глубинах.',
          reply_markup: {
            inline_keyboard: [[{ text: '⚔️ Забрать награду', web_app: { url: WEBAPP_URL } }]],
          },
        }),
      });
      const data = await res.json();
      if (data.ok) sent++; else failed++; // ok:false чаще всего значит "игрок заблокировал бота"
    } catch {
      failed++;
    }
    // Помечаем попытку в любом случае — иначе заблокировавший бота игрок долбился бы каждый день.
    await db.player.update({ where: { id: player.id }, data: { lastReminderSentDate: today } }).catch(() => {});
    // Telegram: не более ~30 сообщений/сек — при текущем масштабе некритично, задел на будущее.
    await new Promise(resolve => setTimeout(resolve, 40));
  }

  return NextResponse.json({ candidates: realPlayers.length, sent, failed });
}

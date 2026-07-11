import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { findShardPack } from '@/lib/premium-shop';

const BOT_TOKEN = process.env.BOT_TOKEN;

/**
 * Создаёт ссылку на инвойс Telegram Stars через Bot API (createInvoiceLink) — единственный
 * разрешённый способ продавать цифровые товары внутри Telegram-бота/Mini App. provider_token
 * намеренно пустой: для оплаты в Stars (currency: "XTR") Telegram его не требует. Сама покупка
 * (начисление Осколков) происходит НЕ здесь, а в /api/telegram/webhook на successful_payment —
 * эта ручка только выдаёт ссылку, деньги ещё не списаны.
 */
export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'Платежи временно недоступны' }, { status: 500 });
  }

  try {
    const { packId } = await req.json();
    const pack = packId ? findShardPack(packId) : null;
    if (!pack) return NextResponse.json({ error: 'Набор не найден' }, { status: 404 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const payload = `shard_pack:${pack.id}:${auth.telegramId}`;
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: pack.nameRu,
        description: `${pack.shards} Осколков Короны для вашего искателя в Cursed Depths.`,
        payload,
        currency: 'XTR',
        prices: [{ label: pack.nameRu, amount: pack.stars }],
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('[Premium] createInvoiceLink failed:', data);
      return NextResponse.json({ error: 'Не удалось создать счёт на оплату' }, { status: 502 });
    }

    return NextResponse.json({ invoiceUrl: data.result });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}

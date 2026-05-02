import { NextRequest, NextResponse } from 'next/server';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  // Verify webhook secret token (only if secret is configured AND set in webhook)
  // Telegram sends X-Telegram-Bot-Api-Secret-Token only when secret_token was passed to setWebhook
  if (WEBHOOK_SECRET) {
    const secretHeader = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (secretHeader && secretHeader !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'BOT_TOKEN not set' }, { status: 500 });
  }

  try {
    const body = await req.json();

    const chatId = body?.message?.chat?.id;
    const text = body?.message?.text;

    if (!chatId || !text) {
      return NextResponse.json({ ok: true });
    }

    // WEBAPP_URL should point to the working URL of the game
    // Before custom domain DNS propagates, use Vercel subdomain
    // After DNS works, set WEBAPP_URL=https://cursed-depths.ru on Vercel
    const WEBAPP_URL = process.env.WEBAPP_URL || 'https://cursed-depths.vercel.app';

    if (text === '/start' || text === '/play') {
      const keyboard = {
        inline_keyboard: [[
          {
            text: '🎮 Играть в Cursed Depths',
            web_app: { url: WEBAPP_URL },
          },
        ]],
      };

      const welcomeText = text === '/start'
        ? `⚔️ Добро пожаловать в **Cursed Depths**!\n\n Dungeon crawler по правилам D&D 5e.\n\n🗡️ 9 рас • ⚔️ 5 классов • 🏰 9 локаций\n🐲 23 монстра • 📦 38+ предметов\n\nНажмите кнопку ниже, чтобы начать!`
        : `🎮 Откройте Cursed Depths для игры!`;

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeText,
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        }),
      });
    } else if (text === '/help') {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '📖 **Cursed Depths — Помощь**\n\n/start — Начать игру\n/play — Открыть игру\n/help — Эта справка\n\n🎮 Создайте персонажа, исследуйте подземелья, сражайтесь с монстрами и становитесь сильнее!',
          parse_mode: 'Markdown',
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

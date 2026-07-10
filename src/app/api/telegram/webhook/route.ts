import { NextRequest, NextResponse } from 'next/server';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  // Verify webhook secret token (only if a secret is configured).
  // Telegram sends X-Telegram-Bot-Api-Secret-Token only when secret_token was
  // passed to setWebhook (see /api/telegram/setup) — if TELEGRAM_WEBHOOK_SECRET
  // is set, the header must be present and match, not just "match if present".
  if (WEBHOOK_SECRET) {
    const secretHeader = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (secretHeader !== WEBHOOK_SECRET) {
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

    if (text.startsWith('/start') || text === '/play') {
      // Приглашение в пати/гильдию — Telegram deep-link вида t.me/<bot>?start=party_<id>
      // или t.me/<bot>?start=guild_<id> (см. PartyTab.tsx / GuildTab.tsx). Telegram
      // присылает payload после "/start " как есть, без URL-декодирования, поэтому
      // party_<id>/guild_<id> ловятся напрямую.
      const startPayload = text.startsWith('/start ') ? text.slice('/start '.length).trim() : '';
      const partyMatch = startPayload.match(/^party_(.+)$/);
      const guildMatch = startPayload.match(/^guild_(.+)$/);
      const webAppUrl = partyMatch
        ? `${WEBAPP_URL}?joinParty=${encodeURIComponent(partyMatch[1])}`
        : guildMatch
          ? `${WEBAPP_URL}?joinGuild=${encodeURIComponent(guildMatch[1])}`
          : WEBAPP_URL;

      const keyboard = {
        inline_keyboard: [[
          {
            text: partyMatch ? '🎮 Открыть игру и вступить в пати' : guildMatch ? '🎮 Открыть игру и вступить в гильдию' : '🎮 Играть в Cursed Depths',
            web_app: { url: webAppUrl },
          },
        ]],
      };

      const welcomeText = partyMatch
        ? `👥 Вас позвали в пати! Нажмите кнопку ниже, чтобы открыть игру и присоединиться.`
        : guildMatch
          ? `🏰 Вас позвали в гильдию! Нажмите кнопку ниже, чтобы открыть игру и присоединиться.`
          : text === '/start'
            ? `⚔️ Добро пожаловать в **Cursed Depths**!\n\n Dungeon crawler по правилам D&D 5e.\n\n🗡️ 6 рас • ⚔️ 26 классов • 🏰 37 локаций\n🐲 97 монстров • 📦 54 предмета\n\nНажмите кнопку ниже, чтобы начать!`
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

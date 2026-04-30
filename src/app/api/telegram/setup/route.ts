import { NextResponse } from 'next/server';

const BOT_TOKEN = process.env.BOT_TOKEN;

export async function GET() {
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'BOT_TOKEN not set' }, { status: 500 });
  }

  const WEBAPP_URL = process.env.WEBAPP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  if (!WEBAPP_URL) {
    return NextResponse.json({ error: 'WEBAPP_URL not set' }, { status: 500 });
  }

  const results: Record<string, unknown> = {};

  try {
    // Set webhook
    const webhookRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${WEBAPP_URL}/api/telegram/webhook` }),
    });
    results.webhook = await webhookRes.json();
  } catch (e) { results.webhook = { error: String(e) }; }

  try {
    // Set menu button
    const menuRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: { type: 'web_app', text: '🎮 Играть', web_app: { url: WEBAPP_URL } },
      }),
    });
    results.menuButton = await menuRes.json();
  } catch (e) { results.menuButton = { error: String(e) }; }

  try {
    // Set commands
    const cmdRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Начать игру' },
          { command: 'play', description: 'Открыть игру' },
          { command: 'help', description: 'Помощь' },
        ],
      }),
    });
    results.commands = await cmdRes.json();
  } catch (e) { results.commands = { error: String(e) }; }

  try {
    // Set description
    const descRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: '⚔️ Cursed Depths — dungeon crawler RPG по правилам D&D 5e. Исследуй проклятые глубины!',
      }),
    });
    results.description = await descRes.json();
  } catch (e) { results.description = { error: String(e) }; }

  return NextResponse.json(results);
}

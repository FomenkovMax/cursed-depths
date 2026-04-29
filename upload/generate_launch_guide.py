#!/usr/bin/env python3
"""Generate PDF: Cursed Depths Launch Guide"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ── Fonts ──
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('CarlitoBold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansMono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSansBold', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerif', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSansBold')
registerFontFamily('Carlito', normal='Carlito', bold='CarlitoBold')
registerFontFamily('LiberationSans', normal='LiberationSans', bold='LiberationSansBold')
registerFontFamily('LiberationSerif', normal='LiberationSerif', bold='LiberationSerif')

# ── Palette ──
ACCENT       = colors.HexColor('#7c31c7')
TEXT_PRIMARY  = colors.HexColor('#242320')
TEXT_MUTED    = colors.HexColor('#908d85')
BG_SURFACE   = colors.HexColor('#e2e0db')
BG_PAGE      = colors.HexColor('#f1f0ed')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# ── Page setup ──
PAGE_W, PAGE_H = A4
MARGIN = 2.0 * cm
OUTPUT = '/home/z/my-project/download/cursed_depths_launch_guide.pdf'

# ── Styles ──
title_style = ParagraphStyle(
    'DocTitle', fontName='DejaVuSans', fontSize=22, leading=30,
    textColor=ACCENT, alignment=TA_CENTER, spaceAfter=8
)
subtitle_style = ParagraphStyle(
    'DocSubtitle', fontName='Carlito', fontSize=12, leading=16,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceAfter=24
)
h1_style = ParagraphStyle(
    'H1', fontName='DejaVuSans', fontSize=16, leading=22,
    textColor=ACCENT, spaceBefore=18, spaceAfter=8
)
h2_style = ParagraphStyle(
    'H2', fontName='DejaVuSans', fontSize=13, leading=18,
    textColor=colors.HexColor('#5a1f94'), spaceBefore=12, spaceAfter=6
)
body_style = ParagraphStyle(
    'Body', fontName='DejaVuSans', fontSize=10, leading=16,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK',
    spaceBefore=0, spaceAfter=6
)
code_style = ParagraphStyle(
    'Code', fontName='DejaVuSansMono', fontSize=9, leading=13,
    textColor=colors.HexColor('#2d2d2d'), backColor=colors.HexColor('#f5f4f3'),
    leftIndent=12, rightIndent=12, spaceBefore=4, spaceAfter=4,
    borderPadding=6
)
bullet_style = ParagraphStyle(
    'Bullet', fontName='DejaVuSans', fontSize=10, leading=16,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    leftIndent=20, bulletIndent=8, spaceBefore=2, spaceAfter=2
)
header_cell = ParagraphStyle(
    'HeaderCell', fontName='DejaVuSans', fontSize=10, leading=14,
    textColor=TABLE_HEADER_TEXT, alignment=TA_CENTER
)
cell_style = ParagraphStyle(
    'Cell', fontName='DejaVuSans', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK'
)
cell_center = ParagraphStyle(
    'CellCenter', fontName='DejaVuSans', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER
)
caption_style = ParagraphStyle(
    'Caption', fontName='Carlito', fontSize=9, leading=12,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=3, spaceAfter=12
)

# ── Helpers ──
def h1(text):
    return Paragraph(f'<b>{text}</b>', h1_style)

def h2(text):
    return Paragraph(f'<b>{text}</b>', h2_style)

def body(text):
    return Paragraph(text, body_style)

def bullet(text):
    return Paragraph(f'<bullet>&bull;</bullet> {text}', bullet_style)

def code(text):
    return Paragraph(text, code_style)

def make_table(headers, rows, col_ratios=None):
    avail = PAGE_W - 2 * MARGIN
    n_cols = len(headers)
    if col_ratios:
        col_w = [r * avail for r in col_ratios]
    else:
        col_w = [avail / n_cols] * n_cols

    data = [[Paragraph(f'<b>{h}</b>', header_cell) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), cell_style) if i == 0 else Paragraph(str(c), cell_center)
                      for i, c in enumerate(row)])

    t = Table(data, colWidths=col_w, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t


# ── Build document ──
doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
    title='Cursed Depths - Launch Guide',
    author='Z.ai',
    creator='Z.ai'
)

story = []

# ── Title ──
story.append(Paragraph('<b>Cursed Depths</b>', title_style))
story.append(Paragraph('Launch Guide / Technical Overview', subtitle_style))
story.append(Spacer(1, 12))

# ── 1. Project Overview ──
story.append(h1('1. Project Overview'))
story.append(body(
    '<b>Cursed Depths</b> (in Russian: "Proklyatye Glubiny") is a Telegram Mini App RPG game built with '
    'Next.js and a grammY-powered Telegram bot. The game uses D&amp;D 5e mechanics (d20 rolls, AC, '
    'critical hits, ability modifiers) and features 5 races, 5 classes, 9 locations, 24 enemies, '
    'and 45+ items including weapons, armor, accessories, consumables, and crafting materials. '
    'The architecture consists of two main components: a Next.js web application serving as the '
    'Mini App frontend and API backend, and a Telegram bot that provides the entry point for players.'
))
story.append(Spacer(1, 6))
story.append(body(
    'The bot uses long-polling mode (via the Bun runtime) or can operate via a webhook route embedded '
    'directly into the Next.js API. The web application is exposed to the internet through a Cloudflare '
    'quick tunnel, which generates a new random URL each time it restarts. This ephemeral URL must be '
    'updated in the .env file and the Telegram webhook must be re-registered every time the tunnel restarts.'
))

# ── 2. Architecture ──
story.append(h1('2. Architecture & Components'))
story.append(body(
    'The project is split across two directory levels. The main Next.js application lives at the project '
    'root, while the separate bot service and tunnel manager are in the mini-services subdirectory. Below '
    'is a breakdown of each component and its role in the system.'
))

story.append(h2('2.1 Next.js Mini App (Frontend + API)'))
story.append(body(
    'The core game runs as a Next.js 16 application located at <font name="DejaVuSansMono">/home/z/my-project/</font>. '
    'It serves the game UI (a single-page React app using Tailwind CSS and shadcn/ui components) and exposes '
    'REST API routes for all game logic: player creation, inventory management, combat, exploration, crafting, '
    'quests, and travel. The database is SQLite via Prisma ORM. The game client runs inside the Telegram WebApp '
    'iframe and communicates with the API routes on the same server.'
))

story.append(make_table(
    ['API Route', 'Method', 'Purpose'],
    [
        ['/api/player', 'GET', 'Load player data'],
        ['/api/player/create', 'POST', 'Create new character'],
        ['/api/player/rest', 'POST', 'Rest at tavern (heal)'],
        ['/api/explore', 'POST', 'Explore current location'],
        ['/api/combat/start', 'POST', 'Start combat encounter'],
        ['/api/combat/action', 'POST', 'Perform combat action'],
        ['/api/inventory', 'GET', 'List inventory items'],
        ['/api/inventory/equip', 'POST', 'Equip/unequip item'],
        ['/api/inventory/use', 'POST', 'Use consumable item'],
        ['/api/craft', 'POST', 'Craft item from materials'],
        ['/api/quests', 'GET', 'List active quests'],
        ['/api/quests/claim', 'POST', 'Claim quest reward'],
        ['/api/travel', 'POST', 'Travel to location'],
        ['/api/daily', 'POST', 'Claim daily reward'],
        ['/api/telegram/webhook', 'POST', 'Telegram bot webhook'],
        ['/api/telegram/setup', 'GET', 'Register webhook + menu'],
    ],
    col_ratios=[0.35, 0.12, 0.53]
))
story.append(Paragraph('Table 1: API Routes of the Next.js Application', caption_style))

story.append(h2('2.2 Telegram Bot (Bun)'))
story.append(body(
    'A standalone grammY bot located at <font name="DejaVuSansMono">/home/z/my-project/mini-services/telegram-bot/</font>. '
    'It runs via Bun with hot-reload (<font name="DejaVuSansMono">bun --hot index.ts</font>) and handles '
    'four commands: /start, /play, /help, and /guide. Each command responds with game information and an '
    'inline keyboard button that opens the Mini App. The bot loads environment variables from the root .env '
    'file. This is the simpler of the two bot modes, but it requires the bot process to be running separately.'
))

story.append(h2('2.3 Telegram Bot (Webhook Mode)'))
story.append(body(
    'An alternative bot integration is embedded directly into the Next.js application via the API route '
    '<font name="DejaVuSansMono">/api/telegram/webhook</font>. Instead of long-polling, Telegram sends '
    'updates to this endpoint as HTTP POST requests. The webhook route creates a grammY Bot instance on '
    'each cold start, initializes it with <font name="DejaVuSansMono">await bot.init()</font>, and processes '
    'the incoming update. The setup route at <font name="DejaVuSansMono">/api/telegram/setup</font> registers '
    'the webhook URL, sets the menu button, and configures bot commands. This mode is more reliable because '
    'it does not require a separate long-running process.'
))

story.append(h2('2.4 Tunnel Manager'))
story.append(body(
    'Located at <font name="DejaVuSansMono">/home/z/my-project/mini-services/tunnel-manager/</font>, this '
    'Bun script manages the Cloudflare quick tunnel lifecycle. It spawns the cloudflared binary, captures '
    'the generated URL from stdout/stderr, saves it to a status JSON file, and automatically updates the '
    'Telegram bot menu button with the new URL. If the tunnel dies, the manager restarts it after a 5-second '
    'delay, making the system more resilient to tunnel failures.'
))

story.append(h2('2.5 Database (Prisma + SQLite)'))
story.append(body(
    'The database is SQLite with the file stored at <font name="DejaVuSansMono">/home/z/my-project/db/custom.db</font>. '
    'The Prisma schema defines five models: Player (character stats, location, combat state), Inventory (items, '
    'equipped slots), CharacterCreation (creation wizard state), PlayerQuest (daily and kill quests), and Enemy '
    '(enemy definitions with loot tables). The database already exists and has been seeded with game data. The '
    'Prisma client is pre-generated and available in node_modules.'
))

# ── 3. What's Already Done ──
story.append(h1('3. What Is Already Done'))
story.append(body(
    'The following components and assets are fully implemented and ready for use. This represents the current '
    'state of the project as it exists on disk, with no additional development needed for these items.'
))

done_items = [
    ('Next.js application', 'Complete game UI with character creation, combat overlay, inventory (VK-style grid), '
     'map, quests, and crafting. All API routes functional.'),
    ('Game data', '5 races, 5 classes, 9 locations, 24 enemies, 45+ items, 11 crafting recipes, '
     '6 quest templates, full rarity system (7 tiers).'),
    ('Database', 'SQLite database with Prisma schema, client generated, data file exists at /home/z/my-project/db/custom.db.'),
    ('AI-generated art', '40 item images (weapons, armor, accessories, potions, materials, quest items), '
     '23 mob images, 5 race portraits, 3 boss images, 2 background images, 4 action images.'),
    ('Combat effects', '9 effect images: slash, crit, heal, fireball, chest, levelup, shield, poison, tavern.'),
    ('Telegram bot (Bun)', 'Standalone grammY bot with /start, /play, /help, /guide commands and inline keyboard.'),
    ('Webhook integration', '/api/telegram/webhook and /api/telegram/setup routes in Next.js app.'),
    ('Tunnel manager', 'Auto-restart Cloudflare tunnel manager with URL capture and bot menu update.'),
    ('Cloudflared binary', 'Pre-installed at /home/z/my-project/bin/cloudflared (version 2026.3.0).'),
    ('Environment', 'Bun 1.3.12, Node 24.14.1, Python 3.12.13, npm 11.11.0 all available.'),
]

for label, desc in done_items:
    story.append(bullet(f'<b>{label}:</b> {desc}'))

# ── 4. What Needs To Be Done ──
story.append(h1('4. What Needs To Be Done For Launch'))
story.append(body(
    'To launch the game and make it accessible to Telegram users, follow the sequence below. Each step is '
    'mandatory and must be completed in order. The main challenge is the Cloudflare quick tunnel, which '
    'generates a new random URL on every restart and requires updating the .env file and re-registering '
    'the Telegram webhook.'
))

story.append(h2('Step 1: Start the Next.js Development Server'))
story.append(body(
    'Navigate to the project root and start the Next.js dev server on port 3000. This serves both the '
    'Mini App frontend and all API routes, including the webhook endpoint.'
))
story.append(code('cd /home/z/my-project &amp;&amp; npm run dev'))
story.append(body(
    'The dev script runs <font name="DejaVuSansMono">next dev -p 3000</font>. Wait for the "Ready" message '
    'in the console before proceeding. The server must be running on port 3000 because the Cloudflare tunnel '
    'is configured to forward traffic to that port.'
))

story.append(h2('Step 2: Start the Cloudflare Tunnel'))
story.append(body(
    'Use the pre-installed cloudflared binary to create a public tunnel pointing to the local Next.js server. '
    'This will output a URL like <font name="DejaVuSansMono">https://xxx-yyy.trycloudflare.com</font>. Copy '
    'this URL, as it is needed in the next step.'
))
story.append(code('/home/z/my-project/bin/cloudflared tunnel --url http://localhost:3000 --protocol http2'))
story.append(body(
    'Alternatively, use the tunnel manager which automatically captures the URL and updates the bot. However, '
    'for the initial setup, running cloudflared directly gives you more control and visibility into the output.'
))

story.append(h2('Step 3: Update the .env File'))
story.append(body(
    'Open <font name="DejaVuSansMono">/home/z/my-project/.env</font> and update the WEBAPP_URL variable with '
    'the new tunnel URL from Step 2. The BOT_TOKEN should already be set. After editing, the file should look like this:'
))
story.append(code(
    'DATABASE_URL=file:/home/z/my-project/db/custom.db<br/>'
    'BOT_TOKEN=8564327679:AAEleUKxPiAADChStms8VVJX-JBrmtqGOzo<br/>'
    'WEBAPP_URL=https://your-new-url.trycloudflare.com'
))
story.append(body(
    'If using the webhook mode (recommended), the .env is read by Next.js at startup. You may need to restart '
    'the Next.js dev server after changing .env for the new value to take effect. If using the standalone Bun '
    'bot, it reads .env at startup, so restart it after updating.'
))

story.append(h2('Step 4: Register the Telegram Webhook'))
story.append(body(
    'With the Next.js server running and the tunnel active, visit the setup endpoint in your browser or via curl. '
    'This registers the webhook URL with Telegram, sets the menu button (the "Play" button in the chat), '
    'configures bot commands, and sets the bot description.'
))
story.append(code('curl https://your-new-url.trycloudflare.com/api/telegram/setup'))
story.append(body(
    'A successful response will return JSON with status "ok" for each field (webhook, menuButton, commands, '
    'description, shortDescription). If any field returns an error, check that BOT_TOKEN and WEBAPP_URL are '
    'correctly set in the .env file.'
))

story.append(h2('Step 5: Verify Everything Works'))
story.append(body(
    'Open Telegram and navigate to @CursedDepthsBot. Send /start and verify that the bot responds with the '
    'welcome message and the "Play" button. Click the button to open the Mini App. If the app loads, the '
    'setup is complete. If you see a 503 Tunnel Unavailable error, the tunnel URL has likely expired and '
    'you need to restart from Step 2.'
))

story.append(h2('Optional: Start the Standalone Bot'))
story.append(body(
    'If you prefer the long-polling bot instead of the webhook integration, start it separately. Note that this '
    'is less reliable than the webhook mode because the Bun process may crash and requires manual monitoring.'
))
story.append(code('cd /home/z/my-project/mini-services/telegram-bot &amp;&amp; bun run dev'))

# ── 5. Python Alternatives ──
story.append(h1('5. Can You Run It With Python?'))
story.append(body(
    'The short answer is: <b>yes, partially</b>, but it would require significant rewriting. The current '
    'project is built on a JavaScript/TypeScript stack (Next.js + Bun + grammY), and while Python has '
    'equivalents for most components, the frontend (React/Next.js) cannot be directly replaced with Python. '
    'Below is a detailed breakdown of what can and cannot be migrated to Python.'
))

story.append(make_table(
    ['Component', 'Current Tech', 'Python Alternative', 'Effort'],
    [
        ['Telegram Bot', 'grammY (TypeScript/Bun)', 'python-telegram-bot or aiogram', 'Medium - rewrite bot logic'],
        ['API Backend', 'Next.js API Routes', 'FastAPI or Flask', 'High - rewrite all routes'],
        ['Database ORM', 'Prisma (TypeScript)', 'SQLAlchemy or Tortoise ORM', 'Medium - rewrite schema & queries'],
        ['Frontend (Mini App)', 'React + Next.js', 'No direct Python replacement', 'Cannot replace - must keep JS'],
        ['Tunnel Manager', 'Bun/TypeScript script', 'Python subprocess + asyncio', 'Low - simple rewrite'],
        ['Dice Engine', 'TypeScript functions', 'Python functions (same logic)', 'Low - straightforward port'],
        ['Game Data', 'TypeScript constants', 'Python dataclasses/dicts', 'Low - copy-paste with syntax changes'],
    ],
    col_ratios=[0.18, 0.20, 0.32, 0.30]
))
story.append(Paragraph('Table 2: Python Migration Feasibility', caption_style))

story.append(h2('5.1 What CAN Be Done in Python'))
story.append(body(
    'The Telegram bot is the easiest component to rewrite in Python. Libraries like <b>python-telegram-bot</b> '
    '(synchronous) or <b>aiogram</b> (asynchronous) provide the same functionality as grammY, including '
    'inline keyboards, web_app buttons, command handlers, and webhook support. The bot logic is minimal '
    '(four commands and a web_app_data handler), so the rewrite would take less than an hour.'
))
story.append(body(
    'The API backend can be rewritten in Python using <b>FastAPI</b>, which provides automatic OpenAPI '
    'documentation, async support, and Pydantic validation. All 16 API routes would need to be ported, '
    'along with the Prisma queries translated to SQLAlchemy. This is a significant effort (estimated 4-8 hours) '
    'but entirely feasible. The dice engine and game data are pure logic with no framework dependency and '
    'can be ported to Python in minutes.'
))
story.append(body(
    'The tunnel manager is a simple subprocess management script that could easily be rewritten in Python '
    'using the subprocess module and asyncio for the restart loop. This would take about 30 minutes.'
))

story.append(h2('5.2 What CANNOT Be Done in Python'))
story.append(body(
    'The <b>frontend (Mini App)</b> is a React single-page application that runs inside the Telegram WebApp '
    'iframe. It uses Tailwind CSS, shadcn/ui components, framer-motion animations, and the Telegram WebApp SDK. '
    'There is no Python framework that can replace this. The frontend must remain as a JavaScript/TypeScript '
    'application. Even if you rewrite the entire backend in Python (FastAPI), you would still need a JavaScript '
    'build step to serve the React frontend as static files.'
))
story.append(body(
    'Additionally, Next.js provides server-side rendering, API routes, and a unified development experience. '
    'Replacing it with a separate Python backend + static React build would increase complexity and reduce '
    'developer experience. The current architecture where the API and frontend are in the same project is '
    'intentional and beneficial for a Mini App of this scale.'
))

story.append(h2('5.3 Hybrid Approach'))
story.append(body(
    'If you strongly prefer Python, a practical hybrid approach would be: keep the Next.js frontend and API '
    'as-is, but replace the standalone Bun bot with a Python bot using aiogram. This gives you the best of '
    'both worlds: Python for the bot logic (which is simple and well-suited to Python), and Next.js for the '
    'web application (which requires JavaScript anyway). The Python bot would run as a separate process, '
    'handling /start, /play, /help, /guide commands, while the webhook integration in Next.js continues '
    'to work as a fallback.'
))

story.append(h2('5.4 Python Bot Example'))
story.append(body(
    'Below is a minimal example of how the bot could be implemented in Python using aiogram. This covers '
    'the same four commands as the current grammY bot, with the inline keyboard button that opens the Mini App.'
))
story.append(code(
    'import asyncio<br/>'
    'from aiogram import Bot, Dispatcher, types<br/>'
    'from aiogram.filters import CommandStart, Command<br/>'
    '<br/>'
    'BOT_TOKEN = "8564327679:AAEleUKxPiAADChStms8VVJX-JBrmtqGOzo"<br/>'
    'WEBAPP_URL = "https://your-tunnel-url.trycloudflare.com"<br/>'
    '<br/>'
    'bot = Bot(token=BOT_TOKEN)<br/>'
    'dp = Dispatcher()<br/>'
    '<br/>'
    '@dp.message(CommandStart())<br/>'
    'async def start_cmd(message: types.Message):<br/>'
    '    kb = types.InlineKeyboardMarkup(inline_keyboard=[[<br/>'
    '        types.InlineKeyboardButton(<br/>'
    '            text="Play Cursed Depths",<br/>'
    '            web_app=types.WebAppInfo(url=WEBAPP_URL)<br/>'
    '        )<br/>'
    '    ]])<br/>'
    '    await message.answer("Welcome to Cursed Depths!", reply_markup=kb)<br/>'
    '<br/>'
    'async def main():<br/>'
    '    await dp.start_polling(bot)<br/>'
    '<br/>'
    'asyncio.run(main())'
))

# ── 6. Quick Start Summary ──
story.append(h1('6. Quick Start Summary'))
story.append(body(
    'For reference, here is the complete launch sequence in a single checklist. Each step must be completed '
    'in order. The entire process takes about 2-3 minutes once you are familiar with it.'
))

steps = [
    ('1', 'Start Next.js', 'cd /home/z/my-project &amp;&amp; npm run dev'),
    ('2', 'Start tunnel', '/home/z/my-project/bin/cloudflared tunnel --url http://localhost:3000'),
    ('3', 'Copy tunnel URL', 'Look for https://xxx.trycloudflare.com in output'),
    ('4', 'Update .env', 'Set WEBAPP_URL to the new tunnel URL'),
    ('5', 'Restart Next.js', 'If .env was changed after server started'),
    ('6', 'Register webhook', 'curl https://NEW-URL/api/telegram/setup'),
    ('7', 'Test in Telegram', 'Open @CursedDepthsBot, send /start, click Play'),
]

story.append(make_table(
    ['Step', 'Action', 'Command / Details'],
    steps,
    col_ratios=[0.07, 0.20, 0.73]
))
story.append(Paragraph('Table 3: Launch Sequence', caption_style))

story.append(Spacer(1, 12))
story.append(body(
    '<b>Important:</b> The Cloudflare quick tunnel URL changes every time the tunnel restarts. If the game '
    'becomes inaccessible (503 error), repeat steps 2-6. For a production deployment, consider using a '
    'stable domain with a named Cloudflare tunnel, a VPS with a static IP, or a platform like Vercel or Railway.'
))

# ── 7. Key File Locations ──
story.append(h1('7. Key File Locations'))

story.append(make_table(
    ['File / Directory', 'Purpose'],
    [
        ['/home/z/my-project/.env', 'Environment variables (BOT_TOKEN, WEBAPP_URL, DATABASE_URL)'],
        ['/home/z/my-project/prisma/schema.prisma', 'Database schema (5 models)'],
        ['/home/z/my-project/db/custom.db', 'SQLite database file'],
        ['/home/z/my-project/src/app/page.tsx', 'Main game UI (React, 1800+ lines)'],
        ['/home/z/my-project/src/lib/game-data.ts', 'Game data constants and helpers'],
        ['/home/z/my-project/src/lib/dice.ts', 'Dice rolling engine (D&D 5e)'],
        ['/home/z/my-project/src/lib/db.ts', 'Prisma client singleton'],
        ['/home/z/my-project/src/app/api/', 'API routes (16 endpoints)'],
        ['/home/z/my-project/public/items/', '40 item art images (PNG)'],
        ['/home/z/my-project/public/mobs/', '23 mob art images (PNG)'],
        ['/home/z/my-project/public/effects/', '9 combat/exploration effects (PNG)'],
        ['/home/z/my-project/public/boss-*.png', '3 boss art images'],
        ['/home/z/my-project/public/char-*.png', '5 race portrait images'],
        ['/home/z/my-project/public/bg-*.jpg', '2 background images'],
        ['/home/z/my-project/mini-services/telegram-bot/index.ts', 'Standalone grammY bot'],
        ['/home/z/my-project/mini-services/tunnel-manager/index.ts', 'Tunnel manager script'],
        ['/home/z/my-project/bin/cloudflared', 'Cloudflared binary (v2026.3.0)'],
    ],
    col_ratios=[0.52, 0.48]
))
story.append(Paragraph('Table 4: Key File Locations', caption_style))

# ── Build ──
doc.build(story)
print(f'PDF generated: {OUTPUT}')

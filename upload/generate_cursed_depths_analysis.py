#!/usr/bin/env python3
"""Generate PDF: Cursed Depths - Comprehensive MVP Analysis & Improvement Plan"""
import os, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether,
    CondPageBreak,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ── Fonts ──
pdfmetrics.registerFont(TTFont('SarasaMonoSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSCBold', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('CarlitoBold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansMono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans', '/usr/share/fonts/truetype/chinese/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerif', '/usr/share/fonts/truetype/chinese/LiberationSerif-Regular.ttf'))
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSansBold')
registerFontFamily('Carlito', normal='Carlito', bold='CarlitoBold')
registerFontFamily('SarasaMonoSC', normal='SarasaMonoSC', bold='SarasaMonoSCBold')

# ── Palette (auto-generated) ──
ACCENT       = colors.HexColor('#217591')
TEXT_PRIMARY  = colors.HexColor('#1d1f21')
TEXT_MUTED    = colors.HexColor('#7e868a')
BG_SURFACE   = colors.HexColor('#dbe0e2')
BG_PAGE      = colors.HexColor('#eceff0')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE
# Secondary accent for special highlights
ACCENT2 = colors.HexColor('#1a5c73')
ACCENT_LIGHT = colors.HexColor('#e8f4f8')

# ── Page setup ──
PAGE_W, PAGE_H = A4
MARGIN = 2.0 * cm
OUTPUT = '/home/z/my-project/download/cursed_depths_mvp_analysis.pdf'

# ── Styles ──
title_style = ParagraphStyle(
    'DocTitle', fontName='DejaVuSans', fontSize=22, leading=30,
    textColor=ACCENT, alignment=TA_CENTER, spaceAfter=8
)
subtitle_style = ParagraphStyle(
    'DocSubtitle', fontName='DejaVuSans', fontSize=12, leading=16,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceAfter=24
)
h1_style = ParagraphStyle(
    'H1', fontName='DejaVuSans', fontSize=16, leading=22,
    textColor=ACCENT, spaceBefore=18, spaceAfter=8
)
h2_style = ParagraphStyle(
    'H2', fontName='DejaVuSans', fontSize=13, leading=18,
    textColor=ACCENT2, spaceBefore=12, spaceAfter=6
)
h3_style = ParagraphStyle(
    'H3', fontName='DejaVuSans', fontSize=11, leading=16,
    textColor=colors.HexColor('#2a6f88'), spaceBefore=8, spaceAfter=4
)
body_style = ParagraphStyle(
    'Body', fontName='DejaVuSans', fontSize=10, leading=16,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK',
    spaceBefore=0, spaceAfter=6
)
body_just = ParagraphStyle(
    'BodyJust', fontName='DejaVuSans', fontSize=10, leading=16,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, wordWrap='CJK',
    spaceBefore=0, spaceAfter=6
)
code_style = ParagraphStyle(
    'Code', fontName='DejaVuSansMono', fontSize=8.5, leading=12,
    textColor=colors.HexColor('#2d2d2d'), backColor=colors.HexColor('#f5f4f3'),
    leftIndent=12, rightIndent=12, spaceBefore=4, spaceAfter=4,
    borderPadding=6
)
bullet_style = ParagraphStyle(
    'Bullet', fontName='DejaVuSans', fontSize=10, leading=16,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    leftIndent=20, bulletIndent=8, spaceBefore=2, spaceAfter=2
)
numbered_style = ParagraphStyle(
    'Numbered', fontName='DejaVuSans', fontSize=10, leading=16,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    leftIndent=24, bulletIndent=8, spaceBefore=2, spaceAfter=2
)
header_cell = ParagraphStyle(
    'HeaderCell', fontName='DejaVuSans', fontSize=9.5, leading=13,
    textColor=TABLE_HEADER_TEXT, alignment=TA_CENTER
)
cell_style = ParagraphStyle(
    'Cell', fontName='DejaVuSans', fontSize=9, leading=13,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK'
)
cell_center = ParagraphStyle(
    'CellCenter', fontName='DejaVuSans', fontSize=9, leading=13,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER
)
caption_style = ParagraphStyle(
    'Caption', fontName='DejaVuSans', fontSize=9, leading=12,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=3, spaceAfter=12
)
callout_style = ParagraphStyle(
    'Callout', fontName='DejaVuSans', fontSize=10, leading=16,
    textColor=ACCENT, alignment=TA_LEFT,
    leftIndent=16, borderPadding=8, spaceBefore=6, spaceAfter=6,
    backColor=ACCENT_LIGHT
)
severity_high = colors.HexColor('#c0392b')
severity_med = colors.HexColor('#e67e22')
severity_low = colors.HexColor('#27ae60')

# ── Helpers ──
def h1(text):
    return Paragraph(f'<b>{text}</b>', h1_style)

def h2(text):
    return Paragraph(f'<b>{text}</b>', h2_style)

def h3(text):
    return Paragraph(f'<b>{text}</b>', h3_style)

def body(text):
    return Paragraph(text, body_style)

def bodyj(text):
    return Paragraph(text, body_just)

def bullet(text):
    return Paragraph(f'<bullet>&bull;</bullet> {text}', bullet_style)

def num(n, text):
    return Paragraph(f'<b>{n}.</b> {text}', numbered_style)

def code(text):
    return Paragraph(text, code_style)

def callout(text):
    return Paragraph(text, callout_style)

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

def make_idea_table(ideas, col_ratios=None):
    """Table for numbered ideas with ID, Category, Idea, Priority columns."""
    avail = PAGE_W - 2 * MARGIN
    if not col_ratios:
        col_ratios = [0.05, 0.15, 0.60, 0.10, 0.10]
    col_w = [r * avail for r in col_ratios]
    headers = ['#', '\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f', '\u0418\u0434\u0435\u044f', '\u041f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442', '\u041f\u0435\u0440\u0441\u043f\u0435\u043a\u0442\u0438\u0432\u0430']
    data = [[Paragraph(f'<b>{h}</b>', header_cell) for h in headers]]
    for idea in ideas:
        num_s, cat, text, prio, persp = idea
        prio_color = severity_high if prio == 'HIGH' else severity_med if prio == 'MED' else severity_low
        prio_style = ParagraphStyle('prio', fontName='DejaVuSans', fontSize=8.5, leading=12,
                                     textColor=colors.white, alignment=TA_CENTER, backColor=prio_color)
        data.append([
            Paragraph(f'<b>{num_s}</b>', cell_center),
            Paragraph(cat, cell_style),
            Paragraph(text, cell_style),
            Paragraph(prio, prio_style),
            Paragraph(persp, cell_center),
        ])
    t = Table(data, colWidths=col_w, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
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
    title='Cursed Depths - MVP Analysis & Improvement Plan',
    author='Z.ai',
    creator='Z.ai'
)

story = []

# ── Title ──
story.append(Spacer(1, 40))
story.append(Paragraph('<b>Cursed Depths</b>', title_style))
story.append(Paragraph('MVP Analysis, Launch Strategy & Improvement Plan<br/>Comprehensive Review for Scaling to 1,000,000 Users', subtitle_style))
story.append(Spacer(1, 12))
story.append(Paragraph('Prepared by: Z.ai | Date: 2026-04-30', ParagraphStyle(
    'Meta', fontName='DejaVuSans', fontSize=9, leading=13,
    textColor=TEXT_MUTED, alignment=TA_CENTER
)))
story.append(Spacer(1, 24))

# ═══════════════════════════════════════════════════════════
# SECTION 1: OPTIMAL LAUNCH STRATEGY
# ═══════════════════════════════════════════════════════════
story.append(h1('1. Optimal Launch Strategy for Telegram Bot'))
story.append(body(
    'The current architecture relies on a Cloudflare quick tunnel that generates ephemeral URLs on every restart, '
    'which creates a fragile operational model unsuitable for production. Below is a tiered strategy progressing from '
    'the simplest viable approach to an enterprise-grade deployment capable of serving 1,000,000+ users.'
))

story.append(h2('1.1 Recommended Architecture: Webhook Mode + Static Hosting'))
story.append(body(
    'The optimal approach for launching Cursed Depths is to use the <b>webhook mode</b> (already implemented in '
    'the Next.js app via /api/telegram/webhook) deployed on a platform with a stable domain. This eliminates the '
    'need for a separate bot process and the unreliable Cloudflare quick tunnel. The webhook mode is inherently more '
    'reliable because Telegram pushes updates to your server only when they arrive, rather than requiring a '
    'continuous long-polling connection that must be monitored and restarted on failure.'
))

story.append(make_table(
    ['Deployment Tier', 'Platform', 'Cost/Month', 'Max DAU', 'Recommendation'],
    [
        ['MVP/Launch', 'Vercel + Supabase', '$0-20', '~10,000', 'Start here'],
        ['Growth', 'Railway + PlanetScale', '$20-100', '~100,000', 'Scale to this'],
        ['Enterprise', 'AWS/GCP + RDS + CloudFront', '$200-2000', '1,000,000+', 'Final target'],
    ],
    col_ratios=[0.14, 0.22, 0.14, 0.14, 0.36]
))
story.append(Paragraph('Table 1: Deployment Tier Comparison', caption_style))

story.append(h2('1.2 MVP/Launch Tier: Vercel + Supabase (Recommended Start)'))
story.append(body(
    'Vercel is the natural deployment target for Next.js applications. It provides automatic SSL, global CDN, '
    'serverless API routes, and zero-configuration deployments. Supabase offers a hosted PostgreSQL database with '
    'real-time subscriptions and built-in authentication, which is far more scalable than SQLite for a multi-user game. '
    'The free tier of Vercel supports 100GB bandwidth and serverless function execution limits that are sufficient for '
    'the initial launch. The migration from SQLite/Prisma to Supabase/Prisma requires only a DATABASE_URL change and '
    'running prisma migrate deploy, making the transition nearly seamless.'
))
story.append(body(
    '<b>Step-by-step launch procedure:</b> (1) Create a Vercel project and connect the GitHub repository. '
    '(2) Set environment variables BOT_TOKEN and WEBAPP_URL in the Vercel dashboard. '
    '(3) Create a Supabase project and obtain the PostgreSQL connection string. '
    '(4) Update DATABASE_URL in the Vercel environment and run prisma migrate deploy. '
    '(5) Deploy to Vercel - the platform automatically builds and deploys on every push to main. '
    '(6) After deployment, visit https://your-app.vercel.app/api/telegram/setup to register the webhook. '
    '(7) Test in Telegram by messaging @CursedDepthsBot and clicking Play. This entire process takes under 30 minutes.'
))

story.append(h2('1.3 Growth Tier: Railway + PlanetScale'))
story.append(body(
    'When the user base grows beyond the Vercel free tier limits (approximately 10,000 DAU), migrate to Railway '
    'for containerized deployment with persistent backend processes and PlanetScale for a MySQL-compatible serverless '
    'database. Railway provides more granular control over the runtime environment, supports WebSocket connections for '
    'real-time features, and offers horizontal scaling. PlanetScale handles database branching, sharding, and read '
    'replicas automatically. This tier also enables a separate worker process for background tasks like quest '
    'generation, daily reward distribution, and analytics processing without impacting the main API performance.'
))

story.append(h2('1.4 Enterprise Tier: AWS/GCP with Microservices'))
story.append(body(
    'At 1,000,000 users, the architecture must evolve into microservices. The game API, bot webhook, database, '
    'and real-time services should be independently scalable. Use AWS ECS/Fargate or GCP Cloud Run for container '
    'orchestration, Aurora/RDS for managed PostgreSQL with read replicas, ElastiCache/Redis for session caching and '
    'leaderboard storage, and CloudFront for global static asset delivery. Implement an API Gateway pattern with '
    'rate limiting to protect against abuse. A comprehensive monitoring stack (CloudWatch/Grafana + Prometheus) '
    'is essential at this scale to detect performance degradation before it impacts users.'
))

story.append(h2('1.5 Why NOT the Current Cloudflare Tunnel Approach'))
story.append(body(
    'The Cloudflare quick tunnel approach is acceptable for local development and demo purposes, but it has '
    'several critical flaws for production use. First, the tunnel URL changes on every restart, requiring manual '
    'updates to the .env file and webhook re-registration. This means any tunnel restart causes downtime measured '
    'in minutes. Second, quick tunnels have no SLA, no bandwidth guarantees, and no DDoS protection. Third, the '
    'latency through a quick tunnel is significantly higher than a direct deployment on Vercel or Railway, which '
    'impacts the game experience. Fourth, there is no way to set up monitoring, alerting, or auto-scaling with '
    'a quick tunnel. For any serious launch, a stable domain with proper hosting is non-negotiable.'
))

# ═══════════════════════════════════════════════════════════
# SECTION 2: MVP PRODUCT REVIEW
# ═══════════════════════════════════════════════════════════
story.append(h1('2. MVP Product Review & Testing'))
story.append(body(
    'This section provides a systematic review of all game mechanics, UI components, and user flows currently '
    'implemented in the Cursed Depths MiniApp. The review is based on the documented architecture, API routes, '
    'game data specifications, and the frontend component inventory described in the launch guide.'
))

story.append(h2('2.1 Character Creation Flow'))
story.append(body(
    'The character creation system allows players to select from 5 races and 5 classes. Each combination creates '
    'a unique character with D&D 5e-style ability modifiers. The CharacterCreation model stores the wizard state, '
    'suggesting a multi-step creation flow. This is a solid foundation, but there are several issues to address. '
    'The creation flow should provide clear descriptions of each race and class with their stat bonuses and special '
    'abilities. Currently, there is no indication of a preview step where players can see their final stats before '
    'confirming. A "recommended class" hint based on the selected race would significantly reduce decision paralysis '
    'for new players unfamiliar with D&D mechanics.'
))

story.append(h2('2.2 Combat System'))
story.append(body(
    'The combat system uses D&D 5e mechanics with d20 rolls, Armor Class (AC), critical hits, and ability modifiers. '
    'The API provides /api/combat/start and /api/combat/action endpoints. Combat effects include 9 visual overlays '
    '(slash, crit, heal, fireball, chest, levelup, shield, poison, tavern), which adds satisfying visual feedback. '
    'However, the combat system has notable gaps. There is no indication of a "flee" or "retreat" option, meaning '
    'players are locked into every encounter until one side is defeated. The Player model tracks combat state, '
    'but there is no visible mechanic for status effects (poison, stun, bleed) beyond the visual overlays. '
    'Additionally, the combat log does not appear to be persisted, so players cannot review past battles.'
))

story.append(h2('2.3 Exploration & Travel'))
story.append(body(
    'The game features 9 locations and an /api/explore endpoint for discovering encounters at the current location, '
    'plus /api/travel for moving between locations. This creates a simple but functional exploration loop. The '
    'location-based design is appropriate for a MiniApp, as it provides clear progression without overwhelming '
    'complexity. However, the travel system lacks any concept of travel time, risk, or cost, which removes '
    'strategic depth. Players can teleport freely between locations, reducing the sense of a cohesive world. '
    'Adding travel costs (gold, stamina, or time gates) would create meaningful resource management decisions.'
))

story.append(h2('2.4 Inventory & Equipment'))
story.append(body(
    'The inventory uses a VK-style grid layout (referenced in the launch guide) with 45+ items spanning weapons, '
    'armor, accessories, consumables, and crafting materials. The 7-tier rarity system (from Common to Legendary) '
    'provides clear visual hierarchy. The /api/inventory endpoints (list, equip, use) cover the core functionality. '
    'Missing features include item comparison (showing stat differences when equipping), item sorting and filtering '
    'options, auto-equip suggestions for better gear, and item durability mechanics. The crafting system with 11 '
    'recipes is a good start, but there is no indication of recipe discovery - players likely see all recipes '
    'immediately, which removes the exploration/reward aspect of crafting.'
))

story.append(h2('2.5 Quest System'))
story.append(body(
    'The quest system supports daily and kill quests via the PlayerQuest model. The /api/quests and '
    '/api/quests/claim endpoints handle quest listing and reward claiming. With 6 quest templates, there is '
    'decent variety, but the system appears static - quests are likely generated from templates without '
    'dynamic scaling to player level. This means a level 1 player and a level 20 player could receive the '
    'same quest, which would be either trivially easy or impossibly hard. Level-scaled quests, quest chains, '
    'and story-driven narrative quests are essential for long-term engagement.'
))

story.append(h2('2.6 Daily Rewards & Monetization'))
story.append(body(
    'The /api/daily endpoint provides a daily reward claim mechanism. This is a standard retention feature in '
    'mobile games and is correctly implemented. However, the current design likely uses a fixed daily reward, '
    'which misses the opportunity for streak-based rewards (day 1 = small, day 7 = large) that significantly '
    'boost retention. There is no mention of any monetization system, which is a critical gap for long-term '
    'sustainability. Telegram Stars, the platform\'s native payment system, should be integrated for cosmetic '
    'items, convenience features, and battle pass access.'
))

story.append(h2('2.7 Bot Interaction Flow'))
story.append(body(
    'The Telegram bot supports /start, /play, /help, and /guide commands. The /start command should trigger a '
    'welcome message with the Play button that opens the MiniApp. The /play command likely does the same. '
    'The /help and /guide commands provide text-based assistance. This is functional but minimal. The bot should '
    'also support callback queries for inline interactions, notifications for quest completion reminders, and '
    'proactive messaging for daily reward availability. The bot\'s profile photo (the Cursed Depths logo) is '
    'well-designed with a dark fantasy aesthetic that matches the game theme.'
))

story.append(h2('2.8 UI/UX Assessment'))
story.append(body(
    'The game UI uses Tailwind CSS and shadcn/ui components with framer-motion animations, which provides a '
    'modern, polished foundation. The VK-style inventory grid is intuitive for the target audience. The combat '
    'overlay with effect images adds visual juice. However, several UX concerns are apparent. The main game page '
    'is described as 1800+ lines in a single page.tsx file, which indicates a monolithic component that is '
    'difficult to maintain and test. The game runs in a Telegram WebApp iframe, which has limited screen real '
    'estate (especially on smaller devices), making information density and navigation crucial. There is no '
    'mention of onboarding tutorials, which are essential for players unfamiliar with RPG mechanics. The loading '
    'states and error handling are also not documented, which suggests they may be incomplete or inconsistent.'
))

# ═══════════════════════════════════════════════════════════
# SECTION 3: MVP ISSUES & RISKS
# ═══════════════════════════════════════════════════════════
story.append(h1('3. Critical Issues & Risk Assessment'))
story.append(body(
    'The following table summarizes the most critical issues identified during the MVP review, along with their '
    'severity, impact, and recommended resolution. These are ordered by priority - the high-severity items must '
    'be addressed before any public launch attempt.'
))

issues = [
    ['SQLite database', 'HIGH', 'No concurrent writes, file locks under load, single-server only',
     'Migrate to PostgreSQL (Supabase) before launch'],
    ['Monolithic page.tsx (1800+ lines)', 'HIGH', 'Unmaintainable, difficult to test, impossible to parallel-develop',
     'Decompose into 15-20 focused components'],
    ['No authentication/authorization', 'HIGH', 'Anyone can call API as any user, no Telegram ID verification',
     'Implement Telegram WebApp initData validation'],
    ['No rate limiting', 'HIGH', 'API abuse, botting, resource exhaustion',
     'Add per-user rate limiting middleware'],
    ['Ephemeral tunnel URLs', 'HIGH', 'Downtime on restart, no SLA, poor UX',
     'Deploy to Vercel/Railway with stable domain'],
    ['No error monitoring', 'MED', 'Silent failures, no visibility into production issues',
     'Integrate Sentry or similar APM tool'],
    ['No input validation', 'MED', 'Invalid data can corrupt database state',
     'Add Zod/Valibot schema validation on all API routes'],
    ['Static quest generation', 'MED', 'No level scaling, repetitive at high levels',
     'Implement dynamic quest scaling based on player level'],
    ['No onboarding tutorial', 'MED', 'New players confused by D&D mechanics, high churn',
     'Add interactive tutorial for first 3 levels'],
    ['Missing flee/retreat in combat', 'LOW', 'Players locked into unwinnable fights',
     'Add retreat option with gold/stamina cost'],
]

story.append(make_table(
    ['Issue', 'Severity', 'Impact', 'Resolution'],
    issues,
    col_ratios=[0.18, 0.08, 0.37, 0.37]
))
story.append(Paragraph('Table 2: Critical Issues and Risk Assessment', caption_style))

# ═══════════════════════════════════════════════════════════
# SECTION 4: 50+ IMPROVEMENT IDEAS
# ═══════════════════════════════════════════════════════════
story.append(h1('4. 50+ Improvement Ideas for Scaling to 1,000,000 Users'))
story.append(body(
    'The following ideas are organized by category and prioritized for impact on user acquisition, retention, '
    'and scalability. Each idea includes a priority level (HIGH = must-have before scaling, MED = important for '
    'growth, LOW = nice-to-have for polish) and the primary perspective from which the idea originates '
    '(S = Senior Developer, T = Tech Lead, D = Designer, P = Product Manager, O = DevOps).'
))

# Batch 1: Architecture & Infrastructure (1-10)
story.append(h2('4.1 Architecture & Infrastructure (Ideas 1-10)'))
ideas_arch = [
    ['1', 'Architecture', 'Migrate from SQLite to PostgreSQL with connection pooling via Prisma', 'HIGH', 'T'],
    ['2', 'Architecture', 'Implement Redis caching layer for player sessions, leaderboards, and hot data', 'HIGH', 'T'],
    ['3', 'Architecture', 'Decompose monolithic page.tsx into 15-20 React components with lazy loading', 'HIGH', 'S'],
    ['4', 'Architecture', 'Add Telegram WebApp initData validation middleware for secure authentication', 'HIGH', 'S'],
    ['5', 'Architecture', 'Implement API rate limiting with sliding window algorithm (per-user, per-endpoint)', 'HIGH', 'S'],
    ['6', 'Infrastructure', 'Deploy to Vercel with stable domain, eliminate Cloudflare quick tunnel dependency', 'HIGH', 'O'],
    ['7', 'Infrastructure', 'Set up CI/CD pipeline with automated testing, linting, and preview deployments', 'MED', 'O'],
    ['8', 'Infrastructure', 'Implement structured logging (JSON) with centralized aggregation (Grafana Loki)', 'MED', 'O'],
    ['9', 'Infrastructure', 'Add health check endpoints (/health, /readiness) for monitoring and auto-restart', 'MED', 'O'],
    ['10', 'Infrastructure', 'Configure CDN (CloudFront/Vercel Edge) for static assets with aggressive caching', 'MED', 'O'],
]
story.append(make_idea_table(ideas_arch))
story.append(Paragraph('Table 3: Architecture & Infrastructure Improvements', caption_style))

# Batch 2: Backend & Data (11-20)
story.append(h2('4.2 Backend & Data (Ideas 11-20)'))
ideas_backend = [
    ['11', 'Backend', 'Add Zod schema validation on all API input to prevent injection and data corruption', 'HIGH', 'S'],
    ['12', 'Backend', 'Implement optimistic concurrency control for combat actions (prevent race conditions)', 'HIGH', 'S'],
    ['13', 'Backend', 'Add database indexes on frequently queried fields (player.telegram_id, inventory.player_id)', 'MED', 'T'],
    ['14', 'Backend', 'Implement soft-delete pattern for player data (GDPR compliance, account recovery)', 'MED', 'S'],
    ['15', 'Backend', 'Add WebSocket support for real-time combat notifications and friend activity', 'MED', 'T'],
    ['16', 'Backend', 'Implement background job queue (BullMQ) for daily reset, quest generation, analytics', 'MED', 'T'],
    ['17', 'Backend', 'Add combat log persistence for battle history replay and stat tracking', 'MED', 'S'],
    ['18', 'Backend', 'Implement database migration strategy with zero-downtime deployments', 'MED', 'O'],
    ['19', 'Backend', 'Add transaction wrapping for multi-step operations (craft + consume materials)', 'MED', 'S'],
    ['20', 'Backend', 'Implement server-side game state validation (prevent client-side cheating)', 'HIGH', 'S'],
]
story.append(make_idea_table(ideas_backend))
story.append(Paragraph('Table 4: Backend & Data Improvements', caption_style))

# Batch 3: Gameplay & Mechanics (21-35)
story.append(h2('4.3 Gameplay & Mechanics (Ideas 21-35)'))
ideas_gameplay = [
    ['21', 'Gameplay', 'Add interactive onboarding tutorial for first-time players (3-step guided intro)', 'HIGH', 'P'],
    ['22', 'Gameplay', 'Implement level-scaled quest generation (quests adapt to player level)', 'HIGH', 'P'],
    ['23', 'Gameplay', 'Add daily login streak rewards (day 1-7 escalating, weekly grand prize)', 'HIGH', 'P'],
    ['24', 'Gameplay', 'Implement flee/retreat option in combat with stamina cost and gold penalty', 'MED', 'P'],
    ['25', 'Gameplay', 'Add item comparison UI showing stat differences when equipping new gear', 'MED', 'D'],
    ['26', 'Gameplay', 'Implement status effects system (poison, stun, bleed, burn) with turn-based ticking', 'MED', 'S'],
    ['27', 'Gameplay', 'Add skill/ability system with cooldowns beyond basic attack (3-4 per class)', 'MED', 'P'],
    ['28', 'Gameplay', 'Implement boss raids with group mechanics (2-4 players cooperative)', 'MED', 'P'],
    ['29', 'Gameplay', 'Add crafting recipe discovery through exploration (not all visible from start)', 'MED', 'P'],
    ['30', 'Gameplay', 'Implement player housing/base system as a gold sink and progression anchor', 'MED', 'P'],
    ['31', 'Gameplay', 'Add PvP arena with ranked matchmaking and seasonal rewards', 'MED', 'P'],
    ['32', 'Gameplay', 'Implement pet/companion system with passive bonuses and combat assistance', 'LOW', 'P'],
    ['33', 'Gameplay', 'Add achievement system with milestone rewards (kill 100 mobs, explore all locations)', 'MED', 'P'],
    ['34', 'Gameplay', 'Implement enchantment/upgrade system for equipment using rare materials', 'MED', 'P'],
    ['35', 'Gameplay', 'Add random dungeon generation for infinite replayable content', 'LOW', 'P'],
]
story.append(make_idea_table(ideas_gameplay))
story.append(Paragraph('Table 5: Gameplay & Mechanics Improvements', caption_style))

# Batch 4: UI/UX & Design (36-45)
story.append(h2('4.4 UI/UX & Design (Ideas 36-45)'))
ideas_ux = [
    ['36', 'UI/UX', 'Design loading skeleton screens for all data-fetching operations (no blank states)', 'HIGH', 'D'],
    ['37', 'UI/UX', 'Implement haptic feedback on combat actions using Telegram WebApp Haptic Feedback API', 'MED', 'D'],
    ['38', 'UI/UX', 'Add dark/light theme toggle matching Telegram app theme via WebApp.colorScheme', 'MED', 'D'],
    ['39', 'UI/UX', 'Implement responsive bottom navigation bar (Map, Inventory, Quests, Profile)', 'HIGH', 'D'],
    ['40', 'UI/UX', 'Add item sorting and filtering (by rarity, type, level) in inventory grid', 'MED', 'D'],
    ['41', 'UI/UX', 'Implement swipe gestures for navigation between game screens on mobile', 'LOW', 'D'],
    ['42', 'UI/UX', 'Add micro-animations for item acquisition, level-up, and quest completion', 'MED', 'D'],
    ['43', 'UI/UX', 'Design accessibility features (high contrast mode, larger text, reduced motion)', 'LOW', 'D'],
    ['44', 'UI/UX', 'Implement pull-to-refresh gesture for manual data sync on all screens', 'LOW', 'D'],
    ['45', 'UI/UX', 'Add confirmation dialogs for irreversible actions (selling rare items, leaving combat)', 'MED', 'D'],
]
story.append(make_idea_table(ideas_ux))
story.append(Paragraph('Table 6: UI/UX & Design Improvements', caption_style))

# Batch 5: Social, Monetization & Growth (46-55)
story.append(h2('4.5 Social, Monetization & Growth (Ideas 46-55)'))
ideas_social = [
    ['46', 'Social', 'Implement global and friend leaderboard with weekly reset and reward tiers', 'HIGH', 'P'],
    ['47', 'Social', 'Add friend system with inline add via Telegram username sharing', 'MED', 'P'],
    ['48', 'Social', 'Implement guild/clan system with shared perks, guild wars, and cooperative bosses', 'MED', 'P'],
    ['49', 'Social', 'Add gifting system (send items/gold to friends via bot notifications)', 'LOW', 'P'],
    ['50', 'Monetization', 'Integrate Telegram Stars for cosmetic items (skins, portraits, effect overlays)', 'HIGH', 'P'],
    ['51', 'Monetization', 'Implement battle pass system (free tier + premium tier) with seasonal content', 'HIGH', 'P'],
    ['52', 'Monetization', 'Add convenience purchases (extra inventory slots, auto-battle, fast travel)', 'MED', 'P'],
    ['53', 'Growth', 'Implement referral system with rewards for inviting friends (Telegram share button)', 'HIGH', 'P'],
    ['54', 'Growth', 'Add share-to-Telegram feature for achievements and rare item drops (viral loop)', 'HIGH', 'P'],
    ['55', 'Growth', 'Implement A/B testing framework for onboarding, rewards, and difficulty tuning', 'MED', 'T'],
]
story.append(make_idea_table(ideas_social))
story.append(Paragraph('Table 7: Social, Monetization & Growth Improvements', caption_style))

# ═══════════════════════════════════════════════════════════
# SECTION 5: MULTI-PERSPECTIVE ANALYSIS
# ═══════════════════════════════════════════════════════════
story.append(h1('5. Multi-Perspective Analysis'))
story.append(body(
    'Each stakeholder perspective brings unique concerns and priorities. This section synthesizes the analysis '
    'from five key viewpoints essential for scaling Cursed Depths to one million users.'
))

story.append(h2('5.1 Senior Developer Perspective'))
story.append(body(
    'The most pressing concern from a senior developer standpoint is code maintainability. A single 1800+ line '
    'page.tsx file is a maintenance nightmare. It must be decomposed into focused components with clear separation '
    'of concerns. The game logic should be extracted into custom hooks (useCombat, useInventory, usePlayer) that '
    'encapsulate state management and API calls. The API routes need consistent error handling with typed response '
    'schemas. TypeScript should be leveraged more aggressively - every API response, game entity, and state '
    'transition should be fully typed. The current lack of input validation on API routes is a security '
    'vulnerability that could allow data corruption or injection attacks. Server-side validation of all game '
    'actions is essential to prevent cheating, which would destroy the game economy at scale.'
))
story.append(body(
    'From a performance perspective, the monolithic component likely re-renders excessively. React.memo, useMemo, '
    'and useCallback should be applied strategically to prevent unnecessary renders. The API should implement '
    'pagination for inventory and quest lists, and the frontend should use infinite scrolling or virtualized lists. '
    'Image optimization is also critical - the 40+ item images, 23 mob images, and effect overlays should use '
    'WebP format with lazy loading and srcset for responsive delivery.'
))

story.append(h2('5.2 Tech Lead Perspective'))
story.append(body(
    'The architecture needs to evolve from a single-server SQLite model to a distributed, horizontally scalable '
    'system. The database is the primary bottleneck - SQLite cannot handle concurrent writes from thousands of '
    'players and will fail under load with database locked errors. PostgreSQL with connection pooling (PgBouncer) '
    'is the minimum viable database for production. At higher scale, read replicas will offload analytics queries, '
    'and Redis will cache hot player data to reduce database load. The game loop should be refactored to use an '
    'event-driven architecture where combat actions, item acquisitions, and quest completions emit events that '
    'can be processed asynchronously by subscribers (analytics, achievements, notifications).'
))
story.append(body(
    'Team coordination is another concern. The current codebase appears to be a solo project with no separation '
    'between frontend and backend concerns. For scaling the team, the API and frontend should be in separate '
    'packages with a shared types library. Feature flags should be introduced to allow safe deployment of '
    'incomplete features without affecting live users. A comprehensive test strategy (unit tests for game logic, '
    'integration tests for API routes, E2E tests for critical user flows) is essential before onboarding '
    'additional developers.'
))

story.append(h2('5.3 Designer Perspective'))
story.append(body(
    'The dark fantasy aesthetic of the Cursed Depths logo is strong and distinctive, but the in-game UI needs '
    'to match this visual identity consistently. The current use of shadcn/ui provides a clean, modern baseline, '
    'but it may feel too generic for a dark fantasy RPG. Custom theming with aged parchment textures, ornate '
    'borders, and atmospheric background effects would create a more immersive experience. The rarity color system '
    '(7 tiers) needs a carefully designed color palette that is both visually distinct and accessible to colorblind '
    'users. Each rarity tier should also have a distinct visual effect (glow, particle, animation) on the item card.'
))
story.append(body(
    'Information architecture is a critical design challenge in the constrained MiniApp viewport. The current '
    'approach likely uses tabs or screens for different game sections (combat, inventory, map, quests), but the '
    'navigation between them needs to be seamless. A persistent bottom navigation bar with clear iconography '
    'would reduce cognitive load. Combat encounters need a dedicated full-screen mode that hides navigation '
    'and focuses the player on tactical decisions. The inventory grid should support drag-and-drop equipping '
    'with visual feedback, and item tooltips should appear on long-press with detailed stat breakdowns.'
))
story.append(body(
    'Typography in the game UI should reinforce the fantasy theme. A decorative display font for headings '
    '(like MedievalSharp or Cinzel) paired with a clean sans-serif for body text would create a strong '
    'hierarchy. All text must remain legible at the small sizes typical of mobile MiniApp viewports. The '
    'minimum touch target size should be 44x44 pixels per Apple Human Interface Guidelines, and buttons '
    'should have generous padding to prevent mis-taps during combat.'
))

story.append(h2('5.4 Product Manager Perspective'))
story.append(body(
    'The core game loop (explore - combat - loot - upgrade - repeat) is solid and well-understood in the RPG '
    'genre. However, the current implementation lacks several key retention mechanics that are standard in '
    'successful mobile RPGs. The daily reward system should use a streak-based model with escalating rewards '
    'and a "grand prize" at day 7 to create a powerful habit loop. The quest system needs variety through '
    'quest chains that tell a story, weekly challenges with unique rewards, and time-limited events that create '
    'FOMO (Fear Of Missing Out). Without these, player retention will drop sharply after the first week.'
))
story.append(body(
    'Monetization must be designed carefully to avoid pay-to-win perception, which is the fastest way to '
    'alienate a free-to-play audience. Telegram Stars should be used exclusively for cosmetic items (character '
    'skins, effect overlays, portrait frames), convenience features (extra inventory, auto-battle), and '
    'a battle pass with both free and premium tracks. The premium track should offer cosmetic rewards and '
    'convenience, never power advantages. A/B testing of reward amounts, difficulty curves, and monetization '
    'touches is essential to optimize the balance between player satisfaction and revenue.'
))
story.append(body(
    'The viral coefficient is the most important metric for reaching 1M users. Telegram MiniApps have a natural '
    'advantage through social sharing, but it must be explicitly designed. Every rare item drop, boss kill, and '
    'achievement should have a one-tap "Share to Chat" button that posts a rich preview card. The referral system '
    'should reward both the inviter and the invitee to maximize sharing incentives. Guild features create social '
    'obligations that prevent churn, and cooperative boss raids require inviting friends to succeed, creating a '
    'natural growth loop.'
))

story.append(h2('5.5 DevOps Perspective'))
story.append(body(
    'The current deployment model (manual Cloudflare tunnel + .env editing) is completely unsuitable for production. '
    'The first DevOps priority is to set up a proper CI/CD pipeline with GitHub Actions that runs linting, type '
    'checking, unit tests, and builds on every pull request. The main branch should auto-deploy to Vercel, with '
    'preview deployments for every PR. Environment secrets (BOT_TOKEN, DATABASE_URL) must be stored in Vercel '
    'encrypted environment variables, never in .env files committed to the repository. The current .env file '
    'appears to contain the bot token in plaintext, which is a security risk if the repository is public.'
))
story.append(body(
    'Monitoring and observability are critical at scale. Sentry should be integrated for error tracking with '
    'source maps, providing real-time alerts when exceptions occur. Application performance monitoring (APM) '
    'with New Relic or DataDog will identify slow API routes before they become user-facing problems. Database '
    'query performance should be monitored via Prisma\'s built-in query logging, with slow queries automatically '
    'flagged for optimization. Infrastructure metrics (CPU, memory, request latency, error rate) should be '
    'displayed on a shared Grafana dashboard accessible to the entire team.'
))
story.append(body(
    'At the 1M user scale, the database will be the most common source of incidents. Automated backup with '
    'point-in-time recovery is non-negotiable. Database migrations must be reversible and tested in staging '
    'before production. Read replicas should be provisioned proactively when write latency exceeds 50ms. '
    'Auto-scaling policies should be configured to add application instances when CPU exceeds 70% or request '
    'latency exceeds 200ms. A runbook documenting common incident scenarios and resolution steps will reduce '
    'mean time to recovery (MTTR) from hours to minutes.'
))

# ═══════════════════════════════════════════════════════════
# SECTION 6: ROADMAP
# ═══════════════════════════════════════════════════════════
story.append(h1('6. Recommended Roadmap to 1M Users'))
story.append(body(
    'The following phased roadmap prioritizes the improvements based on their impact on user acquisition, '
    'retention, and system stability. Each phase builds on the previous one and should be fully completed '
    'before moving to the next phase.'
))

story.append(make_table(
    ['Phase', 'Timeline', 'Focus', 'Key Deliverables', 'Target DAU'],
    [
        ['1. Foundation', 'Weeks 1-2', 'Stability & Security',
         'PostgreSQL migration, auth, rate limiting, Vercel deploy, CI/CD', '100'],
        ['2. Core Polish', 'Weeks 3-4', 'UX & Retention',
         'Onboarding tutorial, streak rewards, item comparison, component refactor', '1,000'],
        ['3. Growth Loop', 'Weeks 5-8', 'Virality & Social',
         'Share features, referral system, leaderboards, friend system', '10,000'],
        ['4. Monetization', 'Weeks 9-12', 'Revenue & Content',
         'Telegram Stars, battle pass, boss raids, guild system', '100,000'],
        ['5. Scale', 'Months 4-6', 'Infrastructure & Optimization',
         'Microservices, Redis, CDN, monitoring, A/B testing', '1,000,000'],
    ],
    col_ratios=[0.10, 0.12, 0.15, 0.43, 0.20]
))
story.append(Paragraph('Table 8: Phased Roadmap to 1M Users', caption_style))

story.append(h2('6.1 Phase 1: Foundation (Weeks 1-2)'))
story.append(body(
    'The foundation phase addresses all HIGH-severity issues that would prevent the game from functioning under '
    'real user load. The database migration from SQLite to PostgreSQL is the single most important change, as it '
    'unlocks concurrent access and horizontal scaling. Authentication via Telegram initData validation ensures '
    'that only legitimate Telegram users can access the game, preventing bot abuse and data corruption. Deploying '
    'to Vercel provides a stable domain, automatic HTTPS, and global CDN. Setting up CI/CD with GitHub Actions '
    'establishes the development workflow that will support a growing team.'
))

story.append(h2('6.2 Phase 2: Core Polish (Weeks 3-4)'))
story.append(body(
    'With the infrastructure stable, focus shifts to the player experience. The onboarding tutorial is the '
    'highest-impact UX improvement because it directly reduces day-1 churn. Streak-based daily rewards create '
    'a habit loop that brings players back each day. The component refactor from a monolithic page.tsx to a '
    'well-structured component architecture enables faster feature development and easier testing. Item comparison '
    'and sorting reduce frustration in inventory management. These changes collectively improve day-7 retention, '
    'which is the key metric for long-term growth.'
))

story.append(h2('6.3 Phase 3: Growth Loop (Weeks 5-8)'))
story.append(body(
    'The growth loop phase implements the viral mechanics that will drive organic user acquisition. The share-to-'
    'Telegram feature creates a viral distribution channel where players advertise the game to their contacts. '
    'The referral system incentivizes sharing with concrete rewards. Leaderboards create competitive motivation '
    'and social proof. The friend system enables cooperative play and creates social obligations that reduce churn. '
    'Together, these features should increase the viral coefficient (K-factor) above 1.0, meaning each user '
    'brings in more than one new user on average, creating exponential growth.'
))

story.append(h2('6.4 Phase 4: Monetization (Weeks 9-12)'))
story.append(body(
    'With a growing user base and proven retention, monetization can be introduced without alienating players. '
    'Telegram Stars integration enables frictionless microtransactions within the Telegram ecosystem. The battle '
    'pass provides recurring revenue with seasonal content updates that keep the game fresh. Boss raids and guild '
    'wars add cooperative and competitive endgame content that increases long-term engagement. The guild system '
    'creates social structures that make churn socially costly, further boosting retention.'
))

story.append(h2('6.5 Phase 5: Scale (Months 4-6)'))
story.append(body(
    'The final phase prepares the infrastructure for 1M users. The monolithic Next.js app is decomposed into '
    'microservices (game API, bot webhook, analytics, notification service) that can be independently scaled. '
    'Redis caching reduces database load by 80-90% for hot data. CDN optimization ensures sub-100ms asset '
    'loading globally. A comprehensive monitoring stack (Grafana + Prometheus + Sentry) provides full '
    'observability. A/B testing infrastructure enables data-driven optimization of game balance, reward '
    'frequency, and monetization touchpoints. At this stage, the team should include at least 3-4 developers, '
    '1 designer, and 1 DevOps engineer to maintain and evolve the product.'
))

# ── Build ──
doc.build(story)
print(f'PDF generated: {OUTPUT}')

#!/usr/bin/env python3
"""
Cursed Depths — Контрольный документ (Checkpoint)
Полное состояние проекта на текущий момент.
Тёмная тема, кириллица через Carlito.
"""

import os, sys, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, CondPageBreak, HRFlowable
)

# ─── Font Registration ───
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Bold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Italic', '/usr/share/fonts/truetype/english/Carlito-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-BoldItalic', '/usr/share/fonts/truetype/english/Carlito-BoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVu', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVu-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
registerFontFamily('Carlito', normal='Carlito', bold='Carlito-Bold', italic='Carlito-Italic', boldItalic='Carlito-BoldItalic')
registerFontFamily('DejaVu', normal='DejaVu', bold='DejaVu-Bold')

sys.path.insert(0, '/home/z/my-project/skills/pdf/scripts')
from pdf import install_font_fallback
install_font_fallback()

# ─── Colors ───
ACCENT       = colors.HexColor('#6b4fc1')
ACCENT_LIGHT = colors.HexColor('#8b6fe1')
ACCENT_DARK  = colors.HexColor('#4b2fa1')
TEXT_PRIMARY  = colors.HexColor('#e9e8e7')
TEXT_MUTED    = colors.HexColor('#8c887f')
BG_SURFACE   = colors.HexColor('#24221c')
BG_PAGE      = colors.HexColor('#131210')
PEPEL_COLOR  = colors.HexColor('#c47a3a')
SKVERNA_COLOR = colors.HexColor('#7a3ac4')
TABLE_HEADER_COLOR = colors.HexColor('#3a6b3a')  # green accent for checkpoint
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN    = colors.HexColor('#1a1816')
TABLE_ROW_ODD     = colors.HexColor('#24221c')
GREEN = colors.HexColor('#4a9a4a')
RED = colors.HexColor('#c44a4a')
YELLOW = colors.HexColor('#c4a43a')

# ─── Page Setup ───
PAGE_W, PAGE_H = A4
LEFT_MARGIN = 18*mm
RIGHT_MARGIN = 18*mm
TOP_MARGIN = 20*mm
BOTTOM_MARGIN = 20*mm
CONTENT_W = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

# ─── Styles ───
cover_title_style = ParagraphStyle('CoverTitle', fontName='Carlito-Bold', fontSize=36, leading=44,
    textColor=GREEN, alignment=TA_CENTER, spaceAfter=10)
cover_subtitle_style = ParagraphStyle('CoverSubtitle', fontName='Carlito', fontSize=16, leading=22,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceAfter=6)
cover_meta_style = ParagraphStyle('CoverMeta', fontName='Carlito', fontSize=12, leading=16,
    textColor=TEXT_MUTED, alignment=TA_CENTER)

h1_style = ParagraphStyle('H1Dark', fontName='Carlito-Bold', fontSize=20, leading=26,
    textColor=GREEN, spaceBefore=16, spaceAfter=8, wordWrap='CJK')
h2_style = ParagraphStyle('H2Dark', fontName='Carlito-Bold', fontSize=15, leading=20,
    textColor=ACCENT_LIGHT, spaceBefore=12, spaceAfter=6, wordWrap='CJK')
h3_style = ParagraphStyle('H3Dark', fontName='Carlito-Bold', fontSize=12, leading=17,
    textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=4, wordWrap='CJK')
body_style = ParagraphStyle('BodyDark', fontName='Carlito', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK', spaceBefore=2, spaceAfter=4)
bullet_style = ParagraphStyle('BulletDark', fontName='Carlito', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK', spaceBefore=1, spaceAfter=2, leftIndent=16, bulletIndent=6)
status_ok_style = ParagraphStyle('StatusOK', fontName='Carlito-Bold', fontSize=9.5, leading=14,
    textColor=GREEN, alignment=TA_LEFT, wordWrap='CJK', spaceBefore=2, spaceAfter=4)
status_warn_style = ParagraphStyle('StatusWarn', fontName='Carlito-Bold', fontSize=9.5, leading=14,
    textColor=YELLOW, alignment=TA_LEFT, wordWrap='CJK', spaceBefore=2, spaceAfter=4)
status_fail_style = ParagraphStyle('StatusFail', fontName='Carlito-Bold', fontSize=9.5, leading=14,
    textColor=RED, alignment=TA_LEFT, wordWrap='CJK', spaceBefore=2, spaceAfter=4)

th_style = ParagraphStyle('THDark', fontName='Carlito-Bold', fontSize=8.5, leading=12,
    textColor=TABLE_HEADER_TEXT, alignment=TA_CENTER, wordWrap='CJK')
td_style = ParagraphStyle('TDDark', fontName='Carlito', fontSize=8.5, leading=12,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK')
td_center_style = ParagraphStyle('TDCenterDark', fontName='Carlito', fontSize=8.5, leading=12,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, wordWrap='CJK')

# ─── Helpers ───
def P(text, style=body_style):
    return Paragraph(text, style)

def hr():
    return HRFlowable(width='100%', thickness=1, color=ACCENT_DARK, spaceAfter=8, spaceBefore=4)

def build_table(headers, rows, col_widths=None):
    data = [[Paragraph(f'<b>{h}</b>', th_style) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), td_style) for c in row])
    if col_widths is None:
        col_widths = [CONTENT_W / len(headers)] * len(headers)
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#3a3830')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(cmds))
    return t

def status(text, state='ok'):
    s = {'ok': status_ok_style, 'warn': status_warn_style, 'fail': status_fail_style}[state]
    label = {'ok': '[ГОТОВО]', 'warn': '[ВНИМАНИЕ]', 'fail': '[КРИТИЧЕСКИ]'}[state]
    return Paragraph(f'{label} {text}', s)

# ─── Doc Template ───
def page_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG_PAGE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setStrokeColor(GREEN)
    canvas.setLineWidth(1.5)
    canvas.line(LEFT_MARGIN, PAGE_H - TOP_MARGIN + 8, PAGE_W - RIGHT_MARGIN, PAGE_H - TOP_MARGIN + 8)
    canvas.setFont('Carlito', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(PAGE_W / 2, BOTTOM_MARGIN / 2, f'{doc.page}')
    canvas.restoreState()

def cover_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG_PAGE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setStrokeColor(GREEN)
    canvas.setLineWidth(0.5)
    canvas.line(LEFT_MARGIN, PAGE_H*0.35, PAGE_W-RIGHT_MARGIN, PAGE_H*0.35)
    canvas.line(LEFT_MARGIN, PAGE_H*0.65, PAGE_W-RIGHT_MARGIN, PAGE_H*0.65)
    canvas.setFillColor(GREEN)
    canvas.rect(LEFT_MARGIN, PAGE_H*0.48, CONTENT_W, 3, fill=1, stroke=0)
    canvas.restoreState()

# ═══════════════════════════════════════════
# BUILD DOCUMENT
# ═══════════════════════════════════════════

OUTPUT = '/home/z/my-project/download/cursed_depths_checkpoint.pdf'

doc = SimpleDocTemplate(OUTPUT, pagesize=A4,
    leftMargin=LEFT_MARGIN, rightMargin=RIGHT_MARGIN,
    topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN)

story = []

# ─── COVER ───
story.append(Spacer(1, PAGE_H * 0.22))
story.append(Paragraph('CURSED DEPTHS', cover_title_style))
story.append(Spacer(1, 10))
story.append(Paragraph('Контрольный документ проекта', ParagraphStyle('CoverSub2',
    fontName='Carlito-Bold', fontSize=20, leading=26, textColor=TEXT_PRIMARY, alignment=TA_CENTER)))
story.append(Spacer(1, 16))
story.append(Paragraph('Telegram MiniApp RPG', cover_subtitle_style))
story.append(Spacer(1, 4))
story.append(Paragraph('Дата: 4 мая 2026', cover_meta_style))
story.append(Spacer(1, 4))
story.append(Paragraph('Состояние: Активная разработка', cover_meta_style))
story.append(Spacer(1, 4))
story.append(Paragraph('Репозиторий: github.com/FomenkovMax/cursed-depths', cover_meta_style))
story.append(Spacer(1, 4))
story.append(Paragraph('Деплой: cursed-depths.vercel.app', cover_meta_style))

story.append(PageBreak())

# ═══════════════════════════════════════════
# 1. ИНСТРУКЦИЯ ДЛЯ НОВОГО ЧАТА
# ═══════════════════════════════════════════
story.append(Paragraph('1. Инструкция для нового чата', h1_style))
story.append(hr())
story.append(P('Если этот чат был потерян, загрузи этот документ в новый чат и скажи:'))
story.append(Spacer(1, 4))
story.append(Paragraph('<i>"Это контрольный документ проекта Cursed Depths. Прочитай его полностью. Мы продолжаем с того места, где остановились."</i>', ParagraphStyle('Quote', fontName='Carlito-Italic', fontSize=10, leading=15, textColor=ACCENT_LIGHT, leftIndent=20, rightIndent=20, spaceBefore=4, spaceAfter=8)))
story.append(Spacer(1, 4))
story.append(P('<b>Что делать дальше:</b> В этом документе описано ВСЁ, что сделано, и что ещё нужно сделать. Не повторяй уже выполненные шаги. Не меняй лор — он утверждён владельцем. Следующий приоритет указан в секции "Что делать дальше".'))

# ═══════════════════════════════════════════
# 2. ЧТО СДЕЛАНО — СТАТУС
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('2. Статус выполненных работ', h1_style))
story.append(hr())

story.append(build_table(
    ['Компонент', 'Статус', 'Описание'],
    [
        ['Telegram Bot', 'ГОТОВО', 'Бот создан, webhook настроен, команды /start /play /work работают. Кнопка меню "Играть" ведёт в WebApp'],
        ['Telegram WebApp', 'ГОТОВО', 'MiniApp открывается из Telegram, SDK интегрирован, expand() вызывается'],
        ['Авторизация', 'ГОТОВО', '3-уровневая: HMAC-SHA256 -> initData парсинг -> x-telegram-id fallback. Мультипользовательская — каждый юзер получает свой telegramId'],
        ['Vercel деплой', 'ГОТОВО', 'Автодеплой из GitHub main -> cursed-depths.vercel.app'],
        ['База данных', 'ЧАСТИЧНО', 'SQLite локально, Turso продакшн. 4 модели: Player, Inventory, CharacterCreation, PlayerQuest. НО: seed-data.ts ссылается на Race/GameClass/Ability которых нет в схеме'],
        ['API (17 эндпоинтов)', 'ГОТОВО', 'player, combat, explore, travel, inventory, craft, daily, quests, leaderboard, races, classes, abilities, seed, telegram/webhook, telegram/setup'],
        ['Игровой цикл', 'ГОТОВО', 'Explore -> Combat -> Loot -> Level Up -> Travel работает end-to-end'],
        ['Создание персонажа', 'ГОТОВО', '4-шаговый визард: Имя -> Раса -> Класс -> Подтверждение'],
        ['UI (6 вкладок)', 'ГОТОВО', 'Обзор, Бой, Карта, Инвентарь, Задания, Крафт — всё в одном monolithic page.tsx (1,674 строки)'],
        ['Лор (библия мира)', 'УТВЕРЖДЁН', 'Свет и Тьма, Гул, 4 Столпа, потомки богов, Карсус, 2 Пути, Пробуждение Тьмы, Храм и Портал — всё утверждено владельцем'],
        ['6 рас + 24 класса', 'УТВЕРЖДЁ', 'Гномы, Эльфы, Люди, Драконорождённые, Нежить, Орки. По 4 класса на расу (2 Пепел + 2 Скверна). 3 стадии эволюции каждого класса'],
        ['~130 способностей', 'УТВЕРЖДЁН', 'С балансом для боссов, PvP и PvE. Босс-ноты прописаны для каждой способности'],
        ['PDF документация', 'ГОТОВО', '3 PDF в /docs/: мастер-документ (35 стр), дерево классов, способности'],
        ['GitHub репозиторий', 'ГОТОВО', 'github.com/FomenkovMax/cursed-depths, автопуш при коммитах'],
    ],
    [CONTENT_W*0.22, CONTENT_W*0.12, CONTENT_W*0.66]
))

# ═══════════════════════════════════════════
# 3. ИЗВЕСТНЫЕ ПРОБЛЕМЫ
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('3. Известные проблемы', h1_style))
story.append(hr())

story.append(status('Расхождение схемы БД: seed-data.ts ссылается на Race/GameClass/Ability, которых нет в schema.prisma. API /races, /classes, /abilities запросят несуществующие таблицы. Рабочая игра использует статические массивы game-data.ts', 'fail'))
story.append(Spacer(1, 3))
story.append(status('Неаутентифицированный эндпоинт: POST /api/players создаёт игрока БЕЗ авторизации. POST /api/seed тоже без авторизации.', 'warn'))
story.append(Spacer(1, 3))
story.append(status('Monolithic page.tsx: 1,674 строки в одном компоненте. Нет декомпозиции.', 'warn'))
story.append(Spacer(1, 3))
story.append(status('TypeScript: ignoreBuildErrors=true в next.config.ts — ошибки TS игнорируются при сборке.', 'warn'))
story.append(Spacer(1, 3))
story.append(status('Две конкурирующие модели данных: game-data.ts (9 D&D рас, 5 классов) vs seed-data.ts (6 кастомных рас, 26 классов). Нужно привести к единой модели.', 'fail'))
story.append(Spacer(1, 3))
story.append(status('Нет генерации квестов: шаблоны есть в game-data.ts, но нет эндпоинта для создания/назначения квестов игроку.', 'warn'))
story.append(Spacer(1, 3))
story.append(status('BOT_TOKEN утечка: токен бота был в истории git (коммит 84eced9). Нужен перевыпуск.', 'warn'))

# ═══════════════════════════════════════════
# 4. ТЕХНИЧЕСКИЙ СТЕК
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('4. Технический стек', h1_style))
story.append(hr())

story.append(build_table(
    ['Слой', 'Технология', 'Версия / Детали'],
    [
        ['Фреймворк', 'Next.js', '16.1.1 (App Router)'],
        ['Фронтенд', 'React', '19'],
        ['Стилизация', 'Tailwind CSS + shadcn/ui', '40+ UI компонентов'],
        ['База данных', 'Prisma ORM', '6.11.1, SQLite (dev) / Turso (prod)'],
        ['Авторизация', 'Telegram WebApp SDK', 'HMAC-SHA256 верификация'],
        ['Бот', 'Telegram Bot API', 'Webhook, MiniApp'],
        ['Деплой', 'Vercel', 'Автодеплой из GitHub main'],
        ['Состояние', 'Zustand', '5'],
        ['Анимации', 'Framer Motion', ''],
        ['Формы', 'React Hook Form + Zod', ''],
        ['Графики', 'Recharts + TanStack Table', ''],
        ['DnD', '@dnd-kit', 'Drag and drop для инвентаря'],
        ['AI SDK', 'z-ai-web-dev-sdk', '0.0.17 (для будущих AI фич)'],
        ['Язык', 'TypeScript', 'ignoreBuildErrors=true (!)'],
    ],
    [CONTENT_W*0.20, CONTENT_W*0.35, CONTENT_W*0.45]
))

# ═══════════════════════════════════════════
# 5. СТРУКТУРА ПРОЕКТА
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('5. Структура проекта', h1_style))
story.append(hr())

story.append(build_table(
    ['Директория/Файл', 'Описание'],
    [
        ['src/app/page.tsx', 'MONOLITHIC клиент игры (1,674 строки). 3 экрана: loading, creation, game (6 вкладок)'],
        ['src/app/api/', '17 API маршрутов (см. секцию 6)'],
        ['src/app/layout.tsx', 'Root layout, Telegram SDK, Toaster'],
        ['src/lib/auth.ts', '3-уровневая Telegram авторизация'],
        ['src/lib/db.ts', 'Prisma клиент (SQLite/Turso)'],
        ['src/lib/game-data.ts', 'Статические игровые данные (544 строки) — текущая рабочая модель'],
        ['src/lib/seed-data.ts', 'Сидер БД (1,014 строк) — РАСШИРЕННАЯ модель, НЕ СОВПАДАЕТ со схемой'],
        ['src/lib/dice.ts', 'Кубики D&D 5e'],
        ['src/lib/inventory-utils.ts', 'Логика стака предметов'],
        ['src/components/ui/', '39 shadcn/ui компонентов (большинство не используется)'],
        ['prisma/schema.prisma', '4 модели: Player, Inventory, CharacterCreation, PlayerQuest'],
        ['docs/', '3 PDF документа: мастер-док (35 стр), дерево классов, способности'],
        ['generate_master_doc.py', 'Скрипт генерации мастер-PDF (используется для обновления документации)'],
    ],
    [CONTENT_W*0.32, CONTENT_W*0.68]
))

# ═══════════════════════════════════════════
# 6. API ЭНДПОИНТЫ
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('6. API эндпоинты', h1_style))
story.append(hr())

story.append(build_table(
    ['Маршрут', 'Метод', 'Авторизация', 'Назначение'],
    [
        ['/api/player', 'GET', 'Telegram', 'Получить текущего игрока'],
        ['/api/player/create', 'POST', 'Telegram', 'Создать персонажа (раса, класс, статы)'],
        ['/api/player/rest', 'POST', 'Telegram', 'Отдых в таверне (полное восстановление)'],
        ['/api/combat/action', 'POST', 'Telegram', 'Боевые действия: атака, заклинание, бегство, способность'],
        ['/api/explore', 'POST', 'Telegram', 'Исследование локации (рандомные встречи, лут)'],
        ['/api/travel', 'POST', 'Telegram', 'Перемещение между локациями'],
        ['/api/inventory', 'GET', 'Telegram', 'Инвентарь игрока'],
        ['/api/inventory/equip', 'POST', 'Telegram', 'Надеть/снять предмет'],
        ['/api/inventory/use', 'POST', 'Telegram', 'Использовать расходник'],
        ['/api/craft', 'POST', 'Telegram', 'Скрафтить предмет'],
        ['/api/daily', 'POST', 'Telegram', 'Ежедневная награда'],
        ['/api/quests', 'GET', 'Telegram', 'Задания игрока'],
        ['/api/quests/claim', 'POST', 'Telegram', 'Забрать награду за задание'],
        ['/api/leaderboard', 'GET', 'Нет', 'Топ-10 игроков'],
        ['/api/races', 'GET', 'Нет', 'Список рас (таблицы НЕ СУЩЕСТВУЮТ)'],
        ['/api/classes', 'GET', 'Нет', 'Список классов (таблицы НЕ СУЩЕСТВУЮТ)'],
        ['/api/seed', 'POST', 'Нет', 'Засеять БД (БЕЗ авторизации!)'],
        ['/api/telegram/webhook', 'POST', 'Bot Token', 'Webhook бота'],
        ['/api/telegram/setup', 'GET', 'SETUP_SECRET', 'Настройка бота: webhook, меню, команды'],
    ],
    [CONTENT_W*0.28, CONTENT_W*0.08, CONTENT_W*0.14, CONTENT_W*0.50]
))

# ═══════════════════════════════════════════
# 7. УТВЕРЖДЁННЫЙ ЛОР (суть)
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('7. Утверждённый лор — ключевые тезисы', h1_style))
story.append(hr())
story.append(P('<b>НЕ ИЗМЕНЯТЬ БЕЗ СОГЛАСИЯ ВЛАДЕЛЬЦА.</b> Лор полностью утверждён и зафиксирован в мастер-PDF.'))
story.append(Spacer(1, 6))

story.append(Paragraph('Космогония', h2_style))
story.append(P('До всего — Свет и Тьма. Не боги — основы. Из столкновения — Гул. Из Света — трое (Веларион, Айлет, Торнак). Из Тьмы — одна (Кессара). Кессара — не зло, она показывает правду за формой.'))
story.append(Spacer(1, 4))

story.append(Paragraph('Потомки богов', h2_style))
story.append(P('Боги породили смертных потомков с искрой: Торин Драккар (гномы/Торнак), Аэларион (люди/Веларион), Сионаэль (эльфы/Айлет), Грумгар (орки/Торнак), Игнира (драконорождённые/Веларион), Морвена (нежить/отрёкшаяся от Айлет). Карсус — потомок Кессары, единственный кто НЕ основал расу — потому что дар Кессары это правда, а правда не передаётся по крови.'))
story.append(Spacer(1, 4))

story.append(Paragraph('Два пути', h2_style))
story.append(P('Карсус нёс правду — мир раскололся на два лагеря. Путь Пепла — сгорел в правде и возродился (очищение). Путь Скверны — сгорел и сгнил (разрушение). Скверна = правильное понимание без силы вынести его. Пустые = искра потухла, тело живо, в глазах тишина.'))
story.append(Spacer(1, 4))

story.append(Paragraph('Пробуждение Тьмы', h2_style))
story.append(P('Кессаре было одиноко — никто не понимал её дар. Сомнение добралось до трёх Столпов Света. Три мгновения сомнения — Глубь проснулась. Глубь = тьма до смысла, пустой голод раньше Гула. Кессара — тьма осмысленная. Глубь — тьма бессмысленная.'))
story.append(Spacer(1, 4))

story.append(Paragraph('Мир', h2_style))
story.append(P('Континент, который болен. Гномы ушли из нижних чертогов в горы. Храм Трёх — последний храм, где искры Столпов горят. Портал — чёрная арка в Катакомбы, куда боги спустились запечатать тьму и не вернулись. Портал открывается только Избранным — тем, в ком Тоска Глуби отозвалась.'))
story.append(Spacer(1, 4))

story.append(Paragraph('6 рас и 24 класса', h2_style))
story.append(P('Гномы (Хранитель камня), Эльфы (Служитель леса), Люди (Хранитель Воли), Драконорождённые (Оплот пламени), Нежить (Восставший), Орки (Воин клана). По 4 класса на расу: 2 Путь Пепла + 2 Путь Скверны. Каждый класс имеет 3 стадии эволюции. ~130 способностей с балансом.'))

# ═══════════════════════════════════════════
# 8. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('8. Переменные окружения (Vercel)', h1_style))
story.append(hr())

story.append(build_table(
    ['Переменная', 'Где используется', 'Статус в .env'],
    [
        ['DATABASE_URL', 'db.ts (локальная SQLite)', 'ЕСТЬ'],
        ['TURSO_URL', 'db.ts (продакшн Turso)', 'НЕТ — только Vercel'],
        ['DATABASE_AUTH_TOKEN', 'db.ts (Turso auth)', 'НЕТ — только Vercel'],
        ['BOT_TOKEN', 'auth.ts, webhook, setup', 'НЕТ — только Vercel (был утечка в git!)'],
        ['TELEGRAM_WEBHOOK_SECRET', 'webhook, setup', 'НЕТ — только Vercel'],
        ['SETUP_SECRET', '/api/telegram/setup', 'НЕТ — только Vercel'],
        ['WEBAPP_URL', 'webhook, setup', 'НЕТ — только Vercel (default: cursed-depths.vercel.app)'],
        ['NODE_ENV', 'auth.ts (dev mode)', 'Системная'],
    ],
    [CONTENT_W*0.28, CONTENT_W*0.42, CONTENT_W*0.30]
))

# ═══════════════════════════════════════════
# 9. ЧТО ДЕЛАТЬ ДАЛЬШЕ
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('9. Что делать дальше — приоритеты', h1_style))
story.append(hr())

story.append(P('<b>Правильный порядок:</b> Геймдиз-документ -> UI/UX дизайн -> Код'))
story.append(Spacer(1, 6))

story.append(Paragraph('Приоритет 1 — Завершить геймдиз-документ', h2_style))
story.append(P('В мастер-PDF уже есть: лор, расы, классы, способности, акты, боссы, рейды, нарратив. Но ещё НЕ ОПРЕДЕЛЕНО:'))
story.append(Spacer(1, 2))
story.append(P('- Локации и подземелья (детальная структура, враги, боссы)'))
story.append(P('- Боевая система (как работает пошаговый бой пошагово)'))
story.append(P('- Экономика (золото, крафт, магазин)'))
story.append(P('- Прогрессия (уровни, опыт, разблокировка)'))
story.append(P('- PvP'))
story.append(P('- Ежедневные активности'))
story.append(Spacer(1, 4))

story.append(Paragraph('Приоритет 2 — UI/UX дизайн', h2_style))
story.append(P('После завершения документа — спроектировать визуал. Дизайн определяет архитектуру кода: если бой с 4 кнопками — один код, если карточный — другой. Дизайн не оторван от механик — он их визуализирует.'))
story.append(Spacer(1, 4))

story.append(Paragraph('Приоритет 3 — Рефакторинг и код', h2_style))
story.append(P('Когда документ и дизайн готовы:'))
story.append(P('1. Унифицировать модель данных (game-data.ts + seed-data.ts -> единая схема Prisma)'))
story.append(P('2. Добавить Race/GameClass/Ability в schema.prisma'))
story.append(P('3. Декомпозировать page.tsx (1,674 строки -> компоненты)'))
story.append(P('4. Реализовать механики из геймдиз-документа'))
story.append(P('5. Убрать ignoreBuildErrors, починить TypeScript'))

# ═══════════════════════════════════════════
# 10. ВАЖНЫЕ ПРАВИЛА
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('10. Важные правила для AI-ассистента', h1_style))
story.append(hr())

story.append(P('<b>1. Не выдумывай лор.</b> Используй только утверждённый текст. Если не уверен — спроси владельца.'))
story.append(Spacer(1, 2))
story.append(P('<b>2. Не меняй утверждённые расы, классы, способности</b> без подтверждения владельца. Баланс уже согласован.'))
story.append(Spacer(1, 2))
story.append(P('<b>3. Карсус — не злодей и не гордец.</b> Он — слушающий, потомок Кессары, нёс правду. Его преступление — честность, не гордыня.'))
story.append(Spacer(1, 2))
story.append(P('<b>4. Кессара — не зло.</b> Она — Тьма-Отражение. Показывает правду за формой. Не ломает — раскрывает.'))
story.append(Spacer(1, 2))
story.append(P('<b>5. Скверна — не «тёмная энергия».</b> Это правильное понимание без силы вынести его. Не болезнь, не паразит — гниль от правды, которую не смог переварить.'))
story.append(Spacer(1, 2))
story.append(P('<b>6. Путь Пепла и Путь Скверны — не добро и зло.</b> Оба произошли от одной правды. Разница — в способности вынести её.'))
story.append(Spacer(1, 2))
story.append(P('<b>7. Глубь — не Скверна.</b> Глубь = тьма до смысла (бессмысленный голод). Кессара = тьма осмысленная (лицо, голос, право). Это разные вещи.'))
story.append(Spacer(1, 2))
story.append(P('<b>8. Нежить — не злая.</b> Они те, кто решил, что боль утраты хуже, чем отсутствие утраты. Морвена — отрёкшаяся от Айлет, не её потомок.'))
story.append(Spacer(1, 2))
story.append(P('<b>9. Драконорождённые — выкованные, не рождённые.</b> Игнира выкована Веларионом из огня и камня.'))
story.append(Spacer(1, 2))
story.append(P('<b>10. GitHub токен</b> владельца: при необходимости пуша — запроси токен. Не храни его в коде или .env. После пуша — удали из remote URL.'))

# ═══════════════════════════════════════════
# 11. ФАЙЛЫ ДОКУМЕНТАЦИИ
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('11. Файлы документации', h1_style))
story.append(hr())

story.append(build_table(
    ['Файл', 'Страниц', 'Содержание'],
    [
        ['docs/cursed_depths_master.pdf', '35', 'Полный мастер-документ: лор, расы, классы, способности, акты, боссы, нарратив, экономика'],
        ['docs/cursed_depths_class_tree.pdf', '-', 'Диаграмма дерева эволюции классов (6 рас x 4 класса x 3 стадии)'],
        ['docs/cursed_depths_abilities.pdf', '19', 'Полная таблица способностей с балансом и босс-нотами'],
        ['generate_master_doc.py', '-', 'Python-скрипт генерации мастер-PDF (ReportLab, тёмная тема)'],
        ['generate_class_tree.py', '-', 'Скрипт генерации диаграммы классов'],
        ['generate_cursed_depths_pdf.py', '-', 'Скрипт генерации PDF способностей'],
    ],
    [CONTENT_W*0.38, CONTENT_W*0.12, CONTENT_W*0.50]
))

# ═══════════════════════════════════════════
# BUILD
# ═══════════════════════════════════════════

doc.build(story, onFirstPage=cover_bg, onLaterPages=page_bg)
print(f'PDF generated: {OUTPUT}')

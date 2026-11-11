#!/usr/bin/env python3
"""
Cursed Depths — RPG Classes & Abilities Reference PDF
6 races, 24 classes (2 paths x 2 per race), boss mechanics table
Dark theme, Cyrillic text via Carlito font
"""

import os, sys, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch, cm
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
from reportlab.platypus.tableofcontents import TableOfContents

# ─── Font Registration ───
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Bold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Italic', '/usr/share/fonts/truetype/english/Carlito-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-BoldItalic', '/usr/share/fonts/truetype/english/Carlito-BoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVu', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVu-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
registerFontFamily('Carlito', normal='Carlito', bold='Carlito-Bold', italic='Carlito-Italic', boldItalic='Carlito-BoldItalic')
registerFontFamily('DejaVu', normal='DejaVu', bold='DejaVu-Bold')

# Install font fallback for mixed content
sys.path.insert(0, '/home/z/my-project/skills/pdf/scripts')
from pdf import install_font_fallback
install_font_fallback()

# ─── Color Palette (dark mode — Cursed Depths theme) ───
ACCENT       = colors.HexColor('#6b4fc1')
ACCENT_LIGHT = colors.HexColor('#8b6fe1')
ACCENT_DARK  = colors.HexColor('#4b2fa1')
TEXT_PRIMARY  = colors.HexColor('#e9e8e7')
TEXT_MUTED    = colors.HexColor('#8c887f')
BG_SURFACE   = colors.HexColor('#24221c')
BG_PAGE      = colors.HexColor('#131210')
PEPEL_COLOR  = colors.HexColor('#c47a3a')   # Path of Ash — warm orange
SKVERNA_COLOR = colors.HexColor('#7a3ac4')  # Path of Blight — purple
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN    = colors.HexColor('#1a1816')
TABLE_ROW_ODD     = colors.HexColor('#24221c')

# ─── Page Setup ───
PAGE_W, PAGE_H = A4
LEFT_MARGIN = 18*mm
RIGHT_MARGIN = 18*mm
TOP_MARGIN = 20*mm
BOTTOM_MARGIN = 20*mm
CONTENT_W = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

# ─── Styles ───
styles = getSampleStyleSheet()

cover_title_style = ParagraphStyle(
    'CoverTitle', fontName='Carlito-Bold', fontSize=38, leading=46,
    textColor=ACCENT_LIGHT, alignment=TA_CENTER, spaceAfter=10
)
cover_subtitle_style = ParagraphStyle(
    'CoverSubtitle', fontName='Carlito', fontSize=16, leading=22,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceAfter=6
)
cover_meta_style = ParagraphStyle(
    'CoverMeta', fontName='Carlito', fontSize=12, leading=16,
    textColor=TEXT_MUTED, alignment=TA_CENTER
)

h1_style = ParagraphStyle(
    'H1Dark', fontName='Carlito-Bold', fontSize=22, leading=28,
    textColor=ACCENT_LIGHT, spaceBefore=16, spaceAfter=10,
    wordWrap='CJK'
)
h2_style = ParagraphStyle(
    'H2Dark', fontName='Carlito-Bold', fontSize=16, leading=22,
    textColor=PEPEL_COLOR, spaceBefore=14, spaceAfter=8,
    wordWrap='CJK'
)
h2_skverna_style = ParagraphStyle(
    'H2Skverna', fontName='Carlito-Bold', fontSize=16, leading=22,
    textColor=SKVERNA_COLOR, spaceBefore=14, spaceAfter=8,
    wordWrap='CJK'
)
h3_style = ParagraphStyle(
    'H3Dark', fontName='Carlito-Bold', fontSize=12, leading=17,
    textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=4,
    wordWrap='CJK'
)
body_style = ParagraphStyle(
    'BodyDark', fontName='Carlito', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK',
    spaceBefore=2, spaceAfter=4
)
ability_style = ParagraphStyle(
    'AbilityDark', fontName='Carlito', fontSize=9, leading=13,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK',
    spaceBefore=1, spaceAfter=2, leftIndent=8
)
passive_style = ParagraphStyle(
    'PassiveDark', fontName='Carlito-Italic', fontSize=9, leading=13,
    textColor=TEXT_MUTED, alignment=TA_LEFT, wordWrap='CJK',
    spaceBefore=1, spaceAfter=2, leftIndent=8
)
boss_note_style = ParagraphStyle(
    'BossNote', fontName='Carlito-Italic', fontSize=8, leading=11,
    textColor=colors.HexColor('#b06030'), alignment=TA_LEFT, wordWrap='CJK',
    spaceBefore=0, spaceAfter=2, leftIndent=16
)

# Table styles
th_style = ParagraphStyle(
    'THDark', fontName='Carlito-Bold', fontSize=9, leading=12,
    textColor=TABLE_HEADER_TEXT, alignment=TA_CENTER, wordWrap='CJK'
)
td_style = ParagraphStyle(
    'TDDark', fontName='Carlito', fontSize=8.5, leading=12,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK'
)
td_center_style = ParagraphStyle(
    'TDCenterDark', fontName='Carlito', fontSize=8.5, leading=12,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, wordWrap='CJK'
)

# TOC styles
toc_h1_style = ParagraphStyle(
    'TOCH1', fontName='Carlito-Bold', fontSize=13, leading=20,
    leftIndent=10, textColor=ACCENT_LIGHT
)
toc_h2_style = ParagraphStyle(
    'TOCH2', fontName='Carlito', fontSize=11, leading=18,
    leftIndent=28, textColor=TEXT_PRIMARY
)

# ─── Helper functions ───

def P(text, style=body_style):
    return Paragraph(text, style)

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def race_header(race_name, race_sub, icon_text):
    """Create a race section header with decorative line."""
    elements = []
    elements.append(CondPageBreak(PAGE_H * 0.15))
    elements.append(add_heading(f'{icon_text} {race_name}', h1_style, level=0))
    elements.append(P(race_sub, ParagraphStyle('RaceSub', fontName='Carlito-Italic',
        fontSize=12, leading=16, textColor=TEXT_MUTED, spaceAfter=8)))
    elements.append(HRFlowable(width='100%', thickness=1.5, color=ACCENT_DARK,
        spaceAfter=10, spaceBefore=4))
    return elements

def class_header(class_name, path_type):
    """Create a class header colored by path."""
    if path_type == 'pepel':
        style = h2_style
        path_label = '<font color="#c47a3a">[Путь Пепла]</font>'
    else:
        style = h2_skverna_style
        path_label = '<font color="#7a3ac4">[Путь Скверны]</font>'
    return [
        add_heading(f'{class_name} {path_label}', style, level=1),
    ]

def stage_header(stage_name):
    return P(f'<b>{stage_name}</b>', h3_style)

def ability(name, desc, is_passive=False):
    style = passive_style if is_passive else ability_style
    prefix = '<i>пассив:</i> ' if is_passive else ''
    return P(f'<b>{name}</b> — {prefix}{desc}', style)

def boss_note(text):
    return P(f'На боссов: {text}', boss_note_style)

def build_abilities_table(abilities_list):
    """Build a compact table for a stage's abilities.
    abilities_list: [(name, desc, is_passive, boss_text), ...]
    """
    data = [[
        Paragraph('<b>Способность</b>', th_style),
        Paragraph('<b>Описание</b>', th_style),
    ]]
    for name, desc, is_passive, boss_txt in abilities_list:
        prefix = '<i>пасс. </i>' if is_passive else ''
        desc_text = f'{prefix}{desc}'
        if boss_txt:
            desc_text += f'<br/><font color="#b06030"><i>Боссы: {boss_txt}</i></font>'
        data.append([
            Paragraph(f'<b>{name}</b>', td_style),
            Paragraph(desc_text, td_style),
        ])

    col_widths = [CONTENT_W * 0.25, CONTENT_W * 0.75]
    table = Table(data, colWidths=col_widths, hAlign='CENTER')

    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#3a3830')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))

    table.setStyle(TableStyle(style_cmds))
    return table

# ─── Doc Template with TOC ───

class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def page_bg(canvas, doc):
    """Draw dark background on every page."""
    canvas.saveState()
    canvas.setFillColor(BG_PAGE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Subtle accent line at top
    canvas.setStrokeColor(ACCENT_DARK)
    canvas.setLineWidth(1.5)
    canvas.line(LEFT_MARGIN, PAGE_H - TOP_MARGIN + 8, PAGE_W - RIGHT_MARGIN, PAGE_H - TOP_MARGIN + 8)
    # Page number
    canvas.setFont('Carlito', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(PAGE_W / 2, BOTTOM_MARGIN / 2, f'{doc.page}')
    canvas.restoreState()

def cover_page_bg(canvas, doc):
    """Draw cover background."""
    canvas.saveState()
    canvas.setFillColor(BG_PAGE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Decorative lines
    canvas.setStrokeColor(ACCENT_DARK)
    canvas.setLineWidth(0.5)
    y = PAGE_H * 0.35
    canvas.line(LEFT_MARGIN, y, PAGE_W - RIGHT_MARGIN, y)
    y2 = PAGE_H * 0.65
    canvas.line(LEFT_MARGIN, y2, PAGE_W - RIGHT_MARGIN, y2)
    # Accent bar
    canvas.setFillColor(ACCENT)
    canvas.rect(LEFT_MARGIN, PAGE_H * 0.48, CONTENT_W, 3, fill=1, stroke=0)
    canvas.restoreState()

# ═══════════════════════════════════════════
# DATA — ALL RACES, CLASSES, ABILITIES
# ═══════════════════════════════════════════

RACES = []

# ─── ГНОМЫ ───
gnome_classes = [
    {
        'name': 'Клятвенный',
        'path': 'pepel',
        'stages': [
            {
                'name': 'Клятвенный',
                'abilities': [
                    ('Последний рубеж', 'Снижает урон следующего удара врага на 40%.', False, ''),
                    ('Обет крови', 'Накапливает щит за каждый пропущенный удар (макс. 3 стака, каждый = 8% макс. ХП).', False, ''),
                    ('Стойка камня', '+20% брони на 3 хода, но -10% к скорости.', False, ''),
                ]
            },
            {
                'name': 'Страж Предела',
                'abilities': [
                    ('Несокрушимый', '1 раз за бой при получении смертельного урона выживает с 1 ХП и получает щит 15% макс. ХП (КД 5 ходов после срабатывания).', False, ''),
                    ('Ответный молот', 'После блокировки удара наносит контрудар равный 40% поглощённого урона.', False, ''),
                ]
            },
            {
                'name': 'Живой Закон',
                'abilities': [
                    ('Стена Торнака', 'На 2 хода: перенаправляет на себя 20% урона, предназначенного одному союзнику (урон снижается на 25%).', False, ''),
                    ('Вечный обет', 'Пока ХП выше 50%, союзники в группе получают +10% брони.', True, ''),
                ]
            },
        ]
    },
    {
        'name': 'Рунный жнец',
        'path': 'pepel',
        'stages': [
            {
                'name': 'Рунный жнец',
                'abilities': [
                    ('Выжженная руна', 'Следующая атака наносит дополнительный урон огнём равный 50% силы атаки.', False, ''),
                    ('Печать предела', 'Усиливает собственную броню на 30% на 2 хода.', False, ''),
                    ('Рунический удар', 'Атака, оставляющая руну: следующий удар по этому врагу любым союзником наносит +25% урона.', False, ''),
                ]
            },
            {
                'name': 'Меченый',
                'abilities': [
                    ('Огненная печать', 'Помечает врага: 3 хода любой урон по нему становится огненным (игнорирует сопротивление).', False, ''),
                    ('Руническая броня', 'Каждый 3-й полученный удар восстанавливает 5% ХП.', True, ''),
                ]
            },
            {
                'name': 'Кузнец Судьбы',
                'abilities': [
                    ('Перековать судьбу', 'Снимает один дебафф с себя или союзника и превращает его в бафф (+15% к случайной характеристике на 2 хода).', False, ''),
                    ('Руна конца', 'Наносит огромный урон одному врагу; если враг выживает — получает «Горение» на 3 хода (8% ХП/ход).', False, ''),
                ]
            },
        ]
    },
    {
        'name': 'Обвальщик',
        'path': 'skverna',
        'stages': [
            {
                'name': 'Обвальщик',
                'abilities': [
                    ('Трещина', 'Игнорирует 15% брони цели на 2 хода.', False, ''),
                    ('Обрушение', 'Снимает щит с врага, наносит урон равный 60% от снятого.', False, ''),
                    ('Удар изнутри', 'Атака, наносящая доп. урон за каждый дебафф на враге (+10% за дебафф).', False, ''),
                ]
            },
            {
                'name': 'Ломатель Клятв',
                'abilities': [
                    ('Разрыв основы', 'Снимает с врага один бафф и наносит урон равный 40% от его силы.', False, ''),
                    ('Дробитель', 'Атаки по врагам со щитом наносят +30% урона.', True, ''),
                ]
            },
            {
                'name': 'Длань Кузницы',
                'abilities': [
                    ('Переплавка', 'Уничтожает один бафф врага и превращает его в щит для себя (равный 50% силы баффа).', False, ''),
                    ('Косой удар', 'Мощная атака: игнорирует 25% брони, либо если у врага нет щита — +50% урона (без игнора брони).', False, ''),
                ]
            },
        ]
    },
    {
        'name': 'Могильный кузнец',
        'path': 'skverna',
        'stages': [
            {
                'name': 'Могильный кузнец',
                'abilities': [
                    ('Мёртвая жила', 'Блокирует пассивную регенерацию врага на 3 хода.', False, ''),
                    ('Печать немоты', 'Снижает точность врага на 30% и снимает один активный бафф.', False, ''),
                    ('Холод горна', 'Снижает скорость врага на 20% на 2 хода.', False, ''),
                ]
            },
            {
                'name': 'Глушитель',
                'abilities': [
                    ('Печать бессилия', 'Снижает урон врага на 25% на 3 хода.', False, '15% вместо 25%.'),
                    ('Мёртвый металл', 'Враги под дебаффами Могильного кузнеца получают +15% урона от всех источников.', True, '+8% на боссов.'),
                ]
            },
            {
                'name': 'Пожиратель Основ',
                'abilities': [
                    ('Вырвать искру', 'Снимает с врага все баффы и наносит урон за каждый снятый (20% от силы баффа за штуку).', False, 'Снимает максимум 2 баффа.'),
                    ('Тишина глубин', 'Враги в радиусе не могут получать исцеление выше 50% от базового значения.', True, 'Выше 75% от базового значения на боссах.'),
                ]
            },
        ]
    },
]
RACES.append(('ГНОМЫ', 'Хранитель камня (1-9)', gnome_classes))

# ─── ЭЛЬФЫ ───
elf_classes = [
    {
        'name': 'Хранитель нити',
        'path': 'pepel',
        'stages': [
            {
                'name': 'Хранитель нити',
                'abilities': [
                    ('Живая нить', 'Восстанавливает 15% ХП себе или союзнику + реген на 3 хода (3% ХП/ход).', False, ''),
                    ('Семя Айлет', 'При получении смертельного удара 1 раз за бой выживает с 1 ХП и восстанавливает 25% ХП.', False, ''),
                    ('Переплетение', 'Связывает себя с одним союзником: исцеление одного на 30% исцеляет и другого.', False, ''),
                ]
            },
            {
                'name': 'Дитя Рощи',
                'abilities': [
                    ('Корни-щиты', 'Опутывает себя или союзника корнями: поглощает следующий удар полностью.', False, ''),
                    ('Шёпот леса', 'Вне боя восстанавливает 5% ХП и маны группе за каждый ход.', True, ''),
                ]
            },
            {
                'name': 'Голос Айлет',
                'abilities': [
                    ('Древесный покров', 'На 2 хода все союзники в группе получают реген 5% ХП/ход и +20% сопротивления к дебаффам.', False, ''),
                    ('Возвращение к корням', 'Воскрешает одного павшего союзника с 20% ХП (1 раз за бой).', False, ''),
                ]
            },
        ]
    },
    {
        'name': 'Лунный стрелок',
        'path': 'pepel',
        'stages': [
            {
                'name': 'Лунный стрелок',
                'abilities': [
                    ('Серебряная стрела', 'Точная атака с шансом замедления врага на 20% скорости (2 хода).', False, ''),
                    ('Цикл луны', 'Игрок ВЫБИРАЕТ стойку каждые 3 хода: Тень (+20% уклонение) / Кровь (+25% крит) / Яд (6% ХП/ход на 3 хода).', False, ''),
                    ('Залп', 'Выпускает 3 стрелы по одному врагу, каждая с шансом крита +10%.', False, ''),
                ]
            },
            {
                'name': 'Ночной охотник',
                'abilities': [
                    ('Стрела тишины', 'Выстрел, который прерывает подготовку врага и блокирует его следующую атаку.', False, ''),
                    ('Лунная тень', 'В стойке Тени атаки из невидимости наносят +25% урона.', True, ''),
                ]
            },
            {
                'name': 'Дитя Затмения',
                'abilities': [
                    ('Затмение', 'На 2 хода: враг теряет 15% точности, Дитя Затмения получает +30% крита.', False, ''),
                    ('Серебряный дождь', 'Обрушивает град стрел на одного врага: 5 ударов по 40% силы атаки каждый, каждый с шансом «Горения» от серебряного света (4% ХП/ход на 2 хода).', False, ''),
                ]
            },
        ]
    },
    {
        'name': 'Пожиратель тепла',
        'path': 'skverna',
        'stages': [
            {
                'name': 'Пожиратель тепла',
                'abilities': [
                    ('Холодные пальцы', 'Наносит урон и крадёт реген здоровья врага на 2 хода.', False, ''),
                    ('Опустошение', 'Наносит урон и снимает один активный бафф с врага.', False, ''),
                    ('Морозный укус', 'Атака, снижающая скорость врага на 15% и крадущая 5% его макс. ХП как исцеление себе.', False, ''),
                ]
            },
            {
                'name': 'Истощитель',
                'abilities': [
                    ('Ледяная хватка', 'Обездвиживает врага на 1 ход и крадёт 10% его брони на 2 хода.', False, 'Замедление 30% на 1 ход вместо обездвиживания.'),
                    ('Пустое место', 'Каждый снятый бафф с врага даёт +5% к урону (макс. 3 стака).', True, ''),
                ]
            },
            {
                'name': 'Эхо Пустоты',
                'abilities': [
                    ('Вакуум', 'Снимает максимум 2 баффа с одного врага и наносит урон за каждый (15% от силы баффа).', False, ''),
                    ('Поглощение тепла', 'Каждый ход крадёт 2% ХП у текущего врага и передаёт себе.', True, ''),
                ]
            },
        ]
    },
    {
        'name': 'Разрыватель уз',
        'path': 'skverna',
        'stages': [
            {
                'name': 'Разрыватель уз',
                'abilities': [
                    ('Обрыв нити', 'Снимает с врага все эффекты лечения и регена, наносит урон равный 30% снятого.', False, 'Снимает один эффект, урон 15%.'),
                    ('Немая связь', 'Блокирует один случайный скилл врага на 2 хода.', False, 'На 1 ход.'),
                    ('Разрыв', 'Атака, наносящая доп. урон за каждый активный бафф на враге (+15% за бафф).', False, '+8% за бафф на боссах.'),
                ]
            },
            {
                'name': 'Отрёкшийся',
                'abilities': [
                    ('Пустая чаша', 'Враг не может получать баффы 2 хода.', False, '1 ход на боссах.'),
                    ('Глушащий удар', 'Атака, которая silence врага на 1 ход.', False, 'Увеличивает стоимость скиллов на 30% на 1 ход вместо silence.'),
                ]
            },
            {
                'name': 'Безмолвный',
                'abilities': [
                    ('Тишина Айлет', 'На 3 хода текущий враг не может получать исцеление и баффы.', False, 'Исцеление и баффы снижены на 50% на 2 хода.'),
                    ('Последний обрыв', 'Если враг под действием Немой связи погибает, способность перезаряжается мгновенно.', True, ''),
                ]
            },
        ]
    },
]
RACES.append(('ЭЛЬФЫ', 'Служитель леса (1-9)', elf_classes))

# ─── ЛЮДИ ───
human_classes = [
    {
        'name': 'Паладин',
        'path': 'pepel',
        'stages': [
            {
                'name': 'Паладин',
                'abilities': [
                    ('Удар светом', 'Урон + исцеление себя на 20% от урона.', False, ''),
                    ('Щит веры', 'Блокирует следующую атаку.', False, ''),
                    ('Клятва', 'Постоянный бонус: мести (+15% урон), защиты (+15% броня), искупления (+15% исцеление).', False, ''),
                ]
            },
            {
                'name': 'Клятвенник',
                'abilities': [
                    ('Суд света', 'Мощная атака: урон х2, если враг — нежить или идёт Путём Скверны.', False, ''),
                    ('Священная аура', 'Союзники в группе получают +10% к исцелению.', True, ''),
                ]
            },
            {
                'name': 'Очиститель',
                'abilities': [
                    ('Очищающий огонь', 'Снимает все дебаффы с себя и одного союзника, наносит доп. урон текущему врагу за каждый снятый дебафф.', False, ''),
                    ('Несокрушимая воля', 'При ХП ниже 30% — иммунитет к контролю и +20% к исцелению.', True, ''),
                ]
            },
        ]
    },
    {
        'name': 'Жрец',
        'path': 'pepel',
        'stages': [
            {
                'name': 'Жрец',
                'abilities': [
                    ('Благословение оружия', 'Союзник получает огненный урон на 3 хода.', False, ''),
                    ('Очистительная аура', 'Наносит урон нежити и идущим Путём Скверны.', False, ''),
                    ('Молитва', 'Все союзники в группе +20% к урону на 2 хода.', False, ''),
                ]
            },
            {
                'name': 'Служитель пепла',
                'abilities': [
                    ('Огненное причастие', 'Союзник получает щит, поглощающий 30% урона и отражающий 10% обратно атакующему.', False, ''),
                    ('Пламенная проповедь', 'Каждое исцеление имеет шанс 20% снять один дебафф с цели.', True, ''),
                ]
            },
            {
                'name': 'Пастырь пламени',
                'abilities': [
                    ('Великая молитва', 'Все союзники в группе восстанавливают 25% ХП и получают +30% к урону на 2 хода.', False, ''),
                    ('Пламя Велариона', 'Союзник с благословением оружия поджигает врага при ударе (4% ХП/ход на 2 хода).', True, ''),
                ]
            },
        ]
    },
    {
        'name': 'Воин',
        'path': 'pepel',
        'stages': [
            {
                'name': 'Воин',
                'abilities': [
                    ('Точный удар', 'Атака с +20% точностью и шансом крита.', False, ''),
                    ('Боевой темп', 'Каждые 2 удара следующая атака наносит +40% урона.', False, ''),
                    ('Второй ветер', 'Самоисцеление 15% ХП.', False, ''),
                ]
            },
            {
                'name': 'Ветеран',
                'abilities': [
                    ('Рассекающий удар', 'Мощная атака по одному врагу: если убивает — следующий удар +50% урона.', False, ''),
                    ('Боевая стойка', 'Каждый 3-й удар гарантированный крит.', True, ''),
                ]
            },
            {
                'name': 'Маршал Пепла',
                'abilities': [
                    ('Зов битвы', 'Все союзники в группе получают +25% к урону и +15% к скорости на 3 хода.', False, ''),
                    ('Неутомимый', 'При убийстве врага восстанавливает 10% ХП и снимает один дебафф с себя.', True, ''),
                    ('Пробивной удар', 'Игнорирует 20% брони + гарантированный крит (КД 3 хода).', False, ''),
                ]
            },
        ]
    },
    {
        'name': 'Плут',
        'path': 'skverna',
        'stages': [
            {
                'name': 'Плут',
                'abilities': [
                    ('Удар из тени', 'Тройной урон из невидимости.', False, ''),
                    ('Обезоруживание', 'Снижает урон врага на 25% на 2 хода.', False, '15% вместо 25%.'),
                    ('Побег', 'Полное уклонение, выход из боя.', False, ''),
                ]
            },
            {
                'name': 'Тень',
                'abilities': [
                    ('Отравленный клинок', 'Атаки накладывают яд: 5% ХП/ход на 3 хода.', False, ''),
                    ('Теневой шаг', 'Телепорт за спину врага, следующая атака +50% крита.', False, ''),
                ]
            },
            {
                'name': 'Фантом',
                'abilities': [
                    ('Казнь из тени', 'Если у врага ниже 20% ХП — мгновенная казнь (PvE: порог 25%, казнь только не-боссов). В PvP: порог 20%, урон 150% вместо казни.', False, '20% от макс. ХП босса, КД 3 хода.'),
                    ('Бесплотный', '25% шанс полностью уклониться от любой атаки.', True, ''),
                ]
            },
        ]
    },
    {
        'name': 'Чародей',
        'path': 'skverna',
        'stages': [
            {
                'name': 'Чародей',
                'abilities': [
                    ('Луч распада', 'Урон тьмой сквозь броню.', False, ''),
                    ('Проклятие', 'Снижает случайную характеристику врага на 25% на 3 хода.', False, '15% на боссах.'),
                    ('Пакт', 'Мощная атака ценой 15% собственного ХП.', False, ''),
                ]
            },
            {
                'name': 'Падший',
                'abilities': [
                    ('Кольцо тьмы', 'Урон тьмой по текущему врагу + замедление 20% на 2 хода.', False, ''),
                    ('Договор', 'Если ХП ниже 50%, все заклинания тьмы наносят +20% урона.', True, ''),
                ]
            },
            {
                'name': 'Владыка теней',
                'abilities': [
                    ('Бездна', 'Проклятие на одного врага: -20% ко всем характеристикам на 2 хода + Владыка получает 20% от урона, нанесённого этому врагу, как исцеление.', False, '-10% характеристик на 2 хода на боссах.'),
                    ('Тень Глуби', 'Каждый раз, когда враг получает урон от проклятий, восстанавливает 3% маны.', True, ''),
                ]
            },
        ]
    },
    {
        'name': 'Следопыт',
        'path': 'skverna',
        'stages': [
            {
                'name': 'Следопыт',
                'abilities': [
                    ('Меткий выстрел', 'Повышенный урон + шанс замедления.', False, ''),
                    ('Ловушка', 'Урон + замедление 40% на 2 хода.', False, 'Замедление 25% на 2 хода на боссах.'),
                    ('Маскировка', 'Невидимость на 1 ход.', False, ''),
                ]
            },
            {
                'name': 'Охотник',
                'abilities': [
                    ('Двойная ловушка', 'Ставит 2 ловушки: активируются автоматически в начале хода врага — урон + замедление 20% на 2 хода.', False, ''),
                    ('След крови', 'Атаки по замедленным или обездвиженным врагам наносят +25% урона.', True, ''),
                ]
            },
            {
                'name': 'Око мрака',
                'abilities': [
                    ('Смертельный маршрут', 'Помечает врага: все атаки союзников по нему +30% точности и +20% крита на 3 хода.', False, ''),
                    ('Ночной охотник', 'Из маскировки первая атака всегда критическая.', True, ''),
                ]
            },
        ]
    },
]
RACES.append(('ЛЮДИ', 'Хранитель Воли (1-9)', human_classes))

# ─── ДРАКОНОРОЖДЁННЫЕ ───
dragon_classes = [
    {
        'name': 'Пламенный легат',
        'path': 'pepel',
        'stages': [
            {
                'name': 'Пламенный легат',
                'abilities': [
                    ('Рассекающий жар', 'Атака огнём + «Горение» на 3 хода (5% ХП/ход).', False, ''),
                    ('Ярость огня', 'При активном «Горении» на враге все атаки наносят +20% урона.', False, ''),
                    ('Огненный вдох', 'Поджигает собственное оружие: следующие 2 атаки наносят огненный урон.', False, ''),
                ]
            },
            {
                'name': 'Опалённый',
                'abilities': [
                    ('Огненный вихрь', 'Мощная атака огнём по одному врагу: если у врага уже «Горение» — урон х2.', False, ''),
                    ('Жар крови', 'При получении урона шанс 20% поджечь атакующего (4% ХП/ход на 2 хода).', True, ''),
                ]
            },
            {
                'name': 'Жрец Игниры',
                'abilities': [
                    ('Пламя возрождения', 'Поджигает себя: теряет 8% ХП/ход, но все атаки наносят +50% огненного урона; союзники в группе получают реген 5% ХП/ход.', False, ''),
                    ('Дыхание дракона', 'Раз в 5 ходов следующая атака автоматически становится огненной с +60% урона.', True, ''),
                ]
            },
        ]
    },
    {
        'name': 'Каменнокожий',
        'path': 'pepel',
        'stages': [
            {
                'name': 'Каменнокожий',
                'abilities': [
                    ('Базальтовая шкура', 'Снижает урон следующего удара на 25%.', False, ''),
                    ('Зеркало Торнака', '20% шанс отразить физический урон обратно врагу.', True, ''),
                    ('Удар хвостом', 'Отбрасывает врага (прерывает подготовку) и снижает скорость на 15% на 2 хода.', False, ''),
                ]
            },
            {
                'name': 'Каменный легат',
                'abilities': [
                    ('Каменный панцирь', 'На 2 хода +30% брони, но -15% скорости.', False, ''),
                    ('Колосс', 'При ХП выше 70% получает доп. +10% брони.', True, ''),
                ]
            },
            {
                'name': 'Нерушимый',
                'abilities': [
                    ('Живая крепость', 'На 3 хода перенаправляет 40% урона, получаемого одним союзником, на себя (урон снижается на 15%).', False, ''),
                    ('Основа Торнака', 'При блокировании удара восстанавливает 3% ХП.', True, ''),
                ]
            },
        ]
    },
    {
        'name': 'Пепельный гладиатор',
        'path': 'skverna',
        'stages': [
            {
                'name': 'Пепельный гладиатор',
                'abilities': [
                    ('Метеоритный удар', 'Тратит 10% собственного ХП, наносит 200% урона.', False, ''),
                    ('Драконья кровь', 'Восстанавливает ХП равное 40% от урона огнём за ход.', False, ''),
                    ('Пепельный клинок', 'Атака: чем меньше ХП у гладиатора, тем выше урон (+5% за каждый недостающий 10% ХП).', False, ''),
                ]
            },
            {
                'name': 'Выживший',
                'abilities': [
                    ('Испытание огнём', 'Поджигает себя на 2 хода (3% ХП/ход), но атаки наносят +50% урона.', False, ''),
                    ('Живучесть', 'При ХП ниже 25% регенерация +10% ХП/ход.', True, ''),
                ]
            },
            {
                'name': 'Воплощение Пепла',
                'abilities': [
                    ('Извержение', 'Тратит 25% ХП, наносит колоссальный урон огнём одному врагу + «Горение» 8% ХП/ход на 3 хода.', False, ''),
                    ('Феникс', '1 раз за бой при смерти восстанавливается с 40% ХП.', True, ''),
                ]
            },
        ]
    },
    {
        'name': 'Обсидиановый воин',
        'path': 'skverna',
        'stages': [
            {
                'name': 'Обсидиановый воин',
                'abilities': [
                    ('Чёрное жало', 'Атака, игнорирующая 40% брони.', False, ''),
                    ('Раскалённая чешуя', 'При получении урона наносит урон огнём атакующему (1 раз за ход).', True, ''),
                    ('Обсидиановый панцирь', 'Снижает следующий получаемый урон на 25%, но следующая атака наносит -15% урона.', False, ''),
                ]
            },
            {
                'name': 'Тёмный легат',
                'abilities': [
                    ('Пробивание брони', 'Следующая атака игнорирует 60% брони цели.', False, '40% на боссах.'),
                    ('Осколочная чешуя', 'Шанс 30% при получении удара — атакующий получает «Осколки» (5% ХП/ход на 2 хода).', True, ''),
                ]
            },
            {
                'name': 'Испепелитель',
                'abilities': [
                    ('Чёрный метеор', 'Атака: игнорирует 50% брони + наносит доп. урон за каждый дебафф на враге (+15% за дебафф).', False, '+8% за дебафф на боссах.'),
                    ('Плавка', 'Враги под «Осколками» или «Горением» получают +20% физического урона от Испепелителя.', True, ''),
                ]
            },
        ]
    },
]
RACES.append(('ДРАКОНОРОЖДЁННЫЕ', 'Оплот пламени (1-9)', dragon_classes))

# ─── НЕЖИТЬ ───
undead_classes = [
    {
        'name': 'Чумной жнец',
        'path': 'pepel',
        'stages': [
            {
                'name': 'Чумной жнец',
                'abilities': [
                    ('Гнилая рана', 'Накладывает яд: 8% ХП/ход на 4 хода.', False, '5% ХП/ход на боссах.'),
                    ('Восстание мёртвых', 'Поднимает павшего врага как скелета-союзника на 3 хода (50% ХП и урона оригинала).', False, 'Не работает, вместо этого — яд 10% ХП/ход на 2 хода.'),
                    ('Сбор душ', 'Каждый убитый враг даёт +3% к урону и +2% к исцелению (стакается до 5 раз за бой).', True, ''),
                ]
            },
            {
                'name': 'Некромант',
                'abilities': [
                    ('Рой мертвецов', 'Призывает 2 скелетов (существуют 2 хода, 40% ХП и урона; если нет павших врагов — призываются из пустоты с 30% ХП/урона).', False, ''),
                    ('Могильная связь', 'Скелеты-союзники при смерти наносят урон текущему врагу (10% от ХП мертвеца).', True, ''),
                ]
            },
            {
                'name': 'Владыка Мора',
                'abilities': [
                    ('Легион праха', 'Призывает 3 скелетов из пустоты (25% ХП/урона, существуют 1 ход).', False, 'Вместо призыва — яд 8% ХП/ход на 3 хода, либо разовый урон 30% от макс. ХП босса.'),
                    ('Пепельная жатва', 'Если на поле боя есть скелеты-союзники, Владыка Мора регенерирует 5% ХП в ход.', True, ''),
                ]
            },
        ]
    },
    {
        'name': 'Костяной страж',
        'path': 'pepel',
        'stages': [
            {
                'name': 'Костяной страж',
                'abilities': [
                    ('Истлевшая плоть', 'Снижает входящий урон на 20% на 3 хода.', False, ''),
                    ('Последняя воля', '1 раз за бой при смертельном ударе выживает с 1 ХП и восстанавливает 15% ХП.', False, ''),
                    ('Костяной щит', 'Создаёт щит из костей: поглощает урон равный 20% макс. ХП.', False, ''),
                ]
            },
            {
                'name': 'Вечный солдат',
                'abilities': [
                    ('Костяной шип', 'При блокировании удара атакующий получает урон равный 15% от поглощённого.', False, ''),
                    ('Неупокоенный', 'При ХП ниже 40% входящий урон снижается на доп. 15%.', True, ''),
                ]
            },
            {
                'name': 'Несломленный',
                'abilities': [
                    ('Костяная крепость', 'На 2 хода: весь входящий урон снижается на 40%, Несломленный провоцирует текущего врага атаковать его.', False, ''),
                    ('Вечный страж', 'После выживания со смертельного удара (Последняя воля) получает +30% к урону на 2 хода.', True, ''),
                ]
            },
        ]
    },
    {
        'name': 'Алхимик распада',
        'path': 'skverna',
        'stages': [
            {
                'name': 'Алхимик распада',
                'abilities': [
                    ('Гниющий знак', 'Все последующие дебаффы на враге сильнее на 20%.', False, '10% на боссах.'),
                    ('Двойной мор', 'Накладывает 2 яда одновременно (каждый 5% ХП/ход на 3 хода).', False, '3% ХП/ход на боссах.'),
                    ('Гнилостная бомба', 'Бросает в текущего врага: яд 4% ХП/ход на 3 хода + снижает броню на 10% на 2 хода.', False, ''),
                ]
            },
            {
                'name': 'Чумной апостол',
                'abilities': [
                    ('Заражение', 'Яд распространяется: если в бою несколько врагов, следующий враг тоже получает яд (50% силы оригинала; в 1v1 — яд усиливается на 20% каждый ход).', False, ''),
                    ('Усиление заразы', 'Каждый ход действия яда на враге увеличивает его силу на 1% (макс. +5%).', True, ''),
                ]
            },
            {
                'name': 'Архилич',
                'abilities': [
                    ('Чума', 'Текущий враг получает мощный яд 6% ХП/ход на 4 хода + исцеление снижается на 50%.', False, 'Яд 4% ХП/ход, исцеление снижено на 25%.'),
                    ('Распад реальности', 'Враги с 3+ дебаффами теряют 5% макс. ХП каждый ход.', True, '3% на боссах.'),
                ]
            },
        ]
    },
    {
        'name': 'Пустотный вор',
        'path': 'skverna',
        'stages': [
            {
                'name': 'Пустотный вор',
                'abilities': [
                    ('Угасание', 'Наносит урон и снимает один бафф с врага.', False, ''),
                    ('Рука Морвены', 'Блокирует случайный скилл врага на 2 хода.', False, 'На 1 ход.'),
                    ('Теневой обход', 'Телепорт за спину врага, следующая атака +25% урона.', False, ''),
                ]
            },
            {
                'name': 'Опустошитель',
                'abilities': [
                    ('Похищение силы', 'Крадёт один бафф с врага и накладывает на себя.', False, ''),
                    ('Пустая тень', 'После уклонения следующая атака снимает бафф гарантированно.', True, ''),
                ]
            },
            {
                'name': 'Безмолвный жнец',
                'abilities': [
                    ('Полное угасание', 'Снимает все баффы с врага, наносит урон за каждый (15% от силы баффа) и блокирует 2 случайных скилла на 2 хода.', False, 'Снимает максимум 2 баффа, блокирует 1 скилл на 1 ход.'),
                    ('Тишина смерти', 'Враги без активных баффов получают +20% урона от Безмолвного жнеца.', True, ''),
                ]
            },
        ]
    },
]
RACES.append(('НЕЖИТЬ', 'Восставший (1-9)', undead_classes))

# ─── ОРКИ ───
orc_classes = [
    {
        'name': 'Неистовый берсерк',
        'path': 'pepel',
        'stages': [
            {
                'name': 'Неистовый берсерк',
                'abilities': [
                    ('Безрассудный взмах', 'Огромный урон, тратит 10% собственного ХП.', False, ''),
                    ('Жажда крови', 'Следующая атака лечит орка на 50% от урона.', False, ''),
                    ('Яростный рёв', '+25% к урону на 2 хода, но -15% к броне.', False, ''),
                ]
            },
            {
                'name': 'Кровавый палач',
                'abilities': [
                    ('Расчленение', 'Атака: если убивает врага, восстанавливает 20% ХП и следующий удар +50% урона.', False, ''),
                    ('Берсерк', 'При ХП ниже 50% — +20% к урону и +10% к скорости.', True, ''),
                ]
            },
            {
                'name': 'Бог Войны',
                'abilities': [
                    ('Резня', 'Серия из 3 ударов по одному врагу, каждый следующий +30% урона; если враг погибает — перезаряжается мгновенно.', False, ''),
                    ('Неистовые', 'При убийстве врага союзники-орки в группе получают +15% к урону на 2 хода.', True, ''),
                ]
            },
        ]
    },
    {
        'name': 'Хранитель Стены',
        'path': 'pepel',
        'stages': [
            {
                'name': 'Хранитель Стены',
                'abilities': [
                    ('Стойкость Грумгара', 'Снижает урон следующего удара на 50%.', False, ''),
                    ('Ответный удар', 'После блока наносит урон равный 60% поглощённого.', False, ''),
                    ('Боевой строй', 'Союзник в группе получает +15% брони.', False, ''),
                ]
            },
            {
                'name': 'Страж рубежа',
                'abilities': [
                    ('Живой щит', 'На 2 хода перенаправляет на себя весь урон, предназначенный одному союзнику (урон снижается на 25%).', False, ''),
                    ('Непоколебимость', 'Не может быть отброшен или обездвижен.', True, ''),
                ]
            },
            {
                'name': 'Железный Страж',
                'abilities': [
                    ('Стена Грумгара', 'На 3 хода: урон по одному выбранному союзнику снижается на 30%, Железный Страж получает 50% этого урона.', False, ''),
                    ('Последний оплот', 'При защите союзника собственная броня +20%.', True, ''),
                ]
            },
        ]
    },
    {
        'name': 'Кровавый охотник',
        'path': 'skverna',
        'stages': [
            {
                'name': 'Кровавый охотник',
                'abilities': [
                    ('Клык', 'Быстрая атака с вампиризмом 30%.', False, ''),
                    ('Отрицание смерти', 'При падении ниже 15% ХП получает +50% к урону на 2 хода.', False, ''),
                    ('Запах крови', 'Помечает врага: атаки по нему +15% точности и крита.', False, ''),
                ]
            },
            {
                'name': 'Рубака',
                'abilities': [
                    ('Вскрытие', 'Атака: наносит доп. урон за каждый дебафф на враге (+10% за дебафф) + вампиризм 40%.', False, ''),
                    ('Жажда', 'Каждое убийство восстанавливает 8% ХП.', True, ''),
                ]
            },
            {
                'name': 'Палач Богов',
                'abilities': [
                    ('Казнь', 'Если у врага ниже 25% ХП — мгновенная казнь.', False, '20% от макс. ХП босса, 1 раз за бой.'),
                    ('Охотник на божеств', 'Атаки по врагам с активными баффами наносят +25% урона и снимают один бафф.', True, '+15% урона на боссах, снимает бафф с шансом 30%.'),
                ]
            },
        ]
    },
    {
        'name': 'Вожак орды',
        'path': 'skverna',
        'stages': [
            {
                'name': 'Вожак орды',
                'abilities': [
                    ('Боевой рёв', 'Снижает защиту врага на 25% на 3 хода.', False, '15% на боссах.'),
                    ('Устрашение', 'С шансом 35% враг пропускает следующий ход.', False, 'Шанс 15%.'),
                    ('Зов добычи', 'Помечает врага: все союзники получают +10% урона по цели.', False, ''),
                ]
            },
            {
                'name': 'Зовущий в бой',
                'abilities': [
                    ('Натиск', 'Все союзники в группе получают +20% к скорости на 2 хода.', False, ''),
                    ('Вожак', 'Союзники рядом получают +10% к урону.', True, ''),
                ]
            },
            {
                'name': 'Крушитель Черепов',
                'abilities': [
                    ('Разгром', 'Мощнейшая атака: огромный урон + враг теряет 15% брони на 2 хода.', False, '10% на боссах.'),
                    ('Диктат силы', 'Враги с пониженной защитой получают +10% урона от всех источников.', True, '+5% на боссов.')
                ]
            },
        ]
    },
]
RACES.append(('ОРКИ', 'Воин клана (1-9)', orc_classes))

# ─── Boss Mechanics Table ───
BOSS_MECHANICS = [
    ('Мгновенная казнь', 'Мгновенная смерть', '20-25% от макс. ХП'),
    ('Снятие баффов', 'Все', 'Максимум 2'),
    ('Silence / блок скиллов', 'Полный', '1 ход или снижение стоимости'),
    ('Обездвиживание', 'Полное', 'Замедление 30%'),
    ('Дебаффы (снижение характеристик)', '100% силы', '50-60% силы'),
    ('Яды (ХП/ход)', '100% силы', '50-75% силы'),
    ('AoE урон', 'Убран, одна цель', '—'),
    ('Хил / баффы на группу', 'Оставлены', 'Оставлены'),
]

# ═══════════════════════════════════════════
# BUILD PDF
# ═══════════════════════════════════════════

OUTPUT_PATH = '/home/z/my-project/download/cursed_depths_abilities.pdf'

doc = TocDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=LEFT_MARGIN,
    rightMargin=RIGHT_MARGIN,
    topMargin=TOP_MARGIN,
    bottomMargin=BOTTOM_MARGIN,
    title='Cursed Depths — Расы, Классы и Способности',
    author='Z.ai',
    creator='Z.ai',
)

story = []

# ─── COVER PAGE ───
story.append(Spacer(1, PAGE_H * 0.22))
story.append(Paragraph('<b>CURSED DEPTHS</b>', cover_title_style))
story.append(Spacer(1, 8))
story.append(Paragraph('Расы, Классы и Способности (v2 — баланс)', cover_subtitle_style))
story.append(Spacer(1, 16))
story.append(Paragraph('Справочник по механикам 1v1 дуэлей и пати/рейдов', cover_meta_style))
story.append(Spacer(1, 6))
story.append(Paragraph('6 рас / 24 класса / 2 пути / Путь Пепла и Путь Скверны', cover_meta_style))
story.append(Spacer(1, 30))

# Path legend on cover
path_legend_style = ParagraphStyle('PathLegend', fontName='Carlito', fontSize=11, leading=16,
    textColor=TEXT_MUTED, alignment=TA_CENTER)
story.append(Paragraph('<font color="#c47a3a"><b>Путь Пепла</b></font> — танк / поддержка / регенерация', path_legend_style))
story.append(Paragraph('<font color="#7a3ac4"><b>Путь Скверны</b></font> — DPS / маг / вампиризм / дебаффы', path_legend_style))

story.append(PageBreak())

# ─── TABLE OF CONTENTS ───
toc = TableOfContents()
toc.levelStyles = [toc_h1_style, toc_h2_style]
story.append(Paragraph('<b>Содержание</b>', ParagraphStyle('TOCTitle', fontName='Carlito-Bold',
    fontSize=20, leading=28, textColor=ACCENT_LIGHT, spaceAfter=16, alignment=TA_CENTER)))
story.append(toc)
story.append(PageBreak())

# ─── RACE SECTIONS ───
race_icons = {
    'ГНОМЫ': '[I]',
    'ЭЛЬФЫ': '[II]',
    'ЛЮДИ': '[III]',
    'ДРАКОНОРОЖДЁННЫЕ': '[IV]',
    'НЕЖИТЬ': '[V]',
    'ОРКИ': '[VI]',
}

for race_name, race_sub, classes in RACES:
    icon = race_icons.get(race_name, '◆')
    story.extend(race_header(race_name, race_sub, icon))

    for cls in classes:
        story.extend(class_header(cls['name'], cls['path']))

        for stage in cls['stages']:
            story.append(stage_header(stage['name']))
            tbl = build_abilities_table(stage['abilities'])
            story.append(Spacer(1, 4))
            story.append(tbl)
            story.append(Spacer(1, 6))

    story.append(Spacer(1, 12))

# ─── BOSS MECHANICS TABLE ───
story.append(CondPageBreak(PAGE_H * 0.15))
story.append(add_heading('Механики: обычный враг vs босс', h1_style, level=0))
story.append(Spacer(1, 6))
story.append(P('Правила корректировки способностей для разных типов противников. Все массовые эффекты убраны — только точечный урон. Хилы и баффы на группу сохранены.', body_style))
story.append(Spacer(1, 10))

boss_data = [[
    Paragraph('<b>Механика</b>', th_style),
    Paragraph('<b>Обычный враг</b>', th_style),
    Paragraph('<b>Босс</b>', th_style),
]]
for mech, normal, boss in BOSS_MECHANICS:
    boss_data.append([
        Paragraph(mech, td_style),
        Paragraph(normal, td_center_style),
        Paragraph(boss, td_center_style),
    ])

boss_col_w = [CONTENT_W * 0.35, CONTENT_W * 0.325, CONTENT_W * 0.325]
boss_table = Table(boss_data, colWidths=boss_col_w, hAlign='CENTER')
boss_style_cmds = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#3a3830')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]
for i in range(1, len(boss_data)):
    bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
    boss_style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
boss_table.setStyle(TableStyle(boss_style_cmds))
story.append(boss_table)

# ─── BALANCE TABLE ───
story.append(Spacer(1, 24))
story.append(add_heading('Итоговая таблица баланса', h1_style, level=0))
story.append(Spacer(1, 6))
story.append(P('Оценка классов после балансировочных правок. Шкала 1-10, где 10 — идеально сбалансирован.', body_style))
story.append(Spacer(1, 10))

BALANCE_DATA = [
    ('Гномы', 'Клятвенный', '8/10', 'Обвальщик', '8/10'),
    ('Гномы', 'Рунный жнец', '8/10', 'Могильный кузнец', '8/10'),
    ('Эльфы', 'Хранитель нити', '7/10', 'Пожиратель тепла', '8/10'),
    ('Эльфы', 'Лунный стрелок', '8/10', 'Разрыватель уз', '8/10'),
    ('Люди', 'Паладин', '9/10', 'Плут', '7/10'),
    ('Люди', 'Жрец', '8/10', 'Чародей', '7/10'),
    ('Люди', 'Воин', '7/10', 'Следопыт', '7/10'),
    ('Драконорождённые', 'Каменнокожий', '8/10', 'Пепельный гладиатор', '7/10'),
    ('Драконорождённые', 'Пламенный легат', '8/10', 'Обсидиановый воин', '8/10'),
    ('Нежить', 'Костяной страж', '9/10', 'Алхимик распада', '7/10'),
    ('Нежить', 'Чумной жнец', '8/10', 'Пустотный вор', '8/10'),
    ('Орки', 'Неистовый берсерк', '8/10', 'Кровавый охотник', '8/10'),
    ('Орки', 'Хранитель Стены', '8/10', 'Вожак орды', '7/10'),
]

bal_header = [
    Paragraph('<b>Раса</b>', th_style),
    Paragraph('<b>Путь Пепла</b>', th_style),
    Paragraph('<b>Оценка</b>', th_style),
    Paragraph('<b>Путь Скверны</b>', th_style),
    Paragraph('<b>Оценка</b>', th_style),
]
bal_data = [bal_header]
for row in BALANCE_DATA:
    bal_data.append([
        Paragraph(row[0], td_style),
        Paragraph(row[1], td_center_style),
        Paragraph(row[2], td_center_style),
        Paragraph(row[3], td_center_style),
        Paragraph(row[4], td_center_style),
    ])

bal_col_w = [CONTENT_W*0.18, CONTENT_W*0.25, CONTENT_W*0.12, CONTENT_W*0.25, CONTENT_W*0.12]
bal_table = Table(bal_data, colWidths=bal_col_w, hAlign='CENTER')
bal_style_cmds = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#3a3830')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]
for i in range(1, len(bal_data)):
    bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
    bal_style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
bal_table.setStyle(TableStyle(bal_style_cmds))
story.append(bal_table)

# ─── BUILD ───
doc.multiBuild(story, onLaterPages=page_bg, onFirstPage=cover_page_bg)
print(f'PDF generated: {OUTPUT_PATH}')

# Check page count
from pypdf import PdfReader
reader = PdfReader(OUTPUT_PATH)
print(f'Pages: {len(reader.pages)}')

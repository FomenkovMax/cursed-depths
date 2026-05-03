#!/usr/bin/env python3
"""
Cursed Depths — Master Development Document PDF
Combines the full master doc structure with our approved lore, races, classes, and abilities.
Dark theme, Cyrillic via Carlito font, 31+ pages
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
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN    = colors.HexColor('#1a1816')
TABLE_ROW_ODD     = colors.HexColor('#24221c')
BOSS_NOTE_COLOR = colors.HexColor('#b06030')

# ─── Page Setup ───
PAGE_W, PAGE_H = A4
LEFT_MARGIN = 18*mm
RIGHT_MARGIN = 18*mm
TOP_MARGIN = 20*mm
BOTTOM_MARGIN = 20*mm
CONTENT_W = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

# ─── Styles ───
cover_title_style = ParagraphStyle('CoverTitle', fontName='Carlito-Bold', fontSize=38, leading=46,
    textColor=ACCENT_LIGHT, alignment=TA_CENTER, spaceAfter=10)
cover_subtitle_style = ParagraphStyle('CoverSubtitle', fontName='Carlito', fontSize=16, leading=22,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceAfter=6)
cover_meta_style = ParagraphStyle('CoverMeta', fontName='Carlito', fontSize=12, leading=16,
    textColor=TEXT_MUTED, alignment=TA_CENTER)

h1_style = ParagraphStyle('H1Dark', fontName='Carlito-Bold', fontSize=20, leading=26,
    textColor=ACCENT_LIGHT, spaceBefore=16, spaceAfter=8, wordWrap='CJK')
h2_style = ParagraphStyle('H2Dark', fontName='Carlito-Bold', fontSize=15, leading=20,
    textColor=PEPEL_COLOR, spaceBefore=12, spaceAfter=6, wordWrap='CJK')
h2_skverna_style = ParagraphStyle('H2Skverna', fontName='Carlito-Bold', fontSize=15, leading=20,
    textColor=SKVERNA_COLOR, spaceBefore=12, spaceAfter=6, wordWrap='CJK')
h3_style = ParagraphStyle('H3Dark', fontName='Carlito-Bold', fontSize=12, leading=17,
    textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=4, wordWrap='CJK')
h4_style = ParagraphStyle('H4Dark', fontName='Carlito-Bold', fontSize=10, leading=14,
    textColor=TEXT_MUTED, spaceBefore=8, spaceAfter=3, wordWrap='CJK')
body_style = ParagraphStyle('BodyDark', fontName='Carlito', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, wordWrap='CJK', spaceBefore=2, spaceAfter=4)
body_left_style = ParagraphStyle('BodyLeftDark', fontName='Carlito', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK', spaceBefore=2, spaceAfter=4)
bullet_style = ParagraphStyle('BulletDark', fontName='Carlito', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK', spaceBefore=1, spaceAfter=2, leftIndent=16, bulletIndent=6)
boss_note_style = ParagraphStyle('BossNote', fontName='Carlito-Italic', fontSize=8, leading=11,
    textColor=BOSS_NOTE_COLOR, alignment=TA_LEFT, wordWrap='CJK', spaceBefore=0, spaceAfter=2, leftIndent=16)

th_style = ParagraphStyle('THDark', fontName='Carlito-Bold', fontSize=8.5, leading=12,
    textColor=TABLE_HEADER_TEXT, alignment=TA_CENTER, wordWrap='CJK')
td_style = ParagraphStyle('TDDark', fontName='Carlito', fontSize=8.5, leading=12,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK')
td_center_style = ParagraphStyle('TDCenterDark', fontName='Carlito', fontSize=8.5, leading=12,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, wordWrap='CJK')

toc_h1_style = ParagraphStyle('TOCH1', fontName='Carlito-Bold', fontSize=12, leading=18,
    leftIndent=10, textColor=ACCENT_LIGHT)
toc_h2_style = ParagraphStyle('TOCH2', fontName='Carlito', fontSize=10, leading=16,
    leftIndent=28, textColor=TEXT_PRIMARY)

# ─── Helpers ───
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

def build_center_table(headers, rows, col_widths=None):
    data = [[Paragraph(f'<b>{h}</b>', th_style) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), td_center_style) for c in row])
    if col_widths is None:
        col_widths = [CONTENT_W / len(headers)] * len(headers)
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#3a3830')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
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

# Abilities table (name + description with boss notes)
def build_abilities_table(abilities_list):
    data = [[Paragraph('<b>Способность</b>', th_style), Paragraph('<b>Описание</b>', th_style)]]
    for name, desc, is_passive, boss_txt in abilities_list:
        prefix = '<i>пасс. </i>' if is_passive else ''
        desc_text = f'{prefix}{desc}'
        if boss_txt:
            desc_text += f'<br/><font color="#b06030"><i>Боссы: {boss_txt}</i></font>'
        data.append([Paragraph(f'<b>{name}</b>', td_style), Paragraph(desc_text, td_style)])
    col_widths = [CONTENT_W * 0.25, CONTENT_W * 0.75]
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#3a3830')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(cmds))
    return t

# ─── Doc Template ───
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def page_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG_PAGE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setStrokeColor(ACCENT_DARK)
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
    canvas.setStrokeColor(ACCENT_DARK)
    canvas.setLineWidth(0.5)
    canvas.line(LEFT_MARGIN, PAGE_H*0.35, PAGE_W-RIGHT_MARGIN, PAGE_H*0.35)
    canvas.line(LEFT_MARGIN, PAGE_H*0.65, PAGE_W-RIGHT_MARGIN, PAGE_H*0.65)
    canvas.setFillColor(ACCENT)
    canvas.rect(LEFT_MARGIN, PAGE_H*0.48, CONTENT_W, 3, fill=1, stroke=0)
    canvas.restoreState()

# ═══════════════════════════════════════════
# ALL CLASS/ABILITY DATA (from our approved balanced design)
# ═══════════════════════════════════════════
RACES_DATA = [
    ('ГНОМЫ', 'Хранитель камня', [
        {
            'name': 'Клятвенный', 'path': 'pepel',
            'stages': [
                {'name': 'Клятвенный', 'abilities': [
                    ('Последний рубеж', 'Снижает урон следующего удара врага на 40%.', False, ''),
                    ('Обет крови', 'Накапливает щит за каждый пропущенный удар (макс. 3 стака, каждый = 8% макс. ХП).', False, ''),
                    ('Стойка камня', '+20% брони на 3 хода, но -10% к скорости.', False, ''),
                ]},
                {'name': 'Страж Предела', 'abilities': [
                    ('Несокрушимый', '1 раз за бой при получении смертельного урона выживает с 1 ХП и получает щит 15% макс. ХП (КД 5 ходов после срабатывания).', False, ''),
                    ('Ответный молот', 'После блокировки удара наносит контрудар равный 40% поглощённого урона.', False, ''),
                ]},
                {'name': 'Живой Закон', 'abilities': [
                    ('Стена Торнака', 'На 2 хода: перенаправляет на себя 20% урона, предназначенного одному союзнику (урон снижается на 25%).', False, ''),
                    ('Вечный обет', 'Пока ХП выше 50%, союзники в группе получают +10% брони.', True, ''),
                ]},
            ]
        },
        {
            'name': 'Рунный жнец', 'path': 'pepel',
            'stages': [
                {'name': 'Рунный жнец', 'abilities': [
                    ('Выжженная руна', 'Следующая атака наносит дополнительный урон огнём равный 50% силы атаки.', False, ''),
                    ('Печать предела', 'Усиливает собственную броню на 30% на 2 хода.', False, ''),
                    ('Рунический удар', 'Атака, оставляющая руну: следующий удар по этому врагу любым союзником наносит +25% урона.', False, ''),
                ]},
                {'name': 'Меченый', 'abilities': [
                    ('Огненная печать', 'Помечает врага: 3 хода любой урон по нему становится огненным (игнорирует сопротивление).', False, ''),
                    ('Руническая броня', 'Каждый 3-й полученный удар восстанавливает 5% ХП.', True, ''),
                ]},
                {'name': 'Кузнец Судьбы', 'abilities': [
                    ('Перековать судьбу', 'Снимает один дебафф с себя или союзника и превращает его в бафф (+15% к случайной характеристике на 2 хода).', False, ''),
                    ('Руна конца', 'Наносит огромный урон одному врагу; если враг выживает — получает «Горение» на 3 хода (8% ХП/ход).', False, ''),
                ]},
            ]
        },
        {
            'name': 'Обвальщик', 'path': 'skverna',
            'stages': [
                {'name': 'Обвальщик', 'abilities': [
                    ('Трещина', 'Игнорирует 15% брони цели на 2 хода.', False, ''),
                    ('Обрушение', 'Снимает щит с врага, наносит урон равный 60% от снятого.', False, ''),
                    ('Удар изнутри', 'Атака, наносящая доп. урон за каждый дебафф на враге (+10% за дебафф).', False, ''),
                ]},
                {'name': 'Ломатель Клятв', 'abilities': [
                    ('Разрыв основы', 'Снимает с врага один бафф и наносит урон равный 40% от его силы.', False, ''),
                    ('Дробитель', 'Атаки по врагам со щитом наносят +30% урона.', True, ''),
                ]},
                {'name': 'Длань Кузницы', 'abilities': [
                    ('Переплавка', 'Уничтожает один бафф врага и превращает его в щит для себя (равный 50% силы баффа).', False, ''),
                    ('Косой удар', 'Мощная атака: игнорирует 25% брони, либо если у врага нет щита — +50% урона (без игнора брони).', False, ''),
                ]},
            ]
        },
        {
            'name': 'Могильный кузнец', 'path': 'skverna',
            'stages': [
                {'name': 'Могильный кузнец', 'abilities': [
                    ('Мёртвая жила', 'Блокирует пассивную регенерацию врага на 3 хода.', False, ''),
                    ('Печать немоты', 'Снижает точность врага на 30% и снимает один активный бафф.', False, ''),
                    ('Холод горна', 'Снижает скорость врага на 20% на 2 хода.', False, ''),
                ]},
                {'name': 'Глушитель', 'abilities': [
                    ('Печать бессилия', 'Снижает урон врага на 25% на 3 хода.', False, '15% вместо 25%.'),
                    ('Мёртвый металл', 'Враги под дебаффами Могильного кузнеца получают +15% урона от всех источников.', True, '+8% на боссов.'),
                ]},
                {'name': 'Пожиратель Основ', 'abilities': [
                    ('Вырвать искру', 'Снимает с врага все баффы и наносит урон за каждый снятый (20% от силы баффа за штуку).', False, 'Снимает максимум 2 баффа.'),
                    ('Тишина глубин', 'Враги в радиусе не могут получать исцеление выше 50% от базового значения.', True, 'Выше 75% от базового значения на боссах.'),
                ]},
            ]
        },
    ]),
    ('ЭЛЬФЫ', 'Служитель леса', [
        {
            'name': 'Хранитель нити', 'path': 'pepel',
            'stages': [
                {'name': 'Хранитель нити', 'abilities': [
                    ('Живая нить', 'Восстанавливает 15% ХП себе или союзнику + реген на 3 хода (3% ХП/ход).', False, ''),
                    ('Семя Айлет', 'При получении смертельного удара 1 раз за бой выживает с 1 ХП и восстанавливает 25% ХП.', False, ''),
                    ('Переплетение', 'Связывает себя с одним союзником: исцеление одного на 30% исцеляет и другого.', False, ''),
                ]},
                {'name': 'Дитя Рощи', 'abilities': [
                    ('Корни-щиты', 'Опутывает себя или союзника корнями: поглощает следующий удар полностью.', False, ''),
                    ('Шёпот леса', 'Вне боя восстанавливает 5% ХП и маны группе за каждый ход.', True, ''),
                ]},
                {'name': 'Голос Айлет', 'abilities': [
                    ('Древесный покров', 'На 2 хода все союзники в группе получают реген 5% ХП/ход и +20% сопротивления к дебаффам.', False, ''),
                    ('Возвращение к корням', 'Воскрешает одного павшего союзника с 20% ХП (1 раз за бой).', False, ''),
                ]},
            ]
        },
        {
            'name': 'Лунный стрелок', 'path': 'pepel',
            'stages': [
                {'name': 'Лунный стрелок', 'abilities': [
                    ('Серебряная стрела', 'Точная атака с шансом замедления врага на 20% скорости (2 хода).', False, ''),
                    ('Цикл луны', 'Игрок ВЫБИРАЕТ стойку каждые 3 хода: Тень (+20% уклонение) / Кровь (+25% крит) / Яд (6% ХП/ход на 3 хода).', False, ''),
                    ('Залп', 'Выпускает 3 стрелы по одному врагу, каждая с шансом крита +10%.', False, ''),
                ]},
                {'name': 'Ночной охотник', 'abilities': [
                    ('Стрела тишины', 'Выстрел, который прерывает подготовку врага и блокирует его следующую атаку.', False, ''),
                    ('Лунная тень', 'В стойке Тени атаки из невидимости наносят +25% урона.', True, ''),
                ]},
                {'name': 'Дитя Затмения', 'abilities': [
                    ('Затмение', 'На 2 хода: враг теряет 15% точности, Дитя Затмения получает +30% крита.', False, ''),
                    ('Серебряный дождь', 'Обрушивает град стрел на одного врага: 5 ударов по 40% силы атаки каждый, каждый с шансом «Горения» от серебряного света (4% ХП/ход на 2 хода).', False, ''),
                ]},
            ]
        },
        {
            'name': 'Пожиратель тепла', 'path': 'skverna',
            'stages': [
                {'name': 'Пожиратель тепла', 'abilities': [
                    ('Холодные пальцы', 'Наносит урон и крадёт реген здоровья врага на 2 хода.', False, ''),
                    ('Опустошение', 'Наносит урон и снимает один активный бафф с врага.', False, ''),
                    ('Морозный укус', 'Атака, снижающая скорость врага на 15% и крадущая 5% его макс. ХП как исцеление себе.', False, ''),
                ]},
                {'name': 'Истощитель', 'abilities': [
                    ('Ледяная хватка', 'Обездвиживает врага на 1 ход и крадёт 10% его брони на 2 хода.', False, 'Замедление 30% на 1 ход вместо обездвиживания.'),
                    ('Пустое место', 'Каждый снятый бафф с врага даёт +5% к урону (макс. 3 стака).', True, ''),
                ]},
                {'name': 'Эхо Пустоты', 'abilities': [
                    ('Вакуум', 'Снимает максимум 2 баффа с одного врага и наносит урон за каждый (15% от силы баффа).', False, ''),
                    ('Поглощение тепла', 'Каждый ход крадёт 2% ХП у текущего врага и передаёт себе.', True, ''),
                ]},
            ]
        },
        {
            'name': 'Разрыватель уз', 'path': 'skverna',
            'stages': [
                {'name': 'Разрыватель уз', 'abilities': [
                    ('Обрыв нити', 'Снимает с врага все эффекты лечения и регена, наносит урон равный 30% снятого.', False, 'Снимает один эффект, урон 15%.'),
                    ('Немая связь', 'Блокирует один случайный скилл врага на 2 хода.', False, 'На 1 ход.'),
                    ('Разрыв', 'Атака, наносящая доп. урон за каждый активный бафф на враге (+15% за бафф).', False, '+8% за бафф на боссах.'),
                ]},
                {'name': 'Отрёкшийся', 'abilities': [
                    ('Пустая чаша', 'Враг не может получать баффы 2 хода.', False, '1 ход на боссах.'),
                    ('Глушащий удар', 'Атака, которая silence врага на 1 ход.', False, 'Увеличивает стоимость скиллов на 30% на 1 ход вместо silence.'),
                ]},
                {'name': 'Безмолвный', 'abilities': [
                    ('Тишина Айлет', 'На 3 хода текущий враг не может получать исцеление и баффы.', False, 'Исцеление и баффы снижены на 50% на 2 хода.'),
                    ('Последний обрыв', 'Если враг под действием Немой связи погибает, способность перезаряжается мгновенно.', True, ''),
                ]},
            ]
        },
    ]),
    ('ЛЮДИ', 'Хранитель Воли', [
        {
            'name': 'Паладин', 'path': 'pepel',
            'stages': [
                {'name': 'Паладин', 'abilities': [
                    ('Удар светом', 'Урон + исцеление себя на 20% от урона.', False, ''),
                    ('Щит веры', 'Блокирует следующую атаку.', False, ''),
                    ('Клятва', 'Постоянный бонус: мести (+15% урон), защиты (+15% броня), искупления (+15% исцеление).', False, ''),
                ]},
                {'name': 'Клятвенник', 'abilities': [
                    ('Суд света', 'Мощная атака: урон х2, если враг — нежить или идёт Путём Скверны.', False, ''),
                    ('Священная аура', 'Союзники в группе получают +10% к исцелению.', True, ''),
                ]},
                {'name': 'Очиститель', 'abilities': [
                    ('Очищающий огонь', 'Снимает все дебаффы с себя и одного союзника, наносит доп. урон текущему врагу за каждый снятый дебафф.', False, ''),
                    ('Несокрушимая воля', 'При ХП ниже 30% — иммунитет к контролю и +20% к исцелению.', True, ''),
                ]},
            ]
        },
        {
            'name': 'Жрец', 'path': 'pepel',
            'stages': [
                {'name': 'Жрец', 'abilities': [
                    ('Благословение оружия', 'Союзник получает огненный урон на 3 хода.', False, ''),
                    ('Очистительная аура', 'Наносит урон нежити и идущим Путём Скверны.', False, ''),
                    ('Молитва', 'Все союзники в группе +20% к урону на 2 хода.', False, ''),
                ]},
                {'name': 'Служитель пепла', 'abilities': [
                    ('Огненное причастие', 'Союзник получает щит, поглощающий 30% урона и отражающий 10% обратно атакующему.', False, ''),
                    ('Пламенная проповедь', 'Каждое исцеление имеет шанс 20% снять один дебафф с цели.', True, ''),
                ]},
                {'name': 'Пастырь пламени', 'abilities': [
                    ('Великая молитва', 'Все союзники в группе восстанавливают 25% ХП и получают +30% к урону на 2 хода.', False, ''),
                    ('Пламя Велариона', 'Союзник с благословением оружия поджигает врага при ударе (4% ХП/ход на 2 хода).', True, ''),
                ]},
            ]
        },
        {
            'name': 'Воин', 'path': 'pepel',
            'stages': [
                {'name': 'Воин', 'abilities': [
                    ('Точный удар', 'Атака с +20% точностью и шансом крита.', False, ''),
                    ('Боевой темп', 'Каждые 2 удара следующая атака наносит +40% урона.', False, ''),
                    ('Второй ветер', 'Самоисцеление 15% ХП.', False, ''),
                ]},
                {'name': 'Ветеран', 'abilities': [
                    ('Рассекающий удар', 'Мощная атака по одному врагу: если убивает — следующий удар +50% урона.', False, ''),
                    ('Боевая стойка', 'Каждый 3-й удар гарантированный крит.', True, ''),
                ]},
                {'name': 'Маршал Пепла', 'abilities': [
                    ('Зов битвы', 'Все союзники в группе получают +25% к урону и +15% к скорости на 3 хода.', False, ''),
                    ('Неутомимый', 'При убийстве врага восстанавливает 10% ХП и снимает один дебафф с себя.', True, ''),
                    ('Пробивной удар', 'Игнорирует 20% брони + гарантированный крит (КД 3 хода).', False, ''),
                ]},
            ]
        },
        {
            'name': 'Плут', 'path': 'skverna',
            'stages': [
                {'name': 'Плут', 'abilities': [
                    ('Удар из тени', 'Тройной урон из невидимости.', False, ''),
                    ('Обезоруживание', 'Снижает урон врага на 25% на 2 хода.', False, '15% вместо 25%.'),
                    ('Побег', 'Полное уклонение, выход из боя.', False, ''),
                ]},
                {'name': 'Тень', 'abilities': [
                    ('Отравленный клинок', 'Атаки накладывают яд: 5% ХП/ход на 3 хода.', False, ''),
                    ('Теневой шаг', 'Телепорт за спину врага, следующая атака +50% крита.', False, ''),
                ]},
                {'name': 'Фантом', 'abilities': [
                    ('Казнь из тени', 'Если у врага ниже 20% ХП — мгновенная казнь (PvE: порог 25%, казнь только не-боссов). PvP: порог 20%, урон 150% вместо казни.', False, '20% от макс. ХП босса, КД 3 хода.'),
                    ('Бесплотный', '25% шанс полностью уклониться от любой атаки.', True, ''),
                ]},
            ]
        },
        {
            'name': 'Чародей', 'path': 'skverna',
            'stages': [
                {'name': 'Чародей', 'abilities': [
                    ('Луч распада', 'Урон тьмой сквозь броню.', False, ''),
                    ('Проклятие', 'Снижает случайную характеристику врага на 25% на 3 хода.', False, '15% на боссах.'),
                    ('Пакт', 'Мощная атака ценой 15% собственного ХП.', False, ''),
                ]},
                {'name': 'Падший', 'abilities': [
                    ('Кольцо тьмы', 'Урон тьмой по текущему врагу + замедление 20% на 2 хода.', False, ''),
                    ('Договор', 'Если ХП ниже 50%, все заклинания тьмы наносят +20% урона.', True, ''),
                ]},
                {'name': 'Владыка теней', 'abilities': [
                    ('Бездна', 'Проклятие на одного врага: -20% ко всем характеристикам на 2 хода + Владыка получает 20% от урона, нанесённого этому врагу, как исцеление.', False, '-10% характеристик на 2 хода на боссах.'),
                    ('Тень Глуби', 'Каждый раз, когда враг получает урон от проклятий, восстанавливает 3% маны.', True, ''),
                ]},
            ]
        },
        {
            'name': 'Следопыт', 'path': 'skverna',
            'stages': [
                {'name': 'Следопыт', 'abilities': [
                    ('Меткий выстрел', 'Повышенный урон + шанс замедления.', False, ''),
                    ('Ловушка', 'Урон + замедление 40% на 2 хода.', False, 'Замедление 25% на 2 хода на боссах.'),
                    ('Маскировка', 'Невидимость на 1 ход.', False, ''),
                ]},
                {'name': 'Охотник', 'abilities': [
                    ('Двойная ловушка', 'Ставит 2 ловушки: активируются автоматически в начале хода врага — урон + замедление 20% на 2 хода.', False, ''),
                    ('След крови', 'Атаки по замедленным или обездвиженным врагам наносят +25% урона.', True, ''),
                ]},
                {'name': 'Око мрака', 'abilities': [
                    ('Смертельный маршрут', 'Помечает врага: все атаки союзников по нему +30% точности и +20% крита на 3 хода.', False, ''),
                    ('Ночной охотник', 'Из маскировки первая атака всегда критическая.', True, ''),
                ]},
            ]
        },
    ]),
    ('ДРАКОНОРОЖДЁННЫЕ', 'Оплот пламени', [
        {
            'name': 'Пламенный легат', 'path': 'pepel',
            'stages': [
                {'name': 'Пламенный легат', 'abilities': [
                    ('Рассекающий жар', 'Атака огнём + «Горение» на 3 хода (5% ХП/ход).', False, ''),
                    ('Ярость огня', 'При активном «Горении» на враге все атаки наносят +20% урона.', False, ''),
                    ('Огненный вдох', 'Поджигает собственное оружие: следующие 2 атаки наносят огненный урон.', False, ''),
                ]},
                {'name': 'Опалённый', 'abilities': [
                    ('Огненный вихрь', 'Мощная атака огнём по одному врагу: если у врага уже «Горение» — урон х2.', False, ''),
                    ('Жар крови', 'При получении урона шанс 20% поджечь атакующего (4% ХП/ход на 2 хода).', True, ''),
                ]},
                {'name': 'Жрец Игниры', 'abilities': [
                    ('Пламя возрождения', 'Поджигает себя: теряет 8% ХП/ход, но все атаки наносят +50% огненного урона; союзники в группе получают реген 5% ХП/ход.', False, ''),
                    ('Дыхание дракона', 'Раз в 5 ходов следующая атака автоматически становится огненной с +60% урона.', True, ''),
                ]},
            ]
        },
        {
            'name': 'Каменнокожий', 'path': 'pepel',
            'stages': [
                {'name': 'Каменнокожий', 'abilities': [
                    ('Базальтовая шкура', 'Снижает урон следующего удара на 25%.', False, ''),
                    ('Зеркало Торнака', '20% шанс отразить физический урон обратно врагу.', True, ''),
                    ('Удар хвостом', 'Отбрасывает врага (прерывает подготовку) и снижает скорость на 15% на 2 хода.', False, ''),
                ]},
                {'name': 'Каменный легат', 'abilities': [
                    ('Каменный панцирь', 'На 2 хода +30% брони, но -15% скорости.', False, ''),
                    ('Колосс', 'При ХП выше 70% получает доп. +10% брони.', True, ''),
                ]},
                {'name': 'Нерушимый', 'abilities': [
                    ('Живая крепость', 'На 3 хода перенаправляет 40% урона, получаемого одним союзником, на себя (урон снижается на 15%).', False, ''),
                    ('Основа Торнака', 'При блокировании удара восстанавливает 3% ХП.', True, ''),
                ]},
            ]
        },
        {
            'name': 'Пепельный гладиатор', 'path': 'skverna',
            'stages': [
                {'name': 'Пепельный гладиатор', 'abilities': [
                    ('Метеоритный удар', 'Тратит 10% собственного ХП, наносит 200% урона.', False, ''),
                    ('Драконья кровь', 'Восстанавливает ХП равное 40% от урона огнём за ход.', False, ''),
                    ('Пепельный клинок', 'Атака: чем меньше ХП у гладиатора, тем выше урон (+5% за каждый недостающий 10% ХП).', False, ''),
                ]},
                {'name': 'Выживший', 'abilities': [
                    ('Испытание огнём', 'Поджигает себя на 2 хода (3% ХП/ход), но атаки наносят +50% урона.', False, ''),
                    ('Живучесть', 'При ХП ниже 25% регенерация +10% ХП/ход.', True, ''),
                ]},
                {'name': 'Воплощение Пепла', 'abilities': [
                    ('Извержение', 'Тратит 25% ХП, наносит колоссальный урон огнём одному врагу + «Горение» 8% ХП/ход на 3 хода.', False, ''),
                    ('Феникс', '1 раз за бой при смерти восстанавливается с 40% ХП.', True, ''),
                ]},
            ]
        },
        {
            'name': 'Обсидиановый воин', 'path': 'skverna',
            'stages': [
                {'name': 'Обсидиановый воин', 'abilities': [
                    ('Чёрное жало', 'Атака, игнорирующая 40% брони.', False, ''),
                    ('Раскалённая чешуя', 'При получении урона наносит урон огнём атакующему (1 раз за ход).', True, ''),
                    ('Обсидиановый панцирь', 'Снижает следующий получаемый урон на 25%, но следующая атака наносит -15% урона.', False, ''),
                ]},
                {'name': 'Тёмный легат', 'abilities': [
                    ('Пробивание брони', 'Следующая атака игнорирует 60% брони цели.', False, '40% на боссах.'),
                    ('Осколочная чешуя', 'Шанс 30% при получении удара — атакующий получает «Осколки» (5% ХП/ход на 2 хода).', True, ''),
                ]},
                {'name': 'Испепелитель', 'abilities': [
                    ('Чёрный метеор', 'Атака: игнорирует 50% брони + доп. урон за каждый дебафф на враге (+15% за дебафф).', False, '+8% за дебафф на боссах.'),
                    ('Плавка', 'Враги под «Осколками» или «Горением» получают +20% физического урона от Испепелителя.', True, ''),
                ]},
            ]
        },
    ]),
    ('НЕЖИТЬ', 'Восставший', [
        {
            'name': 'Чумной жнец', 'path': 'pepel',
            'stages': [
                {'name': 'Чумной жнец', 'abilities': [
                    ('Гнилая рана', 'Накладывает яд: 8% ХП/ход на 4 хода.', False, '5% ХП/ход на боссах.'),
                    ('Восстание мёртвых', 'Поднимает павшего врага как скелета-союзника на 3 хода (50% ХП и урона оригинала).', False, 'Не работает, вместо этого — яд 10% ХП/ход на 2 хода.'),
                    ('Сбор душ', 'Каждый убитый враг даёт +3% к урону и +2% к исцелению (стакается до 5 раз за бой).', True, ''),
                ]},
                {'name': 'Некромант', 'abilities': [
                    ('Рой мертвецов', 'Призывает 2 скелетов (существуют 2 хода, 40% ХП и урона; если нет павших врагов — призываются из пустоты с 30% ХП/урона).', False, ''),
                    ('Могильная связь', 'Скелеты-союзники при смерти наносят урон текущему врагу (10% от ХП мертвеца).', True, ''),
                ]},
                {'name': 'Владыка Мора', 'abilities': [
                    ('Легион праха', 'Призывает 3 скелетов из пустоты (25% ХП/урона, существуют 1 ход).', False, 'Вместо призыва — яд 8% ХП/ход на 3 хода, либо разовый урон 30% от макс. ХП босса.'),
                    ('Пепельная жатва', 'Если на поле боя есть скелеты-союзники, Владыка Мора регенерирует 5% ХП в ход.', True, ''),
                ]},
            ]
        },
        {
            'name': 'Костяной страж', 'path': 'pepel',
            'stages': [
                {'name': 'Костяной страж', 'abilities': [
                    ('Истлевшая плоть', 'Снижает входящий урон на 20% на 3 хода.', False, ''),
                    ('Последняя воля', '1 раз за бой при смертельном ударе выживает с 1 ХП и восстанавливает 15% ХП.', False, ''),
                    ('Костяной щит', 'Создаёт щит из костей: поглощает урон равный 20% макс. ХП.', False, ''),
                ]},
                {'name': 'Вечный солдат', 'abilities': [
                    ('Костяной шип', 'При блокировании удара атакующий получает урон равный 15% от поглощённого.', False, ''),
                    ('Неупокоенный', 'При ХП ниже 40% входящий урон снижается на доп. 15%.', True, ''),
                ]},
                {'name': 'Несломленный', 'abilities': [
                    ('Костяная крепость', 'На 2 хода: весь входящий урон снижается на 40%, Несломленный провоцирует текущего врага атаковать его.', False, ''),
                    ('Вечный страж', 'После выживания со смертельного удара (Последняя воля) получает +30% к урону на 2 хода.', True, ''),
                ]},
            ]
        },
        {
            'name': 'Алхимик распада', 'path': 'skverna',
            'stages': [
                {'name': 'Алхимик распада', 'abilities': [
                    ('Гниющий знак', 'Все последующие дебаффы на враге сильнее на 20%.', False, '10% на боссах.'),
                    ('Двойной мор', 'Накладывает 2 яда одновременно (каждый 5% ХП/ход на 3 хода).', False, '3% ХП/ход на боссах.'),
                    ('Гнилостная бомба', 'Бросает в текущего врага: яд 4% ХП/ход на 3 хода + снижает броню на 10% на 2 хода.', False, ''),
                ]},
                {'name': 'Чумной апостол', 'abilities': [
                    ('Заражение', 'Яд распространяется: если в бою несколько врагов, следующий враг тоже получает яд (50% силы оригинала; в 1v1 — яд усиливается на 20% каждый ход).', False, ''),
                    ('Усиление заразы', 'Каждый ход действия яда на враге увеличивает его силу на 1% (макс. +5%).', True, ''),
                ]},
                {'name': 'Архилич', 'abilities': [
                    ('Чума', 'Текущий враг получает мощный яд 6% ХП/ход на 4 хода + исцеление снижается на 50%.', False, 'Яд 4% ХП/ход, исцеление снижено на 25%.'),
                    ('Распад реальности', 'Враги с 3+ дебаффами теряют 5% макс. ХП каждый ход.', True, '3% на боссах.'),
                ]},
            ]
        },
        {
            'name': 'Пустотный вор', 'path': 'skverna',
            'stages': [
                {'name': 'Пустотный вор', 'abilities': [
                    ('Угасание', 'Наносит урон и снимает один бафф с врага.', False, ''),
                    ('Рука Морвены', 'Блокирует случайный скилл врага на 2 хода.', False, 'На 1 ход.'),
                    ('Теневой обход', 'Телепорт за спину врага, следующая атака +25% урона.', False, ''),
                ]},
                {'name': 'Опустошитель', 'abilities': [
                    ('Похищение силы', 'Крадёт один бафф с врага и накладывает на себя.', False, ''),
                    ('Пустая тень', 'После уклонения следующая атака снимает бафф гарантированно.', True, ''),
                ]},
                {'name': 'Безмолвный жнец', 'abilities': [
                    ('Полное угасание', 'Снимает все баффы с врага, наносит урон за каждый (15% от силы баффа) и блокирует 2 случайных скилла на 2 хода.', False, 'Снимает максимум 2 баффа, блокирует 1 скилл на 1 ход.'),
                    ('Тишина смерти', 'Враги без активных баффов получают +20% урона от Безмолвного жнеца.', True, ''),
                ]},
            ]
        },
    ]),
    ('ОРКИ', 'Воин клана', [
        {
            'name': 'Неистовый берсерк', 'path': 'pepel',
            'stages': [
                {'name': 'Неистовый берсерк', 'abilities': [
                    ('Безрассудный взмах', 'Огромный урон, тратит 10% собственного ХП.', False, ''),
                    ('Жажда крови', 'Следующая атака лечит орка на 50% от урона.', False, ''),
                    ('Яростный рёв', '+25% к урону на 2 хода, но -15% к броне.', False, ''),
                ]},
                {'name': 'Кровавый палач', 'abilities': [
                    ('Расчленение', 'Атака: если убивает врага, восстанавливает 20% ХП и следующий удар +50% урона.', False, ''),
                    ('Берсерк', 'При ХП ниже 50% — +20% к урону и +10% к скорости.', True, ''),
                ]},
                {'name': 'Бог Войны', 'abilities': [
                    ('Резня', 'Серия из 3 ударов по одному врагу, каждый следующий +30% урона; если враг погибает — перезаряжается мгновенно.', False, ''),
                    ('Неистовые', 'При убийстве врага союзники-орки в группе получают +15% к урону на 2 хода.', True, ''),
                ]},
            ]
        },
        {
            'name': 'Хранитель Стены', 'path': 'pepel',
            'stages': [
                {'name': 'Хранитель Стены', 'abilities': [
                    ('Стойкость Грумгара', 'Снижает урон следующего удара на 50%.', False, ''),
                    ('Ответный удар', 'После блока наносит урон равный 60% поглощённого.', False, ''),
                    ('Боевой строй', 'Союзник в группе получает +15% брони.', False, ''),
                ]},
                {'name': 'Страж рубежа', 'abilities': [
                    ('Живой щит', 'На 2 хода перенаправляет на себя весь урон, предназначенный одному союзнику (урон снижается на 25%).', False, ''),
                    ('Непоколебимость', 'Не может быть отброшен или обездвижен.', True, ''),
                ]},
                {'name': 'Железный Страж', 'abilities': [
                    ('Стена Грумгара', 'На 3 хода: урон по одному выбранному союзнику снижается на 30%, Железный Страж получает 50% этого урона.', False, ''),
                    ('Последний оплот', 'При защите союзника собственная броня +20%.', True, ''),
                ]},
            ]
        },
        {
            'name': 'Кровавый охотник', 'path': 'skverna',
            'stages': [
                {'name': 'Кровавый охотник', 'abilities': [
                    ('Клык', 'Быстрая атака с вампиризмом 30%.', False, ''),
                    ('Отрицание смерти', 'При падении ниже 15% ХП получает +50% к урону на 2 хода.', False, ''),
                    ('Запах крови', 'Помечает врага: атаки по нему +15% точности и крита.', False, ''),
                ]},
                {'name': 'Рубака', 'abilities': [
                    ('Вскрытие', 'Атака: наносит доп. урон за каждый дебафф на враге (+10% за дебафф) + вампиризм 40%.', False, ''),
                    ('Жажда', 'Каждое убийство восстанавливает 8% ХП.', True, ''),
                ]},
                {'name': 'Палач Богов', 'abilities': [
                    ('Казнь', 'Если у врага ниже 25% ХП — мгновенная казнь.', False, '20% от макс. ХП босса, 1 раз за бой.'),
                    ('Охотник на божеств', 'Атаки по врагам с активными баффами наносят +25% урона и снимают один бафф.', True, '+15% урона на боссах, снимает бафф с шансом 30%.'),
                ]},
            ]
        },
        {
            'name': 'Вожак орды', 'path': 'skverna',
            'stages': [
                {'name': 'Вожак орды', 'abilities': [
                    ('Боевой рёв', 'Снижает защиту врага на 25% на 3 хода.', False, '15% на боссах.'),
                    ('Устрашение', 'С шансом 35% враг пропускает следующий ход.', False, 'Шанс 15%.'),
                    ('Зов добычи', 'Помечает врага: все союзники получают +10% урона по цели.', False, ''),
                ]},
                {'name': 'Зовущий в бой', 'abilities': [
                    ('Натиск', 'Все союзники в группе получают +20% к скорости на 2 хода.', False, ''),
                    ('Вожак', 'Союзники рядом получают +10% к урону.', True, ''),
                ]},
                {'name': 'Крушитель Черепов', 'abilities': [
                    ('Разгром', 'Мощнейшая атака: огромный урон + враг теряет 15% брони на 2 хода.', False, '10% на боссах.'),
                    ('Диктат силы', 'Враги с пониженной защитой получают +10% урона от всех источников.', True, '+5% на боссов.'),
                ]},
            ]
        },
    ]),
]


# ═══════════════════════════════════════════
# BUILD PDF
# ═══════════════════════════════════════════

OUTPUT_PATH = '/home/z/my-project/download/cursed_depths_master.pdf'

doc = TocDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=LEFT_MARGIN, rightMargin=RIGHT_MARGIN,
    topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN,
    title='Cursed Depths — Мастер-документ разработки',
    author='Z.ai',
    creator='Z.ai',
)

story = []

# ═══ COVER ═══
story.append(Spacer(1, PAGE_H * 0.22))
story.append(Paragraph('<b>CURSED DEPTHS</b>', cover_title_style))
story.append(Spacer(1, 8))
story.append(Paragraph('Мастер-документ разработки', cover_subtitle_style))
story.append(Spacer(1, 16))
story.append(Paragraph('Полный план производства', cover_meta_style))
story.append(Spacer(1, 6))
story.append(Paragraph('Жанр: Пошаговая RPG в Telegram', cover_meta_style))
story.append(Spacer(1, 4))
story.append(Paragraph('Тематика: Тёмное фэнтези, Падение богов, Скверна', cover_meta_style))
story.append(Spacer(1, 4))
story.append(Paragraph('Платформа: Telegram WebApp', cover_meta_style))
story.append(Spacer(1, 30))
story.append(Paragraph('<font color="#c47a3a"><b>Путь Пепла</b></font> — танк / поддержка / регенерация', ParagraphStyle('PL', fontName='Carlito', fontSize=11, leading=16, textColor=TEXT_MUTED, alignment=TA_CENTER)))
story.append(Paragraph('<font color="#7a3ac4"><b>Путь Скверны</b></font> — DPS / маг / вампиризм / дебаффы', ParagraphStyle('PL2', fontName='Carlito', fontSize=11, leading=16, textColor=TEXT_MUTED, alignment=TA_CENTER)))
story.append(PageBreak())

# ═══ TABLE OF CONTENTS ═══
toc = TableOfContents()
toc.levelStyles = [toc_h1_style, toc_h2_style]
story.append(Paragraph('<b>Содержание</b>', ParagraphStyle('TOCTitle', fontName='Carlito-Bold',
    fontSize=20, leading=28, textColor=ACCENT_LIGHT, spaceAfter=16, alignment=TA_CENTER)))
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════
# ФАЗА 0 — ФУНДАМЕНТ МИРА
# ═══════════════════════════════════════════
story.append(add_heading('ФАЗА 0 — ФУНДАМЕНТ МИРА', h1_style, level=0))
story.append(hr())

# 0.1 Lore Bible
story.append(add_heading('0.1 Библия мира (Lore Bible)', h2_style, level=1))

story.append(add_heading('Космогония — как всё началось', h3_style))
story.append(P('Мир был создан Четырьмя Столпами — божественными сущностями, каждая из которых воплотила фундаментальный аспект реальности. Веларион даровал Пламя воли и веры, Айлет сплела Нить Жизни, Торнак заложил незыблемую Основу, а Кессара создала Отражение — зеркало истины, испытующее души. Веками боги правили в гармонии, пока смертный по имени Карсус не познал правду, скрытую за зеркалом Кессары. Он увидел то, что боги скрывали от смертных: истинную природу их даров, которые были не благословением, а цепями, привязывающими души к божественной воле. Карсус нёс эту правду миру — и мир раскололся надвое.'))
story.append(Spacer(1, 4))
story.append(P('Одни приняли его откровение, увидев в нём освобождение от божественного гнёта — они стали первыми, кто обратил искажённую силу себе на службу, проложив то, что позже назовут Путём Скверны. Другие отвергли правду Карсуса, избрав веру и самопожертвование — они переплавляли проклятие через жертву, став идущими Путём Пепла. Но само откровение оказалось настолько мощным, что разорвало ткань реальности: Четыре Столпа рухнули в Глубь — пространственный разлом, образовавшийся в момент раскола. Боги не умерли — они пали, сохранив искру сознания, но утратив контроль над своими дарами. Их сила, искажённая безумием и страданием, стала Скверной — тёмной энергией, пропитывающей Глубь и медленно поднимающейся на поверхность.'))

story.append(add_heading('Природа Скверны', h3_style))
story.append(P('Скверна — это не просто тёмная энергия и не болезнь в привычном понимании. Это паразитическая сущность, возникшая из искажённых даров павших богов. Она обладает примитивным подобием воли — стремится распространяться, поглощать и искажать всё живое. Скверна физически проявляется как чёрная субстанция, проникающая в материю и разум. При контакте она предлагает силу, но оплачивает её телесными и духовными мутациями. Важно понимать: Скверна — это не зло в чистом виде, а искажённая божественная сила, утратившая целостность.'))

story.append(add_heading('Природа Пепла', h3_style))
story.append(P('Пепел — это проклятие, которое несёт в себе каждый житель мира после Падения. Однако в отличие от Скверны, Пепел можно переплавить в силу через жертву. Механика Пепла — это моральный компас мира: отказ от чего-то ценного (здоровья, памяти, связи с близкими) позволяет трансформировать проклятие в мощь, не поддаваясь Скверне. Этот выбор — основа Пути Пепла, одного из двух фундаментальных путей развития персонажа.'))

story.append(add_heading('География мира', h3_style))
story.append(P('Поверхность мира разделена на 6 территорий, каждая из которых является родиной одной из рас. Территории соединены торговыми путями и нейтральными зонами, но везде ощущается влияние Глуби — Скверна просачивается через Разломы, точки соприкосновения поверхности и подземного мира. Глубь имеет вертикальную структуру из 6 уровней, каждый из которых связан с одним из павших Столпов. Чем глубже — тем сильнее Скверна и тем опаснее враги, но и тем могущественнее сокрытые реликвии.'))

story.append(add_heading('Правила мира', h3_style))
story.append(P('Магия в мире работает через связь с Четырьмя Столпами или через Скверну. Эти два Пути фундаментально несовместимы: попытка совместить их ведёт к катастрофическим мутациям и безумию. После смерти душа не уходит в загробный мир — она втягивается Глубью, где может быть поглощена Скверной или, в редких случаях, вернуться в тело (так возникает нежить). Сама Глубь обладает наркотическим эффектом — близость к павшим богам дарует ощущение могущества, заставляя искателей приключений спускаться всё глубже, даже понимая опасность.'))

# 0.2 Расовые лор-документы
story.append(Spacer(1, 8))
story.append(add_heading('0.2 Расовые лор-документы', h2_style, level=1))
story.append(P('Каждая из шести рас мира обладает уникальной историей, культурой и мотивацией. Ниже представлена полная расовая матрица:'))
story.append(Spacer(1, 4))
story.append(build_table(
    ['Раздел', 'Содержание'],
    [
        ['История расы', 'Откуда пришли, как жили до Падения, что изменилось после'],
        ['Отношение к Столпам', 'К какому Столпу расово тяготеют и почему'],
        ['Культура', 'Обычаи, ценности, табу, язык (ключевые слова/фразы)'],
        ['Политика', 'Внутренняя структура власти, фракции внутри расы'],
        ['Отношения с другими расами', 'Союзы, вражда, торговля, презрение, страх'],
        ['Мотивация к Глуби', 'Зачем именно ЭТА раса лезет вниз — что ищет'],
        ['Путь Пепла', 'Как именно они интерпретируют очищение через жертву'],
        ['Путь Скверны', 'Как именно они подчиняют проклятие'],
    ],
    [CONTENT_W*0.3, CONTENT_W*0.7]
))

# Individual race lore
RACE_LORE = [
    ('ГНОМЫ — Хранитель камня', [
        ('История', 'Гномы — древнейшая из рас, помнящая время до Падения. Они жили в глубинах гор, где ковали руны и строили подземные города-крепости. Когда Торнак пал, Великая Кузница — сердце их цивилизации — рухнула в Глубь. Гномы разделились: одни остались на поверхности, сохраняя клятвы, другие спустились за Кузницей, поддавшись Скверне.'),
        ('Столп', 'Торнак (Основа) — гномы расово тяготеют к камню, закону и фундаменту. Их клятвы буквально высечены в камне.'),
        ('Культура', 'Клятва — священна. Нарушить клятву хуже смерти. Рунная магия — основа всего. Мёртвый металл — материал, пропитанный Скверной, опасный но мощный.'),
        ('Путь Пепла', 'Жертва физическая — гномы-клятвенные отдают здоровье и плоть ради защиты других. Их щиты буквально питаются их кровью.'),
        ('Путь Скверны', 'Подчинение и разрушение — обвальщики и могильные кузнецы ломают чужую защиту, превращая вражеские баффы в своё преимущество.'),
    ]),
    ('ЭЛЬФЫ — Служитель леса', [
        ('История', 'Эльфы жили в Корневой Роще — гигантском лесе, где каждое дерево было связано Нитью Айлет. Когда богиня пала, Нить оборвалась. Лес начал умирать, а эльфы потеряли связь с жизненной силой мира. Часть эльфов стала хранителями обрывков Нити, другая — научилась красть чужую жизненную силу.'),
        ('Столп', 'Айлет (Жизнь) — эльфы расово связаны с Нитью Жизни. Их магия — это исцеление, связь, рост или паразитизм и увядание.'),
        ('Культура', 'Связь с природой как с живым существом. Роща — не дом, а часть тела. Уважение к памяти предков через Нить.'),
        ('Путь Пепла', 'Сохранение и жертвенное исцеление — хранители нити отдают себя, чтобы другие жили. Их регенерация питает группу.'),
        ('Путь Скверны', 'Пожирание чужой силы — пожиратели тепла и разрыватели уз крадут баффы, реген и жизнь врагов.'),
    ]),
    ('ЛЮДИ — Хранитель Воли', [
        ('История', 'Люди — самая противоречивая раса. Именно человек Карсус нёс миру правду, которая расколола реальность, и именно люди несут бремя этого выбора. После Падения люди разделились: одни избрали веру и самопожертвование, другие — прагматичное использование Скверны. Люди строят крепости из пепла и верят, что Воля сильнее проклятия.'),
        ('Столп', 'Веларион (Пламя) — люди тяготеют к воле и вере. Их сила — в убеждённости, которая может очищать или разрушать.'),
        ('Культура', 'Воля — главный ресурс. Человек без веры — пуст. Оружие священно, клятвы обязательны. Карсус — не проклятие, а напоминание: истина может разрушить мир не меньше, чем ложь.'),
        ('Путь Пепла', 'Паладины, жрецы и воины идут Путём Пепла через веру — их сила растёт из убеждённости и самопожертвования.'),
        ('Путь Скверны', 'Плуты, чародеи и следопыты используют Скверну прагматично — казнь, проклятия и ловушки без моральных ограничений.'),
    ]),
    ('ДРАКОНОРОЖДЁННЫЕ — Оплот пламени', [
        ('История', 'Драконорождённые — потомки драконов, созданных Веларионом как стражи пламени. Когда Столп пал, их внутренний огонь стал неуправляемым. Каждый драконорождённый живёт на грани между созидательным пламенем и разрушительным безумием. Их земля — Драконье Горнило, вулканический регион, где огонь горит даже в камнях.'),
        ('Столп', 'Веларион (Пламя) — драконорождённые буквально сотканы из огня. Их кровь горит, их чешуя раскалена.'),
        ('Культура', 'Огонь — не оружие, а сущность. Самосожжение ради силы — не безумие, а путь. Испытание огнём — ритуал взросления.'),
        ('Путь Пепла', 'Пламенные легаты и каменнокожие превращают проклятие Пепла в защитный барьер — жертвуют подвижностью ради брони и защиты союзников.'),
        ('Путь Скверны', 'Пепельные гладиаторы и обсидиановые воины поджигают себя, чтобы бить сильнее. Чем меньше у них ХП — тем опаснее они становятся.'),
    ]),
    ('НЕЖИТЬ — Восставший', [
        ('История', 'Нежить — это не раса в привычном понимании. Это бывшие представители других рас, которые умерли и вернулись. В момент Падения души не смогли уйти — Глубь втянула их обратно. Кто-то вернулся в своё тело, кто-то занял чужое, а кто-то существует как чистое сознание в костяной оболочке.'),
        ('Столп', 'Айлет/Кессара — нежить существует на стыке оборванной Жизни и искажённого Отражения. Они не живы и не мертвы.'),
        ('Культура', 'Память о жизни — главная ценность. Каждый нежить помнит, кем был, и это определяет его путь. Скелеты — не бездумные существа, а личности без плоти.'),
        ('Путь Пепла', 'Чумные жнецы и костяные стражи используют «правильную» нежить — защищают, исцеляют ядом (парадоксально), призывают павших как союзников.'),
        ('Путь Скверны', 'Алхимики распада и пустотные воры — это нежить, которая выбрала паразитизм. Они разрушают, крадут баффы, снимают защиту.'),
    ]),
    ('ОРКИ — Воин клана', [
        ('История', 'Орки — самая молодая раса, появившаяся после Падения. Когда Торнак рухнул, его кровь — жидкий камень — смешалась с пеплом и Скверной, и из этой смеси поднялись орки. Они не имеют «до Падения» — они родились из хаоса и считают себя детьми Грумгара, духа-покровителя, который, по легенде, был первым орком и пал, защищая слабых.'),
        ('Столп', 'Торнак/Веларион — орки несут в себе и каменную стойкость, и огненную ярость. Их двойственная природа — основа культуры.'),
        ('Культура', 'Клан — всё. Орки без клана — мертвы. Сила — единственный авторитет. Вождь — сильнейший. Защита слабых — долг сильного.'),
        ('Путь Пепла', 'Берсерки и хранители стены идут Путём Пепла через физическую жертву — отдают ХП ради урона или принимают удар вместо союзника.'),
        ('Путь Скверны', 'Кровавые охотники и вожаки орды используют Скверну через агрессию — вампиризм, казнь, устрашение и разрушение защиты.'),
    ]),
]

for race_name, lore_items in RACE_LORE:
    story.append(add_heading(race_name, h3_style))
    for title, desc in lore_items:
        story.append(P(f'<b>{title}:</b> {desc}'))
    story.append(Spacer(1, 6))

# 0.3 Четыре Столпа
story.append(Spacer(1, 8))
story.append(add_heading('0.3 Четыре Столпа — детальная проработка', h2_style, level=1))

PILLARS = [
    ('Веларион (Пламя)', 'До Падения: справедливый, строгий, очищающий. Дарил смертным волю и веру — способность преодолевать невозможное через убеждённость. После Падения: слепая ярость, огонь без контроля. Его дар превратился в разрушительную одержимость. Скверна: воля превращается в одержимость, очищение — в уничтожение. Там, где прежде пламя закаляло дух, теперь оно выжигает всё дотла.'),
    ('Айлет (Жизнь)', 'До Падения: нежная, связующая, исцеляющая. Дарила Нить Жизни, связывающую всё живое. После Падения: бесконтрольный рост, паразитическая жизнь. Исцеление превратилось в поглощение, связь — в зависимость. Скверна: живое разрастается без меры, поглощая окружающее. Ткань жизни стала паразитической петлёй.'),
    ('Торнак (Основа)', 'До Падения: незыблемый, справедливый, фундаментальный. Дарил стойкость и закон — каменный фундамент, на котором строилась цивилизация. После Падения: окаменение, стагнация, разрушение. Стойкость превратилась в неподвижность, закон — в тиранию. Скверна: всё затвердевает, застывает. Камень, который был живым, становится мёртвым грузом.'),
    ('Кессара (Отражение)', 'До Падения: мудрая, испытывающая, показывающая правду. Зеркало, в котором каждый видел свою суть. После Падения: ложь, искажение, безумие. Знание превращается в паранойю, отражение — в кошмар. Скверна: зеркала лгут. Отражения показывают не правду, а самый глубокий страх смотрящего. Ключ к финальному контенту: её зона в Глуби открывает доступ к истинной концовке игры.'),
]
for pillar_name, pillar_desc in PILLARS:
    story.append(add_heading(pillar_name, h3_style))
    story.append(P(pillar_desc))

# ═══════════════════════════════════════════
# ФАЗА 1 — СИСТЕМА ПРОГРЕССИИ
# ═══════════════════════════════════════════
story.append(CondPageBreak(PAGE_H * 0.15))
story.append(add_heading('ФАЗА 1 — СИСТЕМА ПРОГРЕССИИ', h1_style, level=0))
story.append(hr())

story.append(add_heading('1.1 Уровневая система персонажа', h2_style, level=1))
story.append(P('Персонаж развивается от уровня 1 до 9, проходя через ключевые стадии, каждая из которых открывает новые способности и выборы:'))
story.append(Spacer(1, 4))
story.append(build_center_table(
    ['Уровень', 'Стадия', 'Событие', 'Новый контент'],
    [
        ['1', 'Базовый класс', 'Создание персонажа', '3 способности, обучение'],
        ['2', '—', 'Прокачка', 'Рост характеристик'],
        ['3', 'Стадия 1', 'Выбор специализации', '+2 способности, выбор Пути'],
        ['4', '—', 'Прокачка', 'Рост характеристик'],
        ['5', 'Стадия 2', 'Углубление специализации', '+2 способности'],
        ['6', '—', 'Прокачка', 'Рост характеристик'],
        ['7', 'Стадия 3 (финал)', 'Финальная форма', '+2 способности, ультимейт'],
        ['8', '—', 'Прокачка', 'Рост характеристик'],
        ['9', 'Мастер', 'Эндгейм', 'Доступ к глубинным уровням'],
    ],
    [CONTENT_W*0.10, CONTENT_W*0.20, CONTENT_W*0.30, CONTENT_W*0.40]
))

story.append(add_heading('Получение опыта', h3_style))
story.append(P('PvE бои — основной источник опыта. Квесты — сюжетные и побочные дают значительный опыт. Рейды — бонусный опыт за командную работу. PvP — минимальный опыт, чтобы не фармили рейтинг ради уровня.'))

story.append(add_heading('1.2 Система характеристик', h2_style, level=1))
story.append(P('Шесть базовых характеристик определяют все аспекты боевой системы:'))
story.append(Spacer(1, 4))
story.append(build_table(
    ['Характеристика', 'Что даёт', 'Кто приоритезирует'],
    [
        ['Сила', 'Физический урон, пробивание брони', 'Воин, Берсерк, Обвальщик'],
        ['Ловкость', 'Уклонение, скорость, шанс крита', 'Плут, Следопыт, Лунный стрелок'],
        ['Стойкость', 'ХП, броня, сопротивление дебаффам', 'Клятвенный, Каменнокожий, Костяной страж'],
        ['Разум', 'Магический урон, сила дебаффов', 'Чародей, Алхимик распада, Некромант'],
        ['Воля', 'Мана, сопротивление контролю', 'Жрец, Паладин, Хранитель нити'],
        ['Инстинкт', 'Скорость хода, шанс срабатывания пассивок', 'Кровавый охотник, Пожиратель тепла'],
    ],
    [CONTENT_W*0.18, CONTENT_W*0.42, CONTENT_W*0.40]
))
story.append(Spacer(1, 4))
story.append(P('Распределение: +2 очка характеристик на уровень. +1 бонусное очко за квесты. Ограничение: не более 60% всех очков в одну характеристику.'))

story.append(add_heading('1.3 Система маны', h2_style, level=1))
story.append(P('Базовый пул маны: 100 единиц. Восстановление: +10 маны за ход (базовый реген), +5 маны за пропуск хода (защитная стойка). Дополнительные источники: зелья маны, пассивки классов.'))
story.append(Spacer(1, 4))
story.append(build_center_table(
    ['Тип способности', 'Стоимость маны', 'Пример'],
    [
        ['Базовая атака', '0', 'Автоатака (слабая, всегда доступна)'],
        ['Обычная способность', '15-25', 'Точный удар, Серебряная стрела'],
        ['Сильная способность', '30-45', 'Метеоритный удар, Огненный вихрь'],
        ['Ультимейт', '50-70', 'Казнь из тени, Бездна, Извержение'],
        ['Поддержка', '20-35', 'Живая нить, Благословение оружия'],
    ],
    [CONTENT_W*0.25, CONTENT_W*0.25, CONTENT_W*0.50]
))

story.append(add_heading('1.4 Система снаряжения', h2_style, level=1))
story.append(build_center_table(
    ['Слот', 'Что даёт', 'Примеры'],
    [
        ['Оружие', 'Урон, особые эффекты', 'Меч, посох, кинжал, лук, молот'],
        ['Броня', 'Защита, ХП, сопротивление', 'Латы, кожа, мантия, кости, чешуя'],
        ['Аксессуар', 'Бонусы к характеристикам', 'Кольцо, амулет, руна'],
        ['Расовый предмет', 'Уникальный бонус расы', 'Руна клана, Осколок нити, Коронный зуб'],
        ['Реликвия Глуби', 'Мощный предмет из глубин', 'Эндгейм-лут с боссов'],
    ],
    [CONTENT_W*0.20, CONTENT_W*0.35, CONTENT_W*0.45]
))
story.append(Spacer(1, 6))
story.append(build_center_table(
    ['Редкость', 'Цвет', 'Бонусов', 'Источник'],
    [
        ['Обычный', 'Серый', '1', 'Магазин, начальные враги'],
        ['Необычный', 'Зелёный', '2', 'PvE, квесты'],
        ['Редкий', 'Синий', '3', 'Элитные враги, PvP награды'],
        ['Эпический', 'Фиолетовый', '4 + спецэффект', 'Боссы, рейды'],
        ['Легендарный', 'Оранжевый', '5 + уникальный эффект', 'Глубинные боссы, достижения'],
        ['Проклятый', 'Красный', '6 + мощный эффект + дебафф', 'Самые глубокие уровни'],
    ],
    [CONTENT_W*0.18, CONTENT_W*0.12, CONTENT_W*0.25, CONTENT_W*0.45]
))
story.append(Spacer(1, 4))
story.append(P('<b>Проклятые предметы — ключевая механика:</b> дают огромную силу, но накладывают постоянный дебафф. Пример: «Клинок Карсуса» — +40% урона, но -5% ХП за ход. Можно снять проклятие через квест — но тогда теряется бонус. Выбор игрока: жить с проклятием или очистить.'))

# ═══════════════════════════════════════════
# ФАЗА 1.5 — РАСЫ, КЛАССЫ, СПОСОБНОСТИ (our core data!)
# ═══════════════════════════════════════════
story.append(CondPageBreak(PAGE_H * 0.15))
story.append(add_heading('РАСЫ, КЛАССЫ И СПОСОБНОСТИ', h1_style, level=0))
story.append(P('6 рас, 24 класса (4 на расу: 2 Путь Пепла + 2 Путь Скверны), ~130 способностей, 3 стадии эволюции на класс. Все способности содержат механики взаимодействия с боссами.'))
story.append(hr())

race_icons = {'ГНОМЫ': '[I]', 'ЭЛЬФЫ': '[II]', 'ЛЮДИ': '[III]', 'ДРАКОНОРОЖДЁННЫЕ': '[IV]', 'НЕЖИТЬ': '[V]', 'ОРКИ': '[VI]'}

for race_name, race_sub, classes in RACES_DATA:
    icon = race_icons.get(race_name, '')
    story.append(CondPageBreak(PAGE_H * 0.15))
    story.append(add_heading(f'{icon} {race_name} — {race_sub}', h1_style, level=0))
    story.append(hr())

    for cls in classes:
        if cls['path'] == 'pepel':
            style = h2_style
            path_label = '<font color="#c47a3a">[Путь Пепла]</font>'
        else:
            style = h2_skverna_style
            path_label = '<font color="#7a3ac4">[Путь Скверны]</font>'
        story.append(add_heading(f'{cls["name"]} {path_label}', style, level=1))

        for stage in cls['stages']:
            story.append(P(f'<b>{stage["name"]}</b>', h3_style))
            tbl = build_abilities_table(stage['abilities'])
            story.append(Spacer(1, 3))
            story.append(tbl)
            story.append(Spacer(1, 5))

# Boss mechanics table
story.append(CondPageBreak(PAGE_H * 0.15))
story.append(add_heading('Механики: обычный враг vs босс', h2_style, level=1))
story.append(P('Правила корректировки способностей для разных типов противников. Все массовые эффекты убраны — только точечный урон. Хилы и баффы на группу сохранены.'))
story.append(Spacer(1, 6))

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
boss_data = [[Paragraph(f'<b>{h}</b>', th_style) for h in ['Механика', 'Обычный враг', 'Босс']]]
for mech, normal, boss in BOSS_MECHANICS:
    boss_data.append([Paragraph(mech, td_style), Paragraph(normal, td_center_style), Paragraph(boss, td_center_style)])
boss_col_w = [CONTENT_W*0.35, CONTENT_W*0.325, CONTENT_W*0.325]
boss_table = Table(boss_data, colWidths=boss_col_w, hAlign='CENTER')
boss_cmds = [
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
    boss_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
boss_table.setStyle(TableStyle(boss_cmds))
story.append(boss_table)

# PvP balance table
story.append(Spacer(1, 12))
story.append(add_heading('Баланс: PvE vs PvP', h2_style, level=1))
story.append(build_center_table(
    ['Механика', 'PvE', 'PvP'],
    [
        ['Мгновенная казнь', 'Работает', '150% урона при < 20% ХП'],
        ['Призыв скелетов', 'Работает', 'Максимум 1 скелет, 30% статов'],
        ['Полное обездвиживание', 'Работает', 'Замедление 50% на 1 ход'],
        ['Silence', 'Работает', 'Стоимость +50% на 1 ход'],
        ['Стакающиеся баффы', 'Без лимита', 'Максимум 3 стака'],
        ['Вампиризм', '100%', '50% эффективности'],
    ],
    [CONTENT_W*0.35, CONTENT_W*0.325, CONTENT_W*0.325]
))

# Balance ratings
story.append(Spacer(1, 12))
story.append(add_heading('Итоговая таблица баланса', h2_style, level=1))
story.append(P('Оценка классов после балансировочных правок. Шкала 1-10, где 10 — идеально сбалансирован.'))
story.append(Spacer(1, 6))

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
bal_data = [[Paragraph(f'<b>{h}</b>', th_style) for h in ['Раса', 'Путь Пепла', 'Оценка', 'Путь Скверны', 'Оценка']]]
for row in BALANCE_DATA:
    bal_data.append([Paragraph(r, td_style if i==0 else td_center_style) for i, r in enumerate(row)])
bal_col_w = [CONTENT_W*0.18, CONTENT_W*0.25, CONTENT_W*0.12, CONTENT_W*0.25, CONTENT_W*0.12]
bal_table = Table(bal_data, colWidths=bal_col_w, hAlign='CENTER')
bal_cmds = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#3a3830')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 5),
    ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]
for i in range(1, len(bal_data)):
    bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
    bal_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
bal_table.setStyle(TableStyle(bal_cmds))
story.append(bal_table)

# ═══════════════════════════════════════════
# ФАЗА 2 — PvE КОНТЕНТ
# ═══════════════════════════════════════════
story.append(CondPageBreak(PAGE_H * 0.15))
story.append(add_heading('ФАЗА 2 — PvE КОНТЕНТ', h1_style, level=0))
story.append(hr())

story.append(add_heading('2.1 Структура кампании (Акты 1-6)', h2_style, level=1))
story.append(P('Поверхность делится на 6 регионов — территорий рас. Порядок прохождения линейный, но внутри региона — свобода.'))

# ACT 1
story.append(add_heading('АКТ 1: Пепельные Врата (Люди) — Уровни 1-3', h3_style))
story.append(P('Тема: Руины человеческой цивилизации, последствия откровения Карсуса. Игрок пробуждается у Пепельных Врат без памяти, узнаёт о Падении от НПС-наставника, выбирает первую специализацию (уровень 3), встречает представителя другой расы и обнаруживает Разлом — вход в Глубь.'))
story.append(Spacer(1, 4))
story.append(build_center_table(
    ['Локация', 'Описание', 'Уровень'],
    [
        ['Сожжённая деревня', 'Обучение, первые бои', '1'],
        ['Храм Велариона', 'Заброшенный храм, первый мини-босс', '1-2'],
        ['Тракт Скорби', 'Дорога между руинами, случайные встречи', '2'],
        ['Пепельная крепость', 'Первый крупный данжен', '2-3'],
        ['Разлом Карсуса', 'Точка входа в Глубь, первый настоящий босс', '3'],
    ],
    [CONTENT_W*0.25, CONTENT_W*0.50, CONTENT_W*0.25]
))
story.append(Spacer(1, 4))
story.append(P('<b>Босс Акта 1: Первый Свидетель</b> — Дух человека, который видел Падение. Обезумел от увиденного. Механика: каждые 3 хода меняет форму (физическая/магическая). В физической — высокий урон, низкая защита. В магической — дебаффы, средний урон, высокая защита. Фаза 2 (при 30% ХП): обе формы одновременно.'))

# ACT 2
story.append(add_heading('АКТ 2: Корневая Роща (Эльфы) — Уровни 3-4', h3_style))
story.append(P('Тема: Умирающий лес, оборванная Нить Жизни.'))
story.append(Spacer(1, 4))
story.append(build_center_table(
    ['Локация', 'Уровень'],
    [
        ['Внешняя роща — лес, где деревья ещё живы, но больны', '3'],
        ['Мёртвый берег — река, несущая Скверну из Глуби', '3'],
        ['Сердце Рощи — гигантское мёртвое дерево, бывший храм Айлет', '3-4'],
        ['Тень-грибница — подземная сеть, заражённая Скверной', '4'],
        ['Корень Бездны — корни мёртвого дерева уходят в Глубь', '4'],
    ],
    [CONTENT_W*0.75, CONTENT_W*0.25]
))
story.append(P('<b>Босс Акта 2: Эхо Айлет</b> — Искажённый фрагмент богини Жизни. Выглядит как прекрасная эльфийка, но из трещин сочится Скверна. Механика: хилит себя каждый ход на 5% ХП. Игрок должен накладывать дебаффы на лечение. Фаза 2: призывает корни-ловушки (обездвиживание). Фаза 3: яд на весь бой 3%/ход — гонка на время.'))

# ACT 3
story.append(add_heading('АКТ 3: Каменный Чертог (Гномы) — Уровни 4-5', h3_style))
story.append(P('Тема: Разрушенные шахты, потерянные руны, предательство основ.'))
story.append(build_center_table(
    ['Локация', 'Уровень'],
    [
        ['Внешние шахты — заброшенные тоннели', '4'],
        ['Рунная мастерская — загадки с рунами, ловушки', '4-5'],
        ['Зал Клятв — бывший зал суда, теперь арена', '5'],
        ['Великая Кузница — руины главной святыни Торнака', '5'],
        ['Разлом Основы — Кузница рухнула в Глубь', '5'],
    ],
    [CONTENT_W*0.75, CONTENT_W*0.25]
))
story.append(P('<b>Босс Акта 3: Сломанная Клятва</b> — Гном-титан, давший клятву Торнаку и преданный, когда бог пал. Имеет щит, который нужно сначала сломать. Щит восстанавливается каждые 4 хода. При сломанном щите — берсерк-режим (+50% урона, -30% защиты). Нужно тайминговать урон.'))

# ACT 4
story.append(add_heading('АКТ 4: Драконье Горнило (Драконорождённые) — Уровни 5-6', h3_style))
story.append(P('Тема: Вулканическая земля, раскалённая кровь, грань между силой и самоуничтожением.'))
story.append(build_center_table(
    ['Локация', 'Уровень'],
    [
        ['Пепельная пустошь — выжженная земля вокруг вулкана', '5'],
        ['Гнёзда — остатки драконьих поселений', '5-6'],
        ['Обсидиановый лабиринт — застывшая лава, запутанные ходы', '6'],
        ['Жерло Игниры — вулкан, где Скверна горит в огне', '6'],
        ['Колыбель Пламени — сердце вулкана', '6'],
    ],
    [CONTENT_W*0.75, CONTENT_W*0.25]
))
story.append(P('<b>Босс Акта 4: Первый Дракон</b> — Древний дракон, созданный Веларионом лично. Обезумел от внутреннего огня. Каждый ход накладывает «Горение». Фаза 2: дракон начинает гаснуть — урон падает, но появляется Скверна. Выбор: добить или попытаться исцелить (влияет на награду).'))

# ACT 5
story.append(add_heading('АКТ 5: Гнилые Топи (Нежить) — Уровни 6-7', h3_style))
story.append(P('Тема: Болота, где мёртвые не лежат спокойно. Граница между жизнью и не-жизнью.'))
story.append(build_center_table(
    ['Локация', 'Уровень'],
    [
        ['Внешние топи — мелкая нежить, ядовитые испарения', '6'],
        ['Кладбище кораблей — затонувший флот, нежить-моряки', '6-7'],
        ['Чумной лагерь — алхимики, экспериментирующие со Скверной', '7'],
        ['Костяной собор — храм, построенный из костей', '7'],
        ['Врата Мора — массовое захоронение — вход в Глубь', '7'],
    ],
    [CONTENT_W*0.75, CONTENT_W*0.25]
))
story.append(P('<b>Босс Акта 5: Первый Восставший</b> — Самый первый нежить — тот, кто умер и вернулся в момент Падения. Помнит мир до раскола. Призывает скелетов каждые 2 хода. Фаза 2: перестаёт призывать, но начинает красть ХП. Лорный поворот: предлагает информацию в обмен на пощаду.'))

# ACT 6
story.append(add_heading('АКТ 6: Хребет Грумгара (Орки) — Уровни 7-8', h3_style))
story.append(P('Тема: Война кланов, выживание сильнейшего, честь через кровь.'))
story.append(build_center_table(
    ['Локация', 'Уровень'],
    [
        ['Пограничье — нейтральная земля между кланами', '7'],
        ['Арена Крови — гладиаторские бои для чужаков', '7-8'],
        ['Крепость Грумгара — столица орков', '8'],
        ['Тропа Черепов — ритуальный путь к Глуби', '8'],
        ['Зев Бездны — самый большой разлом', '8'],
    ],
    [CONTENT_W*0.75, CONTENT_W*0.25]
))
story.append(P('<b>Босс Акта 6: Грумгар Нерождённый</b> — Дух великого вождя, который должен был объединить кланы. Убит предательством. Самый агрессивный босс — постоянно атакует. Каждые 2 хода — Ответный удар. Нужно чередовать атаки с защитой. Фаза 2: призывает духов воинов клана (+15% урона каждый).'))

# 2.2 Глубь
story.append(CondPageBreak(PAGE_H * 0.15))
story.append(add_heading('2.2 Глубь — Вертикальная PvE кампания (Акты 7-12)', h2_style, level=1))
story.append(P('6 уровней глубины, каждый привязан к одному из павших Столпов:'))
story.append(Spacer(1, 4))
story.append(build_center_table(
    ['Уровень Глуби', 'Уровень персонажа', 'Тема', 'Связанный Столп'],
    [
        ['Верхняя Глубь', '8-9', 'Руины цивилизации, упавшей вниз', 'Нет'],
        ['Тихие Залы', '9', 'Тишина, ловушки, паранойя', 'Кессара'],
        ['Корневая Бездна', '9', 'Паразитическая жизнь, мутации', 'Айлет'],
        ['Горнило Безумия', '9', 'Бесконтрольный огонь, выжженная пустота', 'Веларион'],
        ['Окаменевший Закон', '9', 'Застывший мир, где время остановилось', 'Торнак'],
        ['Дно', '9 (эндгейм)', 'Место, где лежат боги', 'Все четверо'],
    ],
    [CONTENT_W*0.22, CONTENT_W*0.18, CONTENT_W*0.38, CONTENT_W*0.22]
))

DEPTH_LEVELS = [
    ('Верхняя Глубь (уровень 8-9)', 'Первый слой. Руины того, что упало сверху — обломки зданий, корабли, деревья. Скверна слабая, но ощутимая. Механика зоны: каждые 5 боёв — проверка на Скверну. При провале — случайный дебафф на 3 боя.', 'Привратник Глуби', 'Адаптируется к типу урона — если бить физическим, получает резист к физическому. Нужно чередовать типы урона.'),
    ('Тихие Залы (уровень 9, зона Кессары)', 'Абсолютная тишина. Стены покрыты зеркалами, которые показывают не отражение, а страхи. Механика зоны: каждые 3 хода — Шёпот Кессары: случайный эффект (дебафф ИЛИ бафф). Нельзя предсказать.', 'Зеркало Кессары', 'Не существо — сам зал становится боссом. Зеркало показывает «идеальную версию» игрока — с удвоенными статами. Но каждые 3 хода копия теряет бафф. Нужно пережить натиск и добивать.'),
    ('Корневая Бездна (уровень 9, зона Айлет)', 'Жизнь, которая не должна существовать. Паразитические корни, плоть-растения, мутации. Механика зоны: постоянный реген 2%/ход, НО каждый реген имеет 20% шанс мутации (случайный дебафф).', 'Сердце Айлет', 'Пульсирующий орган богини, ставший паразитом. Хилит себя на 10%/ход. Призывает «Корни» — мини-врагов, которые хилят босса. Фаза 2: начинает хилить ИГРОКА (но с мутацией — каждый хил даёт дебафф).'),
    ('Горнило Безумия (уровень 9, зона Велариона)', 'Огонь без смысла. Пламя, которое горит без топлива. Жар, от которого плавится реальность. Механика зоны: каждый ход — 2% урона от «Жара Глуби». Таймер на прохождение.', 'Пламя Велариона', 'Чистый огонь — без формы, без тела. Наносит огненный урон каждый ход ВСЕМ. Фаза 2: пламя «гаснет» — урон падает, но появляются «Угли» (мини-враги, самовзрывающиеся).'),
    ('Окаменевший Закон (уровень 9, зона Торнака)', 'Мир, где всё застыло. Камень, который был живым. Время, которое остановилось. Механика зоны: каждые 4 хода — «Окаменение»: случайная способность блокируется на 2 хода.', 'Статуя Торнака', 'Бог, обратившийся в камень. Почти неуязвим (90% снижение урона), но МЕДЛЕННЫЙ. Каждые 5 ходов — один удар колоссальной силы. Нужно выживать между ударами и наносить урон в окно уязвимости (1 ход после удара — 50% снижение защиты).'),
]

for level_name, desc, boss_name, boss_desc in DEPTH_LEVELS:
    story.append(add_heading(level_name, h3_style))
    story.append(P(desc))
    story.append(P(f'<b>Босс: {boss_name}</b> — {boss_desc}'))
    story.append(Spacer(1, 4))

story.append(add_heading('Дно (эндгейм)', h3_style))
story.append(P('Место, где четыре павших бога лежат в искажённом покое. Каждый бог — мировой босс. Для их убийства нужна полная группа в максимальной экипировке. Подробнее в секции Эндгейм.'))

# 2.3 Система врагов
story.append(add_heading('2.3 Система врагов — Общие принципы', h2_style, level=1))
story.append(build_center_table(
    ['Тип', 'ХП', 'Урон', 'Механики', 'Лут'],
    [
        ['Обычный', 'x1', 'x1', '1-2 способности', 'Обычный/Необычный'],
        ['Элитный', 'x2', 'x1.5', '3-4 способности + пассивка', 'Необычный/Редкий'],
        ['Мини-босс', 'x3', 'x2', '5-6 способностей + 2 пассивки', 'Редкий/Эпический'],
        ['Босс', 'x5', 'x2.5', '7 способностей + фазы + иммунитеты', 'Эпический/Легендарный'],
        ['Рейд-босс', 'x10', 'x3', '10+ способностей + механики пати', 'Легендарный/Проклятый'],
    ],
    [CONTENT_W*0.15, CONTENT_W*0.10, CONTENT_W*0.10, CONTENT_W*0.35, CONTENT_W*0.30]
))
story.append(Spacer(1, 6))
story.append(build_center_table(
    ['Уровень AI', 'Поведение', 'Где встречается'],
    [
        ['Простой', 'Бьёт сильнейшей доступной атакой', 'Обычные враги'],
        ['Тактический', 'Приоритезирует дебаффы, потом урон', 'Элитные враги'],
        ['Умный', 'Фокусит хилера, снимает баффы, контрит', 'Мини-боссы'],
        ['Босс', 'Фазы, триггеры, адаптация к тактике', 'Боссы'],
        ['Рейдовый', 'Распределяет внимание, меняет цели', 'Рейд-боссы'],
    ],
    [CONTENT_W*0.20, CONTENT_W*0.45, CONTENT_W*0.35]
))

# 2.4 Система квестов
story.append(add_heading('2.4 Система квестов', h2_style, level=1))
story.append(build_center_table(
    ['Тип', 'Описание', 'Награда', 'Пример'],
    [
        ['Сюжетный', 'Двигает основную историю', 'Опыт, лут, открытие локаций', '«Найти Разлом Карсуса»'],
        ['Расовый', 'Раскрывает историю расы', 'Расовый предмет, лор', '«Услышать Шёпот Нити»'],
        ['Побочный', 'Мини-истории НПС', 'Опыт, золото, предметы', '«Помочь торговцу»'],
        ['Охота', 'Убить определённого врага', 'Редкий лут', '«Уничтожить Скверноносца»'],
        ['Исследование', 'Найти секрет в локации', 'Уникальный предмет', '«Расшифровать руну»'],
        ['Выбор', 'Моральная дилемма', 'Зависит от выбора', '«Пощадить Первого Восставшего»'],
    ],
    [CONTENT_W*0.15, CONTENT_W*0.30, CONTENT_W*0.25, CONTENT_W*0.30]
))
story.append(Spacer(1, 4))
story.append(P('<b>Квесты с выбором — ключевая механика:</b> минимум 1 выбор на Акт. Выбор влияет на доступных НПС, лут, репутацию, концовку. НЕ влияет на класс и Путь — это необратимый выбор при создании.'))

# ═══════════════════════════════════════════
# ФАЗА 3 — PvP
# ═══════════════════════════════════════════
story.append(CondPageBreak(PAGE_H * 0.15))
story.append(add_heading('ФАЗА 3 — PvP СИСТЕМА', h1_style, level=0))
story.append(hr())

story.append(add_heading('3.1 Дуэли 1v1', h2_style, level=1))
story.append(build_center_table(
    ['Ранг', 'ELO', 'Награда за сезон'],
    [
        ['Прах', '0-999', 'Обычный сундук'],
        ['Искра', '1000-1199', 'Необычный сундук + титул'],
        ['Пламя', '1200-1399', 'Редкий сундук + рамка'],
        ['Скверна', '1400-1599', 'Эпический сундук + скин'],
        ['Глубь', '1600-1799', 'Легендарный сундук + эффект'],
        ['Столп', '1800+', 'Проклятый сундук + уникальный титул'],
    ],
    [CONTENT_W*0.15, CONTENT_W*0.25, CONTENT_W*0.60]
))
story.append(Spacer(1, 4))
story.append(P('Подбор: +/-100 ELO (расширяется до +/-200 через 30 сек). Одинаковый уровень (+/-1). Нет ограничений по расе/классу. 30 секунд на ход, максимум 30 ходов (ничья = оба теряют рейтинг). Зелья запрещены, экипировка уравнивается по уровню.'))

# ═══════════════════════════════════════════
# ФАЗА 4 — РЕЙДЫ
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(add_heading('ФАЗА 4 — РЕЙДЫ', h1_style, level=0))
story.append(hr())

story.append(add_heading('4.1 Структура рейдов', h2_style, level=1))
story.append(P('Формат: 3-6 игроков, пошаговый бой с одним рейд-боссом.'))
story.append(Spacer(1, 4))
story.append(build_table(
    ['Роль', 'Описание', 'Идеальные классы'],
    [
        ['Танк', 'Держит удар, провоцирует', 'Клятвенный, Каменнокожий, Хранитель Стены, Костяной страж'],
        ['Хилер', 'Лечит группу, снимает дебаффы', 'Хранитель нити, Жрец, Чумной жнец'],
        ['DPS', 'Наносит урон', 'Плут, Берсерк, Пламенный легат, Пепельный гладиатор'],
        ['Саппорт', 'Баффы, дебаффы врага', 'Чародей, Вожак орды, Рунный жнец, Следопыт'],
        ['Антибафф', 'Снимает защиту с босса', 'Обвальщик, Пожиратель тепла, Разрыватель уз'],
    ],
    [CONTENT_W*0.12, CONTENT_W*0.30, CONTENT_W*0.58]
))

story.append(add_heading('4.2 Рейд-боссы (6 штук)', h2_style, level=1))
RAID_BOSSES = [
    ('Рейд 1: Осколок Торнака', 'Уровень: 7+ | Пати: 3-4 человека', 'Каждые 3 хода — «Окаменение» одного игрока. Танк должен провоцировать, чтобы «Окаменение» падало на него. Хилер снимает «Окаменение». DPS-окно: 2 хода после «Окаменения».'),
    ('Рейд 2: Корень Айлет', 'Уровень: 8+ | Пати: 4-5 человек', 'Босс хилит себя на 8%/ход, призывает корни. Антибафф ОБЯЗАТЕЛЕН — без блокировки лечения невозможно убить. Корни хилят босса — нужен оффтанк или второй DPS.'),
    ('Рейд 3: Пепел Велариона', 'Уровень: 8+ | Пати: 4-5 человек', 'Постоянный урон 3%/ход всей группе. Хилер работает на износ. Каждые 5 ходов — «Извержение» (30% ХП всем) — нужен групповой щит.'),
    ('Рейд 4: Зеркало Кессары', 'Уровень: 9+ | Пати: 5-6 человек', 'Создаёт копию случайного игрока каждые 4 хода. Копия имеет 60% статов оригинала. Нужно быстро убивать копии, иначе они стакаются.'),
    ('Рейд 5: Первый Осколок Карсуса', 'Уровень: 9+ | Пати: 5-6 человек', 'Меняет стихию каждые 3 хода (огонь/лёд/тьма/камень). Группа должна адаптировать урон. Фаза 2: все стихии одновременно.'),
    ('Рейд 6: Карсус Возрождённый (финальный)', 'Уровень: 9, эндгейм | Пати: 6 человек', 'Фаза 1: физический бой (танк+DPS). Фаза 2: магический бой (антибафф+саппорт). Фаза 3: проверка на хил (постоянный урон по группе). Фаза 4: DPS-гонка (5 ходов, чтобы добить, иначе вайп).'),
]
for name, req, mech in RAID_BOSSES:
    story.append(P(f'<b>{name}</b> — {req}'))
    story.append(P(f'Механика: {mech}'))
    story.append(Spacer(1, 3))

# ═══════════════════════════════════════════
# ФАЗА 5 — ЭНДГЕЙМ
# ═══════════════════════════════════════════
story.append(CondPageBreak(PAGE_H * 0.15))
story.append(add_heading('ФАЗА 5 — ЭНДГЕЙМ', h1_style, level=0))
story.append(hr())

story.append(add_heading('5.1 Еженедельный контент', h2_style, level=1))
story.append(build_center_table(
    ['Активность', 'Описание', 'Награда', 'Сброс'],
    [
        ['Глубинная экспедиция', '1 прохождение уровня Глуби с модификаторами', 'Легендарный лут', 'Еженедельно'],
        ['Рейд', '1 рейд-босс', 'Эпический/Легендарный', 'Еженедельно'],
        ['PvP сезон', '10 рейтинговых матчей', 'Рейтинг + очки', 'Постоянно'],
        ['Охота на элиту', '3 элитных врага с усиленными статами', 'Редкий/Эпический', 'Ежедневно'],
    ],
    [CONTENT_W*0.20, CONTENT_W*0.35, CONTENT_W*0.25, CONTENT_W*0.20]
))

story.append(add_heading('5.2 Система восхождения (Prestige)', h2_style, level=1))
story.append(build_center_table(
    ['Ранг', 'Бонус', 'Требование'],
    [
        ['Восхождение 1', '+5% ко всем статам', 'Пройти всю Глубь'],
        ['Восхождение 2', '+10% + разблокировка проклятых предметов', 'Убить 3 рейд-босса'],
        ['Восхождение 3', '+15% + уникальная пассивка расы', 'Достичь ранга «Скверна» в PvP'],
        ['Восхождение 4', '+20% + визуальное преображение', 'Пройти Дно'],
        ['Восхождение 5', '+25% + легендарный титул', 'Убить Карсуса Возрождённого'],
    ],
    [CONTENT_W*0.18, CONTENT_W*0.42, CONTENT_W*0.40]
))

story.append(add_heading('5.3 Расовые пассивки восхождения', h2_style, level=1))
story.append(build_table(
    ['Раса', 'Пассивка', 'Описание'],
    [
        ['Гномы', 'Несокрушимая основа', 'При ХП выше 80% — иммунитет к первому дебаффу в бою'],
        ['Эльфы', 'Память Нити', 'Первое исцеление за бой усилено на 50%'],
        ['Люди', 'Воля Карсуса', '1 раз за бой можно использовать любую способность бесплатно'],
        ['Драконорождённые', 'Древнее пламя', 'При ХП ниже 30% — автоматическое «Горение» на врага'],
        ['Нежить', 'Отказ от смерти', 'При первой смерти в бою — автоматическое воскрешение с 10% ХП'],
        ['Орки', 'Кровь клана', 'При убийстве врага — все союзники получают 5% ХП'],
    ],
    [CONTENT_W*0.22, CONTENT_W*0.25, CONTENT_W*0.53]
))

story.append(add_heading('5.4 Дно — Финальная зона', h2_style, level=1))
story.append(P('Место, где четыре павших бога лежат в искажённом покое. Каждый бог — мировой босс. Для их убийства нужна полная группа в максимальной экипировке.'))
story.append(Spacer(1, 4))
story.append(build_center_table(
    ['Босс', 'Механика', 'Сложность'],
    [
        ['Торнак Окаменевший', 'Иммунитет к физическому урону 50% времени', '4/5'],
        ['Айлет Паразитическая', 'Хилит себя на 15%/ход, нужна антихил-группа', '4/5'],
        ['Веларион Безумный', 'Постоянный урон по группе, DPS-гонка', '5/5'],
        ['Кессара Расколотая', 'Копирует всю группу с 80% статов', '5/5'],
    ],
    [CONTENT_W*0.30, CONTENT_W*0.50, CONTENT_W*0.20]
))
story.append(Spacer(1, 4))
story.append(P('<b>Пятый Мировой Босс (секретный):</b> Карсус Истинный — условие: убить всех 4 богов за 1 неделю. Механика: все механики 4 богов + уникальные.'))

# ═══════════════════════════════════════════
# ФАЗА 6 — НАРРАТИВНЫЙ ДИЗАЙН
# ═══════════════════════════════════════════
story.append(CondPageBreak(PAGE_H * 0.15))
story.append(add_heading('ФАЗА 6 — НАРРАТИВНЫЙ ДИЗАЙН', h1_style, level=0))
story.append(hr())

story.append(add_heading('6.1 Основная сюжетная линия', h2_style, level=1))
ARCS = [
    ('Арка 1 (Акты 1-3): Пробуждение', 'Игрок приходит в себя у Пепельных Врат. Узнаёт о Падении, Столпах, Скверне. Выбирает Путь (уровень 3). Встречает НПС-компаньонов. Обнаруживает, что Разломы расширяются — Скверна растёт.'),
    ('Арка 2 (Акты 4-6): Погружение', 'Понимает, что Скверна — не зло, а искажённая сила богов. Встречает тех, кто побывал в Глуби и вернулся (или не вернулся). Осознаёт масштаб: мир умирает, потому что боги не мертвы — они страдают. Ключевой выбор: спасти богов или добить их?'),
    ('Арка 3 (Глубь): Нисхождение', 'Путешествие вниз через зоны каждого Столпа. Каждая зона раскрывает историю одного бога. Игрок переживает их воспоминания. Понимает: Карсус не был безумцем — он познал правду, которую боги скрывали от смертных, и нёс её миру, даже зная, что она его разрушит. Его преступлением была не гордыня, а честность.'),
    ('Арка 4 (Дно): Решение', 'Встреча с павшими богами. Финальный выбор: что делать с богами?'),
]
for arc_name, arc_desc in ARCS:
    story.append(P(f'<b>{arc_name}</b> — {arc_desc}'))

story.append(add_heading('6.2 Три концовки', h2_style, level=1))
story.append(build_center_table(
    ['Концовка', 'Действие', 'Последствие'],
    [
        ['Искупление', 'Жертвуешь свою силу, чтобы исцелить богов', 'Мир спасён, но персонаж теряет все способности. Новая игра с бонусами'],
        ['Восхождение', 'Убиваешь богов и забираешь их силу', 'Персонаж становится новым Столпом. Уникальный класс'],
        ['Равновесие', 'Не убиваешь и не спасаешь — освобождаешь', 'Боги уходят, Скверна остаётся. Мир учится жить с проклятием'],
    ],
    [CONTENT_W*0.15, CONTENT_W*0.40, CONTENT_W*0.45]
))
story.append(P('Каждая концовка даёт уникальный бонус для нового прохождения (New Game+).'))

story.append(add_heading('6.3 НПС-компаньоны', h2_style, level=1))
story.append(build_table(
    ['НПС', 'Раса', 'Роль', 'Конфликт'],
    [
        ['Морвен', 'Гном', 'Наставник', 'Хранит секрет о Великой Кузнице'],
        ['Лиара', 'Эльфийка', 'Хилер-союзник', 'Теряет связь с Нитью — медленно умирает'],
        ['Дамиан', 'Человек', 'Воин-попутчик', 'Потомок Карсуса — несёт бремя правды предка'],
        ['Игнира', 'Драконорождённая', 'Жрица', 'Слышит голос Велариона — или ей кажется'],
        ['Тихий', 'Нежить', 'Разведчик', 'Не помнит, кем был при жизни'],
        ['Грокка', 'Орчиха', 'Вождь без клана', 'Изгнана за отказ убивать пленных'],
    ],
    [CONTENT_W*0.12, CONTENT_W*0.18, CONTENT_W*0.22, CONTENT_W*0.48]
))
story.append(P('Каждый компаньон имеет свою квестовую линию (3-5 квестов), даёт бонус к определённым боям, может умереть при неправильном выборе и влияет на концовку.'))

# ═══════════════════════════════════════════
# ФАЗА 7 — МОНЕТИЗАЦИЯ
# ═══════════════════════════════════════════
story.append(CondPageBreak(PAGE_H * 0.15))
story.append(add_heading('ФАЗА 7 — МОНЕТИЗАЦИЯ И УДЕРЖАНИЕ', h1_style, level=0))
story.append(hr())

story.append(add_heading('7.1 Модель монетизации (F2P-friendly)', h2_style, level=1))
story.append(P('<b>Что МОЖНО купить:</b> Косметика (скины, рамки, эффекты, титулы), Battle Pass (сезонные награды: 60% бесплатные, 40% платные), Ускорение прокачки (+50% опыта на 24 часа), Расширение инвентаря, Сезонный набор новичка.'))
story.append(Spacer(1, 4))
story.append(P('<b>Что НЕЛЬЗЯ купить:</b> Оружие/броня с преимуществом (Pay-to-win убивает PvP), Уровни (обесценивает прогрессию), Способности (разрушает баланс), Пропуск контента (обесценивает лор).'))

story.append(add_heading('7.2 Сезонная система', h2_style, level=1))
story.append(P('Сезон = 8 недель. Недели 1-2: новый сезон, Battle Pass, мини-рейд. Недели 3-4: сезонное событие. Недели 5-6: турнир PvP с призами. Недели 7-8: финальное событие, подведение итогов.'))
story.append(Spacer(1, 4))
story.append(build_center_table(
    ['Сезон', 'Тема', 'Контент'],
    [
        ['1', 'Пробуждение Скверны', 'Базовый запуск, обучение'],
        ['2', 'Шёпот Торнака', 'Гномий контент, рунные события'],
        ['3', 'Лунная охота', 'Эльфийский контент, ночные бои'],
        ['4', 'Пепельная война', 'PvP-сезон, орочьи события'],
        ['5', 'Чумной прилив', 'Нежить-контент, ядовитые модификаторы'],
        ['6', 'Горение', 'Драконий контент, огненные рейды'],
    ],
    [CONTENT_W*0.10, CONTENT_W*0.30, CONTENT_W*0.60]
))

# ═══════════════════════════════════════════
# ФАЗА 8 — ТЕХНИЧЕСКИЙ ПЛАН
# ═══════════════════════════════════════════
story.append(CondPageBreak(PAGE_H * 0.15))
story.append(add_heading('ФАЗА 8 — ТЕХНИЧЕСКИЙ ПЛАН', h1_style, level=0))
story.append(hr())

story.append(add_heading('8.1 Стек технологий', h2_style, level=1))
story.append(build_center_table(
    ['Компонент', 'Технология', 'Почему'],
    [
        ['Фронтенд', 'React/Vue + Canvas/WebGL', 'Быстрый рендеринг в Telegram WebApp'],
        ['Бэкенд', 'Node.js / Python (FastAPI)', 'Лёгкий, масштабируемый'],
        ['БД', 'PostgreSQL + Redis', 'Надёжность + кэш для PvP'],
        ['Бот', 'Telegram Bot API', 'Нативная интеграция'],
        ['Хостинг', 'Cloud (AWS/GCP)', 'Масштабирование'],
        ['Аналитика', 'Собственная + Amplitude', 'Отслеживание баланса'],
    ],
    [CONTENT_W*0.20, CONTENT_W*0.35, CONTENT_W*0.45]
))

story.append(add_heading('8.2 Приоритеты разработки (Roadmap)', h2_style, level=1))
story.append(build_center_table(
    ['Этап', 'Срок', 'Контент'],
    [
        ['MVP', '2-3 мес.', 'Акт 1, 2 расы, 4 класса, стадии 1-2, базовый PvP, экипировка Обычная-Редкая'],
        ['Альфа', '4-6 мес.', 'Акты 1-3, 4 расы, 8 классов, все стадии, первый рейд, PvP рейтинг, квесты с выбором'],
        ['Бета', '7-9 мес.', 'Все 6 Актов, 6 рас, 24 класса, 3 рейда, Верхняя Глубь, Battle Pass v1'],
        ['Релиз', '10-12 мес.', 'Вся Глубь, 6 рейдов, Дно, восхождения, полный PvP, все сезонные системы, 3 концовки'],
    ],
    [CONTENT_W*0.10, CONTENT_W*0.15, CONTENT_W*0.75]
))

# ═══════════════════════════════════════════
# ФАЗА 9 — МЕТРИКИ
# ═══════════════════════════════════════════
story.append(CondPageBreak(PAGE_H * 0.15))
story.append(add_heading('ФАЗА 9 — МЕТРИКИ БАЛАНСА', h1_style, level=0))
story.append(hr())

story.append(add_heading('9.1 Целевые метрики', h2_style, level=1))
story.append(build_center_table(
    ['Метрика', 'Целевое значение', 'Как измеряем'],
    [
        ['Средняя длина боя (PvE)', '8-12 ходов', 'Логи боёв'],
        ['Средняя длина боя (PvP)', '10-15 ходов', 'Логи боёв'],
        ['Винрейт каждого класса (PvP)', '45-55%', 'Статистика матчей'],
        ['Популярность классов', 'Ни один класс не ниже 5%', 'Статистика создания'],
        ['Смертность на боссах', '30-50% с первой попытки', 'Логи боёв'],
        ['Время прохождения Акта', '2-4 часа', 'Аналитика'],
        ['Время до эндгейма', '30-50 часов', 'Аналитика'],
        ['Retention D1/D7/D30', '60%/30%/15%', 'Аналитика'],
    ],
    [CONTENT_W*0.35, CONTENT_W*0.30, CONTENT_W*0.35]
))

story.append(add_heading('9.2 Инструменты балансировки', h2_style, level=1))
story.append(build_center_table(
    ['Инструмент', 'Назначение'],
    [
        ['Симулятор боёв', 'Автоматический прогон 10000 боёв каждой комбинации классов'],
        ['Heatmap способностей', 'Какие способности используются чаще/реже'],
        ['Трекер винрейта', 'Реальный винрейт по классам/расам'],
        ['A/B тесты', 'Тестирование изменений баланса на части аудитории'],
        ['Обратная связь', 'Канал в Telegram для баг-репортов и фидбека'],
    ],
    [CONTENT_W*0.30, CONTENT_W*0.70]
))

# ═══════════════════════════════════════════
# ИТОГОВЫЙ ЧЕКЛИСТ
# ═══════════════════════════════════════════
story.append(Spacer(1, 16))
story.append(add_heading('ИТОГОВЫЙ ЧЕКЛИСТ', h1_style, level=0))
story.append(hr())

CHECKLIST = [
    ('1', 'Библия мира (лор)', '+'),
    ('2', '6 расовых лор-документов', '+'),
    ('3', '4 Столпа — детальная проработка', '+'),
    ('4', '24 класса — полные способности', '+'),
    ('5', 'Механики боссов (таблица)', '+'),
    ('6', 'Баланс PvP vs PvE', '+'),
    ('7', 'Система характеристик и маны', '+'),
    ('8', 'Система экипировки', '+'),
    ('9', '6 Актов поверхности (враги, боссы, квесты)', '+'),
    ('10', '6 уровней Глуби', '+'),
    ('11', '6 рейд-боссов', '+'),
    ('12', 'PvP система', '+'),
    ('13', 'Эндгейм (восхождение, мировые боссы)', '+'),
    ('14', '6 НПС-компаньонов', '+'),
    ('15', 'Сюжет + 3 концовки', '+'),
    ('16', 'Монетизация', '+'),
    ('17', 'Сезонная система', '+'),
    ('18', 'Техническая архитектура', '+'),
    ('19', 'MVP / Альфа / Бета / Релиз', '+'),
    ('20', 'Метрики и инструменты баланса', '+'),
]
story.append(build_center_table(
    ['#', 'Задача', 'Статус'],
    CHECKLIST,
    [CONTENT_W*0.06, CONTENT_W*0.74, CONTENT_W*0.20]
))

# ═══ BUILD ═══
doc.multiBuild(story, onLaterPages=page_bg, onFirstPage=cover_bg)
print(f'PDF generated: {OUTPUT_PATH}')

from pypdf import PdfReader
reader = PdfReader(OUTPUT_PATH)
print(f'Pages: {len(reader.pages)}')

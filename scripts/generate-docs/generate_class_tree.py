#!/usr/bin/env python3
"""
Cursed Depths — Class Evolution Tree Diagram
Renders a tree diagram similar to the user's reference image:
  Bottom: Base class (per race)
  Level 1: Stage 1 class (base)
  Level 2: Stage 2 class (evolution)
  Level 3: Stage 3 class (final evolution)
With paths colored: Pepel (orange) and Skverna (purple)
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np

# Font setup for Russian
import matplotlib.font_manager as fm
fm.fontManager.addfont('/usr/share/fonts/truetype/english/Carlito-Regular.ttf')
fm.fontManager.addfont('/usr/share/fonts/truetype/english/Carlito-Bold.ttf')
fm.fontManager.addfont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')

plt.rcParams['font.sans-serif'] = ['Carlito', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# ─── Colors ───
BG_DARK = '#0d0c0a'
BG_CARD = '#1a1816'
PEPEL = '#c47a3a'       # Path of Ash - warm orange
PEPEL_LIGHT = '#d4944f'
SKVERNA = '#7a3ac4'     # Path of Blight - purple
SKVERNA_LIGHT = '#9a5ae4'
ACCENT = '#6b4fc1'
TEXT_COLOR = '#e9e8e7'
TEXT_MUTED = '#8c887f'
BORDER_COLOR = '#3a3830'
RACE_COLORS = {
    'ГНОМЫ': '#8B7355',
    'ЭЛЬФЫ': '#4a8c4a',
    'ЛЮДИ': '#5a7ab5',
    'ДРАКОНОРОЖДЁННЫЕ': '#b54a4a',
    'НЕЖИТЬ': '#6a6a8a',
    'ОРКИ': '#5a8a3a',
}

# ─── Data: Race → Base → [Pepel classes, Skverna classes] ───
# Each class has 3 stages
TREE_DATA = [
    {
        'race': 'ГНОМЫ',
        'base': 'Хранитель\nкамня',
        'pepel': [
            ('Клятвенный', 'Страж\nПредела', 'Живой\nЗакон'),
            ('Рунный\nжнец', 'Меченый', 'Кузнец\nСудьбы'),
        ],
        'skverna': [
            ('Обвальщик', 'Ломатель\nКлятв', 'Длань\nКузницы'),
            ('Могильный\nкузнец', 'Глушитель', 'Пожиратель\nОснов'),
        ],
    },
    {
        'race': 'ЭЛЬФЫ',
        'base': 'Служитель\nлеса',
        'pepel': [
            ('Хранитель\nнити', 'Дитя\nРощи', 'Голос\nАйлет'),
            ('Лунный\nстрелок', 'Ночной\nохотник', 'Дитя\nЗатмения'),
        ],
        'skverna': [
            ('Пожиратель\nтепла', 'Истощитель', 'Эхо\nПустоты'),
            ('Разрыватель\nуз', 'Отрёкшийся', 'Безмолвный'),
        ],
    },
    {
        'race': 'ЛЮДИ',
        'base': 'Хранитель\nВоли',
        'pepel': [
            ('Паладин', 'Клятвенник', 'Очиститель'),
            ('Жрец', 'Служитель\nпепла', 'Пастырь\nпламени'),
            ('Воин', 'Ветеран', 'Маршал\nПепла'),
        ],
        'skverna': [
            ('Плут', 'Тень', 'Фантом'),
            ('Чародей', 'Падший', 'Владыка\nтеней'),
            ('Следопыт', 'Охотник', 'Око\nмрака'),
        ],
    },
    {
        'race': 'ДРАКОНОРОЖДЁННЫЕ',
        'base': 'Оплот\nпламени',
        'pepel': [
            ('Пламенный\nлегат', 'Опалённый', 'Жрец\nИгниры'),
            ('Каменнокожий', 'Каменный\nлегат', 'Нерушимый'),
        ],
        'skverna': [
            ('Пепельный\nгладиатор', 'Выживший', 'Воплощение\nПепла'),
            ('Обсидиановый\nвоин', 'Тёмный\nлегат', 'Испепелитель'),
        ],
    },
    {
        'race': 'НЕЖИТЬ',
        'base': 'Восставший',
        'pepel': [
            ('Чумной\nжнец', 'Некромант', 'Владыка\nМора'),
            ('Костяной\nстраж', 'Вечный\nсолдат', 'Несломленный'),
        ],
        'skverna': [
            ('Алхимик\nраспада', 'Чумной\nапостол', 'Архилич'),
            ('Пустотный\nвор', 'Опустошитель', 'Безмолвный\nжнец'),
        ],
    },
    {
        'race': 'ОРКИ',
        'base': 'Воин\nклана',
        'pepel': [
            ('Неистовый\nберсерк', 'Кровавый\nпалач', 'Бог\nВойны'),
            ('Хранитель\nСтены', 'Страж\nрубежа', 'Железный\nСтраж'),
        ],
        'skverna': [
            ('Кровавый\nохотник', 'Рубака', 'Палач\nБогов'),
            ('Вожак\nорды', 'Зовущий\nв бой', 'Крушитель\nЧерепов'),
        ],
    },
]

# ─── Layout ───
# Each race gets its own page. Layout within a page:
#   Level 0 (bottom): Base class — 1 node
#   Level 1: Stage 1 classes (Pepel + Skverna) — 2-3 nodes per path
#   Level 2: Stage 2 classes — same count
#   Level 3 (top): Stage 3 classes — same count

BOX_W = 0.11
BOX_H = 0.065
LEVEL_Y = [0.08, 0.28, 0.52, 0.76]  # Y positions for levels 0-3
LEVEL_LABELS = ['Базовый класс', 'Стадия 1', 'Стадия 2', 'Стадия 3 (финал)']

def draw_box(ax, x, y, w, h, text, facecolor, edgecolor, fontsize=7, textcolor=TEXT_COLOR, bold=False):
    """Draw a rounded rectangle with text."""
    box = FancyBboxPatch(
        (x - w/2, y - h/2), w, h,
        boxstyle="round,pad=0.008",
        facecolor=facecolor,
        edgecolor=edgecolor,
        linewidth=1.2,
        zorder=3
    )
    ax.add_patch(box)
    weight = 'bold' if bold else 'normal'
    ax.text(x, y, text, ha='center', va='center', fontsize=fontsize,
            color=textcolor, fontweight=weight, zorder=4,
            linespacing=0.85)

def draw_arrow(ax, x1, y1, x2, y2, color, alpha=0.6):
    """Draw a curved arrow between two boxes."""
    ax.annotate('',
        xy=(x2, y2 - BOX_H/2),
        xytext=(x1, y1 + BOX_H/2),
        arrowprops=dict(
            arrowstyle='->',
            color=color,
            lw=1.5,
            alpha=alpha,
            connectionstyle='arc3,rad=0.0'
        ),
        zorder=2
    )

def draw_race_tree(race_data, ax):
    """Draw one race's complete evolution tree."""
    race_name = race_data['race']
    race_color = RACE_COLORS.get(race_name, ACCENT)
    
    pepel_classes = race_data['pepel']
    skverna_classes = race_data['skverna']
    
    n_pepel = len(pepel_classes)
    n_skverna = len(skverna_classes)
    n_total = n_pepel + n_skverna
    
    # ─── Level 0: Base class (center bottom) ───
    base_x = 0.5
    base_y = LEVEL_Y[0]
    draw_box(ax, base_x, base_y, BOX_W * 1.3, BOX_H * 1.3,
             race_data['base'], race_color, race_color, fontsize=8, bold=True)
    
    # Path labels
    pepel_center_x = 0.25
    skverna_center_x = 0.75
    
    ax.text(pepel_center_x, LEVEL_Y[3] + 0.08, 'ПУТЬ ПЕПЛА',
            ha='center', va='center', fontsize=10, color=PEPEL,
            fontweight='bold', style='italic', zorder=5)
    ax.text(skverna_center_x, LEVEL_Y[3] + 0.08, 'ПУТЬ СКВЕРНЫ',
            ha='center', va='center', fontsize=10, color=SKVERNA,
            fontweight='bold', style='italic', zorder=5)
    
    # Vertical divider
    ax.axvline(x=0.5, color=BORDER_COLOR, linewidth=0.8, linestyle='--', alpha=0.4, zorder=1)
    
    # ─── Draw Pepel branch ───
    for i, (s1, s2, s3) in enumerate(pepel_classes):
        # X positions: spread within left half
        if n_pepel == 1:
            x = 0.25
        elif n_pepel == 2:
            x = 0.15 + i * 0.20
        else:
            x = 0.10 + i * 0.15
        
        # Level 1
        draw_box(ax, x, LEVEL_Y[1], BOX_W, BOX_H, s1, BG_CARD, PEPEL, fontsize=6.5)
        draw_arrow(ax, base_x, base_y, x, LEVEL_Y[1], PEPEL, alpha=0.5)
        
        # Level 2
        draw_box(ax, x, LEVEL_Y[2], BOX_W, BOX_H, s2, BG_CARD, PEPEL, fontsize=6.5)
        draw_arrow(ax, x, LEVEL_Y[1], x, LEVEL_Y[2], PEPEL, alpha=0.5)
        
        # Level 3
        draw_box(ax, x, LEVEL_Y[3], BOX_W, BOX_H, s3, PEPEL + '33', PEPEL, fontsize=6.5, textcolor=PEPEL_LIGHT, bold=True)
        draw_arrow(ax, x, LEVEL_Y[2], x, LEVEL_Y[3], PEPEL, alpha=0.5)
    
    # ─── Draw Skverna branch ───
    for i, (s1, s2, s3) in enumerate(skverna_classes):
        if n_skverna == 1:
            x = 0.75
        elif n_skverna == 2:
            x = 0.65 + i * 0.20
        else:
            x = 0.60 + i * 0.15
        
        # Level 1
        draw_box(ax, x, LEVEL_Y[1], BOX_W, BOX_H, s1, BG_CARD, SKVERNA, fontsize=6.5)
        draw_arrow(ax, base_x, base_y, x, LEVEL_Y[1], SKVERNA, alpha=0.5)
        
        # Level 2
        draw_box(ax, x, LEVEL_Y[2], BOX_W, BOX_H, s2, BG_CARD, SKVERNA, fontsize=6.5)
        draw_arrow(ax, x, LEVEL_Y[1], x, LEVEL_Y[2], SKVERNA, alpha=0.5)
        
        # Level 3
        draw_box(ax, x, LEVEL_Y[3], BOX_W, BOX_H, s3, SKVERNA + '33', SKVERNA, fontsize=6.5, textcolor=SKVERNA_LIGHT, bold=True)
        draw_arrow(ax, x, LEVEL_Y[2], x, LEVEL_Y[3], SKVERNA, alpha=0.5)
    
    # ─── Level labels on the left ───
    for lvl, label in enumerate(LEVEL_LABELS):
        ax.text(0.02, LEVEL_Y[lvl], label, ha='left', va='center',
                fontsize=6, color=TEXT_MUTED, fontstyle='italic', zorder=5)
    
    # Race title at top
    ax.text(0.5, 0.96, race_name, ha='center', va='center',
            fontsize=14, color=race_color, fontweight='bold', zorder=5)


def generate_tree_pdf():
    """Generate a multi-page PDF with race trees."""
    from matplotlib.backends.backend_pdf import PdfPages
    
    output_path = '/home/z/my-project/download/cursed_depths_class_tree.pdf'
    
    with PdfPages(output_path) as pdf:
        for race_data in TREE_DATA:
            fig, ax = plt.subplots(1, 1, figsize=(11.69, 8.27))  # A4 landscape
            fig.patch.set_facecolor(BG_DARK)
            ax.set_facecolor(BG_DARK)
            ax.set_xlim(0, 1)
            ax.set_ylim(0, 1)
            ax.axis('off')
            
            # Subtle border
            for spine in ax.spines.values():
                spine.set_visible(False)
            
            draw_race_tree(race_data, ax)
            
            # Footer
            ax.text(0.5, 0.01, 'CURSED DEPTHS — Дерево классов', ha='center', va='bottom',
                    fontsize=7, color=TEXT_MUTED, zorder=5)
            
            plt.tight_layout(pad=0.5)
            pdf.savefig(fig, facecolor=BG_DARK, edgecolor='none')
            plt.close(fig)
    
    print(f'PDF generated: {output_path}')
    
    # Check page count
    from pypdf import PdfReader
    reader = PdfReader(output_path)
    print(f'Pages: {len(reader.pages)}')

if __name__ == '__main__':
    generate_tree_pdf()

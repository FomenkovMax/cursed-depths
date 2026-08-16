#!/usr/bin/env python3
"""Шаг 2 сборки PPTX: собрать презентацию из фонов и layout.json.

Что получается в файле:
  * фон слайда — картинка (градиенты, «аврора», стеклянные карточки, 3D-объекты);
  * весь текст — обычные надписи PowerPoint, правятся кликом;
  * обе диаграммы — НАТИВНЫЕ графики PowerPoint: правый клик -> «Изменить
    данные», открывается лист Excel с числами.

Дизайн и расположение не меняются: координаты сняты из вёрстки HTML.

Запуск:  python3 build_pptx.py ./build ../variant-a-aurora.pptx
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION, XL_TICK_LABEL_POSITION
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

# Сцена HTML — 1920x1080; слайд PowerPoint 16:9 — 13.333 x 7.5 дюйма.
STAGE_W, STAGE_H = 1920, 1080
SLIDE_W = Emu(12192000)                 # 13.333"
SLIDE_H = Emu(6858000)                  # 7.5"
PX = SLIDE_W / STAGE_W                  # EMU в одном пикселе сцены

# Пиксель сцены -> пункт шрифта. 1920 px = 13.333" = 960 pt.
PT_PER_PX = 0.5

ALIGN = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT}

# Цвета серий диаграмм — те же, что в HTML (проверены на контраст и дальтонизм).
C_CLIENTS = RGBColor(0x15, 0x9C, 0xC2)
C_CREDITS = RGBColor(0x21, 0xA0, 0x38)
C_SUM = RGBColor(0x35, 0xD6, 0xA0)
C_INK = RGBColor(0xB6, 0xCC, 0xC6)

# Цифры 35 / 47% / 100 в HTML залиты градиентом. В PowerPoint градиент по тексту
# средствами python-pptx не задать, поэтому берём средний тон градиента —
# на глаз отличие незаметно, зато цифра остаётся редактируемым текстом.
C_FIGURE = RGBColor(0x76, 0xE6, 0xC8)

DATA = {
    "appeals": [
        ("Вопрос о списания ПЗ", 490),
        ("Списание с в/б более 5 лет", 288),
        ("Уточнение сроков списания/вос-ния", 138),
        ("Отказ суда во взыскании ПЗ", 123),
    ],
    "clients": [129.4, 209.6, 98.3, 175.1, 186.9, 214.5, 283.2, 261.8, 236.8, 101.8, 263.5],
    "credits": [157.7, 254.9, 121.7, 199.6, 226.5, 258.6, 341.0, 309.9, 281.2, 129.4, 322.1],
    "sums":    [14.5, 21.6, 13.2, 39.8, 20.2, 28.2, 28.7, 31.8, 27.9, 11.8, 35.5],
}


def emu(px: float) -> Emu:
    return Emu(int(px * PX))


def rgb(triple: list[int]) -> RGBColor:
    return RGBColor(*triple)


# ---------------------------------------------------------------------------
# Текст
# ---------------------------------------------------------------------------

def add_text(slide, block: dict) -> None:
    """Надпись PowerPoint на месте HTML-блока.

    Каждый абзац собирается из сегментов: внутри строки могут быть куски
    другого размера, начертания или со сдвигом базовой линии — как «%» в 47%,
    жирное «Роль руководителя.» и мелкое «(месяц)».
    """
    figure = block.get("gradient")

    if figure:
        # Крупные цифры центрируем по вертикали внутри исходной рамки: при
        # line-height 0.86 положение глифа иначе зависит от метрик шрифта,
        # и цифра наезжает на подпись под ней.
        box = slide.shapes.add_textbox(
            emu(block["x"] - 6), emu(block["y"]), emu(block["w"] + 40), emu(block["h"])
        )
        box.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    else:
        # Небольшой запас по ширине и высоте: метрики шрифта в PowerPoint и в
        # браузере отличаются, без запаса длинная строка переносится лишний раз.
        box = slide.shapes.add_textbox(
            emu(block["x"] - 6), emu(block["y"] - 8),
            emu(block["w"] + 24), emu(block["h"] + 18),
        )
        box.text_frame.vertical_anchor = (
            MSO_ANCHOR.MIDDLE if block.get("vcenter") else MSO_ANCHOR.TOP
        )

    frame = box.text_frame
    # Однострочный блок не переносим: рамка у него по ширине текста, и разница
    # метрик шрифта иначе разорвала бы заголовок пополам.
    frame.word_wrap = not block.get("singleLine")
    frame.margin_left = frame.margin_right = frame.margin_top = frame.margin_bottom = 0

    for index, segments in enumerate(block["items"]):
        paragraph = frame.paragraphs[0] if index == 0 else frame.add_paragraph()
        paragraph.alignment = ALIGN.get(block.get("align", "left"), PP_ALIGN.LEFT)
        paragraph.line_spacing = 1.0 if figure else block.get("lineHeight", 1.3)
        if index:
            paragraph.space_before = Pt(block["size"] * PT_PER_PX * 0.55)
        if block.get("bullet"):
            _bullet(paragraph, block["size"])

        for segment in segments:
            if segment.get("br"):
                paragraph.add_line_break()
                continue

            text = " ".join(segment["text"].split())
            if not text:
                continue
            if block.get("upper"):
                text = text.upper()

            run = paragraph.add_run()
            # Пробел между сегментами HTML сохраняет, а strip его убирает.
            run.text = text + (" " if segment["text"].endswith((" ", "\n")) else "")
            run.font.size = Pt(segment["size"] * PT_PER_PX)
            run.font.bold = segment["weight"] >= 600
            run.font.color.rgb = C_FIGURE if figure else rgb(segment["color"])
            run.font.name = block["font"]
            if segment.get("baseline"):
                run.font._rPr.set("baseline", str(int(segment["baseline"] * 100000)))
            if block.get("letterSpacing"):
                run.font._rPr.set("spc", str(int(block["letterSpacing"] * PT_PER_PX * 100)))


def _bullet(paragraph, size_px: float) -> None:
    """Маркер-точка и отступ — как в HTML-списках."""
    pPr = paragraph._p.get_or_add_pPr()
    pPr.set("marL", str(int(size_px * PT_PER_PX * 12700 * 1.25)))
    pPr.set("indent", str(-int(size_px * PT_PER_PX * 12700 * 1.25)))

    fill = pPr.makeelement(qn("a:buClr"), {})
    color = fill.makeelement(qn("a:srgbClr"), {"val": "35D6A0"})
    fill.append(color)
    pPr.append(fill)

    font = pPr.makeelement(qn("a:buFont"), {"typeface": "Arial"})
    pPr.append(font)
    char = pPr.makeelement(qn("a:buChar"), {"char": "•"})
    pPr.append(char)


# ---------------------------------------------------------------------------
# Легенда (рисуем сами, чтобы совпадала с HTML)
# ---------------------------------------------------------------------------

def add_legend(slide, legend: dict) -> None:
    from pptx.enum.shapes import MSO_SHAPE

    for item in legend["items"]:
        side = 13
        top = item["y"] + (item["h"] - side) / 2
        swatch = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, emu(item["x"]), emu(top), emu(side), emu(side)
        )
        swatch.fill.solid()
        swatch.fill.fore_color.rgb = rgb(item["color"])
        swatch.line.fill.background()
        swatch.shadow.inherit = False

        box = slide.shapes.add_textbox(
            emu(item["x"] + side + 9), emu(item["y"] - 4),
            emu(len(item["text"]) * item["size"] * 0.62 + 30), emu(item["h"] + 10),
        )
        frame = box.text_frame
        frame.word_wrap = False
        frame.margin_left = frame.margin_right = frame.margin_top = frame.margin_bottom = 0
        run = frame.paragraphs[0].add_run()
        run.text = item["text"]
        run.font.size = Pt(item["size"] * PT_PER_PX)
        run.font.color.rgb = C_INK
        run.font.name = "Onest"


# ---------------------------------------------------------------------------
# Диаграммы
# ---------------------------------------------------------------------------

def _style_axis(axis, visible: bool = True, ink: RGBColor = C_INK) -> None:
    axis.has_major_gridlines = False
    axis.has_minor_gridlines = False
    if not visible:
        axis.visible = False
        return
    axis.visible = True
    axis.tick_labels.font.size = Pt(8)
    axis.tick_labels.font.color.rgb = ink
    axis.tick_labels.font.name = "Onest"
    axis.format.line.color.rgb = RGBColor(0x3A, 0x4A, 0x46)


def add_appeals_chart(slide, box: dict) -> None:
    """«Обращение клиентов» — горизонтальные полосы, одна серия.

    Длину полосы задаёт количество; доля стоит отдельными подписями справа
    (так же, как в HTML): две разные величины не делят одну ось.
    """
    data = CategoryChartData()
    # PowerPoint рисует горизонтальные полосы снизу вверх — разворачиваем,
    # чтобы порядок строк совпал с исходным макетом.
    rows = list(reversed(DATA["appeals"]))
    data.categories = [name for name, _ in rows]
    data.add_series("Кол-во", [value for _, value in rows])

    frame = slide.shapes.add_chart(
        XL_CHART_TYPE.BAR_CLUSTERED,
        emu(box["x"]), emu(box["y"]), emu(box["w"]), emu(box["h"]), data,
    )
    chart = frame.chart
    chart.has_title = False
    chart.has_legend = False
    chart.font.name = "Onest"

    plot = chart.plots[0]
    plot.gap_width = 55
    plot.vary_by_categories = False

    series = plot.series[0]
    series.format.fill.solid()
    series.format.fill.fore_color.rgb = C_CLIENTS
    series.format.line.fill.background()

    plot.has_data_labels = True
    labels = plot.data_labels
    labels.show_value = True
    labels.position = XL_LABEL_POSITION.INSIDE_END
    labels.font.size = Pt(10)
    labels.font.bold = True
    labels.font.color.rgb = RGBColor(0xEA, 0xFC, 0xFF)
    labels.font.name = "Onest"

    _style_axis(chart.category_axis)
    chart.category_axis.tick_labels.font.size = Pt(9.5)
    chart.category_axis.format.line.fill.background()
    _style_axis(chart.value_axis, visible=False)

    _transparent(chart)


def add_balance_chart(slide, box: dict) -> None:
    """«Внебаланс свыше 5 лет» — три серии в группе на одной шкале."""
    data = CategoryChartData()
    # Подписи периодов в исходном макете отсутствуют. Категории заводим
    # номерами, чтобы данные читались в Excel, но ось категорий прячем —
    # на слайде всё выглядит как в оригинале.
    data.categories = [str(i) for i in range(1, len(DATA["clients"]) + 1)]
    data.add_series("Кол-во клиентов(тыс)", DATA["clients"])
    data.add_series("Кол-во кредитов(тыс.)", DATA["credits"])
    data.add_series("Сумма(млрд. руб.)", DATA["sums"])

    frame = slide.shapes.add_chart(
        XL_CHART_TYPE.COLUMN_CLUSTERED,
        emu(box["x"]), emu(box["y"]), emu(box["w"]), emu(box["h"]), data,
    )
    chart = frame.chart
    chart.has_title = False
    chart.has_legend = False          # легенда нарисована отдельно, как в HTML
    chart.font.name = "Onest"

    plot = chart.plots[0]
    plot.gap_width = 60
    plot.overlap = -10

    for series, color in zip(plot.series, (C_CLIENTS, C_CREDITS, C_SUM)):
        series.format.fill.solid()
        series.format.fill.fore_color.rgb = color
        series.format.line.fill.background()
        labels = series.data_labels
        labels.show_value = True
        labels.position = XL_LABEL_POSITION.OUTSIDE_END
        labels.font.size = Pt(7)
        labels.font.color.rgb = C_INK
        labels.font.name = "Onest"

    _style_axis(chart.category_axis, visible=False)
    _style_axis(chart.value_axis, visible=False)
    _transparent(chart)


def _transparent(chart) -> None:
    """Убрать белую подложку графика — под ним фирменный тёмный фон."""
    for element in (chart._chartSpace, chart._chartSpace.find(qn("c:chart"))):
        if element is None:
            continue
    spPr = chart._chartSpace.find(qn("c:spPr"))
    if spPr is None:
        spPr = chart._chartSpace.makeelement(qn("c:spPr"), {})
        chart._chartSpace.insert(
            list(chart._chartSpace).index(chart._chartSpace.find(qn("c:chart"))) + 1, spPr
        )
    for tag in ("a:noFill", "a:ln"):
        spPr.append(spPr.makeelement(qn(tag), {}))
    spPr.find(qn("a:ln")).append(spPr.makeelement(qn("a:noFill"), {}))

    plot_area = chart._chartSpace.find(qn("c:chart")).find(qn("c:plotArea"))
    plot_spPr = plot_area.makeelement(qn("c:spPr"), {})
    plot_spPr.append(plot_spPr.makeelement(qn("a:noFill"), {}))
    line = plot_spPr.makeelement(qn("a:ln"), {})
    line.append(line.makeelement(qn("a:noFill"), {}))
    plot_spPr.append(line)
    plot_area.append(plot_spPr)


# ---------------------------------------------------------------------------
# Сборка
# ---------------------------------------------------------------------------

def build(build_dir: Path, output: Path) -> None:
    layout = json.loads((build_dir / "layout.json").read_text(encoding="utf-8"))

    presentation = Presentation()
    presentation.slide_width = SLIDE_W
    presentation.slide_height = SLIDE_H
    blank = presentation.slide_layouts[6]        # пустой макет

    for data in layout["slides"]:
        slide = presentation.slides.add_slide(blank)

        slide.shapes.add_picture(
            str(build_dir / data["background"]), 0, 0, SLIDE_W, SLIDE_H
        )

        charts = data.get("charts") or {}
        if charts.get("appeals"):
            add_appeals_chart(slide, charts["appeals"])
        if charts.get("balance"):
            add_balance_chart(slide, charts["balance"])
        for legend in charts.get("legends", []):
            add_legend(slide, legend)

        for block in data["blocks"]:
            add_text(slide, block)

    presentation.save(str(output))
    print(f"{output}  —  {output.stat().st_size / 1024 / 1024:.1f} MB, "
          f"{len(layout['slides'])} слайдов")


if __name__ == "__main__":
    build_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "build")
    output = Path(sys.argv[2] if len(sys.argv) > 2 else "../variant-a-aurora.pptx")
    build(build_dir, output)

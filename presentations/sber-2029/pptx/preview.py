#!/usr/bin/env python3
"""Проверка геометрии PPTX без PowerPoint.

Читает готовый .pptx, берёт из него фон, надписи и рамки диаграмм и рисует
слайд заново теми же шрифтами. Нужно, чтобы увидеть переносы строк и вылеты
текста за карточки до того, как файл откроют на защите.

Это проверка РАСКЛАДКИ, а не точный предпросмотр PowerPoint: сглаживание,
кернинг и отрисовку графиков PowerPoint делает по-своему.

Запуск:  python3 preview.py ../variant-a-aurora.pptx ./preview
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.enum.text import MSO_ANCHOR
from pptx.util import Emu

W, H = 1920, 1080
FONTS = Path(__file__).parent / "fonts-ttf"


def font_file(name: str, bold: bool) -> Path:
    family = "Unbounded" if "Unbounded" in name else "Onest"
    if family == "Unbounded":
        weight = 900 if bold else 500
    else:
        weight = 700 if bold else 400
    return FONTS / f"{family}-{weight}.ttf"


def _paragraph_text(paragraph) -> str:
    """Текст абзаца с учётом мягких переносов <a:br/>."""
    from pptx.oxml.ns import qn

    parts: list[str] = []
    for child in paragraph._p:
        if child.tag == qn("a:r"):
            parts.append(child.find(qn("a:t")).text or "")
        elif child.tag == qn("a:br"):
            parts.append("\n")
    return "".join(parts)


def wrap(draw, text: str, font, width: int) -> list[str]:
    lines: list[str] = []
    for raw in text.split("\n"):
        words, line = raw.split(), ""
        for word in words:
            probe = f"{line} {word}".strip()
            if draw.textlength(probe, font=font) <= width or not line:
                line = probe
            else:
                lines.append(line)
                line = word
        lines.append(line)
    return lines


def render(pptx_path: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    presentation = Presentation(str(pptx_path))
    scale = W / presentation.slide_width

    for index, slide in enumerate(presentation.slides, start=1):
        canvas = Image.new("RGB", (W, H), (4, 8, 11))
        draw = ImageDraw.Draw(canvas)
        overflow: list[str] = []

        for shape in slide.shapes:
            x, y = int(shape.left * scale), int(shape.top * scale)
            w, h = int(shape.width * scale), int(shape.height * scale)

            if shape.shape_type == 13:                       # картинка-фон
                image = Image.open(io.BytesIO(shape.image.blob)).convert("RGB")
                canvas.paste(image.resize((w, h)), (x, y))
                continue

            if shape.has_chart:                              # место графика
                draw.rectangle([x, y, x + w, y + h], outline=(90, 130, 120), width=2)
                draw.text((x + 10, y + 8), "[нативный график PowerPoint]",
                          fill=(120, 170, 160))
                continue

            # Квадратик легенды — автофигура: у неё тоже есть текстовая рамка,
            # поэтому отличаем по наличию текста, а не по has_text_frame.
            if not shape.has_text_frame or not shape.text_frame.text.strip():
                try:
                    draw.rectangle([x, y, x + w, y + h],
                                   fill=tuple(shape.fill.fore_color.rgb))
                except Exception:
                    pass
                continue

            cursor = y
            anchor_middle = shape.text_frame.vertical_anchor == MSO_ANCHOR.MIDDLE
            for paragraph in shape.text_frame.paragraphs:
                text = _paragraph_text(paragraph)
                if not text.strip():
                    continue
                run = paragraph.runs[0]
                size = int((run.font.size.pt if run.font.size else 18) * 2)  # pt -> px сцены
                font = ImageFont.truetype(str(font_file(run.font.name or "Onest",
                                                        bool(run.font.bold))), size)
                color = tuple(run.font.color.rgb) if run.font.color and run.font.color.type \
                    else (230, 240, 236)
                spacing = (paragraph.line_spacing or 1.3) * size
                lines = ([text] if not shape.text_frame.word_wrap
                         else wrap(draw, text, font, w))
                top = cursor
                if anchor_middle:
                    top = y + (h - len(lines) * spacing) / 2

                for line in lines:
                    draw.text((x, top), line, font=font, fill=color)
                    top += spacing
                cursor = top + (0 if anchor_middle else size * 0.4)

            if cursor > y + h + 6:
                overflow.append(f"{shape.text_frame.text[:34]!r} +{int(cursor - y - h)}px")

        canvas.save(out_dir / f"slide{index}.png")
        note = f"  ПЕРЕПОЛНЕНИЕ: {'; '.join(overflow)}" if overflow else ""
        print(f"слайд {index}: {len(slide.shapes)} объектов{note}")


if __name__ == "__main__":
    render(Path(sys.argv[1]), Path(sys.argv[2] if len(sys.argv) > 2 else "preview"))

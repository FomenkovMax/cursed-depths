#!/usr/bin/env python3
"""Демо-видео работы скриптов списания на вымышленных данных.

Ничего не придумывает: команды реально выполняются, в видео идёт их настоящий
stdout. Единственное, что «постановочно», — эффект печати команды в терминале
и статичные превью получившихся xlsx (их тоже строим из настоящих файлов,
которые только что сгенерировали команды).

Как это работает:
  1. Реально запускаем make_test_data.py, run_sid.py, run_st46.py и
     pytest — с cwd внутри spisanie/, как в README.
  2. Рисуем кадры «терминала» через Pillow: печать команды посимвольно,
     вывод построчно — как в реальном шелле.
  3. Дополнительно — два кадра с превью получившихся xlsx: читаем реальные
     файлы через openpyxl и рисуем таблицу теми же цветами, что и в
     report.py (DECISION_FILL/HEADER_FILL), чтобы не переизобретать палитру.
  4. Каждый кадр получает свою длительность (без дублирования на диск —
     ffmpeg concat-demuxer сам растягивает кадр на нужное время), затем
     кодируем в mp4 статическим ffmpeg из пакета imageio-ffmpeg.

Запуск:  python3 make_demo_video.py [итоговый.mp4]
Нужно:   pip install pillow imageio-ffmpeg openpyxl
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
MONO = FONT_DIR / "DejaVuSansMono.ttf"
MONO_BOLD = FONT_DIR / "DejaVuSansMono-Bold.ttf"

W, H = 1600, 900
FPS = 30

# Палитра — та же, что в variant-a-aurora (тёмный фон + мятный акцент),
# чтобы демо-ролик выглядел частью того же комплекта, что и презентация.
BG = (5, 9, 8)
PANEL = (10, 16, 14)
BORDER_C = (32, 48, 42)
ACCENT = (53, 214, 160)      # --mint
PROMPT_C = (63, 224, 255)    # --cyan
TEXT = (219, 232, 227)
DIM = (130, 150, 143)
GOOD = (110, 214, 150)       # Списание
BAD = (232, 130, 120)        # Отказ
WARN = (230, 190, 110)       # Ручное рассмотрение

# Те же цвета, что в spisanie/spisanie/report.py — единый источник правды
# для того, «как это выглядит в реальном Excel».
XLSX_HEADER = (0x1F, 0x3B, 0x2C)
XLSX_FILL = {
    "Списание": (0xDF, 0xF3, 0xE3),
    "Отказ": (0xFD, 0xE7, 0xE7),
    "Ручное рассмотрение": (0xFF, 0xF4, 0xD6),
}
XLSX_TEXT_DARK = (20, 30, 26)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(MONO_BOLD if bold else MONO), size)


# ---------------------------------------------------------------------------
# 1. Реальный прогон команд
# ---------------------------------------------------------------------------

@dataclass
class Command:
    cwd: Path
    argv: list[str]
    caption: str
    output: str = ""

    @property
    def line(self) -> str:
        # В кадре показываем «python3», а не полный путь sys.executable —
        # выполняется всё равно точным интерпретатором, просто некрасиво в видео.
        display = ["python3" if a == sys.executable else a for a in self.argv]
        return "$ " + " ".join(display)


def run(cmd: Command) -> Command:
    result = subprocess.run(
        cmd.argv, cwd=cmd.cwd, capture_output=True, text=True, timeout=180
    )
    text = result.stdout.strip()
    if result.stderr.strip():
        text = (text + "\n" + result.stderr.strip()).strip()
    cmd.output = text
    return cmd


def prepare() -> list[Command]:
    """Пересоздать тестовые данные с нуля и реально прогнать оба скрипта."""
    demo_dir = ROOT / "test_data"
    if demo_dir.exists():
        shutil.rmtree(demo_dir)

    commands = [
        Command(ROOT, [sys.executable, "make_test_data.py", "test_data"],
                "Генерируем вымышленные тестовые данные"),
        Command(ROOT, [sys.executable, "run_sid.py", "test_data/reestr_sid.xlsx",
                       "--on-date", "01.09.2026", "-o", "test_data/out_sid.xlsx"],
                "Скрипт 1 — списание по истечении срока предъявления ИД"),
        Command(ROOT, [sys.executable, "run_st46.py", "test_data/reestr_st46.xlsx",
                       "test_data/postanovleniya", "-o", "test_data/out_st46.xlsx"],
                "Скрипт 2 — списание по ст. 46 ФЗ-229"),
        Command(ROOT, [sys.executable, "-m", "pytest", "tests/", "-q"],
                "Прогоняем тесты"),
    ]
    for c in commands:
        run(c)
        print(f"[real-run] {c.line}\n{c.output}\n")
    return commands


# ---------------------------------------------------------------------------
# 2. Кадры «терминала»
# ---------------------------------------------------------------------------

@dataclass
class Frame:
    image: Image.Image
    seconds: float


class Reel:
    """Копит кадры видео и параллельно ведёт растущий буфер строк терминала —
    так следующая команда допечатывается под уже показанным выводом, как
    в настоящем шелле, а не с чистого листа."""

    def __init__(self) -> None:
        self.frames: list[Frame] = []
        self.lines: list[tuple[str, tuple[int, int, int]]] = []

        # геометрия терминальной панели
        self.pad = 64            # отступ панели от краёв кадра
        self.text_x = self.pad + 32
        self.title_bar_h = 46
        self.body_top = self.pad + self.title_bar_h + 20   # с запасом от заголовка окна
        self.line_h = 30
        self.font_size = 19
        self.font = font(self.font_size)
        self.font_b = font(self.font_size, bold=True)

    # --- низкоуровневая отрисовка одного кадра терминала ---
    def _canvas(self) -> tuple[Image.Image, ImageDraw.ImageDraw]:
        img = Image.new("RGB", (W, H), BG)
        draw = ImageDraw.Draw(img)

        x0, y0, x1, y1 = self.pad, self.pad, W - self.pad, H - self.pad
        draw.rounded_rectangle([x0, y0, x1, y1], radius=18, fill=PANEL, outline=BORDER_C, width=2)

        # титульная плашка окна, как у macOS-терминала
        draw.rounded_rectangle([x0, y0, x1, y0 + 46], radius=18, fill=(14, 22, 19))
        draw.rectangle([x0, y0 + 28, x1, y0 + 46], fill=(14, 22, 19))
        for i, c in enumerate([(232, 106, 96), (240, 189, 79), (97, 194, 112)]):
            draw.ellipse([x0 + 22 + i * 26, y0 + 16, x0 + 22 + i * 26 + 14, y0 + 30], fill=c)
        draw.text((x0 + (x1 - x0) / 2, y0 + 23), "spisanie — терминал",
                  font=self.font, fill=DIM, anchor="mm")
        return img, draw

    def _wrapped(self, text: str, max_chars: int) -> list[str]:
        out: list[str] = []
        for raw in text.split("\n"):
            if not raw:
                out.append("")
                continue
            while len(raw) > max_chars:
                out.append(raw[:max_chars])
                raw = "  " + raw[max_chars:]
            out.append(raw)
        return out

    def _render(self, extra: list[tuple[str, tuple[int, int, int]]]) -> Image.Image:
        img, draw = self._canvas()
        body_h = (H - self.pad) - self.body_top
        visible = max(1, body_h // self.line_h)

        all_lines = self.lines + extra
        shown = all_lines[-visible:]

        y = self.body_top
        for text, color in shown:
            draw.text((self.text_x, y), text, font=self.font, fill=color)
            y += self.line_h
        return img

    # --- сценарии ---
    def caption(self, text: str, seconds: float = 1.4) -> None:
        """Заголовок-подсказка над командой — не часть терминала, отдельный кадр."""
        img, draw = self._canvas()
        y = self.body_top
        draw.text((self.text_x, y), "»", font=self.font_b, fill=ACCENT)
        draw.text((self.text_x + 26, y), text, font=self.font_b, fill=ACCENT)
        # текущий буфер терминала показываем под подсказкой затемнённым
        y += self.line_h + 12
        for t, c in self.lines[-10:]:
            faded = tuple(int(v * 0.35 + BG[i] * 0.65) for i, v in enumerate(c))
            draw.text((self.text_x, y), t, font=self.font, fill=faded)
            y += self.line_h
        self.frames.append(Frame(img, seconds))

    def type_command(self, text: str, cps: float = 24) -> None:
        """Печать команды посимвольно, курсор мигает в конце."""
        step = 1 / cps
        for i in range(1, len(text) + 1):
            partial = [(text[:i] + "▏", PROMPT_C)]
            self.frames.append(Frame(self._render(partial), step))
        self.frames.append(Frame(self._render([(text, PROMPT_C)]), 0.35))
        self.lines.append((text, PROMPT_C))

    def reveal_output(self, text: str, per_line: float = 0.09, hold: float = 1.6) -> None:
        max_chars = (W - self.pad - self.text_x) // self._char_w()
        lines = self._wrapped(text, max_chars) if text else []
        for line in lines:
            color = self._colorize(line)
            self.lines.append((line, color))
            self.frames.append(Frame(self._render([]), per_line))
        self.lines.append(("", TEXT))
        if lines:
            self.frames.append(Frame(self._render([]), hold))

    def _char_w(self) -> int:
        bbox = self.font.getbbox("M")
        return max(1, bbox[2] - bbox[0])

    @staticmethod
    def _colorize(line: str) -> tuple[int, int, int]:
        low = line.strip().lower()
        if low.startswith("списание:") or " passed" in low:
            return GOOD
        if low.startswith("отказ:") or "failed" in low:
            return BAD
        if low.startswith("ручное рассмотрение:") or low.startswith("не прочитано") \
                or low.startswith("постановления без строки"):
            return WARN
        if line.startswith("  "):
            return DIM
        return TEXT

    def title_card(self, lines: list[tuple[str, tuple[int, int, int]]], seconds: float) -> None:
        img = Image.new("RGB", (W, H), BG)
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle([0, 0, W, 6], fill=ACCENT)
        y = H / 2 - (len(lines) * 50) / 2
        for i, (text, color) in enumerate(lines):
            size = 44 if i == 0 else 22
            f = font(size, bold=(i == 0))
            draw.text((W / 2, y), text, font=f, fill=color, anchor="mm")
            y += 58 if i == 0 else 34
        self.frames.append(Frame(img, seconds))

    def xlsx_preview(self, path: Path, sheet: str, seconds: float = 4.0) -> None:
        """Кадр с реальными строками только что сгенерированного xlsx."""
        from openpyxl import load_workbook

        wb = load_workbook(path)
        ws = wb[sheet]
        headers = [c.value for c in ws[1]]
        want = ["Строка", "ФИО Клиента", "Решение", "Обоснование"]
        idx = [headers.index(h) for h in want]
        rows = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            rows.append([row[i] for i in idx])
            if len(rows) >= 9:
                break

        img = Image.new("RGB", (W, H), BG)
        draw = ImageDraw.Draw(img)
        x0, y0, x1, y1 = 70, 70, W - 70, H - 70
        draw.rounded_rectangle([x0, y0, x1, y1], radius=16, fill=(250, 250, 247))

        title_f = font(22, bold=True)
        draw.text((x0 + 26, y0 + 22), f"{path.name} — «{sheet}»", font=title_f, fill=(20, 20, 20))

        col_x = [x0 + 26, x0 + 110, x0 + 520, x0 + 720, x1 - 26]
        widths = [col_x[i + 1] - col_x[i] - 14 for i in range(4)]
        top = y0 + 70
        row_h = (y1 - 40 - top) / (len(rows) + 1)

        hdr_f = font(15, bold=True)
        cell_f = font(15)
        draw.rectangle([x0 + 16, top, x1 - 16, top + row_h], fill=XLSX_HEADER)
        for cx, w, label in zip(col_x, widths, want):
            draw.text((cx, top + row_h / 2), label, font=hdr_f, fill=(255, 255, 255), anchor="lm")

        y = top + row_h
        for row in rows:
            fill = XLSX_FILL.get(row[2], (255, 255, 255))
            draw.rectangle([x0 + 16, y, x1 - 16, y + row_h], fill=fill,
                            outline=(220, 222, 216))
            for cx, w, val in zip(col_x, widths, row):
                text = str(val)
                # обрезаем длинный текст обоснования под ширину колонки
                while draw.textlength(text, font=cell_f) > w and len(text) > 3:
                    text = text[:-2]
                if text != str(val):
                    text = text[:-1] + "…"
                draw.text((cx, y + row_h / 2), text, font=cell_f, fill=XLSX_TEXT_DARK, anchor="lm")
            y += row_h

        self.frames.append(Frame(img, seconds))


# ---------------------------------------------------------------------------
# 3. Сборка сценария
# ---------------------------------------------------------------------------

def build_reel(commands: list[Command]) -> Reel:
    make_data, run_sid, run_st46, run_tests = commands
    reel = Reel()

    reel.title_card(
        [
            ("Скрипты списания задолженности", ACCENT),
            ("срок исковой давности · ст. 46 ФЗ-229", DIM),
            ("демо-прогон на вымышленных данных", DIM),
        ],
        seconds=3.0,
    )

    reel.caption(make_data.caption)
    reel.type_command(make_data.line)
    reel.reveal_output(make_data.output)

    reel.caption(run_sid.caption)
    reel.type_command(run_sid.line, cps=20)
    reel.reveal_output(run_sid.output)

    reel.xlsx_preview(ROOT / "test_data" / "out_sid.xlsx", "Реестр решений")

    reel.caption(run_st46.caption)
    reel.type_command(run_st46.line, cps=18)
    reel.reveal_output(run_st46.output)

    reel.xlsx_preview(ROOT / "test_data" / "out_st46.xlsx", "Реестр решений")

    reel.caption("Автотесты — 33 сценария, включая границы «ровно 3 года» и «ровно 2 месяца»")
    reel.type_command(run_tests.line, cps=26)
    reel.reveal_output(run_tests.output, hold=2.4)

    reel.title_card(
        [
            ("spisanie/", ACCENT),
            ("README.md — как запускать и что менять", DIM),
        ],
        seconds=2.6,
    )
    return reel


# ---------------------------------------------------------------------------
# 4. Кодирование в mp4
# ---------------------------------------------------------------------------

def encode(reel: Reel, output: Path) -> None:
    import imageio_ffmpeg

    work = ROOT / ".demo_frames"
    if work.exists():
        shutil.rmtree(work)
    work.mkdir()

    list_path = work / "list.txt"
    with list_path.open("w", encoding="utf-8") as listing:
        for i, frame in enumerate(reel.frames):
            path = work / f"f{i:05d}.png"
            frame.image.save(path)
            listing.write(f"file '{path.name}'\nduration {frame.seconds:.3f}\n")
        # ffmpeg concat-demuxer требует повторить последний файл без duration
        listing.write(f"file 'f{len(reel.frames) - 1:05d}.png'\n")

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run(
        [
            ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", str(list_path),
            "-vsync", "cfr", "-r", str(FPS),
            "-vf", "format=yuv420p",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-movflags", "+faststart",
            str(output),
        ],
        check=True, capture_output=True, text=True,
    )
    shutil.rmtree(work)


def main() -> int:
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "demo.mp4"

    print("== Реальный прогон команд ==")
    commands = prepare()

    print("== Рендер кадров ==")
    reel = build_reel(commands)
    print(f"кадров: {len(reel.frames)}, "
          f"длительность: {sum(f.seconds for f in reel.frames):.1f} с")

    print("== Кодирование в mp4 ==")
    encode(reel, output)

    size_mb = output.stat().st_size / 1e6
    print(f"Готово: {output} ({size_mb:.1f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

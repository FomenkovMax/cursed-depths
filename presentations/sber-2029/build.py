#!/usr/bin/env python3
"""Сборка автономных HTML-презентаций.

Берёт шаблон из src/, подставляет вместо плейсхолдеров:
  /*{{FONTS}}*/          — @font-face со шрифтами, вшитыми как base64
  {{ASSET:имя.webp}}     — картинку как data-URI

На выходе — один HTML-файл, который открывается без интернета и без
внешних файлов рядом. Это важно: презентацию показывают с корпоративного
ноутбука, где fonts.googleapis.com может быть недоступен.

Запуск:  python3 build.py
"""

import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
ASSETS = ROOT / "assets"
FONTS = ROOT / "fonts"

# Какой шаблон какие шрифты получает
TARGETS = {
    "variant-a.html": ("variant-a-aurora.html", ["Onest", "Unbounded"]),
    "variant-b.html": ("variant-b-executive.html", ["GolosText", "PlayfairDisplay"]),
}

MIME = {".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml"}


def data_uri(path: pathlib.Path) -> str:
    mime = MIME.get(path.suffix.lower(), "application/octet-stream")
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def build(template_name: str, out_name: str, families: list[str]) -> None:
    html = (SRC / template_name).read_text(encoding="utf-8")

    fonts_css = "\n".join(
        (FONTS / f"inline_{family}.css").read_text(encoding="utf-8") for family in families
    )
    html = html.replace("/*{{FONTS}}*/", fonts_css)

    missing = []

    def swap(match: re.Match) -> str:
        asset = ASSETS / match.group(1)
        if not asset.exists():
            missing.append(match.group(1))
            return match.group(0)
        return data_uri(asset)

    html = re.sub(r"\{\{ASSET:([^}]+)\}\}", swap, html)

    if missing:
        sys.exit(f"Нет файлов в assets/: {', '.join(sorted(set(missing)))}")
    if "{{" in html:
        sys.exit(f"В {out_name} остались незаполненные плейсхолдеры")

    out = ROOT / out_name
    out.write_text(html, encoding="utf-8")
    print(f"{out_name}  —  {len(html.encode()) / 1024:.0f} KB")


if __name__ == "__main__":
    for template, (out_name, families) in TARGETS.items():
        if (SRC / template).exists():
            build(template, out_name, families)

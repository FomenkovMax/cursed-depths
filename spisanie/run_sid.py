#!/usr/bin/env python3
"""Скрипт 1: списание по истечении срока предъявления ИД (исковой давности).

Вход  — xlsx-реестр (Номер ИД, Номер ИП, Дата окончания, Дата ИД, ФИО клиента,
        Дата рождения клиента, Код кредита, Код клиента).
Выход — xlsx с мотивированными суждениями и решениями по каждой строке.

Примеры:
    python3 run_sid.py реестр.xlsx
    python3 run_sid.py реестр.xlsx -o суждения.xlsx --on-date 01.09.2026
"""

from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

from spisanie.common import OTKAZ, RUCHNIK, SPISANIE, RegistryError, parse_date, read_registry
from spisanie.report import write_report
from spisanie.sid import REQUIRED, SROK_LET, decide_all


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Мотивированные суждения: списание по истечении срока предъявления ИД",
    )
    parser.add_argument("registry", type=Path, help="xlsx-реестр")
    parser.add_argument("-o", "--output", type=Path, help="файл результата (.xlsx)")
    parser.add_argument(
        "--on-date",
        help="отчётная дата в формате ДД.ММ.ГГГГ (по умолчанию — сегодня). "
        "На эту дату считается истечение трёхлетнего срока.",
    )
    args = parser.parse_args(argv)

    on_date = dt.date.today()
    if args.on_date:
        parsed = parse_date(args.on_date)
        if parsed is None:
            print(f"Не удалось разобрать отчётную дату: {args.on_date!r}", file=sys.stderr)
            return 2
        on_date = parsed

    if not args.registry.exists():
        print(f"Файл не найден: {args.registry}", file=sys.stderr)
        return 2

    try:
        rows = read_registry(args.registry, REQUIRED)
    except RegistryError as exc:
        print(f"Ошибка реестра: {exc}", file=sys.stderr)
        return 2

    if not rows:
        print("В реестре нет строк с данными.", file=sys.stderr)
        return 2

    decisions = decide_all(rows, on_date)

    output = args.output or args.registry.with_name(
        args.registry.stem + "_суждения_ИД.xlsx"
    )
    write_report(
        output,
        decisions,
        REQUIRED,
        {
            "title": "Списание по истечении срока предъявления ИД",
            "Исходный реестр": args.registry.name,
            "Отчётная дата": on_date.strftime("%d.%m.%Y"),
            "Критерий": f"с даты окончания ИП прошло более {SROK_LET} лет",
            "Сформирован": dt.datetime.now().strftime("%d.%m.%Y %H:%M"),
        },
    )

    counts = {name: sum(1 for d in decisions if d.decision == name)
              for name in (SPISANIE, OTKAZ, RUCHNIK)}
    print(f"Обработано строк: {len(decisions)}")
    for name, count in counts.items():
        print(f"  {name}: {count}")
    print(f"Результат: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

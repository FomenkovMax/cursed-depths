#!/usr/bin/env python3
"""Скрипт 2: списание по ст. 46 ФЗ-229.

Вход  — xlsx-реестр (те же колонки + Дата возбуждения ИП)
        и папка с постановлениями об окончании ИП (.pdf / .docx / .txt).
Выход — xlsx с мотивированными суждениями и решениями по каждой строке.

Постановление сопоставляется со строкой реестра по номеру исполнительного
производства.

Примеры:
    python3 run_st46.py реестр.xlsx ./постановления
    python3 run_st46.py реестр.xlsx ./постановления -o суждения.xlsx
"""

from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

from spisanie.common import OTKAZ, RUCHNIK, SPISANIE, RegistryError, read_registry
from spisanie.postanovlenie import load_folder
from spisanie.report import write_report
from spisanie.st46 import REQUIRED, SROK_MESYATSEV, decide_all, unmatched_documents


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Мотивированные суждения: списание по ст. 46 ФЗ-229",
    )
    parser.add_argument("registry", type=Path, help="xlsx-реестр")
    parser.add_argument("documents", type=Path, help="папка с постановлениями об окончании ИП")
    parser.add_argument("-o", "--output", type=Path, help="файл результата (.xlsx)")
    args = parser.parse_args(argv)

    if not args.registry.exists():
        print(f"Файл не найден: {args.registry}", file=sys.stderr)
        return 2
    if not args.documents.is_dir():
        print(f"Папка не найдена: {args.documents}", file=sys.stderr)
        return 2

    try:
        rows = read_registry(args.registry, REQUIRED)
    except RegistryError as exc:
        print(f"Ошибка реестра: {exc}", file=sys.stderr)
        return 2

    if not rows:
        print("В реестре нет строк с данными.", file=sys.stderr)
        return 2

    documents, broken = load_folder(args.documents)
    decisions = decide_all(rows, documents)
    orphans = unmatched_documents(rows, documents)

    output = args.output or args.registry.with_name(
        args.registry.stem + "_суждения_ст46.xlsx"
    )
    write_report(
        output,
        decisions,
        REQUIRED,
        {
            "title": "Списание по ст. 46 ФЗ-229",
            "Исходный реестр": args.registry.name,
            "Папка с постановлениями": str(args.documents),
            "Постановлений прочитано": len(documents),
            "Файлов не прочитано": len(broken),
            "Постановлений без строки в реестре": len(orphans),
            "Критерий": f"ИП велось более {SROK_MESYATSEV} месяцев, реквизиты сверены, "
                        "имущество и доходы отсутствуют",
            "Сформирован": dt.datetime.now().strftime("%d.%m.%Y %H:%M"),
        },
    )

    counts = {name: sum(1 for d in decisions if d.decision == name)
              for name in (SPISANIE, OTKAZ, RUCHNIK)}
    print(f"Обработано строк: {len(decisions)}")
    for name, count in counts.items():
        print(f"  {name}: {count}")
    print(f"Постановлений прочитано: {len(documents)}")

    if broken:
        print(f"Не прочитано файлов: {len(broken)}")
        for path, why in broken:
            print(f"  {path.name}: {why}")
    if orphans:
        print(f"Постановления без строки в реестре: {len(orphans)}")
        for document in orphans:
            print(f"  {document.path.name} (ИП {document.ip_nomer})")

    print(f"Результат: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

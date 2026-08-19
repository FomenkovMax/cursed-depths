"""Скрипт 1. Списание по истечении срока предъявления ИД (исковой давности).

Правило: если с даты окончания исполнительного производства прошло БОЛЕЕ трёх
лет — задолженность признаётся безнадёжной. Если не прошло — отказ.
Всё, что не удалось проверить (пустые/битые даты, дубли, аномалии) — на ручное
рассмотрение, а не в автоматическое решение.
"""

from __future__ import annotations

import datetime as dt

from . import templates
from .common import (
    OTKAZ,
    RUCHNIK,
    SPISANIE,
    Decision,
    Row,
    date_plus_years,
    find_duplicates,
    fmt,
)

# Поля, без которых нельзя ни принять решение, ни составить суждение.
REQUIRED = [
    "id_nomer",
    "ip_nomer",
    "ip_data_okonchaniya",
    "id_data",
    "fio",
    "data_rozhdeniya",
    "kod_kredita",
    "kod_klienta",
]

SROK_LET = 3


def _manual(row: Row, code: str, problems: list[str]) -> Decision:
    text = "\n".join(f"— {p}" for p in problems)
    return Decision(
        row=row,
        decision=RUCHNIK,
        reason_code=code,
        reason="; ".join(problems),
        judgment=templates.MANUAL.format(
            row=row.number, fio=row.text("fio") or "—", problems=text
        ),
    )


def decide_row(row: Row, on_date: dt.date, duplicate_note: str | None = None) -> Decision:
    """Решение по одной строке реестра."""
    if duplicate_note:
        return _manual(row, "DUP", [duplicate_note])
    if row.problems:
        return _manual(row, "DATA", row.problems)

    okonchanie = row.date("ip_data_okonchaniya")
    id_data = row.date("id_data")
    dr = row.date("data_rozhdeniya")

    # Аномалии, при которых считать срок бессмысленно.
    anomalies: list[str] = []
    if okonchanie > on_date:
        anomalies.append(
            f"дата окончания ИП {fmt(okonchanie)} позже отчётной даты {fmt(on_date)}"
        )
    if id_data > okonchanie:
        anomalies.append(
            f"дата ИД {fmt(id_data)} позже даты окончания ИП {fmt(okonchanie)}"
        )
    if dr >= okonchanie:
        anomalies.append(f"дата рождения {fmt(dr)} не раньше даты окончания ИП")
    if anomalies:
        return _manual(row, "ANOMALY", anomalies)

    predelnaya = date_plus_years(okonchanie, SROK_LET)
    proshlo = templates.period_text(okonchanie, on_date)

    context = {
        "fio": row.text("fio"),
        "dr": fmt(dr),
        "kod_klienta": row.text("kod_klienta"),
        "kod_kredita": row.text("kod_kredita"),
        "id_nomer": row.text("id_nomer"),
        "id_data": fmt(id_data),
        "ip_nomer": row.text("ip_nomer"),
        "ip_okonchanie": fmt(okonchanie),
        "let": proshlo,
        "on_date": fmt(on_date),
        "predelnaya_data": fmt(predelnaya),
    }
    extra = {
        "Прошло с окончания ИП": proshlo,
        "Предельная дата предъявления ИД": fmt(predelnaya),
    }

    # «Более трёх лет» — строго больше: ровно в предельную дату срок ещё не истёк.
    if on_date > predelnaya:
        return Decision(
            row=row,
            decision=SPISANIE,
            reason_code="SID_OK",
            reason=(
                f"с окончания ИП ({fmt(okonchanie)}) прошло {proshlo} — "
                f"более {SROK_LET} лет"
            ),
            judgment=templates.SID_POSITIVE.format(**context),
            extra=extra,
        )

    return Decision(
        row=row,
        decision=OTKAZ,
        reason_code="SID_NOT_YET",
        reason=(
            f"с окончания ИП ({fmt(okonchanie)}) прошло {proshlo} — "
            f"{SROK_LET}-летний срок не истёк, предельная дата {fmt(predelnaya)}"
        ),
        judgment=templates.SID_NEGATIVE.format(**context),
        extra=extra,
    )


def decide_all(rows: list[Row], on_date: dt.date) -> list[Decision]:
    duplicates = find_duplicates(rows)
    return [decide_row(row, on_date, duplicates.get(row.number)) for row in rows]

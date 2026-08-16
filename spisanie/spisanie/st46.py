"""Скрипт 2. Списание по ст. 46 ФЗ-229.

Положительное решение принимается, только если выполнено ВСЁ:
  1. по строке реестра найдено постановление об окончании ИП;
  2. реквизиты постановления совпадают с реестром (ИП, ФИО, дата рождения,
     даты возбуждения и окончания);
  3. фактическая длительность ИП — более двух месяцев;
  4. основание — ст. 46 ФЗ-229 и в постановлении подтверждено отсутствие
     имущества и доходов.
Любое невыполненное условие даёт отрицательное решение с перечнем расхождений.
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
    date_plus_months,
    find_duplicates,
    fmt,
    norm_fio,
    norm_ip_nomer,
)
from .postanovlenie import Postanovlenie

REQUIRED = [
    "id_nomer",
    "ip_nomer",
    "ip_data_okonchaniya",
    "ip_data_vozbuzhdeniya",
    "id_data",
    "fio",
    "data_rozhdeniya",
    "kod_kredita",
    "kod_klienta",
]

SROK_MESYATSEV = 2
DOPUSTIMYE_PUNKTY = {3, 4}


def fio_match(registry: str, document: str) -> tuple[bool, bool]:
    """Сравнить ФИО из реестра и из постановления.

    В постановлении должник обычно указан в родительном падеже
    («в отношении Иванова Ивана Ивановича»), в реестре — в именительном.
    Возвращает (совпало, потребовался учёт склонения).
    """
    left, right = norm_fio(registry), norm_fio(document)
    if left == right:
        return True, False

    left_words, right_words = left.split(), right.split()
    if len(left_words) != len(right_words) or not left_words:
        return False, False

    for a, b in zip(left_words, right_words):
        if a == b:
            continue
        common = 0
        for x, y in zip(a, b):
            if x != y:
                break
            common += 1

        # Падежное окончание — это короткий хвост, а не другое слово.
        # Общая основа должна покрывать почти оба слова целиком, иначе
        # «Иванов» и «Иваненко» (common = «иван») сойдут за одно лицо.
        shorter, longer = min(len(a), len(b)), max(len(a), len(b))
        minimum = 3 if shorter <= 4 else 4          # «Илья» -> «Ильи»
        if common < minimum or common < shorter - 2 or common < longer - 3:
            return False, False
    return True, True


def _manual(row: Row, code: str, problems: list[str]) -> Decision:
    return Decision(
        row=row,
        decision=RUCHNIK,
        reason_code=code,
        reason="; ".join(problems),
        judgment=templates.MANUAL.format(
            row=row.number,
            fio=row.text("fio") or "—",
            problems="\n".join(f"— {p}" for p in problems),
        ),
    )


def decide_row(
    row: Row,
    documents: dict[str, Postanovlenie],
    duplicate_note: str | None = None,
) -> Decision:
    """Решение по одной строке реестра."""
    if duplicate_note:
        return _manual(row, "DUP", [duplicate_note])
    if row.problems:
        return _manual(row, "DATA", row.problems)

    key = norm_ip_nomer(row.raw.get("ip_nomer"))
    document = documents.get(key)
    if document is None:
        return _manual(
            row,
            "NO_DOC",
            [f"не найдено постановление об окончании ИП № {row.text('ip_nomer')}"],
        )

    rashozhdeniya: list[str] = []
    notes: list[str] = []

    # 1. Сверка реквизитов
    matched, declension = fio_match(row.text("fio"), document.fio or "")
    if not matched:
        rashozhdeniya.append(
            f"ФИО не совпадает: в реестре «{row.text('fio')}», "
            f"в постановлении «{document.fio or '—'}»"
        )
    elif declension:
        notes.append(f"ФИО сверено с учётом склонения: «{document.fio}»")

    if document.data_rozhdeniya != row.date("data_rozhdeniya"):
        rashozhdeniya.append(
            f"дата рождения не совпадает: реестр {fmt(row.date('data_rozhdeniya'))}, "
            f"постановление {fmt(document.data_rozhdeniya)}"
        )

    if document.data_vozbuzhdeniya != row.date("ip_data_vozbuzhdeniya"):
        rashozhdeniya.append(
            f"дата возбуждения ИП не совпадает: реестр "
            f"{fmt(row.date('ip_data_vozbuzhdeniya'))}, "
            f"постановление {fmt(document.data_vozbuzhdeniya)}"
        )

    if document.data_okonchaniya != row.date("ip_data_okonchaniya"):
        rashozhdeniya.append(
            f"дата окончания ИП не совпадает: реестр "
            f"{fmt(row.date('ip_data_okonchaniya'))}, "
            f"постановление {fmt(document.data_okonchaniya)}"
        )

    for name in document.missing:
        rashozhdeniya.append(f"в постановлении не найдено: {name}")

    # 2. Длительность ИП — считаем по датам из постановления, если они есть,
    #    иначе по реестру (тогда расхождение уже зафиксировано выше).
    start = document.data_vozbuzhdeniya or row.date("ip_data_vozbuzhdeniya")
    end = document.data_okonchaniya or row.date("ip_data_okonchaniya")
    dlitelnost = "—"
    if start and end:
        if end < start:
            rashozhdeniya.append(
                f"дата окончания ИП {fmt(end)} раньше даты возбуждения {fmt(start)}"
            )
        else:
            dlitelnost = templates.period_text(start, end)
            # «Более двух месяцев» — строго больше.
            if end <= date_plus_months(start, SROK_MESYATSEV):
                rashozhdeniya.append(
                    f"ИП велось {dlitelnost} — не более {SROK_MESYATSEV} месяцев "
                    f"(с {fmt(start)} по {fmt(end)})"
                )

    # 3. Основание окончания и отсутствие имущества/доходов
    if not document.st46:
        rashozhdeniya.append("в постановлении нет ссылки на ст. 46 ФЗ-229")
    elif document.punkt is None:
        notes.append("пункт ч. 1 ст. 46 в постановлении явно не указан")
    elif document.punkt not in DOPUSTIMYE_PUNKTY:
        rashozhdeniya.append(
            f"основание окончания — п. {document.punkt} ч. 1 ст. 46, "
            f"списание применимо к пп. {', '.join(map(str, sorted(DOPUSTIMYE_PUNKTY)))}"
        )

    if not document.net_imushchestva:
        rashozhdeniya.append(
            "в постановлении не подтверждено отсутствие имущества и доходов должника"
        )

    osnovanie = (
        f"п. {document.punkt} ч. 1 ст. 46 ФЗ-229" if document.punkt else "ст. 46 ФЗ-229"
    )
    extra = {
        "Файл постановления": document.path.name,
        "Длительность ИП": dlitelnost,
        "Основание по постановлению": osnovanie,
        "Примечания сверки": "; ".join(notes),
    }

    if rashozhdeniya:
        return Decision(
            row=row,
            decision=OTKAZ,
            reason_code="ST46_MISMATCH",
            reason="; ".join(rashozhdeniya),
            judgment=templates.ST46_NEGATIVE.format(
                fio=row.text("fio"),
                dr=fmt(row.date("data_rozhdeniya")),
                kod_klienta=row.text("kod_klienta"),
                kod_kredita=row.text("kod_kredita"),
                id_nomer=row.text("id_nomer"),
                id_data=fmt(row.date("id_data")),
                ip_nomer=row.text("ip_nomer"),
                file=document.path.name,
                rashozhdeniya="\n".join(f"— {r}" for r in rashozhdeniya),
            ),
            extra=extra,
        )

    return Decision(
        row=row,
        decision=SPISANIE,
        reason_code="ST46_OK",
        reason=(
            f"реквизиты сверены с постановлением, ИП велось {dlitelnost}, "
            f"имущество и доходы отсутствуют"
        ),
        judgment=templates.ST46_POSITIVE.format(
            fio=row.text("fio"),
            dr=fmt(row.date("data_rozhdeniya")),
            kod_klienta=row.text("kod_klienta"),
            kod_kredita=row.text("kod_kredita"),
            id_nomer=row.text("id_nomer"),
            id_data=fmt(row.date("id_data")),
            ip_nomer=row.text("ip_nomer"),
            ip_vozbuzhdenie=fmt(start),
            ip_okonchanie=fmt(end),
            dlitelnost=dlitelnost,
            osnovanie=osnovanie,
        ),
        extra=extra,
    )


def decide_all(rows: list[Row], documents: dict[str, Postanovlenie]) -> list[Decision]:
    duplicates = find_duplicates(rows)
    return [decide_row(row, documents, duplicates.get(row.number)) for row in rows]


def unmatched_documents(
    rows: list[Row], documents: dict[str, Postanovlenie]
) -> list[Postanovlenie]:
    """Постановления, которым не нашлось строки в реестре."""
    used = {norm_ip_nomer(row.raw.get("ip_nomer")) for row in rows}
    return [doc for key, doc in documents.items() if key not in used]

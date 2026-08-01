"""Генерирует пресеты src/presets/mtt/*.ts из charts/mtt/ffstart.json.

    python tools/extract_ffstart.py charts/mtt/*.png
    python tools/gen_mtt.py

TS-файлы именно генерируются, а не набираются руками: при ручном переносе
чартов в проекте уже ловилась опечатка (дубль A6o в RFI BU), а здесь 27
чартов по 169 ячеек.

Чарты FF START бинарные — рука играется ровно одним действием, долей и
составных ячеек нет. Поэтому всё уезжает в `always`, а `mixed`/`situational`
остаются пустыми (в отличие от кэшевых Green Charts).

Порядок сеток на странице — сверху вниз, слева направо; подписи чартов
скрипт не читает, они заданы здесь по скриншотам.
"""
import json
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "charts", "mtt", "ffstart.json")
DEST_DIR = os.path.join(ROOT, "src", "presets", "mtt")

RANKS = "AKQJT98765432"


def ordered_labels():
    out = []
    for row in range(13):
        for col in range(13):
            hi, lo = RANKS[min(row, col)], RANKS[max(row, col)]
            out.append(hi + hi if row == col else hi + lo + ("s" if row < col else "o"))
    return out


ORDER = ordered_labels()

# Действие чарта: цвет заливки → (kind, подпись, цвет для матрицы).
RAISE = "raise"
CALL = "call"

# ── Описание страниц ────────────────────────────────────────────────────────
#
# Каждый чарт: (индекс сетки на странице, суффикс id, position, subtitle).
# Подписанный на чарте процент идёт в subtitle как есть — он относится к
# сумме «агрессивных» действий и служит сверкой при перегенерации.

PAGES = [
    {
        "file": "rfi.ts",
        "const": "MTT_RFI_PRESETS",
        "group": "MTTRFI",
        "page": "rfi",
        "title": "MTT RFI",
        "doc": (
            "// MTT · опен-рейзы (RFI). Источник — FF START, страница №1.\n"
            "//\n"
            "// Стек 25bb+, сайзинг опена всегда 2bb. Позиции названы как в\n"
            "// оригинале: на 8-max первая позиция — EP+1, на 6-max — MP.\n"
        ),
        "actions": [("purple", RAISE, "опен 2bb", "purple")],
        "charts": [
            (0, "ep1", "EP+1", "первая позиция за 8-max"),
            (1, "ep2", "EP+2", "вторая ранняя"),
            (2, "mp", "MP", "первая позиция за 6-max"),
            (3, "hj", "HJ", "хайджек"),
            (4, "co", "CO", "катофф"),
            (5, "bu", "BU", "баттон"),
        ],
        "note": "стек 25bb+, опен 2bb",
    },
    {
        "file": "iso.ts",
        "const": "MTT_ISO_PRESETS",
        "group": "MTTISO",
        "page": "isolate",
        "title": "MTT изолейт",
        "doc": (
            "// MTT · изолейт после лимпа. Источник — FF START, страница №2.\n"
            "//\n"
            "// Три действия: обычный изолейт 3.5bb (оранжевый), крупный 5-7bb\n"
            "// с сильными руками (красный) и оверлимп (зелёный). Красный —\n"
            "// это тоже изолейт, а не отдельное решение, поэтому оба идут\n"
            "// одним kind=\"raise\" и различаются только цветом легенды —\n"
            "// тот же приём, что с «4бет-фолд»/«4бет-пуш» в кэшевых чартах.\n"
            "//\n"
            "// Подписанный на чарте процент = оранжевый + красный.\n"
        ),
        "actions": [
            ("orange", RAISE, "изолейт 3.5bb", "orange"),
            ("red", RAISE, "крупный изолейт 5-7bb", "red"),
            ("green", CALL, "оверлимп", "green"),
        ],
        "charts": [
            (0, "ep", "EP", "ранняя позиция, один лимпер"),
            (1, "mp", "MP", "один лимпер"),
            (2, "hj", "HJ", "один лимпер"),
            (3, "multi", "vs 2+", "два и больше лимперов, любая позиция"),
            (4, "co", "CO", "один лимпер"),
            (5, "bu", "BU", "один лимпер"),
            (6, "sb", "SB", "один лимпер"),
            (7, "bb", "BB", "один лимпер"),
        ],
        "note": "изолейт 3.5bb, с сильными руками 5-7bb",
    },
    {
        "file": "vsRfi.ts",
        "const": "MTT_VS_RFI_PRESETS",
        "group": "MTTVSRFI",
        "page": "cc and 3bet",
        "title": "MTT против опена",
        "doc": (
            "// MTT · игра против одного рейзера. Источник — FF START, страница №3.\n"
            "//\n"
            "// Стек 40bb+, соперник открыл 2bb. Чарты заданы ГРУППАМИ позиций,\n"
            "// а не конкретным местом: в оригинале одна сетка на «ранние»,\n"
            "// одна на «средние» и так далее. Защита BB — отдельная страница\n"
            "// (bbDefense.ts), здесь её нет.\n"
        ),
        "actions": [
            ("red", RAISE, "3бет 6-8bb", "red"),
            ("green", CALL, "колд-колл", "green"),
        ],
        "charts": [
            (0, "early", "Ранние", "EP, EP+1, EP+2"),
            (1, "middle", "Средние", "MP, HJ"),
            (2, "late", "Поздние", "CO, BU"),
            (3, "sb", "SB", "малый блайнд"),
        ],
        "note": "стек 40bb+, опен соперника 2bb",
    },
    {
        "file": "defVs3bet.ts",
        "const": "MTT_DEF3BET_PRESETS",
        "group": "MTTDEF3BET",
        "page": "def vs 3bet",
        "title": "MTT защита от 3бета",
        "doc": (
            "// MTT · защита против 3бета. Источник — FF START, страница №4.\n"
            "//\n"
            "// Стек 40bb+, 3бет соперника 5-7bb. Чарт один на все позиции\n"
            "// 3беттора — оригинал не делит по тому, кто именно 3бетнул.\n"
            "//\n"
            "// Серые ячейки — фолд: это руки, которыми мы открывались, но на\n"
            "// 3бет сдаём. В пресет они не попадают (вес 0), но именно из-за\n"
            "// них серого на чарте тем больше, чем шире был опен.\n"
        ),
        "actions": [
            ("green", CALL, "колл 3бета", "green"),
            ("red", RAISE, "4бет", "red"),
        ],
        "charts": [
            (0, "ep1", "EP+1", "открыли с EP+1"),
            (1, "ep2", "EP+2", "открыли с EP+2"),
            (2, "mp", "MP", "открыли с MP"),
            (3, "hj", "HJ", "открыли с HJ"),
            (4, "co", "CO", "открыли с CO"),
            (5, "bu", "BU", "открыли с BU"),
        ],
        "note": "стек 40bb+, 3бет соперника 5-7bb",
    },
    {
        "file": "bbDefense.ts",
        "const": "MTT_BBDEF_PRESETS",
        "group": "MTTBBDEF",
        "page": "BB DEF",
        "title": "MTT защита BB",
        "doc": (
            "// MTT · защита большого блайнда. Источник — FF START, страница №5.\n"
            "//\n"
            "// Опен соперника 2-2.2bb. Диапазон колла огромный (40-57%) —\n"
            "// это не ошибка извлечения: на низких лимитах BB защищается\n"
            "// широко, потому что уже вложил блайнд и получает шансы банка.\n"
        ),
        "actions": [
            ("red", RAISE, "3бет 6-10bb", "red"),
            ("green", CALL, "колл на рейз 2-2.2bb", "green"),
        ],
        "charts": [
            (0, "early", "vs ранние", "EP, EP+1, EP+2"),
            (1, "middle", "vs средние", "MP, HJ"),
            (2, "late", "vs поздние", "CO, BU"),
        ],
        "note": "опен соперника 2-2.2bb",
    },
    {
        "file": "push.ts",
        "const": "MTT_PUSH_PRESETS",
        "group": "MTTPUSH",
        "page": None,  # собирается из двух страниц, см. ниже
        "title": "MTT пуш-фолд",
        "doc": (
            "// MTT · пуш-фолд на коротком стеке. Источник — FF START,\n"
            "// страницы №7 (0-9bb) и №8 (10-14bb).\n"
            "//\n"
            "// До нас никто не открылся, играем только олл-ин или фолд.\n"
            "// Две глубины идут одним списком: спот один и тот же, меняется\n"
            "// только стек, и диапазон на 0-9bb обязан быть шире.\n"
            "//\n"
            "// Первая позиция подписана по-разному (EP+1 на 0-9bb, EP на\n"
            "// 10-14bb) — так в оригинале, руками не сводить.\n"
        ),
        "actions": [("pink", RAISE, "олл-ин", "pink")],
        "charts": [
            ("push-fold 9bb", 0, "9-ep1", "EP+1 · 0-9bb", "ранняя позиция", "стек 0-9bb"),
            ("push-fold 9bb", 1, "9-mp", "MP · 0-9bb", "средняя позиция", "стек 0-9bb"),
            ("push-fold 9bb", 2, "9-co", "CO · 0-9bb", "катофф", "стек 0-9bb"),
            ("push-fold 9bb", 3, "9-bu", "BU · 0-9bb", "баттон", "стек 0-9bb"),
            ("push-fold 9bb", 4, "9-sb", "SB · 0-9bb", "малый блайнд", "стек 0-9bb"),
            ("push-fold 10-14", 0, "14-ep", "EP · 10-14bb", "ранняя позиция", "стек 10-14bb"),
            ("push-fold 10-14", 1, "14-mp", "MP · 10-14bb", "средняя позиция", "стек 10-14bb"),
            ("push-fold 10-14", 2, "14-co", "CO · 10-14bb", "катофф", "стек 10-14bb"),
            ("push-fold 10-14", 3, "14-bu", "BU · 10-14bb", "баттон", "стек 10-14bb"),
            ("push-fold 10-14", 4, "14-sb", "SB · 10-14bb", "малый блайнд", "стек 10-14bb"),
        ],
        "note": "олл-ин или фолд",
    },
    {
        "file": "threeBetPush.ts",
        "const": "MTT_3BETPUSH_PRESETS",
        "group": "MTT3BETPUSH",
        "page": "3bet push",
        "title": "MTT 3бет-пуш",
        "doc": (
            "// MTT · 3бет-пуш (рестил). Источник — FF START, страница №9.\n"
            "//\n"
            "// Стек 16-22bb, соперник открыл 2bb. Чарт выбирается парой\n"
            "// «где мы — откуда открылись»: чем позднее опенер, тем шире\n"
            "// его диапазон и тем шире мы пушим.\n"
        ),
        "actions": [("pink", RAISE, "3бет-пуш", "pink")],
        "charts": [
            (0, "early-vs-early", "Ранняя vs ранняя", "мы на ранней, опенер с ранней"),
            (1, "mid-vs-early", "Средняя/поздняя vs ранняя", "опенер с ранней"),
            (2, "late-vs-late", "Поздняя vs поздняя", "опенер с поздней"),
            (3, "blinds-vs-early", "Блайнды vs ранняя", "мы на блайнде, опенер с ранней"),
            (4, "blinds-vs-late", "Блайнды vs поздняя", "мы на блайнде, опенер с поздней"),
        ],
        "note": "стек 16-22bb, опен соперника 2bb",
    },
]


def combos_of(label):
    if len(label) == 2:
        return 6
    return 4 if label.endswith("s") else 12


def width(cells, colors):
    n = sum(combos_of(l) for l, c in cells.items() if c in colors)
    return n / 1326 * 100


def fmt_list(labels, indent):
    pad = " " * indent
    if not labels:
        return "[]"
    rows = [labels[i:i + 10] for i in range(0, len(labels), 10)]
    body = ",\n".join(pad + "  " + ", ".join(f'"{l}"' for l in r) for r in rows)
    return "[\n" + body + ",\n" + pad + "]"


def action_block(cells, color, kind, label, action_color):
    hands = [l for l in ORDER if cells[l] == color]
    if not hands:
        return None
    return (
        "      {\n"
        f'        kind: "{kind}",\n'
        f'        label: "{label}",\n'
        f'        color: "{action_color}",\n'
        f"        always: {fmt_list(hands, 8)},\n"
        "        situational: [],\n"
        "      }"
    )


def widths_note(page, cells):
    """Ширина по линиям — так, как её фильтрует приложение: рейз и пасс.

    Действий бывает больше, чем линий (обычный и крупный изолейт — оба рейз),
    поэтому проценты складываются по kind, а не по цвету.
    """
    by_kind = {}
    labels = {}
    for color, kind, label, _ in page["actions"]:
        w = width(cells, {color})
        if w == 0:
            continue
        by_kind[kind] = by_kind.get(kind, 0) + w
        labels.setdefault(kind, []).append(label)

    def name(kind):
        # Если линию даёт одно действие, берём его подпись («4бет», «оверлимп»);
        # если несколько (два сайзинга изолейта) — обобщаем.
        return labels[kind][0] if len(labels[kind]) == 1 else "рейз"

    if list(by_kind) == [RAISE]:
        return f"{by_kind[RAISE]:.1f}%"
    return " / ".join(f"{name(k)} {w:.1f}%" for k, w in by_kind.items())


def chart_block(page, cells, suffix, position, subtitle_bit, note):
    blocks = [action_block(cells, *a) for a in page["actions"]]
    blocks = [b for b in blocks if b]
    if not blocks:
        raise SystemExit(f"{page['file']}/{suffix}: не нашлось ни одного действия")
    pct = widths_note(page, cells)
    return (
        "  {\n"
        f'    id: "mtt-{page["prefix"]}-{suffix}",\n'
        f'    group: "{page["group"]}",\n'
        f'    position: "{position}",\n'
        f'    title: "{page["title"]} · {position}",\n'
        f'    subtitle: "{subtitle_bit} — {note} ({pct})",\n'
        "    actions: [\n" + ",\n".join(blocks) + ",\n    ],\n"
        "  }"
    )


def main():
    with open(SRC, encoding="utf-8") as f:
        data = json.load(f)

    for page in PAGES:
        page["prefix"] = page["file"].replace(".ts", "").lower()
        chunks = []
        for chart in page["charts"]:
            # Пуш-фолд собирается из двух страниц, поэтому у него имя страницы
            # и своя подпись стека в каждой строке; у остальных они общие.
            if page["page"] is None:
                page_name, idx, suffix, position, subtitle, note = chart
            else:
                idx, suffix, position, subtitle = chart
                page_name, note = page["page"], page["note"]
            cells = data[page_name][idx]["cells"]
            chunks.append(chart_block(page, cells, suffix, position, subtitle, note))

        body = (
            page["doc"]
            + "//\n// Сгенерировано tools/gen_mtt.py — РУКАМИ НЕ ПРАВИТЬ.\n\n"
            'import { RangePreset } from "../types";\n\n'
            f"export const {page['const']}: RangePreset[] = [\n"
            + ",\n".join(chunks)
            + ",\n];\n"
        )
        dest = os.path.join(DEST_DIR, page["file"])
        with open(dest, "w", encoding="utf-8", newline="\n") as f:
            f.write(body)
        print(f"→ src/presets/mtt/{page['file']}  ({len(chunks)} чартов)")


if __name__ == "__main__":
    main()

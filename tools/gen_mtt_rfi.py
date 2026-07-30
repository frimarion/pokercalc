"""Генерирует src/presets/mtt/rfi.ts из charts/mtt/extracted.json.

TS-файл именно генерируется, а не набирается руками: при ручном переносе
чартов уже ловилась опечатка (дубль A6o в RFI BU), а тут ещё и частоты.

    python tools/extract_mtt.py charts/mtt/*.png
    python tools/gen_mtt_rfi.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "charts", "mtt", "extracted.json")
DEST = os.path.join(ROOT, "src", "presets", "mtt", "rfi.ts")

RANKS = "AKQJT98765432"

# Порядок мест за столом и сайзинг опена — из панели действий на скриншотах.
SEATS = [
    ("utg", "UTG", "2.1bb", "Under the Gun"),
    ("utg1", "UTG1", "2.1bb", "UTG+1"),
    ("lj", "LJ", "2.1bb", "Lojack"),
    ("hj", "HJ", "2.1bb", "Hijack"),
    ("co", "CO", "2.2bb", "Cutoff"),
    ("btn", "BTN", "2.5bb", "Button"),
    ("sb", "SB", "3.5bb", "Small Blind"),
]


def ordered_labels():
    """Ярлыки в порядке матрицы — сверху вниз, слева направо."""
    out = []
    for row in range(13):
        for col in range(13):
            hi, lo = RANKS[min(row, col)], RANKS[max(row, col)]
            out.append(hi + hi if row == col else hi + lo + ("s" if row < col else "o"))
    return out


ORDER = ordered_labels()


def fmt_list(labels, indent):
    """Список ярлыков в несколько строк по 10 штук."""
    pad = " " * indent
    if not labels:
        return "[]"
    rows = [labels[i:i + 10] for i in range(0, len(labels), 10)]
    body = ",\n".join(pad + "  " + ", ".join(f'"{l}"' for l in r) for r in rows)
    return "[\n" + body + ",\n" + pad + "]"


def fmt_mixed(pairs, indent):
    pad = " " * indent
    if not pairs:
        return "{}"
    rows = [pairs[i:i + 6] for i in range(0, len(pairs), 6)]
    body = ",\n".join(
        pad + "  " + ", ".join(f'{l}: {w:g}' for l, w in r) for r in rows
    )
    return "{\n" + body + ",\n" + pad + "}"


def action_block(cells, key, label, indent=8):
    always = [l for l in ORDER if cells[l][key] >= 1]
    mixed = [(l, cells[l][key]) for l in ORDER if 0 < cells[l][key] < 1]
    if not always and not mixed:
        return None
    pad = " " * indent
    parts = [
        f'{pad}  kind: "{ "raise" if key == "raise" else "call" }",',
        f'{pad}  label: "{label}",',
        f"{pad}  always: {fmt_list(always, indent + 2)},",
        f"{pad}  situational: [],",
    ]
    if mixed:
        parts.append(f"{pad}  mixed: {fmt_mixed(mixed, indent + 2)},")
    return pad + "{\n" + "\n".join(parts) + "\n" + pad + "}"


def combos_of(label):
    if len(label) == 2:
        return 6
    return 4 if label.endswith("s") else 12


def width(cells, key):
    return sum(combos_of(l) * c[key] for l, c in cells.items()) / 1326 * 100


HEADER = """// MTT RFI — диапазоны открытия, 8-max, 100bb, ChipEV.
//
// Сгенерировано tools/gen_mtt_rfi.py из скриншотов солвера (charts/mtt).
// РУКАМИ НЕ ПРАВИТЬ — перегенерировать.
//
// Легенда чартов: красный — опен рейзом, зелёный — колл (лимп, только SB),
// синий — фолд. Солвер играет руки произвольной частотой, поэтому всё, что
// не 1.0, лежит в `mixed` как есть, без округления до четвертей.

import { RangePreset } from "../types";

export const MTT_RFI_PRESETS: RangePreset[] = [
"""


def main():
    with open(SRC) as f:
        data = json.load(f)

    chunks = []
    for key, seat, size, full in SEATS:
        if key not in data:
            raise SystemExit(f"нет чарта {key} в {SRC}")
        cells = data[key]
        actions = [action_block(cells, "raise", "открытие")]
        call = action_block(cells, "call", "лимп")
        if call:
            actions.append(call)
        actions = [a for a in actions if a]
        w = width(cells, "raise") + width(cells, "call")
        chunks.append(
            "  {\n"
            f'    id: "mtt-rfi-{key}",\n'
            '    group: "MTTRFI",\n'
            f'    position: "{seat}",\n'
            f'    title: "MTT RFI · {seat}",\n'
            f'    subtitle: "{full} — 8-max 100bb, опен {size} ({w:.1f}%)",\n'
            "    actions: [\n" + ",\n".join(actions) + ",\n    ],\n"
            "  }"
        )

    os.makedirs(os.path.dirname(DEST), exist_ok=True)
    with open(DEST, "w", encoding="utf-8", newline="\n") as f:
        f.write(HEADER + ",\n".join(chunks) + ",\n];\n")
    print(f"→ {DEST} ({len(chunks)} чартов)")


if __name__ == "__main__":
    main()

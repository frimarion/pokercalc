"""Генерирует src/presets/blinds4bet.ts из чарта «Blinds Defense vs 4bet»
(стр. 8 Green Charts).

Легенда страницы:
    зелёный   — коллируем 4бет;
    жёлтый    — фолдим на 4бет от пассивных оппов, в остальных случаях коллим;
    фиолетовый — 5бет пушим (олл-ин).

Жёлтый тут — ситуативный КОЛЛ, то есть то же действие, что зелёный, но
играемое не всегда. Поэтому он выносится в ОТДЕЛЬНОЕ действие того же
kind="call" со своим цветом — ровно как в defenseVs3bet.ts разделены
«4бет-фолд» и «4бет-пуш». На вес это не влияет (handWeights складывает
действия одного kind), зато матрица красится цветами оригинала.

Составные ячейки бывают двух видов: зелёный+фиолетовый (колл или пуш) и
зелёный+серый (коллим часть времени). Делятся не только пополам — у 99/88
против BU 2.5bb и TT против BU 3bb пуш занимает четверть ячейки, поэтому
доли округляются до четвертей, как на стр. 10-11.

Запуск:  python tools/gen_blinds4bet.py
"""
from pathlib import Path

from extract_blinds4bet import extract_page

RANKS = "AKQJT98765432"

# Порядок сеток — «сверху вниз, слева направо», как их отдаёт extract_page.
# Подписи взяты с заголовков чартов: скрипт их не читает.
GRIDS = [
    ("vs-utg", "vs UTG", "Блайнды vs 4бет · vs UTG",
     "Мы 3бетнули с блайнда, UTG ответил 4бетом"),
    ("vs-mp", "vs MP", "Блайнды vs 4бет · vs MP",
     "Мы 3бетнули с блайнда, MP ответил 4бетом"),
    ("vs-co", "vs CO", "Блайнды vs 4бет · vs CO",
     "Мы 3бетнули с блайнда, CO ответил 4бетом"),
    ("bb-vs-sb", "BB vs SB", "Блайнды vs 4бет · BB vs SB",
     "Мы 3бетнули с BB против опена SB, SB ответил 4бетом"),
    ("vs-bu-25", "vs BU 2.5bb", "Блайнды vs 4бет · vs BU (опен 2.5bb)",
     "Мы 3бетнули с блайнда, BU ответил 4бетом (опен был 2.5bb)"),
    ("vs-bu-3", "vs BU 3bb", "Блайнды vs 4бет · vs BU (опен 3bb)",
     "Мы 3бетнули с блайнда, BU ответил 4бетом (опен был 3bb)"),
]

ORDER = []
for r in range(13):
    for c in range(13):
        hi, lo = RANKS[min(r, c)], RANKS[max(r, c)]
        ORDER.append(hi + hi if r == c else hi + lo + ("s" if r < c else "o"))
ORDER_INDEX = {n: i for i, n in enumerate(ORDER)}


def combos(name):
    return 6 if len(name) == 2 else (4 if name[2] == "s" else 12)


def snap(fraction):
    """Доля пикселей → вес, кратный четверти. Ниже 0.06 — шум антиалиасинга."""
    if fraction < 0.06:
        return 0.0
    return round(fraction * 4) / 4


def buckets(cells, key):
    """{вес: [руки]} для одного цвета, руки в порядке сетки."""
    out = {}
    for name, fr in cells.items():
        w = snap(fr[key])
        if w > 0:
            out.setdefault(w, []).append(name)
    for lst in out.values():
        lst.sort(key=lambda n: ORDER_INDEX[n])
    return out


def width_pct(cells, *keys):
    """Эффективная ширина в процентах от 1326 комбо.

    Жёлтый идёт с весом 0.5, а не 1.0: на чарте ячейка сплошная, но означает
    «коллим не всегда». Считать её целой — та же ошибка, о которой предупреждает
    CLAUDE.md про закрашенную площадь против эффективной ширины.
    """
    total = 0.0
    for name, v in cells.items():
        w = sum(snap(v[k]) * (0.5 if k == "yellow" else 1.0) for k in keys)
        total += min(w, 1.0) * combos(name)
    return total / 1326 * 100


def fmt(names, indent):
    if not names:
        return "[]"
    lines, line = [], []
    for n in names:
        line.append(f'"{n}"')
        if len(", ".join(line)) > 66:
            lines.append(", ".join(line))
            line = []
    if line:
        lines.append(", ".join(line))
    pad = " " * indent
    return "[\n" + pad + f",\n{pad}".join(lines) + "\n" + " " * (indent - 2) + "]"


def action_block(kind, label, color, by_weight):
    """Одно действие пресета. Пустые списки весов не печатаем."""
    parts = [f'        kind: "{kind}",', f'        label: "{label}",', f'        color: "{color}",']
    parts.append(f'        always: {fmt(by_weight.get(1.0, []), 10)},')
    if by_weight.get(0.75):
        parts.append(f'        threeQuarter: {fmt(by_weight[0.75], 10)},')
    parts.append(f'        situational: {fmt(by_weight.get(0.5, []), 10)},')
    if by_weight.get(0.25):
        parts.append(f'        quarter: {fmt(by_weight[0.25], 10)},')
    return "      {\n" + "\n".join(parts) + "\n      },"


def main():
    data = extract_page(8)
    assert len(data) == len(GRIDS), f"ожидали {len(GRIDS)} сеток, нашли {len(data)}"

    chunks = []
    for (slug, pos, title, subtitle), grid in zip(GRIDS, data):
        cells = grid["cells"]
        green, yellow, purple = (buckets(cells, k) for k in ("green", "yellow", "purple"))

        actions = []
        if green:
            actions.append(action_block("call", "колл 4бета", "green", green))
        if yellow:
            # Жёлтый всегда сплошной, но означает «коллим не всегда» → вес 0.5.
            assert set(yellow) == {1.0}, f"{slug}: жёлтый ожидался сплошным, получено {sorted(yellow)}"
            actions.append(action_block("call", "колл, кроме пассивных", "yellow", {0.5: yellow[1.0]}))
        if purple:
            actions.append(action_block("raise", "5бет-пуш", "purple", purple))

        chunks.append(
            f'''  {{
    id: "blinds4bet-{slug}",
    group: "BLINDS4BET",
    position: "{pos}",
    title: "{title}",
    subtitle: "{subtitle}",
    actions: [
{chr(10).join(actions)}
    ],
  }},'''
        )
        print(f"{pos:12} колл {width_pct(cells, 'green', 'yellow'):5.1f}%  "
              f"пуш {width_pct(cells, 'purple'):4.1f}%  "
              f"всего {width_pct(cells, 'green', 'yellow', 'purple'):5.1f}%")

    header = '''// Blinds Defense vs 4bet — защита блайндов от 4бета (Green Charts, стр. 8).
//
// СГЕНЕРИРОВАНО tools/gen_blinds4bet.py — руками не править, перегенерировать.
//
// Легенда чарта: зелёный — коллируем 4бет, жёлтый — фолдим на 4бет от
// пассивных оппонентов, в остальных случаях коллим, фиолетовый — 5бет-пуш.
//
// Жёлтый — это ситуативный КОЛЛ, а не отдельное решение, поэтому он вынесен
// в отдельное действие того же kind="call" со своим цветом: на вес это не
// влияет (действия одного kind складываются), зато матрица красится как
// оригинал. Тот же приём, что с «4бет-фолд» / «4бет-пуш» в defenseVs3bet.ts.
//
// Составные ячейки делятся не только пополам: у 99/88 против BU 2.5bb и TT
// против BU 3bb на пуш приходится четверть.

import { RangePreset } from "./types";

export const BLINDS4BET_PRESETS: RangePreset[] = [
'''
    out = header + "\n".join(chunks) + "\n];\n"
    dest = Path("../src/presets/blinds4bet.ts")
    dest.write_text(out, encoding="utf-8")
    print(f"написано {dest} ({len(out)} байт)")


if __name__ == "__main__":
    main()

"""Генерирует src/presets/iso.ts из чарта Isolate (стр. 5 Green Charts).

Легенда страницы:
    красный  — диапазон открытия изолэйтом;
    зелёный  — доставляем 0,5bb на SB, если до нас уже были лимперы.

Зелёный есть только в чарте SB: доставить блайнд может лишь тот, кто его
уже частично поставил. Остальные четыре чарта — чистое «изолируем или фолд».

Составные ячейки здесь ровно 50/50 (проверено: доли пикселей 0.41-0.54, и
подписанные проценты сходятся только при весе 0.5). Это НАСТОЯЩИЙ раздел
ячейки, а не другой цвет чернил, как жёлтый в RFI, — поэтому ISO не входит
в YELLOW_PARTIAL_GROUPS в store.ts.

Запуск:  python tools/gen_iso.py
"""
import json
import subprocess
import sys
from pathlib import Path

RANKS = "AKQJT98765432"
PAGE = 5

# Порядок сеток на странице: (round(y/400), x) — сверху вниз, слева направо.
# Подписи скрипт не знает, они взяты из заголовков чартов на странице.
GRIDS = [
    ("mp", "MP", "Изолэйт с MP", "Открываем рейзом после лимпа, 5bb + 1bb за лимпера"),
    ("co", "CO", "Изолэйт с CO", "Открываем рейзом после лимпа, 4bb + 1bb за лимпера"),
    ("bu", "BU", "Изолэйт с BU", "Открываем рейзом после лимпа, 4bb + 1bb за лимпера"),
    ("sb", "SB", "Изолэйт с SB", "Открываем рейзом после лимпа, 5bb + 1bb за лимпера"),
    ("bb", "BB", "Изолэйт с BB", "Открываем рейзом после лимпа, 5bb + 1bb за лимпера"),
]

# Порядок ячеек в файле — как в сетке 13x13: сверху вниз, слева направо.
ORDER = []
for r in range(13):
    for c in range(13):
        hi, lo = RANKS[min(r, c)], RANKS[max(r, c)]
        ORDER.append(hi + hi if r == c else hi + lo + ("s" if r < c else "o"))
ORDER_INDEX = {name: i for i, name in enumerate(ORDER)}


def combos(name):
    return 6 if len(name) == 2 else (4 if name[2] == "s" else 12)


def weight(fraction):
    """Доля пикселей → вес. Ячейка либо целая, либо ровно половина."""
    if fraction > 0.9:
        return 1.0
    # Тёмный текст внутри ячейки съедает часть пикселей, поэтому половинки
    # читаются как 0.41-0.54 — порог ставим низко, но выше шума антиалиасинга.
    return 0.5 if fraction > 0.06 else 0.0


def split(cells, key):
    """Ячейки цвета key, разложенные на целые и половинные."""
    full, half = [], []
    for name, fr in cells.items():
        w = weight(fr[key])
        if w == 1.0:
            full.append(name)
        elif w == 0.5:
            half.append(name)
    for lst in (full, half):
        lst.sort(key=lambda n: ORDER_INDEX[n])
    return full, half


def width_pct(cells, key):
    return sum(weight(v[key]) * combos(k) for k, v in cells.items()) / 1326 * 100


def fmt(names, indent):
    """Список ярлыков в несколько строк по ширине как в остальных пресетах."""
    if not names:
        return "[]"
    out, line = [], []
    for n in names:
        line.append(f'"{n}"')
        if len(", ".join(line)) > 66:
            out.append(", ".join(line))
            line = []
    if line:
        out.append(", ".join(line))
    pad = " " * indent
    body = f",\n{pad}".join(out)
    return "[\n" + pad + body + "\n" + " " * (indent - 2) + "]"


def main():
    path = Path("page5_mixed.json")
    if not path.exists():
        subprocess.run([sys.executable, "extract_charts_mixed.py", str(PAGE)], check=True)
    data = json.load(open(path))
    order = sorted(range(len(data)), key=lambda i: (round(data[i]["box"][1] / 400), data[i]["box"][0]))
    assert len(order) == len(GRIDS), f"ожидали {len(GRIDS)} сеток, нашли {len(order)}"

    chunks = []
    for (slug, pos, title, subtitle), gi in zip(GRIDS, order):
        cells = data[gi]["cells"]
        red_full, red_half = split(cells, "red")
        green_full, green_half = split(cells, "green")

        actions = [
            f'''      {{
        kind: "raise",
        label: "изолэйт",
        always: {fmt(red_full, 10)},
        situational: {fmt(red_half, 10)},
      }},'''
        ]
        if green_full or green_half:
            actions.append(
                f'''      {{
        kind: "call",
        label: "доставить 0.5bb",
        always: {fmt(green_full, 10)},
        situational: {fmt(green_half, 10)},
      }},'''
            )

        body = "\n".join(actions)
        chunks.append(
            f'''  {{
    id: "iso-{slug}",
    group: "ISO",
    position: "{pos}",
    title: "{title}",
    subtitle: "{subtitle}",
    actions: [
{body}
    ],
  }},'''
        )
        print(f"{pos}: изо {width_pct(cells, 'red'):.1f}%  доставить {width_pct(cells, 'green'):.1f}%")

    header = '''// Isolate — открытие рейзом после лимпа (Green Charts, стр. 5).
//
// СГЕНЕРИРОВАНО tools/gen_iso.py — руками не править, перегенерировать.
//
// Легенда чарта: красный — диапазон открытия изолэйтом, зелёный — доставляем
// 0,5bb на SB, если до нас уже были лимперы. Зелёный есть только на SB:
// доставить блайнд может лишь тот, кто его уже частично поставил.
//
// Ячейки, закрашенные наполовину, — смешанная стратегия с весом 0.5. На SB
// это раздел между изолэйтом и доставкой, на остальных местах — между
// изолэйтом и фолдом.
//
// Сайзинг: в позиции 4bb + 1bb за каждого лимпера, без позиции 5bb + 1bb.

import { RangePreset } from "./types";

export const ISO_PRESETS: RangePreset[] = [
'''
    out = header + "\n".join(chunks) + "\n];\n"
    dest = Path("../src/presets/iso.ts")
    dest.write_text(out, encoding="utf-8")
    print(f"написано {dest} ({len(out)} байт)")


if __name__ == "__main__":
    main()

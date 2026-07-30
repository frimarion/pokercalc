"""Извлекает MTT-чарты (солверные скриншоты) из PNG пиксельным сэмплированием.

В отличие от Green Charts, солвер играет руку ЛЮБОЙ частотой, а не долями
1/0.75/0.5/0.25. Частота закодирована долей заливки ячейки, поэтому здесь
считается не медианный цвет центра (как в extract_charts.py), а доля
пикселей каждого цвета внутри ячейки.

Легенда скриншотов:
    красный  — рейз (опен)
    зелёный  — колл (лимп; встречается только на SB)
    синий    — фолд

Использование:
    python tools/extract_mtt.py charts/mtt/utg.png [...]
    → charts/mtt/extracted.json
"""
import json
import os
import sys

import numpy as np
from PIL import Image

RANKS = "AKQJT98765432"

# Доля от размера ячейки, отрезаемая с каждой стороны: убирает рамку между
# ячейками и не даёт соседнему цвету затечь в подсчёт.
CELL_MARGIN = 0.10

# Ниже этой доли частоту считаем нулём, выше 1-EPS — единицей. Сглаживание
# краёв ячейки и антиалиасинг текста дают 1-2% мусора в каждую сторону.
EPS = 0.025


def classify(img):
    """RGB-картинка → маски red / green / blue по оттенку.

    Порог по насыщенности отсекает фон и белый текст в ячейках: у них
    max-min мал, а у заливок — велик.
    """
    a = img.astype(np.int16)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    sat = mx - mn
    colored = (sat > 40) & (mx > 60)
    red = colored & (r == mx) & (r - np.maximum(g, b) > 30)
    blue = colored & (b == mx) & (b - np.maximum(r, g) > 25)
    green = colored & (g == mx) & (g - np.maximum(r, b) > 25)
    return red, green, blue


def grid_box(red, blue):
    """bbox матрицы 13x13.

    Границы берутся ТОЛЬКО по красному и синему: зелёная рамка выделенной
    позиции в верхней панели лежит вне матрицы и сдвинула бы бокс вверх.
    Красный (рейз) и синий (фолд) есть в каждом крайнем ряду и столбце.
    """
    mask = red | blue
    rows = np.where(mask.mean(axis=1) > 0.3)[0]
    cols = np.where(mask.mean(axis=0) > 0.3)[0]
    if len(rows) == 0 or len(cols) == 0:
        raise SystemExit("матрица не найдена: нет плотных рядов красного/синего")
    return int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1


def label_at(row, col):
    hi, lo = RANKS[min(row, col)], RANKS[max(row, col)]
    if row == col:
        return hi + hi
    return hi + lo + ("s" if row < col else "o")


def snap(x):
    if x < EPS:
        return 0.0
    if x > 1 - EPS:
        return 1.0
    return round(x, 2)


def extract(path):
    img = np.array(Image.open(path).convert("RGB"))
    red, green, blue = classify(img)
    x0, y0, x1, y1 = grid_box(red, blue)
    cw, ch = (x1 - x0) / 13.0, (y1 - y0) / 13.0
    mx, my = cw * CELL_MARGIN, ch * CELL_MARGIN

    cells = {}
    for row in range(13):
        for col in range(13):
            cx0 = int(round(x0 + cw * col + mx))
            cx1 = int(round(x0 + cw * (col + 1) - mx))
            cy0 = int(round(y0 + ch * row + my))
            cy1 = int(round(y0 + ch * (row + 1) - my))
            sl = (slice(cy0, cy1), slice(cx0, cx1))
            nr, ng, nb = red[sl].sum(), green[sl].sum(), blue[sl].sum()
            total = nr + ng + nb
            if total == 0:
                raise SystemExit(f"{path}: пустая ячейка {label_at(row, col)}")
            cells[label_at(row, col)] = {
                "raise": snap(nr / total),
                "call": snap(ng / total),
            }
    return {"box": [x0, y0, x1, y1], "cells": cells}


def combos_of(label):
    if len(label) == 2:
        return 6
    return 4 if label.endswith("s") else 12


def width_pct(cells, key):
    """Ширина диапазона в процентах от 1326 комбо — с учётом частот."""
    return sum(combos_of(l) * c[key] for l, c in cells.items()) / 1326 * 100


if __name__ == "__main__":
    paths = sys.argv[1:]
    if not paths:
        raise SystemExit(__doc__)
    out = {}
    for p in paths:
        name = os.path.splitext(os.path.basename(p))[0]
        res = extract(p)
        cells = res["cells"]
        mixed = sum(1 for c in cells.values() if 0 < c["raise"] < 1)
        print(
            f"{name:6} box={res['box']}  рейз {width_pct(cells, 'raise'):5.1f}%"
            f"  колл {width_pct(cells, 'call'):5.1f}%  смешанных ячеек {mixed}"
        )
        out[name] = cells
    dest = os.path.join(os.path.dirname(paths[0]) or ".", "extracted.json")
    with open(dest, "w") as f:
        json.dump(out, f, indent=1, sort_keys=True)
    print(f"\n→ {dest}")

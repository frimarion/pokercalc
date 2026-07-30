"""Извлечение чартов «Blinds Defense vs 4bet» (стр. 8 Green Charts).

Четыре класса пикселей вместо трёх: помимо серого фона тут зелёный
(коллируем 4бет), ЖЁЛТЫЙ (фолдим только против пассивных, иначе коллим)
и фиолетовый (5бет-пуш). Готового извлекателя на такую комбинацию не было:
extract_charts_mixed.py не знает фиолетового, extract_def_vs_3bet.py — жёлтого.

Запуск как модуля: from extract_blinds4bet import extract_page
"""
import sys
import json

import numpy as np

from extract_charts import render, find_grids, RANKS

PAGE = 8


def classify_pixels(px):
    """0 фон, 1 green, 2 yellow, 3 purple, -1 прочее (текст ярлыка, лого)."""
    r = px[:, 0].astype(int)
    g = px[:, 1].astype(int)
    b = px[:, 2].astype(int)
    out = np.full(len(px), -1, dtype=np.int8)

    grey = (r > 195) & (g > 195) & (b > 195) & (abs(r - g) < 22) & (abs(g - b) < 22)
    out[grey] = 0
    # Зелёный: G заметно выше R, синего мало.
    green = (g > 140) & ((g - r) > 60) & (b < 190)
    out[green] = 1
    # Жёлтый: R и G высокие, B низкий. Проверяется ПОСЛЕ зелёного, чтобы
    # не перехватить его: у зелёного B тоже низкий, но R сильно меньше G.
    yellow = (r > 170) & (g > 140) & (b < 120) & ((r - b) > 80) & ((r - g) > -30)
    out[yellow & (out == -1)] = 2
    # Фиолетовый: синий высокий, зелёного мало.
    purple = (r > 110) & (b > 150) & ((b - g) > 40) & ((r - g) > 20)
    out[purple] = 3
    return out


def extract_grid(img, box, inset=0.08):
    """Доли каждого класса в 169 ячейках сетки."""
    x0, y0, w, h = box
    cw, ch = w / 13.0, h / 13.0
    cells = {}
    for row in range(13):
        for col in range(13):
            cx0 = int(x0 + cw * (col + inset))
            cx1 = int(x0 + cw * (col + 1 - inset))
            cy0 = int(y0 + ch * (row + inset))
            cy1 = int(y0 + ch * (row + 1 - inset))
            patch = img[cy0:cy1, cx0:cx1].reshape(-1, 3)
            lab = classify_pixels(patch)
            counted = lab[lab >= 0]
            hi, lo = RANKS[min(row, col)], RANKS[max(row, col)]
            name = hi + hi if row == col else (hi + lo + ("s" if row < col else "o"))
            if len(counted) == 0:
                cells[name] = {"fold": 1.0, "green": 0.0, "yellow": 0.0, "purple": 0.0}
                continue
            n = len(counted)
            cells[name] = {
                "fold": float((counted == 0).sum()) / n,
                "green": float((counted == 1).sum()) / n,
                "yellow": float((counted == 2).sum()) / n,
                "purple": float((counted == 3).sum()) / n,
            }
    return cells


def extract_page(page=PAGE):
    """Сетки страницы в порядке «сверху вниз, слева направо»."""
    img = render(page)
    grids = find_grids(img)
    order = sorted(range(len(grids)), key=lambda i: (round(grids[i][1] / 400), grids[i][0]))
    return [{"box": grids[i], "cells": extract_grid(img, grids[i])} for i in order]


if __name__ == "__main__":
    page = int(sys.argv[1]) if len(sys.argv) > 1 else PAGE
    data = extract_page(page)
    print(f"page {page}: {len(data)} grids")
    for i, g in enumerate(data):
        c = g["cells"]
        solid = {k: sum(1 for v in c.values() if v[k] > 0.9) for k in ("green", "yellow", "purple")}
        part = [k for k, v in c.items()
                if any(0.06 < v[x] < 0.9 for x in ("green", "yellow", "purple"))]
        print(f"  grid {i+1} @ x={g['box'][0]} y={g['box'][1]} сплошных={solid} частичных={len(part)}")
    with open(f"page{page}_blinds4bet.json", "w") as f:
        json.dump(data, f)
    print("saved")

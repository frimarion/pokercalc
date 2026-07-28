"""Извлечение чартов с поддержкой СОСТАВНЫХ ячеек (смешанных стратегий).

В отличие от extract.py (медиана цвета центра), здесь для каждой ячейки
считаются ДОЛИ пикселей каждого класса цвета. Это позволяет читать ячейки,
закрашенные частично — например «половина 3бет, половина колл».
"""
import sys
import json
import numpy as np
from extract import render, find_grids, RANKS


def classify_pixels(px):
    """px: (N,3) int16 → массив меток: 0 fold, 1 red, 2 green, 3 yellow, -1 прочее."""
    r = px[:, 0].astype(int)
    g = px[:, 1].astype(int)
    b = px[:, 2].astype(int)
    out = np.full(len(px), -1, dtype=np.int8)

    # Светло-серый фон невыбранной ячейки.
    grey = (r > 195) & (g > 195) & (b > 195) & (abs(r - g) < 22) & (abs(g - b) < 22)
    out[grey] = 0
    # Красный: R высокий, G и B заметно ниже.
    red = (r > 170) & (g < 150) & (b < 160) & ((r - g) > 70)
    out[red] = 1
    # Зелёный: G высокий, R заметно ниже.
    green = (g > 140) & ((g - r) > 60) & (b < 190)
    out[green] = 2
    # Жёлтый: R и G высокие, B низкий.
    yellow = (r > 180) & (g > 150) & (b < 130) & ((g - b) > 60) & ((r - g) < 90)
    out[yellow] = 3
    return out


def extract_grid_mixed(img, box, inset=0.22):
    """Доли действий в каждой из 169 ячеек.

    inset — насколько сжать область выборки к центру, чтобы не задеть
    границы соседних ячеек (текст внутри не мешает: он попадает в «прочее»).
    """
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
                cells[name] = {"fold": 1.0, "red": 0.0, "green": 0.0, "yellow": 0.0}
                continue
            n = len(counted)
            cells[name] = {
                "fold": float((counted == 0).sum()) / n,
                "red": float((counted == 1).sum()) / n,
                "green": float((counted == 2).sum()) / n,
                "yellow": float((counted == 3).sum()) / n,
            }
    return cells


def snap(v, step=0.25):
    """Округлить долю к ближайшей четверти — чарты рисуют ровными долями."""
    return round(v / step) * step


if __name__ == "__main__":
    page = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    img = render(page)
    grids = find_grids(img)
    print(f"page {page}: {len(grids)} grids")
    result = []
    for i, box in enumerate(grids):
        cells = extract_grid_mixed(img, box)
        mixed = {k: v for k, v in cells.items() if v["red"] > 0.08 and v["green"] > 0.08}
        print(f"  grid {i+1} @ x={box[0]} y={box[1]} — составных ячеек: {len(mixed)}")
        result.append({"box": box, "cells": cells})
    with open(f"page{page}_mixed.json", "w") as f:
        json.dump(result, f)
    print("saved")

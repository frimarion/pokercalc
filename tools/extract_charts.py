"""Извлекает диапазоны из чартов Green Charts (PDF) пиксельным сэмплированием.

Каждая страница — растровая картинка с несколькими сетками 13x13.
Ячейки: красный = всегда, жёлтый = ситуативно, серый/белый = фолд.

Подход: раздуваем маску непустых пикселей, чтобы ячейки сетки слились в
один блоб; фильтруем блобы по размеру/квадратности; каждый делим на 13x13
и сэмплируем медианный цвет центра ячейки.
"""
import os
import sys
import json
import numpy as np
import fitz
from scipy import ndimage

# Путь к исходному PDF. Переопределяется переменной окружения GREENCHARTS_PDF.
PDF = os.environ.get(
    "GREENCHARTS_PDF",
    os.path.expanduser("~/Downloads/GreenCharts2024_01.pdf"),
)
RANKS = "AKQJT98765432"
SCALE = 2.0


def render(page_no, scale=SCALE):
    doc = fitz.open(PDF)
    p = doc[page_no - 1]
    pix = p.get_pixmap(matrix=fitz.Matrix(scale, scale))
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    return img[:, :, :3].astype(np.int16)


def classify(rgb):
    r, g, b = int(rgb[0]), int(rgb[1]), int(rgb[2])
    if r > 170 and g < 140 and b < 140 and (r - g) > 60:
        return "red"
    if r > 170 and g > 130 and b < 130 and (g - b) > 50:
        return "yellow"
    return "fold"


def dense_span(mask):
    """Диапазон от первой до последней True. Между рядами ячеек есть белые
    зазоры, поэтому берём именно span, а не непрерывный участок."""
    idx = np.where(mask)[0]
    if len(idx) == 0:
        return None
    return (int(idx[0]), int(idx[-1]) + 1)


def find_grids(img):
    """Возвращает bbox каждой сетки 13x13: (x0, y0, w, h).

    Дилатация нужна, чтобы ячейки слились в один блоб, но она раздувает
    рамку — поэтому внутри найденной области берём ТОЧНЫЕ границы по
    неразмытой маске (иначе деление на 13 съезжает на полклетки).
    """
    s = img.sum(axis=2)
    nonwhite = (s < 730) & (s > 40)
    dil = ndimage.binary_dilation(nonwhite, structure=np.ones((9, 9)))
    lbl, n = ndimage.label(dil)
    grids = []
    for sl in ndimage.find_objects(lbl):
        y0, y1 = sl[0].start, sl[0].stop
        x0, x1 = sl[1].start, sl[1].stop
        h, w = y1 - y0, x1 - x0
        if w < 250 or h < 250:
            continue
        if abs(w - h) > max(w, h) * 0.25:
            continue
        # Заголовок чарта ("Under the Gun (UTG) 14%") слипается с сеткой при
        # дилатации. Строки сетки закрашены почти на всю ширину, строки текста —
        # нет, поэтому отбираем самый длинный участок с высокой плотностью.
        sub = nonwhite[y0:y1, x0:x1]
        dens_r = sub.mean(axis=1)
        dens_c = sub.mean(axis=0)
        r_ok = dens_r > 0.6
        c_ok = dens_c > 0.6
        rs = dense_span(r_ok)
        cs = dense_span(c_ok)
        if rs is None or cs is None:
            continue
        ey0, ey1 = y0 + rs[0], y0 + rs[1]
        ex0, ex1 = x0 + cs[0], x0 + cs[1]
        ew, eh = ex1 - ex0, ey1 - ey0
        if ew < 250 or eh < 250:
            continue
        grids.append((ex0, ey0, ew, eh))
    grids.sort(key=lambda g: (g[1], g[0]))
    return grids


def extract_grid(img, box):
    x0, y0, w, h = box
    cw, ch = w / 13.0, h / 13.0
    out = {}
    for row in range(13):
        for col in range(13):
            cx = int(x0 + cw * (col + 0.5))
            cy = int(y0 + ch * (row + 0.5))
            r = max(2, int(min(cw, ch) * 0.18))
            patch = img[cy - r:cy + r + 1, cx - r:cx + r + 1].reshape(-1, 3)
            med = np.median(patch, axis=0)
            hi, lo = RANKS[min(row, col)], RANKS[max(row, col)]
            label = hi + hi if row == col else (hi + lo + ("s" if row < col else "o"))
            out[label] = classify(med)
    return out


def summarize(cells):
    red = [k for k, v in cells.items() if v == "red"]
    yellow = [k for k, v in cells.items() if v == "yellow"]
    return red, yellow


def combos_of(label):
    if len(label) == 2:
        return 6
    return 4 if label.endswith("s") else 12


def pct(labels):
    return sum(combos_of(l) for l in labels) / 1326 * 100


if __name__ == "__main__":
    page = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    img = render(page)
    grids = find_grids(img)
    print(f"page {page}: {len(grids)} grids")
    result = []
    for i, box in enumerate(grids):
        cells = extract_grid(img, box)
        red, yellow = summarize(cells)
        print(f"\n--- grid {i+1} @ x={box[0]} y={box[1]} size={box[2]}x{box[3]}")
        print(f"    red={len(red)} labels ({pct(red):.1f}%)  yellow={len(yellow)} ({pct(yellow):.1f}%)")
        print(f"    total {pct(red+yellow):.1f}%")
        result.append({"box": box, "cells": cells})
    with open(f"page{page}.json", "w") as f:
        json.dump(result, f)

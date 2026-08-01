"""Извлекает чарты FF START (MTT-пак, ffstart.online) из PNG-страниц.

Отличия от Green Charts и от солверных скриншотов:

* заливка ячейки ПЛОСКАЯ — одна рука играется ровно одним действием, долей и
  составных ячеек нет. Поэтому здесь берётся медианный цвет центра ячейки, а
  не доли пикселей (как в extract_mtt.py);
* цветов на странице до четырёх, и смысл у них свой на каждой странице —
  задаётся легендой внизу. Скрипт называет цвета по тону (red/orange/green/
  purple/pink/grey/white), а маппинг «цвет → действие» живёт в генераторах;
* на одной странице несколько чартов, разложенных в 2 ряда.

Сетки ищутся по «непустым» пикселям: у каждой ячейки есть подпись руки, и
после морфологического замыкания 169 подписей склеиваются в один блоб на чарт.
Заголовок чарта отсекается по плотности строк — так же, как в extract_charts.py
(там он слипался с сеткой при дилатации).

Использование:
    python tools/extract_ffstart.py charts/mtt/page1.png [...]
    python tools/extract_ffstart.py --debug charts/mtt/page1.png

--debug кладёт рядом <имя>.debug.png с обведёнными сетками: глазами проверить,
что найдены все чарты и границы не съехали, дешевле, чем ловить сдвиг на ряд
по разъехавшимся процентам.
"""
import json
import os
import sys

import numpy as np

# Консоль Windows по умолчанию cp1251 — стрелки и проценты в выводе её роняют.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
from PIL import Image, ImageDraw
from scipy import ndimage

RANKS = "AKQJT98765432"

# Доля ячейки, отрезаемая с каждой стороны перед взятием медианы: убирает
# рамку и не даёт соседней заливке затечь в подсчёт.
CELL_MARGIN = 0.18

# Плотность «чернил» в строке/столбце, ниже которой это ещё не сетка, а
# заголовок над ней. Порог по span'у, а не по непрерывному участку.
DENSITY = 0.35

# Минимальная сторона блоба, чтобы считать его чартом (в пикселях).
MIN_GRID_PX = 200


def ink(img):
    """Маска «не фон»: всё, что заметно темнее или насыщеннее белого."""
    a = img.astype(np.int16)
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    return (mx < 240) | (mx - mn > 12)


def find_grids(mask):
    """Прямоугольники чартов, отсортированные сверху вниз, слева направо.

    Замыкание с ядром чуть больше зазора между ячейками склеивает подписи рук
    в один блоб на чарт, но НЕ дотягивается до соседнего чарта и до текста
    рекомендаций справа.
    """
    closed = ndimage.binary_closing(mask, structure=np.ones((9, 9)))
    closed = ndimage.binary_dilation(closed, structure=np.ones((5, 5)))
    lab, n = ndimage.label(closed)
    boxes = []
    for sy, sx in ndimage.find_objects(lab):
        h, w = sy.stop - sy.start, sx.stop - sx.start
        if h < MIN_GRID_PX or w < MIN_GRID_PX:
            continue
        # Чарт почти квадратный. Колонка рекомендаций — узкая и высокая,
        # заголовок страницы — широкий и низкий; и то и другое отсеивается.
        if not 0.7 < w / h < 1.45:
            continue
        boxes.append(trim(mask, sx.start, sy.start, sx.stop, sy.stop))
    # Ряды чартов могут отличаться на пиксель по y, поэтому сортировка идёт
    # по огрублённому y — тот же приём, что в extract_charts.py.
    boxes.sort(key=lambda b: (round(b[1] / 200), b[0]))
    return boxes


def trim(mask, x0, y0, x1, y1):
    """Отрезать заголовок и поля: оставить span строк/столбцов с чернилами.

    Матрица 13x13 квадратная, поэтому лишняя высота — это заголовок, который
    не отсёкся по плотности: на бежевой плашке («Против 2+ лимперов») подпись
    чарта такая же густая, как ряды ячеек. Приводим бокс к квадрату, прижимая
    его к нижнему краю, — заголовок всегда сверху.
    """
    sub = mask[y0:y1, x0:x1]
    rows = np.where(sub.mean(axis=1) > DENSITY)[0]
    cols = np.where(sub.mean(axis=0) > DENSITY)[0]
    if len(rows) == 0 or len(cols) == 0:
        return x0, y0, x1, y1
    bx0, by0 = x0 + int(cols[0]), y0 + int(rows[0])
    bx1, by1 = x0 + int(cols[-1]) + 1, y0 + int(rows[-1]) + 1
    side = min(bx1 - bx0, by1 - by0)
    return bx0, by1 - side, bx0 + side, by1


def color_name(rgb):
    """Плоская заливка → имя цвета. Тон различает красный/розовый/оранжевый."""
    r, g, b = (int(v) for v in rgb)
    mx, mn = max(r, g, b), min(r, g, b)
    sat = mx - mn
    if sat < 25:
        return "white" if mx > 245 else "grey"
    h = _hue(r, g, b, mx, sat)
    if h < 15 or h >= 345:
        return "red"
    if h < 45:
        return "orange"
    if h < 75:
        return "yellow"
    if h < 170:
        return "green"
    if h < 200:
        return "cyan"
    if h < 290:
        return "purple"
    return "pink"


def _hue(r, g, b, mx, sat):
    if mx == r:
        h = 60 * (((g - b) / sat) % 6)
    elif mx == g:
        h = 60 * ((b - r) / sat + 2)
    else:
        h = 60 * ((r - g) / sat + 4)
    return h % 360


def label_at(row, col):
    hi, lo = RANKS[min(row, col)], RANKS[max(row, col)]
    if row == col:
        return hi + hi
    return hi + lo + ("s" if row < col else "o")


def read_grid(img, box):
    x0, y0, x1, y1 = box
    cw, ch = (x1 - x0) / 13.0, (y1 - y0) / 13.0
    mx, my = cw * CELL_MARGIN, ch * CELL_MARGIN
    cells = {}
    for row in range(13):
        for col in range(13):
            sl = (
                slice(int(round(y0 + ch * row + my)), int(round(y0 + ch * (row + 1) - my))),
                slice(int(round(x0 + cw * col + mx)), int(round(x0 + cw * (col + 1) - mx))),
            )
            patch = img[sl].reshape(-1, 3)
            # Медиана по каналу, а не среднее: подпись руки внутри ячейки —
            # это тёмные пиксели, и среднее уводило бы цвет в грязь.
            cells[label_at(row, col)] = color_name(np.median(patch, axis=0))
    return cells


def combos_of(label):
    if len(label) == 2:
        return 6
    return 4 if label.endswith("s") else 12


def widths(cells):
    """Доля 1326 комбо на каждый цвет — для сверки с подписанными процентами."""
    out = {}
    for label, c in cells.items():
        out[c] = out.get(c, 0) + combos_of(label)
    return {c: n / 1326 * 100 for c, n in sorted(out.items(), key=lambda kv: -kv[1])}


def debug_overlay(path, img, boxes):
    im = Image.fromarray(img)
    d = ImageDraw.Draw(im)
    for i, (x0, y0, x1, y1) in enumerate(boxes):
        d.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(255, 0, 0), width=3)
        for k in range(1, 13):
            x = x0 + (x1 - x0) * k / 13
            y = y0 + (y1 - y0) * k / 13
            d.line([x, y0, x, y1], fill=(0, 128, 255), width=1)
            d.line([x0, y, x1, y], fill=(0, 128, 255), width=1)
        d.text((x0 + 4, y0 + 4), str(i), fill=(255, 0, 0))
    dest = os.path.splitext(path)[0] + ".debug.png"
    im.save(dest)
    print(f"   → {dest}")


def main(paths, debug):
    out = {}
    for path in paths:
        img = np.array(Image.open(path).convert("RGB"))
        boxes = find_grids(ink(img))
        name = os.path.splitext(os.path.basename(path))[0]
        print(f"{name}: найдено сеток — {len(boxes)}")
        grids = []
        for i, box in enumerate(boxes):
            cells = read_grid(img, box)
            w = widths(cells)
            shown = "  ".join(f"{c} {p:.1f}%" for c, p in w.items() if c != "white")
            print(f"  [{i}] box={box}  {shown}")
            grids.append({"box": list(box), "cells": cells})
        out[name] = grids
        if debug:
            debug_overlay(path, img, boxes)

    dest = os.path.join(os.path.dirname(paths[0]) or ".", "ffstart.json")
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, sort_keys=True)
    print(f"\n→ {dest}")


if __name__ == "__main__":
    # Отладочные оверлеи лежат рядом с исходниками и попадают под charts/mtt/*.png —
    # без фильтра они бы вторым проходом переписали ffstart.json своими копиями.
    args = [a for a in sys.argv[1:] if not a.startswith("--") and ".debug." not in a]
    if not args:
        raise SystemExit(__doc__)
    main(args, "--debug" in sys.argv)

"""Извлечение чартов "Defense vs 3Bet IP/OOP" (стр. 10, 11).

Три цвета в PDF: зелёный (колл 3бета), красный (4бет и фолд на 5бет),
фиолетовый (4бет и колл 5бет пуша). Для модели диапазона в приложении
красный и фиолетовый — это ОДНО действие "raise" (4бет) с весом 1.0;
разница между ними — только план на будущий 5бет, не влияет на вес
(см. комментарий в threeBetIP.ts). Зелёный — действие "call".

Составные ячейки (наполовину цвет, наполовину серый фон фолда) — вес 0.5.
Ячейки, наполовину красные-наполовину фиолетовые — оба варианта "raise",
поэтому вес всё равно 1.0 (это одно действие).
"""
import sys
import numpy as np
from extract_charts import render, find_grids, RANKS


def classify_pixels(px):
    """0 fold(серый), 1 red, 2 green, 3 purple, -1 прочее (текст/лого)."""
    r = px[:, 0].astype(int)
    g = px[:, 1].astype(int)
    b = px[:, 2].astype(int)
    out = np.full(len(px), -1, dtype=np.int8)

    grey = (r > 195) & (g > 195) & (b > 195) & (abs(r - g) < 22) & (abs(g - b) < 22)
    out[grey] = 0
    red = (r > 170) & (g < 150) & (b < 160) & ((r - g) > 70) & ((r - b) > 40)
    out[red] = 1
    green = (g > 140) & ((g - r) > 60) & (b < 190)
    out[green] = 2
    purple = (r > 110) & (b > 150) & ((b - g) > 40) & ((r - g) > 20)
    out[purple] = 3
    return out


def extract_grid_mixed(img, box, inset=0.08):
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
                cells[name] = {"fold": 1.0, "red": 0.0, "green": 0.0, "purple": 0.0}
                continue
            n = len(counted)
            cells[name] = {
                "fold": float((counted == 0).sum()) / n,
                "red": float((counted == 1).sum()) / n,
                "green": float((counted == 2).sum()) / n,
                "purple": float((counted == 3).sum()) / n,
            }
    return cells


def snap_quarter(v):
    return round(v / 0.25) * 0.25


def to_action_weight(cells):
    """Возвращает (call_w, fold_w, push_w) — {hand: weight} для трёх действий:
    колл (зелёный), 4бет-фолд (красный), 4бет-пуш (фиолетовый).

    Красный и фиолетовый снэпаются НЕЗАВИСИМО (не суммой), чтобы сохранить
    разницу между ними для раскраски матрицы под легенду чарта.
    Доли пикселей округляются до ближайшей четверти (0/0.25/0.5/0.75/1.0).
    """
    call_w, fold_w, push_w = {}, {}, {}
    for name, v in cells.items():
        green = snap_quarter(v["green"])
        red = snap_quarter(v["red"])
        purple = snap_quarter(v["purple"])
        if green > 0:
            call_w[name] = green
        if red > 0:
            fold_w[name] = red
        if purple > 0:
            push_w[name] = purple
    return call_w, fold_w, push_w


def by_weight(weights):
    """{hand: weight} → {1.0: [...], 0.75: [...], 0.5: [...], 0.25: [...]}."""
    out = {1.0: [], 0.75: [], 0.5: [], 0.25: []}
    for name, w in weights.items():
        if w in out:
            out[w].append(name)
    return out


if __name__ == "__main__":
    page = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    img = render(page)
    grids = find_grids(img)
    print(f"page {page}: {len(grids)} grids")
    for i, box in enumerate(grids):
        cells = extract_grid_mixed(img, box)
        call_w, fold_w, push_w = to_action_weight(cells)
        print(f"\n--- grid {i+1} @ x={box[0]} y={box[1]}")
        for tier, hands in by_weight(call_w).items():
            print(f"  call {tier}: {hands}")
        for tier, hands in by_weight(fold_w).items():
            print(f"  4bet-fold {tier}: {hands}")
        for tier, hands in by_weight(push_w).items():
            print(f"  4bet-push {tier}: {hands}")

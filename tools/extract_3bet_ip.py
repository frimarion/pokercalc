"""Извлечение стр. 9 "3Bet IP": три чарта (vs RFI 15% / 18% / 26%).

Легенда этой страницы кодирует цветом НЕ вес руки, а стратегию ответа на
4бет (красный/зелёный/жёлтый/фиолетовый) — сама рука в диапазоне всегда
играется действием "3бет". Вес (always=1.0 vs situational=0.5) читается
из того, что ячейка залита ЦВЕТОМ ЛИБО ПОЛНОСТЬЮ, ЛИБО НАПОЛОВИНУ (левая
половина цветная, правая — серый фон "фолда"), как в BB Defense.

Поэтому здесь считаем не доли отдельных цветов, а долю "любого цвета
действия" (red|green|yellow|purple) против серого фона.
"""
import json
import numpy as np
from extract_charts import render, find_grids, RANKS

PAGE = 9


def classify(px):
    r = px[:, 0].astype(int)
    g = px[:, 1].astype(int)
    b = px[:, 2].astype(int)
    out = np.full(len(px), -1, dtype=np.int8)  # -1 = прочее (текст/лого)

    grey = (r > 195) & (g > 195) & (b > 195) & (abs(r - g) < 22) & (abs(g - b) < 22)
    out[grey] = 0

    red = (r > 170) & (g < 150) & (b < 160) & ((r - g) > 70)
    out[red] = 1

    green = (g > 140) & ((g - r) > 60) & (b < 190)
    out[green] = 2

    yellow = (r > 180) & (g > 150) & (b < 130) & ((g - b) > 60) & ((r - g) < 90)
    out[yellow] = 3

    purple = (r > 100) & (b > 130) & ((b - g) > 40) & ((r - g) > 20) & (r < 200)
    out[purple] = 4

    return out


def cell_fill(img, box, inset=0.22):
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
            lab = classify(patch)
            counted = lab[lab >= 0]
            hi, lo = RANKS[min(row, col)], RANKS[max(row, col)]
            name = hi + hi if row == col else (hi + lo + ("s" if row < col else "o"))
            if len(counted) == 0:
                cells[name] = 0.0
                continue
            colored = int((counted != 0).sum())
            cells[name] = colored / len(counted)
    return cells


def classify_weight(frac):
    if frac >= 0.75:
        return 1.0
    if frac >= 0.25:
        return 0.5
    return 0.0


if __name__ == "__main__":
    img = render(PAGE)
    grids = find_grids(img)
    print(f"page {PAGE}: {len(grids)} grids")
    out = []
    for i, box in enumerate(grids):
        fills = cell_fill(img, box)
        always = sorted([h for h, f in fills.items() if classify_weight(f) == 1.0])
        situational = sorted([h for h, f in fills.items() if classify_weight(f) == 0.5])
        print(f"\n--- grid {i+1} @ {box}")
        print(f"always ({len(always)}): {always}")
        print(f"situational ({len(situational)}): {situational}")
        out.append({"box": box, "fills": fills, "always": always, "situational": situational})
    with open("page9_3bet_ip.json", "w") as f:
        json.dump(out, f, indent=2)

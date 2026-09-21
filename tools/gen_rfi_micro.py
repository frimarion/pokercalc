# Оцифровка RFI-чартов "кэш микро" (источник — скриншоты пользователя,
# charts/micro/*.png) в src/presets/rfiMicro.ts.
#
# Легенда чарта — не Green Charts: заливка по типу руки (пара — синий,
# suited — жёлтый, offsuit — красный), полная насыщенность значит "играем
# всегда" (вес 1.0), бледная того же тона — фолд. Отдельно на части ячеек
# снизу нарисована зелёная полоска — "открываем только под фиша на
# блайндах" (тот же приём, что и в rfi.ts: второе action kind="raise" с
# color="green", вес 0.25). Подтверждено пользователем в чате и сверкой
# зумом по K9s/K8s на UTG (K9s без полоски играется всегда, K8s — только
# под фиша).
#
# Порядок кода/строк/столбцов такой же, как во всех остальных extract_*:
# сверху вниз, слева направо, сетка 13x13, ранги "AKQJT98765432".

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CHARTS = ROOT / "charts" / "micro"
RANKS = "AKQJT98765432"

POSITIONS = [
    ("utg", "UTG", "3bb"),
    ("mp", "MP", "3bb"),
    ("co", "CO", "2.5bb"),
    ("btn", "BU", "2.5bb"),
    ("sb", "SB", "3bb"),
]


def label(r, c):
    if r == c:
        return RANKS[r] + RANKS[c]
    if r < c:
        return RANKS[r] + RANKS[c] + "s"
    return RANKS[c] + RANKS[r] + "o"


def kind_of(r, c):
    if r == c:
        return "pair"
    if r < c:
        return "suited"
    return "offsuit"


def classify(rgb, kind):
    r, g, b = rgb
    if kind == "pair":
        return "always" if r < 100 else "fold"
    if kind == "offsuit":
        return "always" if g < 150 else "fold"
    return "always" if b < 170 else "fold"  # suited


def find_top_offset(img, cell_w):
    """Заголовок-плашка над сеткой есть не у всех картинок (UTG без неё).
    Ищем первую строку, где ячейка (0,0) уже синяя — это AA."""
    for yo in range(0, 80, 2):
        r, g, b = img.getpixel((int(0.2 * cell_w) + 2, yo + 5))
        if b > 200 and r < 80:
            return yo
    return 0


def extract(path):
    img = Image.open(path).convert("RGB")
    w, h = img.size
    cell_w = w / 13
    y_off = find_top_offset(img, cell_w)
    cell_h = (h - y_off) / 13

    always, fish = [], []
    for row in range(13):
        for col in range(13):
            x0 = int((col + 0.15) * cell_w) + 2
            y0 = y_off + int((row + 0.15) * cell_h) + 2
            top = img.getpixel((x0, y0))
            k = kind_of(row, col)
            cls = classify(top, k)

            green = False
            by = y_off + int((row + 0.82) * cell_h)
            for frac in (0.2, 0.35, 0.5, 0.65, 0.8):
                bx = int((col + frac) * cell_w)
                r, g, b = img.getpixel((bx, by))
                if g > 150 and g > r + 20 and g > b + 40:
                    green = True
                    break

            lab = label(row, col)
            if green:
                fish.append(lab)
            elif cls == "always":
                always.append(lab)

    return sorted(always, key=hand_sort_key), sorted(fish, key=hand_sort_key)


def hand_sort_key(h):
    order = "AKQJT98765432"
    r1 = order.index(h[0])
    r2 = order.index(h[1])
    suited = h.endswith("s")
    return (r1, r2, 0 if suited else 1)


def ts_list(hands):
    return "[" + ", ".join(f'"{h}"' for h in hands) + "]"


def main():
    charts = {}
    for key, seat, size in POSITIONS:
        path = CHARTS / f"{key}.png"
        if not path.exists():
            print(f"missing {path}", file=sys.stderr)
            sys.exit(1)
        always, fish = extract(path)
        charts[key] = {"seat": seat, "size": size, "always": always, "fish": fish}
        print(f"{seat:4s} always={len(always):3d} fish={len(fish):3d}")

    out_json = ROOT / "charts" / "micro" / "rfi_micro.json"
    out_json.write_text(json.dumps(charts, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = []
    lines.append("// Открытие (RFI) — \"кэш микро\", отдельный источник от Green Charts.")
    lines.append("//")
    lines.append("// Скриншоты чарта — не Green Charts: заливка кодирует тип руки (пара")
    lines.append("// синяя, suited жёлтая, offsuit красная), а не частоту. Полная")
    lines.append("// насыщенность = играем всегда (вес 1.0), бледная того же тона = фолд.")
    lines.append("// Зелёная полоска снизу ячейки — отдельное решение \"открываем только")
    lines.append("// под фиша на блайндах\", тот же приём, что и в rfi.ts (color: \"green\",")
    lines.append("// вес 0.25). Середины (situational 0.5), которая есть в Green Charts,")
    lines.append("// тут нет вовсе — только always/fish/фолд.")
    lines.append("//")
    lines.append("// Оцифровано tools/gen_rfi_micro.py из charts/micro/*.png. Руками не")
    lines.append("// правилось — при разногласиях исправлять картинку/скрипт и")
    lines.append("// перегенерировать, а не редактировать список рук здесь.")
    lines.append("")
    lines.append('import { RangePreset } from "./types";')
    lines.append("")
    lines.append("export const RFI_MICRO_PRESETS: RangePreset[] = [")
    for key, seat, size in POSITIONS:
        c = charts[key]
        lines.append("  {")
        lines.append(f'    id: "rfi-micro-{key}",')
        lines.append('    group: "RFIMICRO",')
        lines.append(f'    position: "{seat}",')
        lines.append(f'    title: "RFI микро · {seat}",')
        lines.append(f'    subtitle: "{seat} — открытие рейзом ({size}), источник \\"кэш микро\\"",')
        lines.append("    actions: [")
        lines.append("      {")
        lines.append('        kind: "raise",')
        lines.append('        label: "открытие",')
        lines.append(f"        always: {ts_list(c['always'])},")
        lines.append("        situational: [],")
        lines.append("      },")
        lines.append("      {")
        lines.append('        kind: "raise",')
        lines.append('        label: "фиш на блайндах",')
        lines.append('        color: "green",')
        lines.append("        always: [],")
        lines.append("        situational: [],")
        lines.append(f"        quarter: {ts_list(c['fish'])},")
        lines.append("      },")
        lines.append("    ],")
        lines.append("  },")
    lines.append("];")
    lines.append("")

    out_ts = ROOT / "src" / "presets" / "rfiMicro.ts"
    out_ts.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {out_ts}")


if __name__ == "__main__":
    main()

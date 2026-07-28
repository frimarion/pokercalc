"""Генерирует src/presets/defenseVs3bet.ts из чартов Defense vs 3Bet IP/OOP
(стр. 10 и 11 Green Charts). См. extract_def_vs_3bet.py для деталей разбора
цвета. Три действия на выходе — колл (зелёный), 4бет-фолд (красный) и
4бет-пуш (фиолетовый) — держим отдельно (не сливаем в один "raise"), чтобы
матрица могла раскрашиваться теми же цветами, что и оригинальный чарт.

Доли пикселей округляются до ближайшей четверти (0.25/0.5/0.75/1.0), т.к.
на этих чартах составные ячейки — не всегда 50/50, встречаются и 25/75.
"""
from extract_charts import render, find_grids
from extract_def_vs_3bet import extract_grid_mixed, to_action_weight, by_weight

PAGE_GRIDS = {
    10: [
        ("6", "IP vs 3bet 6%", "Диапазон защиты в позиции, блайнд 3бетит 6%"),
        ("8", "IP vs 3bet 8%", "Диапазон защиты в позиции, блайнд 3бетит 8%"),
        ("12", "IP vs 3bet 12%", "Диапазон защиты в позиции, блайнд 3бетит 12%"),
        ("10", "IP vs 3bet 10%", "Диапазон защиты в позиции, блайнд 3бетит 10%"),
        ("14", "IP vs 3bet 14%", "Диапазон защиты в позиции, блайнд 3бетит 14%"),
    ],
    11: [
        ("8", "OOP vs 3bet 8%", "Диапазон защиты вне позиции от 3бета в 8%"),
        ("10", "OOP vs 3bet 10%", "Диапазон защиты вне позиции от 3бета в 10%"),
        ("18", "OOP vs 3bet 18% (SB vs BB)", "Диапазон защиты вне позиции от 3бета в 18%, SB vs BB"),
        ("12", "OOP vs 3bet 12%", "Диапазон защиты вне позиции от 3бета в 12%"),
    ],
}
# PAGE_GRIDS уже перечислены в том порядке, в котором find_grids отдаёт
# сетки (сверху-вниз, слева-направо) — сверено по заголовкам чарта на
# скриншотах страниц, порядок НЕ совпадает с возрастанием процентов.


def fmt_list(hands):
    return "[" + ", ".join(f'"{h}"' for h in hands) + "]"


def action_block(indent, kind, label, color, tiers):
    always = tiers.get(1.0, [])
    three_q = tiers.get(0.75, [])
    half = tiers.get(0.5, [])
    quarter = tiers.get(0.25, [])
    lines = [
        f'{indent}{{',
        f'{indent}  kind: "{kind}",',
        f'{indent}  label: "{label}",',
        f'{indent}  color: "{color}",',
        f'{indent}  always: {fmt_list(always)},',
        f'{indent}  threeQuarter: {fmt_list(three_q)},',
        f'{indent}  situational: {fmt_list(half)},',
        f'{indent}  quarter: {fmt_list(quarter)},',
        f'{indent}}},',
    ]
    return "\n".join(lines)


def gen_group(page, group, id_prefix, position_prefix):
    img = render(page)
    grids = find_grids(img)
    meta = PAGE_GRIDS[page]
    presets = []
    for box, (pct, position, subtitle) in zip(grids, meta):
        cells = extract_grid_mixed(img, box)
        call_w, fold_w, push_w = to_action_weight(cells)
        pid = f"{id_prefix}-{pct}"
        block = f'''  {{
    id: "{pid}",
    group: "{group}",
    position: "{position}",
    title: "{position_prefix} · {pct}%",
    subtitle: "{subtitle}",
    actions: [
{action_block("      ", "call", "колл", "green", by_weight(call_w))}
{action_block("      ", "raise", "4бет-фолд", "red", by_weight(fold_w))}
{action_block("      ", "raise", "4бет-пуш", "purple", by_weight(push_w))}
    ],
  }},'''
        presets.append(block)
    return presets


HEADER = '''// Defense vs 3Bet IP / OOP (Green Charts, стр. 10 и 11).
//
// Три цвета в PDF: зелёный (колл 3бета), красный (4бет и фолд на 5бет),
// фиолетовый (4бет и колл 5бет пуша). В отличие от threeBetIP.ts, здесь
// красный/фиолетовый держатся как ДВА РАЗНЫХ действия одного kind="raise" —
// для равновесия диапазона (фильтры всё/4бет/колл) это без разницы, обе
// считаются 4бетом, но раздельные action.color позволяют красить матрицу
// теми же цветами, что и оригинальный чарт (режим «цвета пресета»).
//
// Составные ячейки здесь не всегда 50/50 — встречаются и четверти (25/75).
// Доля пикселей округляется до ближайшей четверти: always=1.0,
// threeQuarter=0.75, situational=0.5, quarter=0.25.
//
// Сгенерировано tools/gen_def_vs_3bet.py — не редактировать руками.

import { RangePreset } from "./types";

export const DEF3BETIP_PRESETS: RangePreset[] = [
'''

MID = '''];

export const DEF3BETOOP_PRESETS: RangePreset[] = [
'''

FOOTER = '''];
'''

if __name__ == "__main__":
    ip = gen_group(10, "DEF3BETIP", "def3bet-ip", "Def vs 3Bet IP")
    oop = gen_group(11, "DEF3BETOOP", "def3bet-oop", "Def vs 3Bet OOP")
    with open("../src/presets/defenseVs3bet.ts", "w", encoding="utf-8") as f:
        f.write(HEADER)
        f.write("\n".join(ip))
        f.write("\n" + MID)
        f.write("\n".join(oop))
        f.write("\n" + FOOTER)
    print("written src/presets/defenseVs3bet.ts")

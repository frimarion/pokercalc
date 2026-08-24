// SB Defense — защита малого блайнда 3бетом.
//
// На SB чистый 3бет-или-фолд: флэтов нет, поэтому в чарте одно действие.
// Цвет ячейки задаёт ЧАСТОТУ 3бета: красный — всегда (1.0), жёлтый —
// половину раздач (0.5), зелёный — четверть (0.25). Чарты подписаны шириной
// опена соперника (16%+ / 19%+ / 26%+ / 39%+), она же определяет позицию.
//
// Под частью красных ячеек нарисована зелёная полоска — такая рука 3бетится
// половину времени. Проверяется подписью: на каждом чарте указан процент
// «красных рук», и он сходится ТОЛЬКО если полоску считать половиной
// (vs EP 4.68, vs MP 5.73, vs CO 8.45, vs BU 11.6 — все четыре точно).
//
// Сайзинг: против опена 2.5bb — 3бет до 10bb, против 3bb — до 12bb.

import { RangePreset } from "./types";

export const SB3BET_PRESETS: RangePreset[] = [
  {
    id: "sb3bet-vs-utg",
    group: "SB3BET",
    position: "vs UTG",
    title: "SB 3бет · vs UTG",
    subtitle: "Против опена UTG (3bb, 16%+) — 3бет до 12bb",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
          "AA", "AKo", "AKs", "AQs", "AJs", "KK", "KQs", "QQ", "JJ", "TT"
        ],
        situational: [
          "AQo", "ATs", "KJs", "KTs", "QJs", "99"
        ],
        quarter: [
          "A5s", "A4s", "QTs", "JTs"
        ],
      },
    ],
  },
  {
    id: "sb3bet-vs-mp",
    group: "SB3BET",
    position: "vs MP",
    title: "SB 3бет · vs MP",
    subtitle: "Против опена MP (3bb, 19%+) — 3бет до 12bb",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
          "AA", "AKo", "AKs", "AQs", "AJs", "ATs", "KK", "KQs", "KJs", "QQ",
          "QJs", "JJ", "TT"
        ],
        situational: [
          "AQo", "A5s", "KTs", "QTs", "99", "88"
        ],
        quarter: [
          "A4s", "A3s", "JTs"
        ],
      },
    ],
  },
  {
    id: "sb3bet-vs-co",
    group: "SB3BET",
    position: "vs CO",
    title: "SB 3бет · vs CO",
    subtitle: "Против опена CO (2.5bb, 26%+) — 3бет до 10bb",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
          "AA", "AKo", "AKs", "AQo", "AQs", "AJs", "ATs", "KK", "KQs", "KJs",
          "KTs", "QQ", "QJs", "QTs", "JJ", "JTs", "TT", "99"
        ],
        situational: [
          "KQo", "AJo", "KJo", "A9s", "A5s", "A4s", "A3s", "K9s", "88", "77"
        ],
        quarter: [
          "T9s", "98s", "87s", "76s"
        ],
      },
    ],
  },
  {
    id: "sb3bet-vs-bu",
    group: "SB3BET",
    position: "vs BU",
    title: "SB 3бет · vs BU",
    subtitle: "Против опена BU (2.5bb, 39%+) — 3бет до 10bb",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
          "AA", "AKo", "AKs", "AQo", "AQs", "AJo", "AJs", "ATs", "A9s", "A5s",
          "A4s", "KK", "KQo", "KQs", "KJs", "KTs", "QQ", "QJs", "QTs", "JJ",
          "JTs", "TT", "99", "88"
        ],
        situational: [
          "ATo", "A8s", "A7s", "A6s", "A3s", "A2s", "KJo", "K9s", "Q9s",
          "J9s", "T9s", "77", "66"
        ],
        quarter: [
          "QJo", "KTo", "T8s", "98s", "97s", "87s", "76s"
        ],
      },
    ],
  },
];

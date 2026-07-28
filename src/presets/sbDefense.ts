// SB Defense — защита малого блайнда 3бетом (Green Charts, стр. 6).
//
// На SB играем 3бет-или-фолд: флэтов нет, поэтому оба цвета чарта — это 3бет.
// Красный — 3бетим всегда, жёлтый — 3бетим в подходящих оппонентов
// (например, фолдящих на 3беты).
// Сайзинг: против опена 2.5bb — 3бет до 10bb, против 3bb — до 12bb.

import { RangePreset } from "./types";

export const SB3BET_PRESETS: RangePreset[] = [
  {
    id: "sb3bet-vs-utg",
    group: "SB3BET",
    position: "vs UTG",
    title: "SB 3бет · vs UTG",
    subtitle: "Против опена UTG (3bb) — 3бет до 12bb",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
          "AA", "AKo", "AKs", "AQs", "AJs", "KK", "KQs", "QQ", "JJ", "TT"
        ],
        situational: [
          "AQo", "ATs", "KJs", "KTs", "99"
        ],
      },
    ],
  },
  {
    id: "sb3bet-vs-mp",
    group: "SB3BET",
    position: "vs MP",
    title: "SB 3бет · vs MP",
    subtitle: "Против опена MP (3bb) — 3бет до 12bb",
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
      },
    ],
  },
  {
    id: "sb3bet-vs-co",
    group: "SB3BET",
    position: "vs CO",
    title: "SB 3бет · vs CO",
    subtitle: "Против опена CO (2.5bb) — 3бет до 10bb",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
          "AA", "AKo", "AKs", "AQo", "AQs", "AJs", "ATs", "KK", "KQs", "KJs",
          "KTs", "QQ", "QJs", "QTs", "JJ", "JTs", "TT", "99"
        ],
        situational: [
          "AJo", "A9s", "A5s", "A4s", "A3s", "KQo", "KJo", "K9s", "88", "77"
        ],
      },
    ],
  },
  {
    id: "sb3bet-vs-bu",
    group: "SB3BET",
    position: "vs BU",
    title: "SB 3бет · vs BU",
    subtitle: "Против опена BU (2.5bb) — 3бет до 10bb",
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
          "ATo", "A8s", "A7s", "A6s", "A3s", "A2s", "KJo", "K9s", "Q9s", "J9s",
          "T9s", "77", "66"
        ],
      },
    ],
  },
];

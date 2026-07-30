// Blinds Defense vs 4bet — защита блайндов от 4бета (Green Charts, стр. 8).
//
// СГЕНЕРИРОВАНО tools/gen_blinds4bet.py — руками не править, перегенерировать.
//
// Легенда чарта: зелёный — коллируем 4бет, жёлтый — фолдим на 4бет от
// пассивных оппонентов, в остальных случаях коллим, фиолетовый — 5бет-пуш.
//
// Жёлтый — это ситуативный КОЛЛ, а не отдельное решение, поэтому он вынесен
// в отдельное действие того же kind="call" со своим цветом: на вес это не
// влияет (действия одного kind складываются), зато матрица красится как
// оригинал. Тот же приём, что с «4бет-фолд» / «4бет-пуш» в defenseVs3bet.ts.
//
// Составные ячейки делятся не только пополам: у 99/88 против BU 2.5bb и TT
// против BU 3bb на пуш приходится четверть.

import { RangePreset } from "./types";

export const BLINDS4BET_PRESETS: RangePreset[] = [
  {
    id: "blinds4bet-vs-utg",
    group: "BLINDS4BET",
    position: "vs UTG",
    title: "Блайнды vs 4бет · vs UTG",
    subtitle: "Мы 3бетнули с блайнда, UTG ответил 4бетом",
    actions: [
      {
        kind: "call",
        label: "колл 4бета",
        color: "green",
        always: [
          "QQ"
        ],
        situational: [
          "AA", "AKs", "AKo"
        ],
      },
      {
        kind: "call",
        label: "колл, кроме пассивных",
        color: "yellow",
        always: [],
        situational: [
          "JJ"
        ],
      },
      {
        kind: "raise",
        label: "5бет-пуш",
        color: "purple",
        always: [
          "KK"
        ],
        situational: [
          "AA", "AKs"
        ],
      },
    ],
  },
  {
    id: "blinds4bet-vs-mp",
    group: "BLINDS4BET",
    position: "vs MP",
    title: "Блайнды vs 4бет · vs MP",
    subtitle: "Мы 3бетнули с блайнда, MP ответил 4бетом",
    actions: [
      {
        kind: "call",
        label: "колл 4бета",
        color: "green",
        always: [],
        situational: [
          "AA", "AKs", "AKo", "QQ", "JJ"
        ],
      },
      {
        kind: "call",
        label: "колл, кроме пассивных",
        color: "yellow",
        always: [],
        situational: [
          "AQs", "TT"
        ],
      },
      {
        kind: "raise",
        label: "5бет-пуш",
        color: "purple",
        always: [
          "KK"
        ],
        situational: [
          "AA", "AKs", "QQ"
        ],
      },
    ],
  },
  {
    id: "blinds4bet-vs-co",
    group: "BLINDS4BET",
    position: "vs CO",
    title: "Блайнды vs 4бет · vs CO",
    subtitle: "Мы 3бетнули с блайнда, CO ответил 4бетом",
    actions: [
      {
        kind: "call",
        label: "колл 4бета",
        color: "green",
        always: [
          "AQs"
        ],
        situational: [
          "AA", "QQ", "JJ"
        ],
      },
      {
        kind: "call",
        label: "колл, кроме пассивных",
        color: "yellow",
        always: [],
        situational: [
          "AJs", "KQs", "TT"
        ],
      },
      {
        kind: "raise",
        label: "5бет-пуш",
        color: "purple",
        always: [
          "AKs", "AKo", "KK"
        ],
        situational: [
          "AA", "QQ", "JJ"
        ],
      },
    ],
  },
  {
    id: "blinds4bet-bb-vs-sb",
    group: "BLINDS4BET",
    position: "BB vs SB",
    title: "Блайнды vs 4бет · BB vs SB",
    subtitle: "Мы 3бетнули с BB против опена SB, SB ответил 4бетом",
    actions: [
      {
        kind: "call",
        label: "колл 4бета",
        color: "green",
        always: [
          "AJs", "ATs", "KQs", "KJs", "QJs", "88"
        ],
        situational: [
          "AA", "AQs", "AQo", "JJ", "TT"
        ],
      },
      {
        kind: "call",
        label: "колл, кроме пассивных",
        color: "yellow",
        always: [],
        situational: [
          "KTs", "QTs", "JTs", "T9s", "98s", "87s", "76s", "65s", "54s"
        ],
      },
      {
        kind: "raise",
        label: "5бет-пуш",
        color: "purple",
        always: [
          "AKs", "A5s", "A4s", "AKo", "KK", "QQ", "99"
        ],
        situational: [
          "AA", "AQs", "AQo", "JJ", "TT"
        ],
      },
    ],
  },
  {
    id: "blinds4bet-vs-bu-25",
    group: "BLINDS4BET",
    position: "vs BU 2.5bb",
    title: "Блайнды vs 4бет · vs BU (опен 2.5bb)",
    subtitle: "Мы 3бетнули с блайнда, BU ответил 4бетом (опен был 2.5bb)",
    actions: [
      {
        kind: "call",
        label: "колл 4бета",
        color: "green",
        always: [
          "AQs", "AJs", "KQs"
        ],
        threeQuarter: [
          "99", "88"
        ],
        situational: [
          "AA", "JJ", "TT"
        ],
      },
      {
        kind: "call",
        label: "колл, кроме пассивных",
        color: "yellow",
        always: [],
        situational: [
          "ATs", "KJs", "KTs", "AQo", "QJs"
        ],
      },
      {
        kind: "raise",
        label: "5бет-пуш",
        color: "purple",
        always: [
          "AKs", "A5s", "A4s", "AKo", "KK", "QQ"
        ],
        situational: [
          "AA", "JJ", "TT"
        ],
        quarter: [
          "99", "88"
        ],
      },
    ],
  },
  {
    id: "blinds4bet-vs-bu-3",
    group: "BLINDS4BET",
    position: "vs BU 3bb",
    title: "Блайнды vs 4бет · vs BU (опен 3bb)",
    subtitle: "Мы 3бетнули с блайнда, BU ответил 4бетом (опен был 3bb)",
    actions: [
      {
        kind: "call",
        label: "колл 4бета",
        color: "green",
        always: [
          "AQs", "AJs", "KQs"
        ],
        threeQuarter: [
          "TT"
        ],
        situational: [
          "AA", "QQ", "JJ"
        ],
      },
      {
        kind: "call",
        label: "колл, кроме пассивных",
        color: "yellow",
        always: [],
        situational: [
          "ATs", "KJs", "KTs", "AQo", "QJs", "99", "88"
        ],
      },
      {
        kind: "raise",
        label: "5бет-пуш",
        color: "purple",
        always: [
          "AKs", "A5s", "AKo", "KK"
        ],
        situational: [
          "AA", "QQ", "JJ"
        ],
        quarter: [
          "TT"
        ],
      },
    ],
  },
];

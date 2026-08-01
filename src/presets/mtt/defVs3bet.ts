// MTT · защита против 3бета. Источник — FF START, страница №4.
//
// Стек 40bb+, 3бет соперника 5-7bb. Чарт один на все позиции
// 3беттора — оригинал не делит по тому, кто именно 3бетнул.
//
// Серые ячейки — фолд: это руки, которыми мы открывались, но на
// 3бет сдаём. В пресет они не попадают (вес 0), но именно из-за
// них серого на чарте тем больше, чем шире был опен.
//
// Сгенерировано tools/gen_mtt.py — РУКАМИ НЕ ПРАВИТЬ.

import { RangePreset } from "../types";

export const MTT_DEF3BET_PRESETS: RangePreset[] = [
  {
    id: "mtt-defvs3bet-ep1",
    group: "MTTDEF3BET",
    position: "EP+1",
    title: "MTT защита от 3бета · EP+1",
    subtitle: "открыли с EP+1 — стек 40bb+, 3бет соперника 5-7bb (колл 3бета 4.4% / 4бет 0.9%)",
    actions: [
      {
        kind: "call",
        label: "колл 3бета",
        color: "green",
        always: [
          "AKs", "AQs", "AJs", "AKo", "KQs", "QQ", "JJ", "TT", "99", "88",
        ],
        situational: [],
      },
      {
        kind: "raise",
        label: "4бет",
        color: "red",
        always: [
          "AA", "KK",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-defvs3bet-ep2",
    group: "MTTDEF3BET",
    position: "EP+2",
    title: "MTT защита от 3бета · EP+2",
    subtitle: "открыли с EP+2 — стек 40bb+, 3бет соперника 5-7bb (колл 3бета 6.6% / 4бет 0.9%)",
    actions: [
      {
        kind: "call",
        label: "колл 3бета",
        color: "green",
        always: [
          "AKs", "AQs", "AJs", "ATs", "AKo", "KQs", "KJs", "AQo", "QQ", "QJs",
          "JJ", "TT", "99", "88", "77",
        ],
        situational: [],
      },
      {
        kind: "raise",
        label: "4бет",
        color: "red",
        always: [
          "AA", "KK",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-defvs3bet-mp",
    group: "MTTDEF3BET",
    position: "MP",
    title: "MTT защита от 3бета · MP",
    subtitle: "открыли с MP — стек 40bb+, 3бет соперника 5-7bb (колл 3бета 6.9% / 4бет 0.9%)",
    actions: [
      {
        kind: "call",
        label: "колл 3бета",
        color: "green",
        always: [
          "AKs", "AQs", "AJs", "ATs", "AKo", "KQs", "KJs", "KTs", "AQo", "QQ",
          "QJs", "JJ", "TT", "99", "88", "77",
        ],
        situational: [],
      },
      {
        kind: "raise",
        label: "4бет",
        color: "red",
        always: [
          "AA", "KK",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-defvs3bet-hj",
    group: "MTTDEF3BET",
    position: "HJ",
    title: "MTT защита от 3бета · HJ",
    subtitle: "открыли с HJ — стек 40bb+, 3бет соперника 5-7bb (колл 3бета 5.9% / 4бет 2.6%)",
    actions: [
      {
        kind: "call",
        label: "колл 3бета",
        color: "green",
        always: [
          "AQs", "AJs", "ATs", "KQs", "KJs", "KTs", "AQo", "QJs", "QTs", "JJ",
          "JTs", "TT", "99", "88", "77",
        ],
        situational: [],
      },
      {
        kind: "raise",
        label: "4бет",
        color: "red",
        always: [
          "AA", "AKs", "AKo", "KK", "QQ",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-defvs3bet-co",
    group: "MTTDEF3BET",
    position: "CO",
    title: "MTT защита от 3бета · CO",
    subtitle: "открыли с CO — стек 40bb+, 3бет соперника 5-7bb (колл 3бета 8.7% / 4бет 2.6%)",
    actions: [
      {
        kind: "call",
        label: "колл 3бета",
        color: "green",
        always: [
          "AQs", "AJs", "ATs", "A9s", "KQs", "KJs", "KTs", "AQo", "KQo", "QJs",
          "QTs", "AJo", "JJ", "JTs", "TT", "T9s", "99", "88", "77", "66",
        ],
        situational: [],
      },
      {
        kind: "raise",
        label: "4бет",
        color: "red",
        always: [
          "AA", "AKs", "AKo", "KK", "QQ",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-defvs3bet-bu",
    group: "MTTDEF3BET",
    position: "BU",
    title: "MTT защита от 3бета · BU",
    subtitle: "открыли с BU — стек 40bb+, 3бет соперника 5-7bb (колл 3бета 10.6% / 4бет 2.6%)",
    actions: [
      {
        kind: "call",
        label: "колл 3бета",
        color: "green",
        always: [
          "AQs", "AJs", "ATs", "A9s", "A8s", "KQs", "KJs", "KTs", "K9s", "AQo",
          "KQo", "QJs", "QTs", "Q9s", "AJo", "JJ", "JTs", "J9s", "TT", "T9s",
          "99", "98s", "88", "87s", "77", "66",
        ],
        situational: [],
      },
      {
        kind: "raise",
        label: "4бет",
        color: "red",
        always: [
          "AA", "AKs", "AKo", "KK", "QQ",
        ],
        situational: [],
      },
    ],
  },
];

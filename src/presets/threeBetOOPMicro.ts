// 3Bet OOP — "кэш микро", отдельный источник от Green Charts. Защита блайндов
// 3бетом без позиции против опена соперника.
//
// Позиция в `position` записана как "<защитник> vs <опенер(ы)>" — опенер
// иногда один (CO, BU, SB), иногда чарт сразу на два места (UTG,MP), потому
// что источник дал на них общий диапазон.
//
// Экспортировано из FlopzillaPro range-строкой (Copy range), не оцифровано
// скриптом — доверяем строке, а не пикселям скриншота.
//
// BB: руки, которые источник клал и в 3бет, и в колл (`bbCallMicro.ts`),
// разделены 50/50 — здесь они в situational. BB vs SB коллом не защищается
// вовсе: присланный колл-диапазон целиком перенесён в 3бет (объединением с
// прежним, где у руки было два веса — взят больший).

import { RangePreset } from "./types";

export const THREEBET_OOP_MICRO_PRESETS: RangePreset[] = [
  {
    id: "3betoop-micro-sb-vs-utg-mp",
    group: "3BETOOPMICRO",
    position: "SB vs UTG,MP",
    title: "3бет OOP микро · SB vs UTG,MP",
    subtitle: "SB — 3бет без позиции против опена UTG/MP, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
          "AA", "KK", "QQ", "JJ", "TT", "99",
          "AKs", "AQs", "AJs", "ATs", "A5s",
          "KQs", "KJs", "KTs",
          "QJs",
          "AKo", "AQo",
        ],
        situational: ["A4s", "KQo"],
      },
    ],
  },
  {
    id: "3betoop-micro-sb-vs-co",
    group: "3BETOOPMICRO",
    position: "SB vs CO",
    title: "3бет OOP микро · SB vs CO",
    subtitle: "SB — 3бет без позиции против опена CO, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
          "AA", "KK", "QQ", "JJ", "TT", "99", "88",
          "AKs", "AQs", "AJs", "ATs", "A9s",
          "A5s", "A4s",
          "KQs", "KJs", "KTs",
          "QJs", "QTs",
          "AKo", "AQo", "AJo",
          "KQo",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "3betoop-micro-sb-vs-bu",
    group: "3BETOOPMICRO",
    position: "SB vs BU",
    title: "3бет OOP микро · SB vs BU",
    subtitle: "SB — 3бет без позиции против опена BU, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
          "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66",
          "AKs", "AQs", "AJs", "ATs", "A9s", "A8s",
          "A5s", "A4s",
          "KQs", "KJs", "KTs", "K9s",
          "QJs", "QTs",
          "JTs",
          "AKo", "AQo", "AJo", "ATo",
          "KQo", "KJo",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "3betoop-micro-bb-vs-utg-mp",
    group: "3BETOOPMICRO",
    position: "BB vs UTG,MP",
    title: "3бет OOP микро · BB vs UTG,MP",
    subtitle: "BB — 3бет без позиции против опена UTG/MP, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
          "AA", "KK", "QQ", "JJ",
          "AKs", "AQs", "A5s", "A4s", "A3s", "A2s",
          "AKo",
        ],
        situational: [
          "AJs", "ATs",
          "KQs", "KJs", "KTs",
          "QJs", "QTs",
          "JTs",
          "AQo",
        ],
      },
    ],
  },
  {
    id: "3betoop-micro-bb-vs-bu",
    group: "3BETOOPMICRO",
    position: "BB vs BU",
    title: "3бет OOP микро · BB vs BU",
    subtitle: "BB — 3бет без позиции против опена BU, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
          "AA", "KK", "QQ", "JJ",
          "AKs", "AQs", "AJs", "ATs", "A5s", "A4s", "A3s", "A2s",
          "K5s", "K4s", "K3s", "K2s",
          "Q3s", "Q2s",
          "AKo",
        ],
        situational: [
          "TT",
          "KQs", "KJs", "KTs",
          "QJs", "QTs", "Q5s", "Q4s",
          "JTs", "J9s", "J8s", "J7s", "J6s", "J5s",
          "T9s", "T8s", "T7s", "T6s",
          "AQo", "ATo",
          "KJo", "KTo",
          "QJo", "QTo",
          "JTo",
        ],
      },
    ],
  },
  {
    id: "3betoop-micro-bb-vs-co",
    group: "3BETOOPMICRO",
    position: "BB vs CO",
    title: "3бет OOP микро · BB vs CO",
    subtitle: "BB — 3бет без позиции против опена CO, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
          "AA", "KK", "QQ", "JJ",
          "AKs", "AQs", "A5s", "A4s", "A3s", "A2s",
          "AKo",
        ],
        situational: [
          "TT",
          "AJs", "ATs",
          "KQs", "KJs", "KTs", "K5s", "K4s", "K3s", "K2s",
          "QJs", "QTs",
          "JTs",
          "AQo", "ATo",
          "KJo", "KTo",
          "QJo",
        ],
      },
    ],
  },
  {
    id: "3betoop-micro-bb-vs-sb",
    group: "3BETOOPMICRO",
    position: "BB vs SB",
    title: "3бет OOP микро · BB vs SB",
    subtitle: "BB — 3бет против опена SB, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
          "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22",
          "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
          "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s",
          "QJs", "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "Q2s",
          "JTs", "J9s", "J8s", "J7s",
          "T9s", "T8s", "T7s",
          "98s", "97s", "96s", "95s",
          "87s", "86s", "85s",
          "76s", "75s", "74s",
          "65s", "64s", "63s",
          "54s", "53s", "52s",
          "43s", "42s",
          "32s",
          "AKo", "AQo", "AJo", "ATo", "A9o", "A8o", "A5o", "A4o", "A3o", "A2o",
          "KQo", "KJo", "KTo",
          "QJo", "QTo",
          "JTo",
        ],
        situational: [
          "J6s", "J5s", "J4s", "J3s", "J2s",
          "T6s", "T5s", "T4s", "T3s", "T2s",
          "A7o", "A6o",
          "K9o", "K8o", "K7o", "K6o",
          "Q9o", "Q8o",
          "J9o", "J8o",
          "T9o", "T8o",
        ],
      },
    ],
  },
];

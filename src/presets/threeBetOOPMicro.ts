// 3Bet OOP — "кэш микро", отдельный источник от Green Charts. Защита SB
// 3бетом без позиции против опена соперника.
//
// Позиция в `position` записана как "<защитник> vs <опенер(ы)>" — опенер
// иногда один (CO, BU, SB), иногда чарт сразу на два места (UTG,MP), потому
// что источник дал на них общий диапазон.
//
// Экспортировано из FlopzillaPro range-строкой (Copy range), не оцифровано
// скриптом — доверяем строке, а не пикселям скриншота.
//
// Защита BB (3бет + колл + фолд) вынесена в один чарт — `bbDefenseMicro.ts`.

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
];

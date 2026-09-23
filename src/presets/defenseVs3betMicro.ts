// Защита опенера на 3бет без позиции — "кэш микро", отдельный источник от
// Green Charts. Опенер остаётся без позиции, когда 3бет пришёл от игрока,
// который сам оказался в позиции: против UTG/MP/CO это 3бет с более позднего
// места (см. threeBetIPMicro.ts), против SB — 3бет от BB, который у него
// в позиции постфлоп (BB против опена SB сам оказывается в позиции).
//
// Легенда источника: не в скобках — 4бет всегда (вес 1.0); [50] — колл
// половину раздач (вес 0.5 на колл); [30]/[25] — смешанная стратегия
// "4бет или фолд" с указанной частотой 4бета, остаток веса уходит в фолд
// молча (в модели диапазона это и так подразумевается весом < 1).
//
// Экспортировано из FlopzillaPro range-строкой (Copy range), не оцифровано
// скриптом — доверяем строке, а не пикселям скриншота.

import { RangePreset } from "./types";

export const DEF3BETOOP_MICRO_PRESETS: RangePreset[] = [
  {
    id: "def3betoop-micro-utg",
    group: "DEF3BETOOPMICRO",
    position: "UTG",
    title: "Защита на 3бет OOP микро · UTG",
    subtitle: "UTG получил 3бет в позицию, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "4бет",
        always: ["AA", "KK", "AJs", "KJs"],
        situational: [],
        mixed: { ATs: 0.3, KTs: 0.3, AQo: 0.3 },
      },
      {
        kind: "call",
        label: "колл",
        always: [],
        situational: ["QQ", "JJ", "TT", "AKs", "AQs", "KQs", "AKo"],
      },
    ],
  },
  {
    id: "def3betoop-micro-mp",
    group: "DEF3BETOOPMICRO",
    position: "MP",
    title: "Защита на 3бет OOP микро · MP",
    subtitle: "MP получил 3бет в позицию, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "4бет",
        always: ["AA", "KK", "AJs", "ATs", "KJs", "KTs", "AQo"],
        situational: [],
      },
      {
        kind: "call",
        label: "колл",
        always: [],
        situational: ["QQ", "JJ", "TT", "AKs", "AQs", "KQs", "AKo"],
      },
    ],
  },
  {
    id: "def3betoop-micro-co",
    group: "DEF3BETOOPMICRO",
    position: "CO",
    title: "Защита на 3бет OOP микро · CO",
    subtitle: "CO получил 3бет в позицию, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "4бет",
        always: ["AA", "KK", "ATs", "KJs", "KTs", "AQo"],
        situational: [],
      },
      {
        kind: "call",
        label: "колл",
        always: [],
        situational: [
          "QQ", "JJ", "TT", "99", "88", "77",
          "AKs", "AQs", "AJs",
          "KQs",
          "AKo",
        ],
      },
    ],
  },
  {
    id: "def3betoop-micro-sb",
    group: "DEF3BETOOPMICRO",
    position: "SB",
    title: "Защита на 3бет OOP микро · SB",
    subtitle: "SB получил 3бет от BB (тот в позиции), источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "4бет",
        always: ["AA", "KK", "QQ", "JJ", "AKs", "ATs", "AKo", "AJo", "KQo"],
        situational: [],
        mixed: { ATo: 0.25, KJo: 0.25 },
      },
      {
        kind: "call",
        label: "колл",
        always: [],
        situational: [
          "TT", "99", "88", "77", "66", "55",
          "AQs", "AJs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s",
          "KQs", "KJs", "KTs", "K9s", "K8s",
          "QJs", "QTs", "Q9s",
          "JTs", "J9s",
          "T9s", "T8s",
          "98s",
        ],
      },
    ],
  },
];

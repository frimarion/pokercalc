// Защита опенера на 3бет в позиции — "кэш микро", отдельный источник от
// Green Charts. Опенер остаётся в позиции, когда 3бет пришёл с блайнда (он
// ходит постфлоп первым) — зеркально defenseVs3betMicro.ts, где 3бет пришёл
// от игрока, который сам оказался в позиции.
//
// Легенда та же, что и в defenseVs3betMicro.ts: не в скобках — 4бет всегда
// (вес 1.0), [50] — колл половину раздач (вес 0.5 на колл). Здесь дробных
// блоков кроме [50] в источнике нет.
//
// Экспортировано из FlopzillaPro range-строкой (Copy range), не оцифровано
// скриптом — доверяем строке, а не пикселям скриншота.

import { RangePreset } from "./types";

export const DEF3BETIP_MICRO_PRESETS: RangePreset[] = [
  {
    id: "def3betip-micro-utg",
    group: "DEF3BETIPMICRO",
    position: "UTG",
    title: "Защита на 3бет IP микро · UTG",
    subtitle: "UTG получил 3бет с блайнда, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "4бет",
        always: ["AA", "KK", "KJs"],
        situational: [],
      },
      {
        kind: "call",
        label: "колл",
        always: [],
        situational: ["QQ", "JJ", "TT", "AKs", "AQs", "AJs", "KQs", "AKo"],
      },
    ],
  },
  {
    id: "def3betip-micro-mp",
    group: "DEF3BETIPMICRO",
    position: "MP",
    title: "Защита на 3бет IP микро · MP",
    subtitle: "MP получил 3бет с блайнда, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "4бет",
        always: ["AA", "KK", "KTs"],
        situational: [],
      },
      {
        kind: "call",
        label: "колл",
        always: [],
        situational: [
          "QQ", "JJ", "TT", "99",
          "AKs", "AQs", "AJs", "ATs",
          "KQs", "KJs",
          "AKo",
        ],
      },
    ],
  },
  {
    id: "def3betip-micro-co",
    group: "DEF3BETIPMICRO",
    position: "CO",
    title: "Защита на 3бет IP микро · CO",
    subtitle: "CO получил 3бет с блайнда, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "4бет",
        always: ["AA", "KK", "AQo"],
        situational: [],
      },
      {
        kind: "call",
        label: "колл",
        always: [],
        situational: [
          "QQ", "JJ", "TT", "99", "88", "77",
          "AKs", "AQs", "AJs", "ATs",
          "KQs", "KJs", "KTs",
          "AKo",
        ],
      },
    ],
  },
  {
    id: "def3betip-micro-btn",
    group: "DEF3BETIPMICRO",
    position: "BU",
    title: "Защита на 3бет IP микро · BU",
    subtitle: "BU получил 3бет с блайнда, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "4бет",
        always: ["AA", "KK", "AJo", "KQo"],
        situational: [],
      },
      {
        kind: "call",
        label: "колл",
        always: [],
        situational: [
          "QQ", "JJ", "TT", "99", "88", "77", "66", "55",
          "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
          "KQs", "KJs", "KTs", "K9s",
          "QJs", "QTs", "Q9s",
          "JTs", "J9s",
          "T9s", "T8s",
          "98s",
          "AKo", "AQo",
        ],
      },
    ],
  },
];

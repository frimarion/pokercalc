// 3Bet IP — "кэш микро", отдельный источник от Green Charts.
//
// В отличие от threeBetIP.ts (Green Charts, где чарт выбирается по ширине
// опена соперника — 15/18/26%), здесь диапазон 3бета в позиции задан прямо
// по месту опенера: против UTG, MP или CO. Соответствует дереву источника
// в FlopzillaPro (Cash micro → 3bet IP → vs UTG/vs MP/vs CO).
//
// Экспортировано из FlopzillaPro range-строкой (Copy range), не оцифровано
// скриптом — доверяем строке, а не пикселям скриншота.

import { RangePreset } from "./types";

export const THREEBET_IP_MICRO_PRESETS: RangePreset[] = [
  {
    id: "3betip-micro-utg",
    group: "3BETIPMICRO",
    position: "vs UTG",
    title: "3бет IP микро · vs UTG",
    subtitle: "3бет в позиции против опена UTG, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
          "AA", "KK", "QQ", "JJ", "TT", "99",
          "AKs", "AQs", "AJs", "ATs",
          "KQs", "KJs",
          "AKo", "AQo",
        ],
        situational: ["A9s", "A5s", "A4s", "KTs", "KQo"],
      },
    ],
  },
  {
    id: "3betip-micro-mp",
    group: "3BETIPMICRO",
    position: "vs MP",
    title: "3бет IP микро · vs MP",
    subtitle: "3бет в позиции против опена MP, источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
          "AA", "KK", "QQ", "JJ", "TT", "99",
          "AKs", "AQs", "AJs", "ATs",
          "KQs", "KJs", "KTs",
          "AKo", "AQo", "KQo",
        ],
        situational: ["A9s", "A5s", "A4s", "QJs", "AJo"],
      },
    ],
  },
  {
    id: "3betip-micro-co",
    group: "3BETIPMICRO",
    position: "vs CO",
    title: "3бет IP микро · vs CO",
    subtitle: "3бет в позиции против опена CO, источник \"кэш микро\"",
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
          "JTs",
          "AKo", "AQo", "AJo",
          "KQo",
        ],
        situational: [
          "77", "66", "55",
          "A8s", "A7s", "A6s", "A3s",
          "K9s", "Q9s", "J9s", "T9s",
          "ATo", "KJo", "QJo",
        ],
      },
    ],
  },
];

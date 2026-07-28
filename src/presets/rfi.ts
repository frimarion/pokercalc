// Open Raise (RFI) — диапазоны открытия (Green Charts, стр. 4).
//
// Легенда чарта: красный — открываем всегда, жёлтый — только в подходящих
// ситуациях (например, когда на блайндах сидят фиши).
// Сайзинг: CO/BU — 2.5bb, остальные позиции — 3bb.

import { RangePreset } from "./types";

export const RFI_PRESETS: RangePreset[] = [
  {
    id: "rfi-utg",
    group: "RFI",
    position: "UTG",
    title: "RFI · UTG",
    subtitle: "Under the Gun — открытие рейзом (3bb)",
    actions: [
      {
        kind: "raise",
        label: "открытие",
        always: [
          "AA", "AKo", "AKs", "AQo", "AQs", "AJo", "AJs", "ATo", "ATs", "A9s",
          "KK", "KQo", "KQs", "KJs", "KTs", "QQ", "QJs", "QTs", "JJ", "JTs",
          "TT", "T9s", "99", "88", "77", "66"
        ],
        situational: [
          "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s", "98s", "87s", "76s",
          "65s", "55"
        ],
      },
    ],
  },
  {
    id: "rfi-mp",
    group: "RFI",
    position: "MP",
    title: "RFI · MP",
    subtitle: "Middle Position — открытие рейзом (3bb)",
    actions: [
      {
        kind: "raise",
        label: "открытие",
        always: [
          "AA", "AKo", "AKs", "AQo", "AQs", "AJo", "AJs", "ATo", "ATs", "A9s",
          "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s", "KK", "KQo", "KQs",
          "KJs", "KTs", "QQ", "QJs", "QTs", "JJ", "JTs", "TT", "T9s", "99",
          "88", "77", "66", "55"
        ],
        situational: [
          "KJo", "K9s", "Q9s", "J9s", "98s", "87s", "76s", "65s"
        ],
      },
    ],
  },
  {
    id: "rfi-co",
    group: "RFI",
    position: "CO",
    title: "RFI · CO",
    subtitle: "Cut Off — открытие рейзом (2.5bb)",
    actions: [
      {
        kind: "raise",
        label: "открытие",
        always: [
          "AA", "AKo", "AKs", "AQo", "AQs", "AJo", "AJs", "ATo", "ATs", "A9s",
          "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s", "KK", "KQo", "KQs",
          "KJo", "KJs", "KTo", "KTs", "K9s", "K8s", "K7s", "QQ", "QJo", "QJs",
          "QTo", "QTs", "Q9s", "Q8s", "JJ", "JTo", "JTs", "J9s", "J8s", "TT",
          "T9s", "T8s", "99", "98s", "88", "87s", "77", "76s", "66", "65s",
          "55", "44"
        ],
        situational: [
          "A9o", "K6s", "K5s", "K4s", "Q7s", "J7s", "T7s", "97s", "86s", "75s",
          "64s", "54s", "33", "22"
        ],
      },
    ],
  },
  {
    id: "rfi-bu",
    group: "RFI",
    position: "BU",
    title: "RFI · BU",
    subtitle: "Button — открытие рейзом (2.5bb)",
    actions: [
      {
        kind: "raise",
        label: "открытие",
        always: [
          "AA", "AKo", "AKs", "AQo", "AQs", "AJo", "AJs", "ATo", "ATs", "A9o",
          "A9s", "A8o", "A8s", "A7o", "A7s", "A6s", "A5o", "A5s", "A4o", "A4s",
          "A3s", "A2s", "KK", "KQo", "KQs", "KJo", "KJs", "KTo", "KTs", "K9o",
          "K9s", "K8o", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s", "QQ",
          "QJo", "QJs", "QTo", "QTs", "Q9o", "Q9s", "Q8o", "Q8s", "Q7s", "Q6s",
          "JJ", "JTo", "JTs", "J9o", "J9s", "J8s", "J7s", "TT", "T9o", "T9s",
          "T8s", "T7s", "99", "98s", "97s", "88", "87s", "86s", "77", "76s",
          "75s", "66", "65s", "64s", "55", "54s", "53s", "44", "43s", "33",
          "22"
        ],
        situational: [
          "A6o", "A3o", "A2o", "Q5s", "Q4s", "Q3s", "Q2s", "J6s", "J5s", "J4s",
          "J3s", "J2s", "96s", "85s", "74s", "63s"
        ],
      },
    ],
  },
  {
    id: "rfi-sb",
    group: "RFI",
    position: "SB",
    title: "RFI · SB",
    subtitle: "Small Blind — открытие рейзом (3bb)",
    actions: [
      {
        kind: "raise",
        label: "открытие",
        always: [
          "AA", "AKo", "AKs", "AQo", "AQs", "AJo", "AJs", "ATo", "ATs", "A9o",
          "A9s", "A8o", "A8s", "A7o", "A7s", "A6o", "A6s", "A5o", "A5s", "A4o",
          "A4s", "A3o", "A3s", "A2s", "KK", "KQo", "KQs", "KJo", "KJs", "KTo",
          "KTs", "K9o", "K9s", "K8o", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s",
          "K2s", "QQ", "QJo", "QJs", "QTo", "QTs", "Q9o", "Q9s", "Q8s", "Q7s",
          "Q6s", "Q5s", "Q4s", "Q3s", "Q2s", "JJ", "JTo", "JTs", "J9o", "J9s",
          "J8s", "J7s", "J6s", "J5s", "TT", "T9o", "T9s", "T8s", "T7s", "T6s",
          "99", "98s", "97s", "96s", "88", "87s", "86s", "77", "76s", "75s",
          "66", "65s", "64s", "55", "54s", "44", "33", "22"
        ],
        situational: [
          "Q8o", "J8o", "J4s", "T8o", "98o", "85s", "74s", "53s", "43s"
        ],
      },
    ],
  },
];

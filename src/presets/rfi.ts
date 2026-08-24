// Open Raise (RFI) — диапазоны открытия (Green Charts, стр. 4).
//
// Легенда чарта: красный — открываем всегда, жёлтый — только в подходящих
// ситуациях (например, когда на блайндах сидят фиши).
// Сайзинг: CO/BU — 2.5bb, остальные позиции — 3bb.
//
// У UTG чарт заменён на трёхцветный: там есть ещё зелёный — «открываем,
// только если на блайндах супер-ВИП». Это отдельное действие того же
// kind: "raise" со своим цветом (приём из blinds4bet.ts) и весом 0.25.

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
          "AA", "AKo", "AKs", "AQo", "AQs", "AJo", "AJs", "ATs",
          "KK", "KQo", "KQs", "KJs", "KTs", "QQ", "QJs", "QTs", "JJ", "JTs",
          "TT", "99", "88", "77", "66"
        ],
        situational: [
          "ATo", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s",
          "K9s", "Q9s", "T9s", "98s", "87s", "76s", "55"
        ],
      },
      {
        // Зелёный на чарте: открываем, только когда на блайндах сидит
        // «супер-ВИП» — то есть реже, чем жёлтое «ситуативно», отсюда 0.25.
        kind: "raise",
        label: "фиш на блайндах",
        color: "green",
        always: [],
        situational: [],
        quarter: ["A2s", "KJo", "QJo", "J9s", "65s", "44", "33", "22"],
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
          "KJs", "KTs", "QQ", "QJs", "QTs", "JJ", "JTs", "TT", "99",
          "88", "77", "66"
        ],
        situational: [
          "KJo", "QJo", "K9s", "Q9s", "J9s", "T9s", "98s", "87s", "76s", "55"
        ],
      },
      {
        kind: "raise",
        label: "фиш на блайндах",
        color: "green",
        always: [],
        situational: [],
        quarter: ["65s", "44", "33", "22"],
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
          "K6s", "K5s", "K4s", "Q7s", "J7s", "T7s", "97s", "54s", "33", "22"
        ],
      },
      {
        kind: "raise",
        label: "фиш на блайндах",
        color: "green",
        always: [],
        situational: [],
        quarter: [
          "A9o", "K3s", "K2s", "Q6s", "J6s", "96s", "86s", "85s", "75s", "74s",
          "64s", "53s", "43s"
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
          "QJo", "QJs", "QTo", "QTs", "Q9o", "Q9s", "Q8s", "Q7s", "Q6s",
          "JJ", "JTo", "JTs", "J9o", "J9s", "J8s", "J7s", "TT", "T9o", "T9s",
          "T8s", "T7s", "99", "98s", "97s", "88", "87s", "77", "76s",
          "66", "65s", "55", "54s", "44"
        ],
        situational: [
          "A6o", "A3o", "A2o", "Q8o", "J8o", "T8o", "98o",
          "Q5s", "Q4s", "Q3s", "Q2s", "J6s", "J5s", "J4s", "J3s", "J2s",
          "T6s", "96s", "86s", "85s", "75s", "74s", "64s", "63s", "53s", "43s",
          "33", "22"
        ],
      },
      {
        kind: "raise",
        label: "фиш на блайндах",
        color: "green",
        always: [],
        situational: [],
        quarter: ["K7o", "87o", "76o", "95s", "84s", "73s", "52s", "42s", "32s"],
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
          "KTs", "K9o", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s",
          "K2s", "QQ", "QJo", "QJs", "QTo", "QTs", "Q9o", "Q9s", "Q8s", "Q7s",
          "Q6s", "Q5s", "Q4s", "Q3s", "Q2s", "JJ", "JTo", "JTs", "J9o", "J9s",
          "J8s", "J7s", "J6s", "J5s", "J4s", "J3s", "TT", "T9o", "T9s", "T8s",
          "T7s", "T6s",
          "99", "98s", "97s", "96s", "88", "87s", "86s", "77", "76s", "75s",
          "66", "65s", "64s", "55", "54s", "44", "33", "32s", "22"
        ],
        situational: [
          "K8o", "Q8o", "J8o", "T8o", "98o", "K7o", "87o", "76o", "A2o",
          "J2s", "T5s", "95s", "85s", "74s", "53s", "43s"
        ],
      },
      {
        kind: "raise",
        label: "фиш на блайндах",
        color: "green",
        always: [],
        situational: [],
        quarter: [
          "T4s", "T3s", "T2s", "94s", "93s", "92s", "84s", "83s", "82s",
          "73s", "72s", "63s", "62s", "52s", "42s",
          "Q7o", "J7o", "T7o", "97o",
          "K6o", "Q6o", "J6o", "T6o", "96o", "86o",
          "K5o", "Q5o", "J5o", "T5o", "95o", "85o", "75o", "65o",
          "K4o", "Q4o", "J4o", "T4o", "94o", "84o", "74o", "64o", "54o",
          "K3o", "Q3o", "J3o", "T3o", "93o", "83o", "73o", "63o", "53o", "43o",
          "K2o", "Q2o", "J2o", "T2o", "92o", "82o", "72o", "62o", "52o", "42o",
          "32o"
        ],
      },
    ],
  },
];

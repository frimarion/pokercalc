// MTT · изолейт после лимпа. Источник — FF START, страница №2.
//
// Три действия: обычный изолейт 3.5bb (оранжевый), крупный 5-7bb
// с сильными руками (красный) и оверлимп (зелёный). Красный —
// это тоже изолейт, а не отдельное решение, поэтому оба идут
// одним kind="raise" и различаются только цветом легенды —
// тот же приём, что с «4бет-фолд»/«4бет-пуш» в кэшевых чартах.
//
// Подписанный на чарте процент = оранжевый + красный.
//
// Сгенерировано tools/gen_mtt.py — РУКАМИ НЕ ПРАВИТЬ.

import { RangePreset } from "../types";

export const MTT_ISO_PRESETS: RangePreset[] = [
  {
    id: "mtt-iso-ep",
    group: "MTTISO",
    position: "EP",
    title: "MTT изолейт · EP",
    subtitle: "ранняя позиция, один лимпер — изолейт 3.5bb, с сильными руками 5-7bb (13.7%)",
    actions: [
      {
        kind: "raise",
        label: "изолейт 3.5bb",
        color: "orange",
        always: [
          "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "KQs",
          "KJs", "KTs", "K9s", "AQo", "KQo", "QJs", "QTs", "AJo", "KJo", "JJ",
          "JTs", "TT", "99", "88", "77", "66",
        ],
        situational: [],
      },
      {
        kind: "raise",
        label: "крупный изолейт 5-7bb",
        color: "red",
        always: [
          "AA", "AKs", "AKo", "KK", "QQ",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-iso-mp",
    group: "MTTISO",
    position: "MP",
    title: "MTT изолейт · MP",
    subtitle: "один лимпер — изолейт 3.5bb, с сильными руками 5-7bb (19.0%)",
    actions: [
      {
        kind: "raise",
        label: "изолейт 3.5bb",
        color: "orange",
        always: [
          "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s",
          "A2s", "KQs", "KJs", "KTs", "K9s", "K8s", "AQo", "KQo", "QJs", "QTs",
          "Q9s", "Q8s", "AJo", "KJo", "QJo", "JJ", "JTs", "J9s", "J8s", "ATo",
          "TT", "T9s", "T8s", "99", "98s", "88", "77", "66", "55",
        ],
        situational: [],
      },
      {
        kind: "raise",
        label: "крупный изолейт 5-7bb",
        color: "red",
        always: [
          "AA", "AKs", "AKo", "KK", "QQ",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-iso-hj",
    group: "MTTISO",
    position: "HJ",
    title: "MTT изолейт · HJ",
    subtitle: "один лимпер — изолейт 3.5bb, с сильными руками 5-7bb (23.2%)",
    actions: [
      {
        kind: "raise",
        label: "изолейт 3.5bb",
        color: "orange",
        always: [
          "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s",
          "A2s", "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "AQo", "KQo", "QJs",
          "QTs", "Q9s", "Q8s", "AJo", "KJo", "QJo", "JJ", "JTs", "J9s", "J8s",
          "ATo", "KTo", "QTo", "JTo", "TT", "T9s", "T8s", "A9o", "99", "98s",
          "88", "87s", "77", "66", "55",
        ],
        situational: [],
      },
      {
        kind: "raise",
        label: "крупный изолейт 5-7bb",
        color: "red",
        always: [
          "AA", "AKs", "AKo", "KK", "QQ",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-iso-multi",
    group: "MTTISO",
    position: "vs 2+",
    title: "MTT изолейт · vs 2+",
    subtitle: "два и больше лимперов, любая позиция — изолейт 3.5bb, с сильными руками 5-7bb (рейз 16.6% / оверлимп 4.7%)",
    actions: [
      {
        kind: "raise",
        label: "изолейт 3.5bb",
        color: "orange",
        always: [
          "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "KQs", "KJs",
          "KTs", "K9s", "AQo", "KQo", "QJs", "QTs", "Q9s", "AJo", "KJo", "QJo",
          "JJ", "JTs", "J9s", "ATo", "KTo", "TT", "T9s", "99", "88", "77",
        ],
        situational: [],
      },
      {
        kind: "raise",
        label: "крупный изолейт 5-7bb",
        color: "red",
        always: [
          "AA", "AKs", "AKo", "KK", "QQ",
        ],
        situational: [],
      },
      {
        kind: "call",
        label: "оверлимп",
        color: "green",
        always: [
          "A4s", "A3s", "A2s", "K8s", "Q8s", "J8s", "T8s", "98s", "66", "55",
          "44", "33", "22",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-iso-co",
    group: "MTTISO",
    position: "CO",
    title: "MTT изолейт · CO",
    subtitle: "один лимпер — изолейт 3.5bb, с сильными руками 5-7bb (рейз 25.5% / оверлимп 11.5%)",
    actions: [
      {
        kind: "raise",
        label: "изолейт 3.5bb",
        color: "orange",
        always: [
          "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "KQs", "KJs",
          "KTs", "K9s", "K8s", "K7s", "K6s", "AQo", "KQo", "QJs", "QTs", "Q9s",
          "Q8s", "Q7s", "AJo", "KJo", "QJo", "JJ", "JTs", "J9s", "J8s", "J7s",
          "ATo", "KTo", "QTo", "JTo", "TT", "T9s", "T8s", "T7s", "A9o", "99",
          "98s", "97s", "A8o", "88", "87s", "77", "76s", "66", "55", "44",
        ],
        situational: [],
      },
      {
        kind: "raise",
        label: "крупный изолейт 5-7bb",
        color: "red",
        always: [
          "AA", "AKs", "AKo", "KK", "QQ",
        ],
        situational: [],
      },
      {
        kind: "call",
        label: "оверлимп",
        color: "green",
        always: [
          "A4s", "A3s", "A2s", "K5s", "K4s", "K3s", "K2s", "Q6s", "Q5s", "Q4s",
          "J6s", "T6s", "K9o", "Q9o", "J9o", "T9o", "96s", "86s", "A7o", "75s",
          "65s", "A5o", "54s", "33", "22",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-iso-bu",
    group: "MTTISO",
    position: "BU",
    title: "MTT изолейт · BU",
    subtitle: "один лимпер — изолейт 3.5bb, с сильными руками 5-7bb (рейз 37.0% / оверлимп 17.2%)",
    actions: [
      {
        kind: "raise",
        label: "изолейт 3.5bb",
        color: "orange",
        always: [
          "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s",
          "A2s", "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s",
          "K3s", "K2s", "AQo", "KQo", "QJs", "QTs", "Q9s", "Q8s", "Q7s", "Q6s",
          "Q5s", "Q4s", "AJo", "KJo", "QJo", "JJ", "JTs", "J9s", "J8s", "J7s",
          "J6s", "ATo", "KTo", "QTo", "JTo", "TT", "T9s", "T8s", "T7s", "T6s",
          "A9o", "K9o", "Q9o", "J9o", "99", "98s", "97s", "96s", "A8o", "88",
          "87s", "86s", "A7o", "77", "76s", "A6o", "66", "65s", "A5o", "55",
          "54s", "44", "43s", "33", "22",
        ],
        situational: [],
      },
      {
        kind: "raise",
        label: "крупный изолейт 5-7bb",
        color: "red",
        always: [
          "AA", "AKs", "AKo", "KK", "QQ",
        ],
        situational: [],
      },
      {
        kind: "call",
        label: "оверлимп",
        color: "green",
        always: [
          "Q3s", "Q2s", "J5s", "J4s", "J3s", "J2s", "T5s", "T4s", "T3s", "T9o",
          "95s", "K8o", "Q8o", "J8o", "T8o", "98o", "85s", "K7o", "Q7o", "97o",
          "87o", "75s", "74s", "K6o", "64s", "53s", "A4o", "A3o", "A2o",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-iso-sb",
    group: "MTTISO",
    position: "SB",
    title: "MTT изолейт · SB",
    subtitle: "один лимпер — изолейт 3.5bb, с сильными руками 5-7bb (рейз 11.9% / оверлимп 64.6%)",
    actions: [
      {
        kind: "raise",
        label: "изолейт 3.5bb",
        color: "orange",
        always: [
          "AQs", "AJs", "ATs", "A9s", "KQs", "KJs", "KTs", "AQo", "KQo", "QJs",
          "QTs", "AJo", "KJo", "JJ", "JTs", "ATo", "TT", "99", "88",
        ],
        situational: [],
      },
      {
        kind: "raise",
        label: "крупный изолейт 5-7bb",
        color: "red",
        always: [
          "AA", "AKs", "AKo", "KK", "QQ",
        ],
        situational: [],
      },
      {
        kind: "call",
        label: "оверлимп",
        color: "green",
        always: [
          "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s", "K9s", "K8s", "K7s",
          "K6s", "K5s", "K4s", "K3s", "K2s", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s",
          "Q4s", "Q3s", "Q2s", "QJo", "J9s", "J8s", "J7s", "J6s", "J5s", "J4s",
          "J3s", "J2s", "KTo", "QTo", "JTo", "T9s", "T8s", "T7s", "T6s", "T5s",
          "T4s", "T3s", "T2s", "A9o", "K9o", "Q9o", "J9o", "T9o", "98s", "97s",
          "96s", "95s", "94s", "93s", "92s", "A8o", "K8o", "Q8o", "J8o", "T8o",
          "98o", "87s", "86s", "85s", "84s", "83s", "82s", "A7o", "K7o", "Q7o",
          "J7o", "T7o", "97o", "87o", "77", "76s", "75s", "74s", "73s", "72s",
          "A6o", "K6o", "Q6o", "J6o", "T6o", "96o", "86o", "76o", "66", "65s",
          "64s", "63s", "62s", "A5o", "K5o", "Q5o", "J5o", "75o", "65o", "55",
          "54s", "53s", "52s", "A4o", "K4o", "Q4o", "64o", "54o", "44", "43s",
          "42s", "A3o", "K3o", "43o", "33", "32s", "A2o", "K2o", "22",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-iso-bb",
    group: "MTTISO",
    position: "BB",
    title: "MTT изолейт · BB",
    subtitle: "один лимпер — изолейт 3.5bb, с сильными руками 5-7bb (14.5%)",
    actions: [
      {
        kind: "raise",
        label: "изолейт 3.5bb",
        color: "orange",
        always: [
          "AQs", "AJs", "ATs", "A9s", "A8s", "KQs", "KJs", "KTs", "AQo", "KQo",
          "QJs", "QTs", "AJo", "KJo", "QJo", "JJ", "JTs", "ATo", "TT", "A9o",
          "99", "88", "77",
        ],
        situational: [],
      },
      {
        kind: "raise",
        label: "крупный изолейт 5-7bb",
        color: "red",
        always: [
          "AA", "AKs", "AKo", "KK", "QQ",
        ],
        situational: [],
      },
    ],
  },
];

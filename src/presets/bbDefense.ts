// BB Defense — защита большого блайнда (Green Charts, стр. 7).
//
// Легенда чарта: красный — 3бетим, зелёный — коллируем префлоп рейз.
// Ячейки, закрашенные наполовину, означают смешанную стратегию: половину
// раздач 3бет, половину колл — такие руки попадают в ОБА действия с весом 0.5.
//
// Сайзинг 3бета из чарта:
//   OOP (BB против всех, кроме SB): опен 2.5bb → 10bb, опен 3bb → 12bb
//   IP  (BB против SB):             опен 2.5bb →  9bb, опен 3bb → 10bb

import { RangePreset } from "./types";

export const BBDEF_PRESETS: RangePreset[] = [
  {
    id: "bbdef-vs-utg",
    group: "BBDEF",
    position: "vs UTG",
    title: "BB защита · vs UTG",
    subtitle: "Против опена UTG (3bb) — 3бет до 12bb",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
        "AA", "AKs", "KK", "KQs", "KJs", "QQ", "QJs"
        ],
        situational: [
        "AKo", "AQs", "AJs", "ATs", "A5s", "A4s", "KTs", "QTs", "JJ", "JTs",
        "TT"
        ],
      },
      {
        kind: "call",
        label: "колл",
        always: [
        "AQo", "AJo", "A9s", "A8s", "A7s", "A6s", "A3s", "A2s", "KQo", "K9s",
        "Q9s", "J9s", "T9s", "99", "98s", "88", "87s", "77", "76s", "66", "55",
        "44", "33", "22"
        ],
        situational: [
        "AKo", "AQs", "AJs", "ATs", "A5s", "A4s", "KTs", "QTs", "JJ", "JTs",
        "TT"
        ],
      },
    ],
  },
  {
    id: "bbdef-vs-mp",
    group: "BBDEF",
    position: "vs MP",
    title: "BB защита · vs MP",
    subtitle: "Против опена MP (3bb) — 3бет до 12bb",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
        "AA", "AKo", "AKs", "AQs", "KK", "KQs", "KJs", "QQ", "QJs", "JJ"
        ],
        situational: [
        "AJs", "ATs", "A5s", "A4s", "KTs", "QTs", "JTs", "TT", "99"
        ],
      },
      {
        kind: "call",
        label: "колл",
        always: [
        "AQo", "AJo", "ATo", "A9s", "A8s", "A7s", "A6s", "A3s", "A2s", "KQo",
        "KJo", "K9s", "K8s", "Q9s", "J9s", "T9s", "T8s", "98s", "97s", "88",
        "87s", "77", "76s", "66", "55", "44", "33", "22"
        ],
        situational: [
        "AJs", "ATs", "A5s", "A4s", "KTs", "QTs", "JTs", "TT", "99"
        ],
      },
    ],
  },
  {
    id: "bbdef-vs-co",
    group: "BBDEF",
    position: "vs CO",
    title: "BB защита · vs CO",
    subtitle: "Против опена CO (2.5bb) — 3бет до 10bb",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
        "AA", "AKo", "AKs", "AQs", "AJs", "KK", "KQs", "KJs", "KTs", "QQ",
        "QJs", "QTs", "JJ", "JTs", "TT"
        ],
        situational: [
        "AQo", "ATs", "A9s", "A5s", "A4s", "K9s", "Q9s", "J9s", "T9s", "99"
        ],
      },
      {
        kind: "call",
        label: "колл",
        always: [
        "AJo", "ATo", "A8s", "A7s", "A6s", "A3s", "A2s", "KQo", "KJo", "K8s",
        "K7s", "K6s", "K5s", "Q8s", "Q7s", "J8s", "T8s", "98s", "97s", "88",
        "87s", "86s", "77", "76s", "66", "65s", "55", "54s", "44", "33", "22"
        ],
        situational: [
        "AQo", "ATs", "A9s", "A5s", "A4s", "K9s", "Q9s", "J9s", "T9s", "99"
        ],
      },
    ],
  },
  {
    id: "bbdef-vs-sb",
    group: "BBDEF",
    position: "vs SB",
    title: "BB защита · vs SB",
    subtitle: "Против опена SB — 3бет до 9-10bb, BB в позиции",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
        "AA", "AKo", "AKs", "AQo", "AQs", "AJs", "ATs", "A5s", "A4s", "KK",
        "KQs", "KJs", "KTs", "QQ", "QJs", "JJ", "JTs", "TT", "T9s", "99",
        "98s", "87s", "76s", "65s", "54s"
        ],
        situational: [
        "AJo", "A9s", "A5o", "A4o", "A3o", "A3s", "A2o", "KQo", "K9s", "K8o",
        "K7o", "K7s", "K6o", "K6s", "K5o", "QTs", "Q8o", "J9s", "J8o", "J4s",
        "J3s", "T8o", "T8s", "T5s", "T4s", "T3s", "T2s", "97s", "88", "77"
        ],
      },
      {
        kind: "call",
        label: "колл",
        always: [
        "ATo", "A9o", "A8o", "A8s", "A7o", "A7s", "A6o", "A6s", "A2s", "KJo",
        "KTo", "K9o", "K8s", "K5s", "K4s", "K3s", "K2s", "QJo", "QTo", "Q9o",
        "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "Q2s", "JTo", "J9o",
        "J8s", "J7s", "J6s", "J5s", "J2s", "T9o", "T7s", "T6s", "98o", "96s",
        "95s", "94s", "93s", "87o", "86s", "85s", "84s", "76o", "75s", "74s",
        "73s", "66", "65o", "64s", "63s", "55", "53s", "52s", "44", "43s",
        "42s", "33", "32s", "22"
        ],
        situational: [
        "AJo", "A9s", "A5o", "A4o", "A3o", "A3s", "A2o", "KQo", "K9s", "K8o",
        "K7o", "K7s", "K6o", "K6s", "K5o", "QTs", "Q8o", "J9s", "J8o", "J4s",
        "J3s", "T8o", "T8s", "T5s", "T4s", "T3s", "T2s", "97s", "88", "77"
        ],
      },
    ],
  },
  {
    id: "bbdef-vs-bu-25",
    group: "BBDEF",
    position: "vs BU 2.5bb",
    title: "BB защита · vs BU 2.5bb",
    subtitle: "Против опена BU с сайзингом 2.5bb — 3бет до 10bb",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
        "AA", "AKo", "AKs", "AQo", "AQs", "AJs", "ATs", "A5s", "A4s", "KK",
        "KQs", "KJs", "KTs", "QQ", "QJs", "QTs", "Q9s", "JJ", "JTs", "J9s",
        "J8s", "TT", "T9s", "T8s", "99", "98s", "87s", "76s", "65s"
        ],
        situational: [
        "AJo", "A9s", "A8s", "A3s", "A2s", "KQo", "K9s", "88", "54s"
        ],
      },
      {
        kind: "call",
        label: "колл",
        always: [
        "ATo", "A9o", "A8o", "A7o", "A7s", "A6s", "A5o", "KJo", "KTo", "K9o",
        "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s", "QJo", "QTo", "Q9o",
        "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "Q2s", "JTo", "J9o", "J7s",
        "J6s", "T9o", "T7s", "T6s", "97s", "96s", "86s", "85s", "77", "75s",
        "74s", "66", "64s", "63s", "55", "53s", "44", "43s", "33", "22"
        ],
        situational: [
        "AJo", "A9s", "A8s", "A3s", "A2s", "KQo", "K9s", "88", "54s"
        ],
      },
    ],
  },
  {
    id: "bbdef-vs-bu-3",
    group: "BBDEF",
    position: "vs BU 3bb",
    title: "BB защита · vs BU 3bb",
    subtitle: "Против опена BU с сайзингом 3bb — 3бет до 12bb",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
        "AA", "AKo", "AKs", "AQo", "AQs", "AJs", "ATs", "A5s", "A4s", "KK",
        "KQs", "KJs", "KTs", "QQ", "QJs", "QTs", "JJ", "JTs", "TT", "T9s",
        "99", "98s"
        ],
        situational: [
        "A9s", "A3s", "K9s", "Q9s", "J9s", "J8s", "T8s", "88", "87s", "77",
        "76s"
        ],
      },
      {
        kind: "call",
        label: "колл",
        always: [
        "AJo", "ATo", "A9o", "A8o", "A8s", "A7o", "A7s", "A6s", "A5o", "A2s",
        "KQo", "KJo", "KTo", "K9o", "K8s", "K7s", "K6s", "K5s", "K4s", "QJo",
        "QTo", "Q8s", "Q7s", "Q6s", "JTo", "J7s", "T9o", "T7s", "97s", "86s",
        "75s", "66", "65s", "64s", "55", "54s", "44", "33", "22"
        ],
        situational: [
        "A9s", "A3s", "K9s", "Q9s", "J9s", "J8s", "T8s", "88", "87s", "77",
        "76s"
        ],
      },
    ],
  },
];

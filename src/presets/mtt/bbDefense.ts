// MTT · защита большого блайнда. Источник — FF START, страница №5.
//
// Опен соперника 2-2.2bb. Диапазон колла огромный (40-57%) —
// это не ошибка извлечения: на низких лимитах BB защищается
// широко, потому что уже вложил блайнд и получает шансы банка.
//
// Сгенерировано tools/gen_mtt.py — РУКАМИ НЕ ПРАВИТЬ.

import { RangePreset } from "../types";

export const MTT_BBDEF_PRESETS: RangePreset[] = [
  {
    id: "mtt-bbdefense-early",
    group: "MTTBBDEF",
    position: "vs ранние",
    title: "MTT защита BB · vs ранние",
    subtitle: "EP, EP+1, EP+2 — опен соперника 2-2.2bb (3бет 6-10bb 6.3% / колл на рейз 2-2.2bb 41.8%)",
    actions: [
      {
        kind: "raise",
        label: "3бет 6-10bb",
        color: "red",
        always: [
          "AA", "AKs", "AQs", "AJs", "AKo", "KK", "KQs", "KJs", "AQo", "QQ",
          "QJs", "JJ", "TT", "99",
        ],
        situational: [],
      },
      {
        kind: "call",
        label: "колл на рейз 2-2.2bb",
        color: "green",
        always: [
          "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s", "KTs",
          "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s", "KQo", "QTs",
          "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "Q2s", "AJo", "KJo",
          "QJo", "JTs", "J9s", "J8s", "J7s", "J6s", "J5s", "J4s", "J3s", "J2s",
          "ATo", "KTo", "QTo", "JTo", "T9s", "T8s", "T7s", "T6s", "T5s", "A9o",
          "K9o", "Q9o", "J9o", "T9o", "98s", "97s", "96s", "95s", "A8o", "T8o",
          "98o", "88", "87s", "86s", "85s", "84s", "A7o", "97o", "87o", "77",
          "76s", "75s", "74s", "73s", "86o", "76o", "66", "65s", "64s", "63s",
          "75o", "65o", "55", "54s", "53s", "44", "43s", "33", "22",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-bbdefense-middle",
    group: "MTTBBDEF",
    position: "vs средние",
    title: "MTT защита BB · vs средние",
    subtitle: "MP, HJ — опен соперника 2-2.2bb (3бет 6-10bb 6.3% / колл на рейз 2-2.2bb 49.3%)",
    actions: [
      {
        kind: "raise",
        label: "3бет 6-10bb",
        color: "red",
        always: [
          "AA", "AKs", "AQs", "AJs", "AKo", "KK", "KQs", "KJs", "AQo", "QQ",
          "QJs", "JJ", "TT", "99",
        ],
        situational: [],
      },
      {
        kind: "call",
        label: "колл на рейз 2-2.2bb",
        color: "green",
        always: [
          "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s", "KTs",
          "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s", "KQo", "QTs",
          "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "Q2s", "AJo", "KJo",
          "QJo", "JTs", "J9s", "J8s", "J7s", "J6s", "J5s", "J4s", "J3s", "J2s",
          "ATo", "KTo", "QTo", "JTo", "T9s", "T8s", "T7s", "T6s", "T5s", "T4s",
          "T3s", "T2s", "A9o", "K9o", "Q9o", "J9o", "T9o", "98s", "97s", "96s",
          "95s", "94s", "93s", "92s", "A8o", "T8o", "98o", "88", "87s", "86s",
          "85s", "84s", "83s", "82s", "A7o", "97o", "87o", "77", "76s", "75s",
          "74s", "73s", "72s", "A6o", "86o", "76o", "66", "65s", "64s", "63s",
          "62s", "A5o", "75o", "65o", "55", "54s", "53s", "52s", "A4o", "54o",
          "44", "43s", "42s", "33", "32s", "22",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-bbdefense-late",
    group: "MTTBBDEF",
    position: "vs поздние",
    title: "MTT защита BB · vs поздние",
    subtitle: "CO, BU — опен соперника 2-2.2bb (3бет 6-10bb 6.3% / колл на рейз 2-2.2bb 56.6%)",
    actions: [
      {
        kind: "raise",
        label: "3бет 6-10bb",
        color: "red",
        always: [
          "AA", "AKs", "AQs", "AJs", "AKo", "KK", "KQs", "KJs", "AQo", "QQ",
          "QJs", "JJ", "TT", "99",
        ],
        situational: [],
      },
      {
        kind: "call",
        label: "колл на рейз 2-2.2bb",
        color: "green",
        always: [
          "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s", "KTs",
          "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s", "KQo", "QTs",
          "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "Q2s", "AJo", "KJo",
          "QJo", "JTs", "J9s", "J8s", "J7s", "J6s", "J5s", "J4s", "J3s", "J2s",
          "ATo", "KTo", "QTo", "JTo", "T9s", "T8s", "T7s", "T6s", "T5s", "T4s",
          "T3s", "T2s", "A9o", "K9o", "Q9o", "J9o", "T9o", "98s", "97s", "96s",
          "95s", "94s", "93s", "92s", "A8o", "K8o", "Q8o", "J8o", "T8o", "98o",
          "88", "87s", "86s", "85s", "84s", "83s", "82s", "A7o", "K7o", "T7o",
          "97o", "87o", "77", "76s", "75s", "74s", "73s", "72s", "A6o", "86o",
          "76o", "66", "65s", "64s", "63s", "62s", "A5o", "75o", "65o", "55",
          "54s", "53s", "52s", "A4o", "64o", "54o", "44", "43s", "42s", "A3o",
          "33", "32s", "A2o", "22",
        ],
        situational: [],
      },
    ],
  },
];

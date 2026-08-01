// MTT · опен-рейзы (RFI). Источник — FF START, страница №1.
//
// Стек 25bb+, сайзинг опена всегда 2bb. Позиции названы как в
// оригинале: на 8-max первая позиция — EP+1, на 6-max — MP.
//
// Сгенерировано tools/gen_mtt.py — РУКАМИ НЕ ПРАВИТЬ.

import { RangePreset } from "../types";

export const MTT_RFI_PRESETS: RangePreset[] = [
  {
    id: "mtt-rfi-ep1",
    group: "MTTRFI",
    position: "EP+1",
    title: "MTT RFI · EP+1",
    subtitle: "первая позиция за 8-max — стек 25bb+, опен 2bb (16.0%)",
    actions: [
      {
        kind: "raise",
        label: "опен 2bb",
        color: "purple",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "AQo", "KQo", "QQ",
          "QJs", "QTs", "Q9s", "AJo", "KJo", "JJ", "JTs", "J9s", "ATo", "TT",
          "T9s", "99", "88", "77", "66", "55",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-rfi-ep2",
    group: "MTTRFI",
    position: "EP+2",
    title: "MTT RFI · EP+2",
    subtitle: "вторая ранняя — стек 25bb+, опен 2bb (18.6%)",
    actions: [
      {
        kind: "raise",
        label: "опен 2bb",
        color: "purple",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "A3s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "K8s", "AQo",
          "KQo", "QQ", "QJs", "QTs", "Q9s", "AJo", "KJo", "QJo", "JJ", "JTs",
          "J9s", "ATo", "TT", "T9s", "T8s", "99", "98s", "88", "77", "66",
          "55", "44",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-rfi-mp",
    group: "MTTRFI",
    position: "MP",
    title: "MTT RFI · MP",
    subtitle: "первая позиция за 6-max — стек 25bb+, опен 2bb (22.0%)",
    actions: [
      {
        kind: "raise",
        label: "опен 2bb",
        color: "purple",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "A3s", "A2s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "K8s",
          "K7s", "K6s", "AQo", "KQo", "QQ", "QJs", "QTs", "Q9s", "Q8s", "AJo",
          "KJo", "QJo", "JJ", "JTs", "J9s", "J8s", "ATo", "KTo", "TT", "T9s",
          "T8s", "99", "98s", "88", "87s", "77", "76s", "66", "55", "44",
          "33",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-rfi-hj",
    group: "MTTRFI",
    position: "HJ",
    title: "MTT RFI · HJ",
    subtitle: "хайджек — стек 25bb+, опен 2bb (27.0%)",
    actions: [
      {
        kind: "raise",
        label: "опен 2bb",
        color: "purple",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "A3s", "A2s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "K8s",
          "K7s", "K6s", "K5s", "K4s", "AQo", "KQo", "QQ", "QJs", "QTs", "Q9s",
          "Q8s", "AJo", "KJo", "QJo", "JJ", "JTs", "J9s", "J8s", "ATo", "KTo",
          "QTo", "JTo", "TT", "T9s", "T8s", "T7s", "A9o", "99", "98s", "97s",
          "88", "87s", "86s", "77", "76s", "66", "65s", "55", "44", "33",
          "22",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-rfi-co",
    group: "MTTRFI",
    position: "CO",
    title: "MTT RFI · CO",
    subtitle: "катофф — стек 25bb+, опен 2bb (37.0%)",
    actions: [
      {
        kind: "raise",
        label: "опен 2bb",
        color: "purple",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "A3s", "A2s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "K8s",
          "K7s", "K6s", "K5s", "K4s", "K3s", "K2s", "AQo", "KQo", "QQ", "QJs",
          "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "AJo", "KJo", "QJo",
          "JJ", "JTs", "J9s", "J8s", "J7s", "J6s", "ATo", "KTo", "QTo", "JTo",
          "TT", "T9s", "T8s", "T7s", "T6s", "A9o", "K9o", "Q9o", "J9o", "T9o",
          "99", "98s", "97s", "96s", "A8o", "88", "87s", "86s", "A7o", "77",
          "76s", "75s", "66", "65s", "A5o", "55", "54s", "44", "33", "22",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-rfi-bu",
    group: "MTTRFI",
    position: "BU",
    title: "MTT RFI · BU",
    subtitle: "баттон — стек 25bb+, опен 2bb (54.1%)",
    actions: [
      {
        kind: "raise",
        label: "опен 2bb",
        color: "purple",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "A3s", "A2s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "K8s",
          "K7s", "K6s", "K5s", "K4s", "K3s", "K2s", "AQo", "KQo", "QQ", "QJs",
          "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "Q2s", "AJo",
          "KJo", "QJo", "JJ", "JTs", "J9s", "J8s", "J7s", "J6s", "J5s", "J4s",
          "J3s", "J2s", "ATo", "KTo", "QTo", "JTo", "TT", "T9s", "T8s", "T7s",
          "T6s", "T5s", "T4s", "T3s", "A9o", "K9o", "Q9o", "J9o", "T9o", "99",
          "98s", "97s", "96s", "95s", "A8o", "K8o", "Q8o", "J8o", "T8o", "98o",
          "88", "87s", "86s", "85s", "A7o", "K7o", "Q7o", "97o", "87o", "77",
          "76s", "75s", "74s", "A6o", "K6o", "66", "65s", "64s", "A5o", "55",
          "54s", "53s", "A4o", "44", "43s", "A3o", "33", "A2o", "22",
        ],
        situational: [],
      },
    ],
  },
];

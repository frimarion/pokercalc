// MTT · пуш-фолд на коротком стеке. Источник — FF START,
// страницы №7 (0-9bb) и №8 (10-14bb).
//
// До нас никто не открылся, играем только олл-ин или фолд.
// Две глубины идут одним списком: спот один и тот же, меняется
// только стек, и диапазон на 0-9bb обязан быть шире.
//
// Первая позиция подписана по-разному (EP+1 на 0-9bb, EP на
// 10-14bb) — так в оригинале, руками не сводить.
//
// Сгенерировано tools/gen_mtt.py — РУКАМИ НЕ ПРАВИТЬ.

import { RangePreset } from "../types";

export const MTT_PUSH_PRESETS: RangePreset[] = [
  {
    id: "mtt-push-9-ep1",
    group: "MTTPUSH",
    position: "EP+1 · 0-9bb",
    title: "MTT пуш-фолд · EP+1 · 0-9bb",
    subtitle: "ранняя позиция — стек 0-9bb (14.5%)",
    actions: [
      {
        kind: "raise",
        label: "олл-ин",
        color: "pink",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "AKo", "KK", "KQs", "KJs", "KTs", "AQo", "KQo", "QQ", "QJs", "QTs",
          "AJo", "JJ", "JTs", "ATo", "TT", "A9o", "99", "88", "77", "66",
          "55",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-push-9-mp",
    group: "MTTPUSH",
    position: "MP · 0-9bb",
    title: "MTT пуш-фолд · MP · 0-9bb",
    subtitle: "средняя позиция — стек 0-9bb (24.1%)",
    actions: [
      {
        kind: "raise",
        label: "олл-ин",
        color: "pink",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "A3s", "A2s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "K8s",
          "AQo", "KQo", "QQ", "QJs", "QTs", "Q9s", "AJo", "KJo", "QJo", "JJ",
          "JTs", "J9s", "ATo", "KTo", "TT", "T9s", "A9o", "99", "A8o", "88",
          "A7o", "77", "A6o", "66", "A5o", "55", "44", "33",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-push-9-co",
    group: "MTTPUSH",
    position: "CO · 0-9bb",
    title: "MTT пуш-фолд · CO · 0-9bb",
    subtitle: "катофф — стек 0-9bb (34.2%)",
    actions: [
      {
        kind: "raise",
        label: "олл-ин",
        color: "pink",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "A3s", "A2s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "K8s",
          "K7s", "K6s", "K5s", "K4s", "K3s", "K2s", "AQo", "KQo", "QQ", "QJs",
          "QTs", "Q9s", "Q8s", "AJo", "KJo", "QJo", "JJ", "JTs", "J9s", "J8s",
          "ATo", "KTo", "QTo", "JTo", "TT", "T9s", "T8s", "A9o", "K9o", "99",
          "98s", "A8o", "K8o", "88", "87s", "A7o", "77", "A6o", "66", "A5o",
          "55", "A4o", "44", "A3o", "33", "A2o", "22",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-push-9-bu",
    group: "MTTPUSH",
    position: "BU · 0-9bb",
    title: "MTT пуш-фолд · BU · 0-9bb",
    subtitle: "баттон — стек 0-9bb (44.2%)",
    actions: [
      {
        kind: "raise",
        label: "олл-ин",
        color: "pink",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "A3s", "A2s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "K8s",
          "K7s", "K6s", "K5s", "K4s", "K3s", "K2s", "AQo", "KQo", "QQ", "QJs",
          "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "AJo", "KJo", "QJo",
          "JJ", "JTs", "J9s", "J8s", "J7s", "ATo", "KTo", "QTo", "JTo", "TT",
          "T9s", "T8s", "T7s", "A9o", "K9o", "Q9o", "J9o", "T9o", "99", "98s",
          "97s", "A8o", "K8o", "Q8o", "88", "87s", "86s", "A7o", "K7o", "77",
          "76s", "A6o", "K6o", "66", "A5o", "K5o", "55", "A4o", "K4o", "44",
          "A3o", "33", "A2o", "22",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-push-9-sb",
    group: "MTTPUSH",
    position: "SB · 0-9bb",
    title: "MTT пуш-фолд · SB · 0-9bb",
    subtitle: "малый блайнд — стек 0-9bb (73.5%)",
    actions: [
      {
        kind: "raise",
        label: "олл-ин",
        color: "pink",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "A3s", "A2s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "K8s",
          "K7s", "K6s", "K5s", "K4s", "K3s", "K2s", "AQo", "KQo", "QQ", "QJs",
          "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "Q2s", "AJo",
          "KJo", "QJo", "JJ", "JTs", "J9s", "J8s", "J7s", "J6s", "J5s", "J4s",
          "J3s", "J2s", "ATo", "KTo", "QTo", "JTo", "TT", "T9s", "T8s", "T7s",
          "T6s", "T5s", "T4s", "T3s", "T2s", "A9o", "K9o", "Q9o", "J9o", "T9o",
          "99", "98s", "97s", "96s", "95s", "94s", "93s", "A8o", "K8o", "Q8o",
          "J8o", "T8o", "98o", "88", "87s", "86s", "85s", "84s", "A7o", "K7o",
          "Q7o", "J7o", "T7o", "97o", "87o", "77", "76s", "75s", "74s", "A6o",
          "K6o", "Q6o", "J6o", "T6o", "96o", "86o", "76o", "66", "65s", "64s",
          "A5o", "K5o", "Q5o", "J5o", "55", "54s", "53s", "A4o", "K4o", "Q4o",
          "J4o", "44", "43s", "A3o", "K3o", "Q3o", "J3o", "33", "A2o", "K2o",
          "Q2o", "J2o", "22",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-push-14-ep",
    group: "MTTPUSH",
    position: "EP · 10-14bb",
    title: "MTT пуш-фолд · EP · 10-14bb",
    subtitle: "ранняя позиция — стек 10-14bb (9.8%)",
    actions: [
      {
        kind: "raise",
        label: "олл-ин",
        color: "pink",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "AKo", "KK", "KQs", "KJs", "KTs",
          "AQo", "QQ", "QJs", "QTs", "AJo", "JJ", "JTs", "TT", "99", "88",
          "77", "66",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-push-14-mp",
    group: "MTTPUSH",
    position: "MP · 10-14bb",
    title: "MTT пуш-фолд · MP · 10-14bb",
    subtitle: "средняя позиция — стек 10-14bb (17.6%)",
    actions: [
      {
        kind: "raise",
        label: "олл-ин",
        color: "pink",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "A3s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "AQo", "KQo",
          "QQ", "QJs", "QTs", "Q9s", "AJo", "KJo", "JJ", "JTs", "J9s", "ATo",
          "TT", "T9s", "A9o", "99", "88", "77", "66", "55", "44",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-push-14-co",
    group: "MTTPUSH",
    position: "CO · 10-14bb",
    title: "MTT пуш-фолд · CO · 10-14bb",
    subtitle: "катофф — стек 10-14bb (28.2%)",
    actions: [
      {
        kind: "raise",
        label: "олл-ин",
        color: "pink",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "A3s", "A2s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "K8s",
          "K7s", "AQo", "KQo", "QQ", "QJs", "QTs", "Q9s", "Q8s", "AJo", "KJo",
          "QJo", "JJ", "JTs", "J9s", "J8s", "ATo", "KTo", "TT", "T9s", "T8s",
          "A9o", "99", "98s", "A8o", "88", "87s", "A7o", "77", "A6o", "66",
          "A5o", "55", "A4o", "44", "A3o", "33", "22",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-push-14-bu",
    group: "MTTPUSH",
    position: "BU · 10-14bb",
    title: "MTT пуш-фолд · BU · 10-14bb",
    subtitle: "баттон — стек 10-14bb (33.9%)",
    actions: [
      {
        kind: "raise",
        label: "олл-ин",
        color: "pink",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "A3s", "A2s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "K8s",
          "K7s", "K6s", "K5s", "K4s", "K3s", "AQo", "KQo", "QQ", "QJs", "QTs",
          "Q9s", "Q8s", "Q7s", "AJo", "KJo", "QJo", "JJ", "JTs", "J9s", "J8s",
          "ATo", "KTo", "QTo", "JTo", "TT", "T9s", "T8s", "T7s", "A9o", "K9o",
          "99", "98s", "97s", "A8o", "88", "87s", "A7o", "77", "A6o", "66",
          "A5o", "55", "A4o", "44", "A3o", "33", "A2o", "22",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-push-14-sb",
    group: "MTTPUSH",
    position: "SB · 10-14bb",
    title: "MTT пуш-фолд · SB · 10-14bb",
    subtitle: "малый блайнд — стек 10-14bb (62.6%)",
    actions: [
      {
        kind: "raise",
        label: "олл-ин",
        color: "pink",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "A3s", "A2s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "K8s",
          "K7s", "K6s", "K5s", "K4s", "K3s", "K2s", "AQo", "KQo", "QQ", "QJs",
          "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "Q2s", "AJo",
          "KJo", "QJo", "JJ", "JTs", "J9s", "J8s", "J7s", "J6s", "J5s", "J4s",
          "J3s", "J2s", "ATo", "KTo", "QTo", "JTo", "TT", "T9s", "T8s", "T7s",
          "T6s", "T5s", "T4s", "A9o", "K9o", "Q9o", "J9o", "T9o", "99", "98s",
          "97s", "96s", "95s", "A8o", "K8o", "Q8o", "J8o", "T8o", "98o", "88",
          "87s", "86s", "85s", "A7o", "K7o", "Q7o", "J7o", "T7o", "97o", "87o",
          "77", "76s", "75s", "74s", "A6o", "K6o", "Q6o", "66", "65s", "64s",
          "A5o", "K5o", "Q5o", "55", "54s", "53s", "A4o", "K4o", "Q4o", "44",
          "A3o", "K3o", "Q3o", "33", "A2o", "K2o", "22",
        ],
        situational: [],
      },
    ],
  },
];

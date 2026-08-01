// MTT · игра против одного рейзера. Источник — FF START, страница №3.
//
// Стек 40bb+, соперник открыл 2bb. Чарты заданы ГРУППАМИ позиций,
// а не конкретным местом: в оригинале одна сетка на «ранние»,
// одна на «средние» и так далее. Защита BB — отдельная страница
// (bbDefense.ts), здесь её нет.
//
// Сгенерировано tools/gen_mtt.py — РУКАМИ НЕ ПРАВИТЬ.

import { RangePreset } from "../types";

export const MTT_VS_RFI_PRESETS: RangePreset[] = [
  {
    id: "mtt-vsrfi-early",
    group: "MTTVSRFI",
    position: "Ранние",
    title: "MTT против опена · Ранние",
    subtitle: "EP, EP+1, EP+2 — стек 40bb+, опен соперника 2bb (3бет 6-8bb 3.5% / колд-колл 4.4%)",
    actions: [
      {
        kind: "raise",
        label: "3бет 6-8bb",
        color: "red",
        always: [
          "AA", "AKs", "AKo", "KK", "AQo", "QQ",
        ],
        situational: [],
      },
      {
        kind: "call",
        label: "колд-колл",
        color: "green",
        always: [
          "AQs", "AJs", "ATs", "A9s", "KQs", "KJs", "QJs", "JJ", "TT", "99",
          "88", "77",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-vsrfi-middle",
    group: "MTTVSRFI",
    position: "Средние",
    title: "MTT против опена · Средние",
    subtitle: "MP, HJ — стек 40bb+, опен соперника 2bb (3бет 6-8bb 4.2% / колд-колл 4.1%)",
    actions: [
      {
        kind: "raise",
        label: "3бет 6-8bb",
        color: "red",
        always: [
          "AA", "AKs", "AQs", "AKo", "KK", "AQo", "QQ", "JJ",
        ],
        situational: [],
      },
      {
        kind: "call",
        label: "колд-колл",
        color: "green",
        always: [
          "AJs", "ATs", "A9s", "KQs", "KJs", "QJs", "TT", "99", "88", "77",
          "66",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-vsrfi-late",
    group: "MTTVSRFI",
    position: "Поздние",
    title: "MTT против опена · Поздние",
    subtitle: "CO, BU — стек 40bb+, опен соперника 2bb (3бет 6-8bb 12.2% / колд-колл 7.8%)",
    actions: [
      {
        kind: "raise",
        label: "3бет 6-8bb",
        color: "red",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "AKo", "KK", "KQs",
          "KJs", "KTs", "AQo", "KQo", "QQ", "QJs", "QTs", "AJo", "KJo", "JJ",
          "JTs", "ATo", "TT", "99", "88",
        ],
        situational: [],
      },
      {
        kind: "call",
        label: "колд-колл",
        color: "green",
        always: [
          "A7s", "A6s", "A5s", "A4s", "A3s", "A2s", "K9s", "K8s", "Q9s", "J9s",
          "T9s", "T8s", "98s", "87s", "77", "76s", "66", "65s", "55", "54s",
          "44", "33", "22",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-vsrfi-sb",
    group: "MTTVSRFI",
    position: "SB",
    title: "MTT против опена · SB",
    subtitle: "малый блайнд — стек 40bb+, опен соперника 2bb (3бет 6-8bb 6.3% / колд-колл 12.5%)",
    actions: [
      {
        kind: "raise",
        label: "3бет 6-8bb",
        color: "red",
        always: [
          "AA", "AKs", "AQs", "AJs", "AKo", "KK", "KQs", "KJs", "AQo", "QQ",
          "QJs", "JJ", "TT", "99",
        ],
        situational: [],
      },
      {
        kind: "call",
        label: "колд-колл",
        color: "green",
        always: [
          "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s", "KTs",
          "K9s", "K8s", "KQo", "QTs", "Q9s", "AJo", "JTs", "J9s", "ATo", "T9s",
          "T8s", "98s", "88", "87s", "77", "76s", "66", "65s", "55", "44",
          "33", "22",
        ],
        situational: [],
      },
    ],
  },
];

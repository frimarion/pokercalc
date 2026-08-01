// MTT · 3бет-пуш (рестил). Источник — FF START, страница №9.
//
// Стек 16-22bb, соперник открыл 2bb. Чарт выбирается парой
// «где мы — откуда открылись»: чем позднее опенер, тем шире
// его диапазон и тем шире мы пушим.
//
// Сгенерировано tools/gen_mtt.py — РУКАМИ НЕ ПРАВИТЬ.

import { RangePreset } from "../types";

export const MTT_3BETPUSH_PRESETS: RangePreset[] = [
  {
    id: "mtt-threebetpush-early-vs-early",
    group: "MTT3BETPUSH",
    position: "Ранняя vs ранняя",
    title: "MTT 3бет-пуш · Ранняя vs ранняя",
    subtitle: "мы на ранней, опенер с ранней — стек 16-22bb, опен соперника 2bb (5.4%)",
    actions: [
      {
        kind: "raise",
        label: "3бет-пуш",
        color: "pink",
        always: [
          "AA", "AKs", "AQs", "AJs", "AKo", "KK", "AQo", "QQ", "JJ", "TT",
          "99",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-threebetpush-mid-vs-early",
    group: "MTT3BETPUSH",
    position: "Средняя/поздняя vs ранняя",
    title: "MTT 3бет-пуш · Средняя/поздняя vs ранняя",
    subtitle: "опенер с ранней — стек 16-22bb, опен соперника 2bb (7.2%)",
    actions: [
      {
        kind: "raise",
        label: "3бет-пуш",
        color: "pink",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "AKo", "KK", "KQs", "KJs", "AQo",
          "QQ", "JJ", "TT", "99", "88", "77",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-threebetpush-late-vs-late",
    group: "MTT3BETPUSH",
    position: "Поздняя vs поздняя",
    title: "MTT 3бет-пуш · Поздняя vs поздняя",
    subtitle: "опенер с поздней — стек 16-22bb, опен соперника 2bb (12.8%)",
    actions: [
      {
        kind: "raise",
        label: "3бет-пуш",
        color: "pink",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "AKo", "KK",
          "KQs", "KJs", "KTs", "AQo", "KQo", "QQ", "QJs", "AJo", "JJ", "ATo",
          "TT", "99", "88", "77", "66", "55", "44",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-threebetpush-blinds-vs-early",
    group: "MTT3BETPUSH",
    position: "Блайнды vs ранняя",
    title: "MTT 3бет-пуш · Блайнды vs ранняя",
    subtitle: "мы на блайнде, опенер с ранней — стек 16-22bb, опен соперника 2bb (6.0%)",
    actions: [
      {
        kind: "raise",
        label: "3бет-пуш",
        color: "pink",
        always: [
          "AA", "AKs", "AQs", "AKo", "KK", "AQo", "QQ", "JJ", "TT", "99",
          "88", "77",
        ],
        situational: [],
      },
    ],
  },
  {
    id: "mtt-threebetpush-blinds-vs-late",
    group: "MTT3BETPUSH",
    position: "Блайнды vs поздняя",
    title: "MTT 3бет-пуш · Блайнды vs поздняя",
    subtitle: "мы на блайнде, опенер с поздней — стек 16-22bb, опен соперника 2bb (22.5%)",
    actions: [
      {
        kind: "raise",
        label: "3бет-пуш",
        color: "pink",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "A3s", "A2s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "AQo",
          "KQo", "QQ", "QJs", "QTs", "Q9s", "AJo", "KJo", "JJ", "JTs", "J9s",
          "ATo", "KTo", "TT", "T9s", "A9o", "99", "A8o", "88", "A7o", "77",
          "A6o", "66", "55", "44", "33", "22",
        ],
        situational: [],
      },
    ],
  },
];

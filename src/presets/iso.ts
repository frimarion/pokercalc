// Isolate — открытие рейзом после лимпа (Green Charts, стр. 5).
//
// СГЕНЕРИРОВАНО tools/gen_iso.py — руками не править, перегенерировать.
//
// Легенда чарта: красный — диапазон открытия изолэйтом, зелёный — доставляем
// 0,5bb на SB, если до нас уже были лимперы. Зелёный есть только на SB:
// доставить блайнд может лишь тот, кто его уже частично поставил.
//
// Ячейки, закрашенные наполовину, — смешанная стратегия с весом 0.5. На SB
// это раздел между изолэйтом и доставкой, на остальных местах — между
// изолэйтом и фолдом.
//
// Сайзинг: в позиции 4bb + 1bb за каждого лимпера, без позиции 5bb + 1bb.

import { RangePreset } from "./types";

export const ISO_PRESETS: RangePreset[] = [
  {
    id: "iso-mp",
    group: "ISO",
    position: "MP",
    title: "Изолэйт с MP",
    subtitle: "Открываем рейзом после лимпа, 5bb + 1bb за лимпера",
    actions: [
      {
        kind: "raise",
        label: "изолэйт",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "AKo", "KK", "KQs", "KJs", "KTs",
          "AQo", "KQo", "QQ", "QJs", "QTs", "AJo", "JJ", "JTs", "TT", "99", "88",
          "77"
        ],
        situational: [
          "A5s"
        ],
      },
    ],
  },
  {
    id: "iso-co",
    group: "ISO",
    position: "CO",
    title: "Изолэйт с CO",
    subtitle: "Открываем рейзом после лимпа, 4bb + 1bb за лимпера",
    actions: [
      {
        kind: "raise",
        label: "изолэйт",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "AKo", "KK", "KQs", "KJs", "KTs", "AQo", "KQo", "QQ", "QJs", "QTs", "AJo",
          "JJ", "JTs", "TT", "99", "88", "77"
        ],
        situational: [
          "K9s", "Q9s", "KJo", "QJo", "J9s", "ATo", "T9s", "98s", "66"
        ],
      },
    ],
  },
  {
    id: "iso-bu",
    group: "ISO",
    position: "BU",
    title: "Изолэйт с BU",
    subtitle: "Открываем рейзом после лимпа, 4bb + 1bb за лимпера",
    actions: [
      {
        kind: "raise",
        label: "изолэйт",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "A4s", "A3s", "A2s", "AKo", "KK", "KQs", "KJs", "KTs", "K9s", "AQo",
          "KQo", "QQ", "QJs", "QTs", "Q9s", "AJo", "KJo", "QJo", "JJ", "JTs", "J9s",
          "ATo", "TT", "T9s", "99", "98s", "88", "77", "66"
        ],
        situational: [
          "K8s", "K7s", "Q8s", "KTo", "QTo", "JTo", "A9o", "87s", "76s", "55"
        ],
      },
    ],
  },
  {
    id: "iso-sb",
    group: "ISO",
    position: "SB",
    title: "Изолэйт с SB",
    subtitle: "Открываем рейзом после лимпа, 5bb + 1bb за лимпера",
    actions: [
      {
        kind: "raise",
        label: "изолэйт",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "AKo", "KK", "KQs", "KJs", "KTs",
          "AQo", "KQo", "QQ", "QJs", "QTs", "AJo", "JJ", "JTs", "TT", "99", "88",
          "77"
        ],
        situational: [
          "A8s", "A5s", "A4s", "K9s", "KJo", "ATo"
        ],
      },
      {
        kind: "call",
        label: "доставить 0.5bb",
        always: [
          "A7s", "A6s", "A3s", "A2s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s",
          "K2s", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "QJo", "J9s", "J8s", "J7s",
          "KTo", "QTo", "JTo", "T9s", "T8s", "T7s", "A9o", "98s", "97s", "A8o",
          "87s", "86s", "76s", "66", "65s", "55", "54s", "44", "33", "22"
        ],
        situational: [
          "A8s", "A5s", "A4s", "K9s", "KJo", "ATo"
        ],
      },
    ],
  },
  {
    id: "iso-bb",
    group: "ISO",
    position: "BB",
    title: "Изолэйт с BB",
    subtitle: "Открываем рейзом после лимпа, 5bb + 1bb за лимпера",
    actions: [
      {
        kind: "raise",
        label: "изолэйт",
        always: [
          "AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
          "AKo", "KK", "KQs", "KJs", "KTs", "AQo", "KQo", "QQ", "QJs", "QTs", "AJo",
          "JJ", "JTs", "TT", "99", "88", "77"
        ],
        situational: [
          "A4s", "A3s", "A2s", "K9s", "KJo", "QJo", "ATo"
        ],
      },
    ],
  },
];

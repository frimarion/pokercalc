// BB Defense — защита большого блайнда.
//
// Источник смешанный. `vs CO` и `vs SB` — Green Charts (стр. 7): красный
// 3бет, зелёный колл, ячейка пополам = «половину раздач 3бет, половину колл».
// Остальные четыре чарта перенесены с нового источника, где частота руки
// помечена полоской под ярлыком: одна зелёная полоска = 50%, а на `vs BU
// 2.5bb` полосок три цвета — зелёная 75%, голубая 50%, жёлтая 25%.
//
// Отсюда важное отличие от Green Charts: рука может миксовать колл с ФОЛДОМ
// (`K9s`, `Q9s`, `AJo` у vs EP; `J8s`, `T8s` у vs BU 3bb), поэтому частичные
// списки двух действий больше не совпадают. Инвариант остался один: сумма
// частот 3бета и колла не больше единицы, и он проверяется тестом.
//
// Сверка по подписанным процентам: 3бет сходится точно на всех четырёх
// (4.68 / 5.73 / 9.8 / 14.0). Колл читается шире подписи на vs EP (11.9 при
// 10.6), vs MP (13.1 при 12.7) и vs BU 2.5bb (25.4 при 23) — по решению
// владельца чартов оставлено как прочиталось: расхождение сидит в паре
// offsuit-ячеек, чью полоску на скриншоте не различить.
//
// Сайзинг 3бета:
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
        "AQs", "AJs", "ATs", "A5s", "A4s", "KTs", "QTs", "JTs", "AKo", "JJ",
        "TT"
        ],
      },
      {
        kind: "call",
        label: "колл",
        always: [
        "A9s", "A8s", "A7s", "A6s", "A3s", "A2s", "T9s", "98s", "87s", "76s",
        "65s", "54s", "AQo", "KQo", "99", "88", "77", "66", "55", "44", "33",
        "22"
        ],
        situational: [
        "AQs", "AJs", "ATs", "A5s", "A4s", "KTs", "QTs", "JTs", "AKo", "JJ",
        "TT", "K9s", "Q9s", "AJo"
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
        "A9s", "A8s", "A7s", "A6s", "A3s", "A2s", "K9s", "Q9s", "T9s", "98s",
        "87s", "76s", "65s", "54s", "AQo", "KQo", "AJo", "KJo", "88", "77",
        "66", "55", "44", "33", "22"
        ],
        situational: [
        "AJs", "ATs", "A5s", "A4s", "KTs", "QTs", "JTs", "TT", "99", "J9s",
        "ATo"
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
        "AKs", "AQs", "AJs", "ATs", "A5s", "A4s", "KQs", "KJs", "KTs", "QJs",
        "QTs", "JTs", "J9s", "J8s", "T9s", "T8s", "AKo", "AQo", "AA", "KK",
        "QQ", "JJ", "TT", "99"
        ],
        situational: [
        "A9s", "A8s", "A3s", "A2s", "K9s", "Q9s", "54s", "KQo", "KJo", "AJo",
        "ATo", "88"
        ],
        threeQuarter: [
        "98s", "87s", "76s", "65s"
        ],
        quarter: [
        "Q8s", "J7s", "T7s", "97s", "86s", "75s", "64s", "77"
        ],
      },
      {
        kind: "call",
        label: "колл",
        always: [
        "A7s", "A6s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s", "Q7s",
        "Q6s", "Q5s", "Q4s", "Q3s", "Q2s", "J6s", "J5s", "T6s", "96s", "85s",
        "74s", "53s", "43s", "QJo", "KTo", "QTo", "JTo", "A9o", "K9o", "Q9o",
        "J9o", "T9o", "A8o", "A7o", "66", "55", "44", "33", "22"
        ],
        situational: [
        "A9s", "A8s", "A3s", "A2s", "K9s", "Q9s", "54s", "KQo", "KJo", "AJo",
        "ATo", "88", "A5o", "A4o"
        ],
        threeQuarter: [
        "Q8s", "J7s", "T7s", "97s", "86s", "75s", "64s", "77"
        ],
        quarter: [
        "98s", "87s", "76s", "65s"
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
        "AA", "AKo", "AKs", "AQs", "AJs", "ATs", "KK", "KQs", "KJs", "KTs",
        "QQ", "QJs", "QTs", "JJ", "JTs", "TT", "99"
        ],
        situational: [
        "A5s", "A4s", "T9s", "88", "77", "AQo", "KQo", "AJo", "KJo", "ATo"
        ],
      },
      {
        kind: "call",
        label: "колл",
        always: [
        "A9s", "A8s", "A7s", "A6s", "A3s", "A2s", "K9s", "K8s", "K7s", "K6s",
        "K5s", "K4s", "Q9s", "Q8s", "J9s", "98s", "97s", "87s", "76s", "65s",
        "54s", "QJo", "KTo", "QTo", "JTo", "A9o", "66", "55", "44", "33", "22"
        ],
        situational: [
        "A5s", "A4s", "T9s", "88", "77", "AQo", "KQo", "AJo", "KJo", "ATo",
        "J8s", "T8s"
        ],
      },
    ],
  },
];

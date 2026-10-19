// Защита BB — "кэш микро", один чарт на опенера: 3бет, колл и фолд (всё, что
// не покрашено). Прежде 3бет и колл лежали в разных файлах.
//
// Вес колла кодирует сайзинг опена, против которого рука ещё коллируется:
//   1.0 — против 3bb (а значит и против меньших опенов),
//   0.5 — добавляется против 2.5bb, 0.25 — только против 2bb.
// Это три отдельных действия kind "call" со своим цветом: на вес не влияет,
// зато легенда называет сайзинг.
//
// Рука, которую источник клал и в колл, и в 3бет, делится 50/50: 3бет 0.5 и
// колл 0.5 (действие «колл — 50/50 с 3бетом»).
//
// vs SB колл-диапазон взят из прежнего колл-чарта (коммит b4435ce), 3бет — из
// прежнего 3бет-чарта до слияния (0e82dbf^). Сгенерировано tools/gen_bbdef_micro.ts.

import { RangePreset } from "./types";

export const BBDEF_MICRO_PRESETS: RangePreset[] = [
  {
    id: "bbdef-micro-vs-utg-mp",
    group: "BBDEFMICRO",
    position: "BB vs UTG,MP",
    title: "Защита BB микро · vs UTG/MP",
    subtitle: "BB против опена UTG/MP: 3бет, колл (зелёный — против 3bb, жёлтый — добавляется против 2.5bb, оранжевый — против 2bb, фиолетовый — клетка пополам с 3бетом), остальное фолд",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: ["AA", "KK", "QQ", "JJ", "AKs", "AQs", "A5s", "A4s", "A3s", "A2s", "AKo"],
        situational: ["AJs", "ATs", "KQs", "KJs", "KTs", "QJs", "QTs", "JTs", "AQo"],
      },
      {
        kind: "call",
        label: "колл vs 3bb",
        color: "green",
        always: ["TT", "99", "88", "77", "66", "55", "44", "33", "22", "A9s", "A8s", "A7s", "K9s", "Q9s", "J9s", "T9s", "T8s", "98s", "97s", "87s", "76s", "65s", "54s"],
        situational: [],
      },
      {
        kind: "call",
        label: "колл vs 2.5bb",
        color: "yellow",
        always: [],
        situational: ["K8s", "AJo", "KQo"],
      },
      {
        kind: "call",
        label: "колл vs 2bb",
        color: "orange",
        always: [],
        situational: [],
        quarter: ["Q8s", "J8s", "86s", "75s", "64s", "53s", "43s", "ATo", "KJo"],
      },
      {
        kind: "call",
        label: "колл — 50/50 с 3бетом",
        color: "purple",
        always: [],
        situational: ["AJs", "ATs", "KQs", "KJs", "KTs", "QJs", "QTs", "JTs", "AQo"],
      },
    ],
  },
  {
    id: "bbdef-micro-vs-co",
    group: "BBDEFMICRO",
    position: "BB vs CO",
    title: "Защита BB микро · vs CO",
    subtitle: "BB против опена CO: 3бет, колл (зелёный — против 3bb, жёлтый — добавляется против 2.5bb, оранжевый — против 2bb, фиолетовый — клетка пополам с 3бетом), остальное фолд",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: ["AA", "KK", "QQ", "JJ", "AKs", "AQs", "A5s", "A4s", "A3s", "A2s", "AKo"],
        situational: ["TT", "AJs", "ATs", "KQs", "KJs", "KTs", "K5s", "K4s", "K3s", "K2s", "QJs", "QTs", "JTs", "AQo", "ATo", "KJo", "KTo", "QJo"],
      },
      {
        kind: "call",
        label: "колл vs 3bb",
        color: "green",
        always: ["99", "88", "77", "66", "55", "44", "33", "22", "A9s", "A8s", "A7s", "A6s", "K9s", "K8s", "K7s", "K6s", "Q9s", "Q8s", "J9s", "J8s", "T9s", "T8s", "98s", "97s", "87s", "86s", "76s", "75s", "65s", "64s", "54s", "53s", "AJo", "KQo"],
        situational: [],
      },
      {
        kind: "call",
        label: "колл vs 2bb",
        color: "orange",
        always: [],
        situational: [],
        quarter: ["Q7s", "Q6s", "Q5s", "Q4s", "J7s", "T7s", "96s", "85s", "74s", "43s", "A9o", "QTo", "JTo"],
      },
      {
        kind: "call",
        label: "колл — 50/50 с 3бетом",
        color: "purple",
        always: [],
        situational: ["TT", "AJs", "ATs", "KQs", "KJs", "KTs", "QJs", "QTs", "JTs", "AQo", "ATo", "KJo", "KTo", "QJo"],
      },
    ],
  },
  {
    id: "bbdef-micro-vs-bu",
    group: "BBDEFMICRO",
    position: "BB vs BU",
    title: "Защита BB микро · vs BU",
    subtitle: "BB против опена BU: 3бет, колл (зелёный — против 3bb, жёлтый — добавляется против 2.5bb, оранжевый — против 2bb, фиолетовый — клетка пополам с 3бетом), остальное фолд",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: ["AA", "KK", "QQ", "JJ", "AKs", "AQs", "AJs", "ATs", "A5s", "A4s", "A3s", "A2s", "K5s", "K4s", "K3s", "K2s", "Q3s", "Q2s", "AKo"],
        situational: ["TT", "KQs", "KJs", "KTs", "QJs", "QTs", "Q5s", "Q4s", "JTs", "J9s", "J8s", "J7s", "J6s", "J5s", "T9s", "T8s", "T7s", "T6s", "AQo", "ATo", "KJo", "KTo", "QJo", "QTo", "JTo"],
      },
      {
        kind: "call",
        label: "колл vs 3bb",
        color: "green",
        always: ["99", "88", "77", "66", "55", "44", "33", "22", "A9s", "A8s", "A7s", "A6s", "K9s", "K8s", "K7s", "K6s", "Q9s", "Q8s", "Q7s", "Q6s", "98s", "97s", "87s", "86s", "76s", "75s", "65s", "64s", "54s", "53s", "AJo", "A9o", "A8o", "KQo"],
        situational: [],
      },
      {
        kind: "call",
        label: "колл vs 2bb",
        color: "orange",
        always: [],
        situational: [],
        quarter: ["J4s", "96s", "85s", "74s", "63s", "52s", "43s", "42s", "32s", "A7o", "A6o", "A5o", "K9o", "Q9o", "J9o", "T9o"],
      },
      {
        kind: "call",
        label: "колл — 50/50 с 3бетом",
        color: "purple",
        always: [],
        situational: ["TT", "KQs", "KJs", "KTs", "QJs", "QTs", "Q5s", "Q4s", "JTs", "J9s", "J8s", "J7s", "J6s", "J5s", "T9s", "T8s", "T7s", "T6s", "AQo", "ATo", "KJo", "KTo", "QJo", "QTo", "JTo"],
      },
    ],
  },
  {
    id: "bbdef-micro-vs-sb",
    group: "BBDEFMICRO",
    position: "BB vs SB",
    title: "Защита BB микро · vs SB",
    subtitle: "BB против опена SB: 3бет, колл (зелёный — против 3bb, жёлтый — добавляется против 2.5bb, оранжевый — против 2bb, фиолетовый — клетка пополам с 3бетом), остальное фолд",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: ["AA", "KK", "QQ", "JJ", "TT", "99", "AKs", "AQs", "AJs", "ATs", "A5s", "A4s", "KQs", "KJs", "KTs", "QJs", "QTs", "JTs", "AKo", "AQo"],
        situational: ["J6s", "J5s", "J4s", "J3s", "J2s", "T6s", "T5s", "T4s", "T3s", "T2s", "K6o", "A3s", "A2s", "K5s", "K4s", "K3s", "K2s", "Q5s", "Q4s", "Q3s", "Q2s", "A5o", "A4o", "A3o", "A2o", "A7o", "A6o", "K8o", "K7o"],
      },
      {
        kind: "call",
        label: "колл vs 3bb",
        color: "green",
        always: ["88", "77", "66", "55", "44", "33", "22", "A9s", "A8s", "A7s", "A6s", "K9s", "K8s", "K7s", "K6s", "Q9s", "Q8s", "Q7s", "Q6s", "J9s", "J8s", "J7s", "T9s", "T8s", "T7s", "98s", "97s", "96s", "95s", "87s", "86s", "85s", "76s", "75s", "74s", "65s", "64s", "63s", "54s", "53s", "52s", "43s", "42s", "32s", "AJo", "ATo", "A9o", "A8o", "KQo", "KJo", "KTo", "QJo", "QTo", "JTo"],
        situational: [],
      },
      {
        kind: "call",
        label: "колл vs 2.5bb",
        color: "yellow",
        always: [],
        situational: ["K9o", "Q9o", "Q8o", "J9o", "J8o", "T9o", "T8o"],
      },
      {
        kind: "call",
        label: "колл — 50/50 с 3бетом",
        color: "purple",
        always: [],
        situational: ["A3s", "A2s", "K5s", "K4s", "K3s", "K2s", "Q5s", "Q4s", "Q3s", "Q2s", "A5o", "A4o", "A3o", "A2o", "A7o", "A6o", "K8o", "K7o"],
      },
    ],
  },
];

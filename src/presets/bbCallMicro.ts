// Колл BB — "кэш микро", отдельный источник от Green Charts. Защита BB
// коллом против опена, с разбивкой по сайзингу опена.
//
// Вес руки здесь кодирует не частоту, а сайзинг, против которого рука ещё
// коллируется (так задал источник):
//   1.0  — коллируем и против 3bb (а значит и против меньших опенов),
//   0.5  — добавляется против 2.5bb,
//   0.25 — добавляется только против 2bb.
// Поэтому три веса — три отдельных действия kind "call" со своим цветом:
// на вес это не влияет, а легенда называет сайзинг.
//
// Источник клал часть рук и в колл, и в 3бет (`3betoop-micro-bb-vs-*`), у
// vs CO/BU местами по полному весу в каждом. По решению владельца чартов
// такая клетка делится 50/50: 3бет 0.5 и колл 0.5, независимо от яруса
// сайзинга. Эти руки вынесены в отдельное действие «колл — 50/50 с 3бетом».
//
// Против SB колла нет: BB там защищается только 3бетом.
//
// Экспортировано из FlopzillaPro range-строкой, TS сгенерирован скриптом.

import { RangePreset } from "./types";

export const BB_CALL_MICRO_PRESETS: RangePreset[] = [
  {
    id: "bbcall-micro-vs-utg-mp",
    group: "BBCALLMICRO",
    position: "BB vs UTG,MP",
    title: "Колл BB микро · vs UTG/MP",
    subtitle: "BB — колл опена UTG/MP: зелёный против 3bb, жёлтый добавляется против 2.5bb, оранжевый — против 2bb, фиолетовый — клетка пополам с 3бетом",
    actions: [
      {
        kind: "call",
        label: "колл vs 3bb",
        color: "green",
        always: [
          "TT", "99", "88", "77", "66", "55", "44", "33", "22",
          "A9s", "A8s", "A7s",
          "K9s",
          "Q9s",
          "J9s",
          "T9s", "T8s",
          "98s", "97s",
          "87s",
          "76s",
          "65s",
          "54s",
        ],
        situational: [],
      },
      {
        kind: "call",
        label: "колл vs 2.5bb",
        color: "yellow",
        always: [],
        situational: [
          "K8s",
          "AJo",
          "KQo",
        ],
      },
      {
        kind: "call",
        label: "колл vs 2bb",
        color: "orange",
        always: [],
        situational: [],
        quarter: [
          "Q8s",
          "J8s",
          "86s",
          "75s",
          "64s",
          "53s",
          "43s",
          "ATo",
          "KJo",
        ],
      },
      {
        kind: "call",
        label: "колл — 50/50 с 3бетом",
        color: "purple",
        always: [],
        situational: [
          "AJs", "ATs",
          "KQs", "KJs", "KTs",
          "QJs", "QTs",
          "JTs",
          "AQo",
        ],
      },
    ],
  },
  {
    id: "bbcall-micro-vs-co",
    group: "BBCALLMICRO",
    position: "BB vs CO",
    title: "Колл BB микро · vs CO",
    subtitle: "BB — колл опена CO: зелёный против 3bb, жёлтый добавляется против 2.5bb, оранжевый — против 2bb, фиолетовый — клетка пополам с 3бетом",
    actions: [
      {
        kind: "call",
        label: "колл vs 3bb",
        color: "green",
        always: [
          "99", "88", "77", "66", "55", "44", "33", "22",
          "A9s", "A8s", "A7s", "A6s",
          "K9s", "K8s", "K7s", "K6s",
          "Q9s", "Q8s",
          "J9s", "J8s",
          "T9s", "T8s",
          "98s", "97s",
          "87s", "86s",
          "76s", "75s",
          "65s", "64s",
          "54s", "53s",
          "AJo",
          "KQo",
        ],
        situational: [],
      },
      {
        kind: "call",
        label: "колл vs 2bb",
        color: "orange",
        always: [],
        situational: [],
        quarter: [
          "Q7s", "Q6s", "Q5s", "Q4s",
          "J7s",
          "T7s",
          "96s",
          "85s",
          "74s",
          "43s",
          "A9o",
          "QTo",
          "JTo",
        ],
      },
      {
        kind: "call",
        label: "колл — 50/50 с 3бетом",
        color: "purple",
        always: [],
        situational: [
          "TT",
          "AJs", "ATs",
          "KQs", "KJs", "KTs",
          "QJs", "QTs",
          "JTs",
          "AQo", "ATo",
          "KJo", "KTo",
          "QJo",
        ],
      },
    ],
  },
  {
    id: "bbcall-micro-vs-bu",
    group: "BBCALLMICRO",
    position: "BB vs BU",
    title: "Колл BB микро · vs BU",
    subtitle: "BB — колл опена BU: зелёный против 3bb, оранжевый — против 2bb, фиолетовый — клетка пополам с 3бетом",
    actions: [
      {
        kind: "call",
        label: "колл vs 3bb",
        color: "green",
        always: [
          "99", "88", "77", "66", "55", "44", "33", "22",
          "A9s", "A8s", "A7s", "A6s",
          "K9s", "K8s", "K7s", "K6s",
          "Q9s", "Q8s", "Q7s", "Q6s",
          "98s", "97s",
          "87s", "86s",
          "76s", "75s",
          "65s", "64s",
          "54s", "53s",
          "AJo", "A9o", "A8o",
          "KQo",
        ],
        situational: [],
      },
      {
        kind: "call",
        label: "колл vs 2bb",
        color: "orange",
        always: [],
        situational: [],
        quarter: [
          "J4s",
          "96s",
          "85s",
          "74s",
          "63s",
          "52s",
          "43s", "42s",
          "32s",
          "A7o", "A6o", "A5o",
          "K9o",
          "Q9o",
          "J9o",
          "T9o",
        ],
      },
      {
        kind: "call",
        label: "колл — 50/50 с 3бетом",
        color: "purple",
        always: [],
        situational: [
          "TT",
          "KQs", "KJs", "KTs",
          "QJs", "QTs", "Q5s", "Q4s",
          "JTs", "J9s", "J8s", "J7s", "J6s", "J5s",
          "T9s", "T8s", "T7s", "T6s",
          "AQo", "ATo",
          "KJo", "KTo",
          "QJo", "QTo",
          "JTo",
        ],
      },
    ],
  },
];

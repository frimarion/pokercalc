// Открытие (RFI) — "кэш микро", отдельный источник от Green Charts.
//
// Скриншоты чарта — не Green Charts: заливка кодирует тип руки (пара
// синяя, suited жёлтая, offsuit красная), а не частоту. Полная
// насыщенность = играем всегда (вес 1.0), бледная того же тона = фолд.
// Зелёная полоска снизу ячейки — отдельное решение "открываем только
// под фиша на блайндах", тот же приём, что и в rfi.ts (color: "green",
// вес 0.25). Середины (situational 0.5), которая есть в Green Charts,
// тут нет вовсе — только always/fish/фолд.
//
// Оцифровано tools/gen_rfi_micro.py из charts/micro/*.png. Руками не
// правилось — при разногласиях исправлять картинку/скрипт и
// перегенерировать, а не редактировать список рук здесь.

import { RangePreset } from "./types";

export const RFI_MICRO_PRESETS: RangePreset[] = [
  {
    id: "rfi-micro-utg",
    group: "RFIMICRO",
    position: "UTG",
    title: "RFI микро · UTG",
    subtitle: "UTG — открытие рейзом (3bb), источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "открытие",
        always: ["AA", "AKs", "AKo", "AQs", "AQo", "AJs", "AJo", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s", "KK", "KQs", "KQo", "KJs", "KTs", "K9s", "QQ", "QJs", "QTs", "JJ", "JTs", "TT", "99", "88", "77", "66", "55"],
        situational: [],
      },
      {
        kind: "raise",
        label: "фиш на блайндах",
        color: "green",
        always: [],
        situational: [],
        quarter: ["ATo", "KJo", "K8s", "Q9s", "J9s", "T9s"],
      },
    ],
  },
  {
    id: "rfi-micro-mp",
    group: "RFIMICRO",
    position: "MP",
    title: "RFI микро · MP",
    subtitle: "MP — открытие рейзом (3bb), источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "открытие",
        always: ["AA", "AKs", "AKo", "AQs", "AQo", "AJs", "AJo", "ATs", "ATo", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s", "KK", "KQs", "KQo", "KJs", "KJo", "KTs", "K9s", "K8s", "QQ", "QJs", "QTs", "Q9s", "JJ", "JTs", "J9s", "TT", "T9s", "99", "88", "77", "66", "55", "44"],
        situational: [],
      },
      {
        kind: "raise",
        label: "фиш на блайндах",
        color: "green",
        always: [],
        situational: [],
        quarter: ["KTo", "QJo"],
      },
    ],
  },
  {
    id: "rfi-micro-co",
    group: "RFIMICRO",
    position: "CO",
    title: "RFI микро · CO",
    subtitle: "CO — открытие рейзом (2.5bb), источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "открытие",
        always: ["AA", "AKs", "AKo", "AQs", "AQo", "AJs", "AJo", "ATs", "ATo", "A9s", "A9o", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s", "KK", "KQs", "KQo", "KJs", "KJo", "KTs", "KTo", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "QQ", "QJs", "QJo", "QTs", "QTo", "Q9s", "Q8s", "JJ", "JTs", "JTo", "J9s", "J8s", "TT", "T9s", "T8s", "99", "98s", "88", "77", "66", "55", "44", "33", "22"],
        situational: [],
      },
      {
        kind: "raise",
        label: "фиш на блайндах",
        color: "green",
        always: [],
        situational: [],
        quarter: ["K2s", "Q7s"],
      },
    ],
  },
  {
    id: "rfi-micro-btn",
    group: "RFIMICRO",
    position: "BU",
    title: "RFI микро · BU",
    subtitle: "BU — открытие рейзом (2.5bb), источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "открытие",
        always: ["AA", "AKs", "AKo", "AQs", "AQo", "AJs", "AJo", "ATs", "ATo", "A9s", "A9o", "A8s", "A8o", "A7s", "A7o", "A6s", "A6o", "A5s", "A5o", "A4s", "A4o", "A3s", "A3o", "A2s", "A2o", "KK", "KQs", "KQo", "KJs", "KJo", "KTs", "KTo", "K9s", "K9o", "K8s", "K8o", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s", "QQ", "QJs", "QJo", "QTs", "QTo", "Q9s", "Q9o", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "JJ", "JTs", "JTo", "J9s", "J9o", "J8s", "J7s", "J6s", "J5s", "TT", "T9s", "T9o", "T8s", "T7s", "T6s", "99", "98s", "97s", "96s", "88", "87s", "86s", "77", "76s", "75s", "66", "65s", "64s", "55", "54s", "53s", "44", "43s", "33", "22"],
        situational: [],
      },
      {
        kind: "raise",
        label: "фиш на блайндах",
        color: "green",
        always: [],
        situational: [],
        quarter: ["Q2s", "J4s", "J3s", "J2s", "T5s"],
      },
    ],
  },
  {
    id: "rfi-micro-sb",
    group: "RFIMICRO",
    position: "SB",
    title: "RFI микро · SB",
    subtitle: "SB — открытие рейзом (3bb), источник \"кэш микро\"",
    actions: [
      {
        kind: "raise",
        label: "открытие",
        always: ["AA", "AKs", "AKo", "AQs", "AQo", "AJs", "AJo", "ATs", "ATo", "A9s", "A9o", "A8s", "A8o", "A7s", "A7o", "A6s", "A6o", "A5s", "A5o", "A4s", "A3s", "A2s", "KK", "KQs", "KQo", "KJs", "KJo", "KTs", "KTo", "K9s", "K9o", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s", "QQ", "QJs", "QJo", "QTs", "QTo", "Q9s", "Q9o", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "JJ", "JTs", "JTo", "J9s", "J9o", "J8s", "J7s", "J6s", "J5s", "TT", "T9s", "T9o", "T8s", "T7s", "T6s", "99", "98s", "97s", "96s", "88", "87s", "86s", "77", "76s", "75s", "66", "65s", "64s", "55", "54s", "44", "33", "22"],
        situational: [],
      },
      {
        kind: "raise",
        label: "фиш на блайндах",
        color: "green",
        always: [],
        situational: [],
        quarter: ["A4o", "A3o", "A2o", "K8o", "Q2s", "J4s", "J3s", "J2s", "T5s", "53s", "43s"],
      },
    ],
  },
];

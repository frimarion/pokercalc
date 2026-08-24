// Колл 4бета после 3бета в позиции.
//
// Источник — те же чарты, что и `threeBetIP.ts`: там диапазон 3бета раскрашен
// по тому, что делать, когда опенер ответил 4бетом. Зелёный — защищаемся
// всегда (вес 1), оранжевый — половину раздач (0.5), красный — сдаём.
// Пуша в этих чартах нет, защита здесь — именно колл 4бета.
//
// Процент на чарте подписан у 3бет-диапазона, а не у защиты, поэтому обычной
// сверки ширины тут нет. Вместо неё структурный инвариант (в тестах):
// защищаться можно только той рукой, которой ты и 3бетнул, — весь чарт обязан
// умещаться в `3betip-*` того же процента.

import { RangePreset } from "./types";

export const DEF4BETIP_PRESETS: RangePreset[] = [
  {
    id: "def4bet-ip-15",
    group: "DEF4BETIP",
    position: "vs RFI 15%",
    title: "Колл 4бета · после 3бета IP vs 15%",
    subtitle: "Чарт «IP vs EP 16%+ open» — опенер ответил 4бетом",
    actions: [
      {
        kind: "call",
        label: "колл 4бета",
        always: ["AA", "AKs", "AKo", "KK", "QQ"],
        situational: ["JJ"],
      },
    ],
  },
  {
    id: "def4bet-ip-18",
    group: "DEF4BETIP",
    position: "vs RFI 18%",
    title: "Колл 4бета · после 3бета IP vs 18%",
    subtitle: "Чарт «IP vs MP 19%+ open» — опенер ответил 4бетом",
    actions: [
      {
        kind: "call",
        label: "колл 4бета",
        always: ["AA", "AKs", "AKo", "KK", "QQ", "JJ"],
        situational: ["AQs", "TT"],
      },
    ],
  },
  {
    id: "def4bet-ip-26",
    group: "DEF4BETIP",
    position: "vs RFI 26%",
    title: "Колл 4бета · после 3бета IP vs 26%",
    subtitle: "Чарт «IP vs CO 26%+ open» — опенер ответил 4бетом",
    actions: [
      {
        kind: "call",
        label: "колл 4бета",
        always: ["AA", "AKs", "AQs", "AKo", "KK", "QQ", "JJ"],
        situational: ["AJs", "KQs", "TT"],
      },
    ],
  },
];

// 3Bet IP — 3бет в позиции против оупенрейза (Green Charts, стр. 9).
//
// «vs RFI 15/18/26%» — это НЕ ширина диапазона хиро, а ширина рейнджа
// оппонента-опенрейзера, против которого строится 3бет (см. подпись в PDF:
// «Диапазон 3бета в позиции на оппа, который оупенрейзит 15%»). На MP, CO
// и BU игра идёт без диапазона колла — только 3бет либо фолд, поэтому здесь
// всего одно действие "raise".
//
// Цвет ячейки в PDF (красный/зелёный/жёлтый/фиолетовый) кодирует НЕ вес
// руки, а стратегию ответа на 4бет (фолд / колл / фолд-от-пассивных / пуш) —
// это никак не влияет на модель диапазона. Вес читается из другого: ячейка
// залита цветом целиком (always, вес 1.0) либо наполовину, вторая половина —
// серый фон фолда (situational, вес 0.5) — та же конвенция, что в BB Defense.
//
// Сайзинг: оупенрейз 2.5bb → 3бет до 9bb, оупенрейз 3bb → 3бет до 10bb.

import { RangePreset } from "./types";

export const THREEBET_IP_PRESETS: RangePreset[] = [
  {
    id: "3betip-15",
    group: "3BETIP",
    position: "vs RFI 15%",
    title: "3бет IP · vs RFI 15%",
    subtitle: "Диапазон 3бета в позиции на оппа, который оупенрейзит 15%",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
        "AA", "AKs", "AKo", "AQs", "AJs", "KK", "KQs", "KJs", "QQ", "QJs",
        "JJ", "TT", "99"
        ],
        situational: [
        "AQo", "ATs", "KTs", "QTs", "JTs"
        ],
      },
    ],
  },
  {
    id: "3betip-18",
    group: "3BETIP",
    position: "vs RFI 18%",
    title: "3бет IP · vs RFI 18%",
    subtitle: "Диапазон 3бета в позиции на оппа, который оупенрейзит 18%",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
        "AA", "AKs", "AKo", "AQs", "AQo", "AJs", "ATs", "KK", "KQs", "KJs",
        "KTs", "QQ", "QJs", "QTs", "JJ", "JTs", "TT", "99", "88"
        ],
        situational: [],
      },
    ],
  },
  {
    id: "3betip-26",
    group: "3BETIP",
    position: "vs RFI 26%",
    title: "3бет IP · vs RFI 26%",
    subtitle: "Диапазон 3бета в позиции на оппа, который оупенрейзит 26%",
    actions: [
      {
        kind: "raise",
        label: "3бет",
        always: [
        "AA", "AKs", "AKo", "AQs", "AQo", "AJs", "ATs", "A5s", "A4s", "KK",
        "KQs", "KJs", "KTs", "QQ", "QJs", "QTs", "JJ", "JTs", "TT", "99", "88"
        ],
        situational: [
        "AJo", "A9s", "KQo", "K9s", "Q9s", "J9s", "T9s", "98s", "87s", "77",
        "76s"
        ],
      },
    ],
  },
];

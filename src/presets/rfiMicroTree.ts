// Ветка событий для "кэш микро" — пока оцифрован только RFI, поэтому дерево
// состоит из одного шага (кто открыл) без продолжения. Дальше по действиям
// соперников (3бет, защита блайндов и т.п.) для этого источника чартов нет —
// подставлять сюда чарты Green Charts было бы враньём: другой источник,
// другая ширина. Честно: дерево не показывает линию, под которую нет чарта
// (тот же принцип, что у MTT_STACKS в mtt/tree.ts).

import { TreeNode } from "./tree";
import { ActionKind } from "./types";

const RFI_MICRO_SEATS: { key: string; seat: string; size: string }[] = [
  { key: "utg", seat: "UTG", size: "3bb" },
  { key: "mp", seat: "MP", size: "3bb" },
  { key: "co", seat: "CO", size: "2.5bb" },
  { key: "btn", seat: "BU", size: "2.5bb" },
  { key: "sb", seat: "SB", size: "3bb" },
];

export const RFI_MICRO_TREE: TreeNode = {
  title: "Кто открыл",
  note: "источник «кэш микро» — оцифрован только RFI, ответы соперников не покрыты",
  showFold: true,
  options: RFI_MICRO_SEATS.map(({ key, seat, size }) => ({
    key,
    label: seat,
    note: `рейз ${size}`,
    presetId: `rfi-micro-${key}`,
    actionKind: "raise" as ActionKind,
  })),
};

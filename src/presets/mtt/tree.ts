// Ветка событий MTT (FF START).
//
// В отличие от кэша, в MTT глубина стека — часть спота, а не фон: на 25bb+
// открываем рейзом 2bb, на 10-14bb уже только пуш-фолд, против опена на 40bb+
// коллируем и 3бетим, а на 16-22bb ставим олл-ин. Поэтому после «что было до
// вас» идёт шаг выбора стека, и только потом позиция. Без него чарты
// противоречили бы друг другу: и опен 2bb, и опен-пуш — это «все сфолдили».
//
// Чарты, заданные группой позиций («ранние», «поздние»), так группой и
// остаются: оригинал не делит их по конкретному месту, и раскладывать их по
// местам самим — выдумывать данные.

import { TreeNode, TreeOption } from "../tree";
import { RangePreset } from "../types";
import { MTT_RFI_PRESETS } from "./rfi";
import { MTT_ISO_PRESETS } from "./iso";
import { MTT_VS_RFI_PRESETS } from "./vsRfi";
import { MTT_DEF3BET_PRESETS } from "./defVs3bet";
import { MTT_BBDEF_PRESETS } from "./bbDefense";
import { MTT_PUSH_PRESETS } from "./push";
import { MTT_3BETPUSH_PRESETS } from "./threeBetPush";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Шаг выбора линии внутри чарта с двумя действиями. Нужен там, где чарт
 * играет руку и рейзом, и пассивно: без фильтра в матрицу лёг бы
 * объединённый диапазон, по которому не видно, чем именно рука играется.
 */
function lineNode(p: RangePreset): TreeNode | undefined {
  const raise = p.actions.find((a) => a.kind === "raise");
  const call = p.actions.find((a) => a.kind === "call");
  if (!raise || !call) return undefined;
  return {
    title: `${p.position} — какой линией`,
    options: [
      { key: "all", label: "Весь диапазон", presetId: p.id },
      { key: "raise", label: cap(raise.label), presetId: p.id, actionKind: "raise" },
      { key: "call", label: cap(call.label), presetId: p.id, actionKind: "call" },
    ],
  };
}

/** Список чартов → опции шага, с подшагом выбора линии там, где линий две. */
function options(presets: RangePreset[]): TreeOption[] {
  return presets.map((p): TreeOption => ({
    // Ключ — хвост id после префикса группы: он уникален внутри шага.
    key: p.id.replace(/^mtt-[a-z0-9]+-/, ""),
    label: p.position,
    presetId: p.id,
    next: lineNode(p),
  }));
}

const pushAt = (stack: string) =>
  MTT_PUSH_PRESETS.filter((p) => p.subtitle.includes(`стек ${stack}`));

/** Все сфолдили — открываем сами. Чем именно, решает стек. */
const OPEN_NODE: TreeNode = {
  title: "Глубина стека",
  note: "от неё зависит, открываем рейзом или пушим",
  options: [
    {
      key: "deep",
      label: "25bb+",
      note: "опен 2bb",
      next: {
        title: "Ваша позиция",
        note: "чем позже, тем шире открываем",
        showFold: true,
        options: options(MTT_RFI_PRESETS),
      },
    },
    {
      key: "s1014",
      label: "10-14bb",
      note: "только пуш или фолд",
      next: { title: "Ваша позиция", showFold: true, options: options(pushAt("10-14bb")) },
    },
    {
      key: "s09",
      label: "0-9bb",
      note: "только пуш или фолд",
      next: { title: "Ваша позиция", showFold: true, options: options(pushAt("0-9bb")) },
    },
  ],
};

/** До нас лимп. BB здесь тоже есть: отказ от изолейта у него — чек, а не фолд. */
const LIMP_NODE: TreeNode = {
  title: "Ваша позиция",
  note: "изолейт 3.5bb, с сильными руками 5-7bb",
  showFold: true,
  options: options(MTT_ISO_PRESETS),
};

/** До нас опен 2bb. На 40bb+ играем постфлоп, на 16-22bb — рестил-пуш. */
const VS_OPEN_NODE: TreeNode = {
  title: "Глубина стека",
  options: [
    {
      key: "deep",
      label: "40bb+",
      note: "3бет или колд-колл",
      next: {
        title: "Где вы сидите",
        showFold: true,
        options: [
          ...options(MTT_VS_RFI_PRESETS),
          {
            key: "bb",
            label: "BB",
            note: "защита блайнда",
            next: {
              title: "Кто открыл",
              showFold: true,
              options: options(MTT_BBDEF_PRESETS),
            },
          },
        ],
      },
    },
    {
      key: "short",
      label: "16-22bb",
      note: "3бет-пуш (рестил)",
      next: {
        title: "Кто открыл и где вы",
        showFold: true,
        options: options(MTT_3BETPUSH_PRESETS),
      },
    },
  ],
};

/** Мы открыли, нас 3бетнули. */
const DEF_3BET_NODE: TreeNode = {
  title: "С какой позиции вы открылись",
  note: "стек 40bb+, 3бет соперника 5-7bb",
  showFold: true,
  options: options(MTT_DEF3BET_PRESETS),
};

export const MTT_TREE: TreeNode = {
  title: "Что было до вас",
  note: "FF START · MTT",
  options: [
    { key: "open", label: "Все сфолдили", note: "открываем первыми", next: OPEN_NODE },
    { key: "limp", label: "Есть лимперы", note: "изолейт", next: LIMP_NODE },
    { key: "vsopen", label: "Открыли рейзом 2bb", note: "3бет, колл или пуш", next: VS_OPEN_NODE },
    { key: "def3bet", label: "Вы открыли, вас 3бетнули", next: DEF_3BET_NODE },
  ],
};

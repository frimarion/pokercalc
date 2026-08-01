// Ветки событий MTT (FF START) — своя на каждую глубину стека.
//
// В турнире стек решает всё: на 9bb единственное решение — пушить или нет,
// на 20bb против опена ты не коллируешь, а ставишь олл-ин, и только с 40bb
// начинается привычная игра с постфлопом. Поэтому глубина вынесена НАВЕРХ,
// в конфиг (как в GTO Wizard), а не спрятана шагом посреди дерева: сначала
// выбираешь стек, дальше видишь только те линии, которые на нём существуют.
//
// Из этого следует и главное правило этого файла: **дерево не показывает
// линию, под которую в паке нет чарта**. На 16-22bb пак не даёт опена, на
// 25-40bb — игры против опена. Подставить туда соседнюю глубину было бы
// незаметным враньём, поэтому вместо этого в note честно написано, чего
// на этом стеке нет.

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
    // У пуш-фолда position — «EP · 10-14bb»: стек внутри подписи нужен в
    // общем списке чартов, но в дереве он уже выбран конфигом выше.
    label: p.position.split(" · ")[0],
    presetId: p.id,
    next: lineNode(p),
  }));
}

const pushAt = (stack: string) =>
  MTT_PUSH_PRESETS.filter((p) => p.subtitle.includes(`стек ${stack}`));

/** Дерево коротких стеков: единственное решение — пушить или фолдить. */
function pushTree(stack: string): TreeNode {
  return {
    title: "Ваша позиция",
    note: "все до вас сфолдили · только олл-ин или фолд",
    showFold: true,
    options: options(pushAt(stack)),
  };
}

const OPEN_NODE: TreeNode = {
  title: "Ваша позиция",
  note: "чем позже, тем шире открываем",
  showFold: true,
  options: options(MTT_RFI_PRESETS),
};

/** До нас лимп. BB здесь тоже есть: отказ от изолейта у него — чек, а не фолд. */
const LIMP_NODE: TreeNode = {
  title: "Ваша позиция",
  note: "изолейт 3.5bb, с сильными руками 5-7bb",
  showFold: true,
  options: options(MTT_ISO_PRESETS),
};

/** До нас опен 2bb, стек 40bb+: играем 3бет или колд-колл. */
const VS_OPEN_NODE: TreeNode = {
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
};

/** Мы открыли, нас 3бетнули (5-7bb). */
const DEF_3BET_NODE: TreeNode = {
  title: "С какой позиции вы открылись",
  note: "3бет соперника 5-7bb",
  showFold: true,
  options: options(MTT_DEF3BET_PRESETS),
};

export interface StackConfig {
  key: string;
  /** Подпись кнопки конфига — глубина стека. */
  label: string;
  /** Что на этой глубине есть, а чего пак не покрывает. */
  note: string;
  tree: TreeNode;
}

// От глубокого к короткому: первый конфиг — дефолтный, а полное дерево
// полезнее как точка входа, чем чарт пуш-фолда на девяти блайндах.
export const MTT_STACKS: StackConfig[] = [
  {
    key: "s40",
    label: "40bb+",
    note: "полное дерево: опен, изолейт, игра против опена и защита от 3бета",
    tree: {
      title: "Что было до вас",
      options: [
        { key: "open", label: "Все сфолдили", note: "открываем первыми", next: OPEN_NODE },
        { key: "limp", label: "Есть лимперы", note: "изолейт", next: LIMP_NODE },
        {
          key: "vsopen",
          label: "Открыли рейзом 2bb",
          note: "3бет или колд-колл",
          next: VS_OPEN_NODE,
        },
        { key: "def3bet", label: "Вы открыли, вас 3бетнули", next: DEF_3BET_NODE },
      ],
    },
  },
  {
    key: "s2540",
    label: "25-40bb",
    note: "опен 2bb и изолейт · игра против опена начинается с 40bb",
    tree: {
      title: "Что было до вас",
      options: [
        { key: "open", label: "Все сфолдили", note: "открываем первыми", next: OPEN_NODE },
        { key: "limp", label: "Есть лимперы", note: "изолейт", next: LIMP_NODE },
      ],
    },
  },
  {
    key: "s1622",
    label: "16-22bb",
    note: "рестил-пуш против опена · своего опена на этом стеке в паке нет",
    tree: {
      title: "Кто открыл и где вы",
      note: "соперник открыл 2bb, вы отвечаете олл-ином",
      showFold: true,
      options: options(MTT_3BETPUSH_PRESETS),
    },
  },
  {
    key: "s1014",
    label: "10-14bb",
    note: "только опен-пуш · игры против опена пак не покрывает",
    tree: pushTree("10-14bb"),
  },
  {
    key: "s09",
    label: "0-9bb",
    note: "только опен-пуш · игры против опена пак не покрывает",
    tree: pushTree("0-9bb"),
  },
];

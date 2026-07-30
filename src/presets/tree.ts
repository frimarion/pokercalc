// Дерево префлоп-линий (в духе action tree в GTO Wizard).
//
// Вместо плоских рядов кнопок спот собирается по шагам: кто открыл → кто и
// как ответил → как опенер ответил на 3бет. На каждом шаге применяется
// соответствующий чарт Green Charts.
//
// Позиционная логика (кто IP, кто OOP) выводится строго из мест за столом:
// 3бет от CO/BU оставляет опенера вне позиции, 3бет от блайндов — в позиции,
// а BB против опена SB сам оказывается в позиции. Ширина диапазона соперника
// НЕ используется для автоподстановки чарта — %-чарты выбираются явно, а
// фактическая ширина показывается подсказкой, чтобы выбрать ближайший.

import { ActionKind, RangePreset, partialWeights } from "./types";
import { presetById } from "./all";
import { Range } from "../engine/combos";

/** Места за столом: 6-max кэша (UTG/MP/CO/BU) и 8-max MTT (UTG1/LJ/HJ/BTN). */
export type Seat =
  | "UTG"
  | "UTG1"
  | "MP"
  | "LJ"
  | "HJ"
  | "CO"
  | "BU"
  | "BTN"
  | "SB"
  | "BB";

export interface TreeOption {
  key: string;
  label: string;
  /** Мелкая подпись справа от названия — сайзинг или пояснение. */
  note?: string;
  /** Чарт, применяемый при выборе. Без него опция только раскрывает шаг. */
  presetId?: string;
  /** Фильтр действия внутри чарта. Сбрасывается при смене presetId. */
  actionKind?: ActionKind;
  next?: TreeNode;
}

export interface TreeNode {
  /** Заголовок карточки — чьё это решение или что выбираем. */
  title: string;
  note?: string;
  /** Показать серый неактивный «Фолд» первым пунктом (узел решения). */
  showFold?: boolean;
  options: TreeOption[];
}

/** Ширина диапазона пресета в процентах от 1326 комбо. */
export function presetWidthPct(p: RangePreset, kind?: ActionKind): number {
  const r = new Range();
  for (const a of p.actions) {
    if (kind && a.kind !== kind) continue;
    for (const h of a.always) r.setHand(h, 1);
    for (const [h, w] of partialWeights(a)) {
      r.setHand(h, Math.min(1, r.handWeight(h) + w));
    }
  }
  return (r.totalCombos() / 1326) * 100;
}

function widthOf(id: string, kind?: ActionKind): number {
  const p = presetById(id);
  return p ? presetWidthPct(p, kind) : 0;
}

const pct = (n: number) => `${n.toFixed(1)}%`;

interface Opener {
  key: string;
  seat: Seat;
  /** Сайзинг опенрейза. */
  size: string;
  rfi: string;
  /** Ответ SB 3бетом (нет, когда открывает сам SB). */
  sb?: string;
  /** Ответ BB. */
  bb: string;
  note?: string;
}

const OPENERS: Opener[] = [
  { key: "utg", seat: "UTG", size: "3bb", rfi: "rfi-utg", sb: "sb3bet-vs-utg", bb: "bbdef-vs-utg" },
  { key: "mp", seat: "MP", size: "3bb", rfi: "rfi-mp", sb: "sb3bet-vs-mp", bb: "bbdef-vs-mp" },
  { key: "co", seat: "CO", size: "2.5bb", rfi: "rfi-co", sb: "sb3bet-vs-co", bb: "bbdef-vs-co" },
  { key: "bu25", seat: "BU", size: "2.5bb", rfi: "rfi-bu", sb: "sb3bet-vs-bu", bb: "bbdef-vs-bu-25" },
  {
    key: "bu3",
    seat: "BU",
    size: "3bb",
    rfi: "rfi-bu",
    sb: "sb3bet-vs-bu",
    bb: "bbdef-vs-bu-3",
    note: "RFI оцифрован для 2.5bb",
  },
  { key: "sb", seat: "SB", size: "3bb", rfi: "rfi-sb", bb: "bbdef-vs-sb" },
];

/** Сайзинг 3бета — из подписей в чартах Green Charts. */
const SB_3BET_SIZE: Record<string, string> = {
  utg: "12bb", mp: "12bb", co: "10bb", bu25: "10bb", bu3: "10bb",
};
const BB_3BET_SIZE: Record<string, string> = {
  utg: "12bb", mp: "12bb", co: "10bb", bu25: "10bb", bu3: "12bb", sb: "9-10bb",
};

/** Места до блайндов — из них берутся 3беторы в позиции. */
const EARLY_SEATS: Seat[] = ["UTG", "MP", "CO", "BU"];

/** Кто может 3бетнуть в позиции после опена с этого места. */
function ipRaisers(seat: Seat): Seat[] {
  const i = EARLY_SEATS.indexOf(seat);
  return i < 0 ? [] : EARLY_SEATS.slice(i + 1);
}

const DEF_IP_PCTS = [6, 8, 10, 12, 14];
const DEF_OOP_PCTS = [8, 10, 12, 18];

/** Финальный шаг: как опенер разыгрывает выбранный чарт защиты. */
function actionsNode(presetId: string, ip: boolean): TreeNode {
  return {
    title: "Действие",
    note: `4бет = сайзинг 3бета × ${ip ? "2.2" : "2.5"}`,
    options: [
      { key: "all", label: "Весь диапазон", presetId },
      { key: "call", label: "Колл 3бета", presetId, actionKind: "call" },
      { key: "raise", label: "4бет", presetId, actionKind: "raise" },
    ],
  };
}

/**
 * Шаг «опенер отвечает на 3бет»: сначала явно выбирается чарт по ширине
 * 3бет-диапазона соперника, затем действие.
 */
function defenseNode(opener: Opener, ip: boolean, raiser: string, raiserWidth: number): TreeNode {
  const pcts = ip ? DEF_IP_PCTS : DEF_OOP_PCTS;
  const prefix = ip ? "def3bet-ip-" : "def3bet-oop-";
  return {
    title: `${opener.seat} — ответ на 3бет`,
    note: `${ip ? "в позиции" : "без позиции"} · ${raiser} 3бетит ${pct(raiserWidth)} — возьмите ближайший чарт`,
    showFold: true,
    options: pcts.map((n) => ({
      key: `p${n}`,
      label: `vs 3бет ${n}%`,
      presetId: `${prefix}${n}`,
      next: actionsNode(`${prefix}${n}`, ip),
    })),
  };
}

/** Шаг «кто и как ответил на опен». */
function respondersNode(op: Opener): TreeNode {
  const options: TreeOption[] = [];
  const ip = ipRaisers(op.seat);

  if (ip.length > 0) {
    // 3бет в позиции: чарт зависит от ширины опена соперника — выбираем явно.
    const size = op.size === "2.5bb" ? "9bb" : "10bb";
    options.push({
      key: "ip3bet",
      label: `${ip.join("/")} — 3бет`,
      note: `в позиции, до ${size}`,
      next: {
        title: "3бет в позиции",
        note: `${op.seat} открывает ${pct(widthOf(op.rfi))} — возьмите ближайший чарт`,
        options: [15, 18, 26].map((n) => ({
          key: `r${n}`,
          label: `vs опен ${n}%`,
          presetId: `3betip-${n}`,
          // 3бетор сидит ближе к баттону → опенер остаётся вне позиции.
          next: defenseNode(op, false, "Соперник", widthOf(`3betip-${n}`)),
        })),
      },
    });
  }

  if (op.sb) {
    options.push({
      key: "sb3bet",
      label: "SB — 3бет",
      note: `до ${SB_3BET_SIZE[op.key]}`,
      presetId: op.sb,
      // SB играет постфлоп первым → опенер в позиции.
      next: defenseNode(op, true, "SB", widthOf(op.sb)),
    });
  }

  // BB против опена SB сам оказывается в позиции постфлоп.
  const openerIpVsBb = op.seat !== "SB";
  options.push({
    key: "bb3bet",
    label: "BB — 3бет",
    note: `до ${BB_3BET_SIZE[op.key]}`,
    presetId: op.bb,
    actionKind: "raise",
    next: defenseNode(op, openerIpVsBb, "BB", widthOf(op.bb, "raise")),
  });
  options.push({
    key: "bbcall",
    label: "BB — колл",
    presetId: op.bb,
    actionKind: "call",
  });

  return {
    title: `Ответ на опен ${op.seat}`,
    note: "остальные фолд",
    showFold: true,
    options,
  };
}

/**
 * Места, с которых бывает изолэйт. UTG в чарте нет: до него лимпить некому.
 * Сайзинг из легенды стр. 5 — в позиции 4bb, без позиции 5bb, плюс 1bb за
 * каждого лимпера.
 */
const ISO_SEATS: { key: string; seat: Seat; size: string }[] = [
  { key: "mp", seat: "MP", size: "5bb + 1bb за лимпера" },
  { key: "co", seat: "CO", size: "4bb + 1bb за лимпера" },
  { key: "bu", seat: "BU", size: "4bb + 1bb за лимпера" },
  { key: "sb", seat: "SB", size: "5bb + 1bb за лимпера" },
  { key: "bb", seat: "BB", size: "5bb + 1bb за лимпера" },
];

/** Шаг «до нас лимп»: с какого места изолируем. */
const isoNode: TreeNode = {
  title: "Изолэйт после лимпа",
  note: "кто-то долимпил, рейза не было",
  showFold: true,
  options: ISO_SEATS.map(({ key, seat, size }) => ({
    key,
    label: seat,
    note: size,
    presetId: `iso-${key}`,
    // Только на SB у чарта есть второе действие — доставить блайнд до целого.
    next:
      seat === "SB"
        ? {
            title: "Действие",
            note: "на SB блайнд уже наполовину поставлен",
            options: [
              { key: "all", label: "Весь диапазон", presetId: "iso-sb" },
              { key: "raise", label: "Изолэйт", presetId: "iso-sb", actionKind: "raise" },
              {
                key: "call",
                label: "Доставить 0.5bb",
                presetId: "iso-sb",
                actionKind: "call",
              },
            ],
          }
        : undefined,
  })),
};

export const ACTION_TREE: TreeNode = {
  title: "Первое действие",
  note: "открываем сами или отвечаем на лимп",
  showFold: true,
  options: [
    ...OPENERS.map((op) => ({
      key: op.key,
      label: op.seat,
      note: op.note ? `рейз ${op.size} · ${op.note}` : `рейз ${op.size}`,
      presetId: op.rfi,
      actionKind: "raise" as ActionKind,
      next: respondersNode(op),
    })),
    { key: "iso", label: "Изолэйт", note: "до нас лимп", next: isoNode },
  ],
};

/** Цепочка карточек и выбранных опций для текущего пути. */
export function resolvePath(
  path: string[],
  root: TreeNode = ACTION_TREE,
): { node: TreeNode; chosen?: TreeOption }[] {
  const chain: { node: TreeNode; chosen?: TreeOption }[] = [];
  let node: TreeNode | undefined = root;
  for (let i = 0; node; i++) {
    const chosen: TreeOption | undefined = node.options.find((o) => o.key === path[i]);
    chain.push({ node, chosen });
    node = chosen?.next;
  }
  return chain;
}

/** Чарт и фильтр действия, соответствующие пути. */
export function presetForPath(
  path: string[],
  root: TreeNode = ACTION_TREE,
): { presetId?: string; actionKind?: ActionKind } {
  let presetId: string | undefined;
  let actionKind: ActionKind | undefined;
  for (const { chosen } of resolvePath(path, root)) {
    if (!chosen?.presetId) continue;
    presetId = chosen.presetId;
    actionKind = chosen.actionKind; // сбрасывается вместе со сменой чарта
  }
  return { presetId, actionKind };
}

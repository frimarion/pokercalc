// Категоризатор: как конкретная рука (2 карты) взаимодействует с бордом.
// Даёт MADE-категорию (лучшая готовая рука в терминах Flopzilla) и флаги дро.
// Плюс агрегатор, который считает взвешенные комбо диапазона по категориям.

import { Card, cardRank, cardSuit } from "./cards";
import { evaluate, categoryOf, straightHigh } from "./evaluator";
import { Range, NUM_COMBOS } from "./combos";

export type MadeCategory =
  | "straight-flush"
  | "quads"
  | "full-house"
  | "flush"
  | "straight"
  | "set-trips"
  | "two-pair"
  | "overpair"
  | "top-pair"
  | "middle-pair"
  | "weak-pair"
  | "underpair"
  | "no-pair";

export type DrawType = "flush-draw" | "oesd" | "gutshot" | "bdfd";

export const MADE_ORDER: MadeCategory[] = [
  "straight-flush",
  "quads",
  "full-house",
  "flush",
  "straight",
  "set-trips",
  "two-pair",
  "overpair",
  "top-pair",
  "middle-pair",
  "weak-pair",
  "underpair",
  "no-pair",
];

export const DRAW_ORDER: DrawType[] = ["flush-draw", "oesd", "gutshot", "bdfd"];

function rankMaskOf(cards: Card[]): number {
  let m = 0;
  for (const c of cards) m |= 1 << cardRank(c);
  return m;
}

/** MADE-категория руки (2 карты) на борде (3–5 карт). */
export function classifyMade(a: Card, b: Card, board: Card[]): MadeCategory {
  const all = [a, b, ...board];
  const cat = categoryOf(evaluate(all));
  switch (cat) {
    case 8:
      return "straight-flush";
    case 7:
      return "quads";
    case 6:
      return "full-house";
    case 5:
      return "flush";
    case 4:
      return "straight";
    case 3:
      return "set-trips"; // сет (карманка) или трипс (пара на борде + рука)
    case 2:
      return "two-pair";
    case 1:
      return classifyPair(a, b, board);
    default:
      return "no-pair";
  }
}

function classifyPair(a: Card, b: Card, board: Card[]): MadeCategory {
  const ra = cardRank(a);
  const rb = cardRank(b);
  const boardRanks = board.map(cardRank);
  const distinctBoard = [...new Set(boardRanks)].sort((x, y) => y - x);
  const top = distinctBoard[0];

  // Ранг пары (единственный ранг со счётом 2 в 7 картах).
  const count = new Array(13).fill(0);
  for (const c of [a, b, ...board]) count[cardRank(c)]++;
  let pairedRank = -1;
  for (let r = 12; r >= 0; r--) {
    if (count[r] === 2) {
      pairedRank = r;
      break;
    }
  }

  const pocket = ra === rb;
  if (pocket && ra === pairedRank) {
    // Чистая карманная пара (борд не добавил третью).
    return ra > top ? "overpair" : "underpair";
  }

  // Пара с участием карты борда.
  const holeHasPaired = ra === pairedRank || rb === pairedRank;
  if (!holeHasPaired) return "no-pair"; // играет пару борда, своей нет

  const pos = distinctBoard.indexOf(pairedRank);
  if (pos === 0) return "top-pair";
  if (pos === 1) return "middle-pair";
  return "weak-pair";
}

/** Ранги, добавление которых достраивает 5-стрит (аутсы стрит-дро). */
function straightOuts(mask: number): Set<number> {
  const outs = new Set<number>();
  for (let r = 0; r < 13; r++) {
    if (mask & (1 << r)) continue;
    if (straightHigh(mask | (1 << r)) >= 0) outs.add(r);
  }
  return outs;
}

/** Флаги дро (только на флопе/тёрне; на ривере дро нет). */
export function classifyDraws(a: Card, b: Card, board: Card[]): DrawType[] {
  const n = board.length;
  if (n < 3 || n >= 5) return [];
  const flags: DrawType[] = [];

  const holeSuits = [cardSuit(a), cardSuit(b)];
  const suitCount = [0, 0, 0, 0];
  for (const c of [a, b, ...board]) suitCount[cardSuit(c)]++;
  for (let s = 0; s < 4; s++) {
    if (!holeSuits.includes(s)) continue; // дро должно опираться на карту руки
    if (suitCount[s] === 4) flags.push("flush-draw");
    else if (suitCount[s] === 3 && n === 3) flags.push("bdfd");
  }

  const allMask = rankMaskOf([a, b, ...board]);
  const boardMask = rankMaskOf(board);
  const madeStraight = straightHigh(allMask) >= 0;
  if (!madeStraight) {
    const outsFull = straightOuts(allMask);
    const outsBoard = straightOuts(boardMask);
    // Считаем, только если рука добавляет аутсы (иначе это дро самого борда).
    if (outsFull.size > outsBoard.size) {
      if (outsFull.size >= 2) flags.push("oesd");
      else if (outsFull.size === 1) flags.push("gutshot");
    }
  }

  return flags;
}

export interface RangeBreakdown {
  total: number; // сумма весов живых комбо
  made: Record<MadeCategory, number>;
  draws: Record<DrawType, number>;
}

function emptyMade(): Record<MadeCategory, number> {
  return Object.fromEntries(MADE_ORDER.map((k) => [k, 0])) as Record<MadeCategory, number>;
}
function emptyDraws(): Record<DrawType, number> {
  return Object.fromEntries(DRAW_ORDER.map((k) => [k, 0])) as Record<DrawType, number>;
}

/**
 * Разбор всего диапазона по категориям на данном борде.
 * blockerMask должен включать борд (+ карты hero), чтобы пересекающиеся
 * с бордом комбо исключались.
 */
export function breakdownRange(
  range: Range,
  board: Card[],
  blockerMask: bigint,
): RangeBreakdown {
  const made = emptyMade();
  const draws = emptyDraws();
  let total = 0;
  if (board.length < 3) return { total, made, draws };

  for (const [, hi, lo, w] of range.liveCombos(blockerMask)) {
    total += w;
    made[classifyMade(hi, lo, board)] += w;
    for (const d of classifyDraws(hi, lo, board)) draws[d] += w;
  }
  return { total, made, draws };
}

/** Сила MADE-категории 0..1 (для heatmap): 1 = стрит-флеш, 0 = нет пары. */
export function madeStrength(cat: MadeCategory): number {
  const i = MADE_ORDER.indexOf(cat);
  return (MADE_ORDER.length - 1 - i) / (MADE_ORDER.length - 1);
}

/**
 * Морфинг: оставить в диапазоне только комбо, чья MADE-категория входит в
 * keepMade ИЛИ у которых есть дро из keepDraws. Веса сохраняются, остальное → 0.
 * Возвращает новые веса (Float32Array). До флопа фильтрация не применяется.
 */
export function filterRange(
  range: Range,
  board: Card[],
  blockerMask: bigint,
  keepMade: Set<MadeCategory>,
  keepDraws: Set<DrawType>,
): Float32Array {
  if (board.length < 3) return range.weights.slice();
  const out = new Float32Array(NUM_COMBOS);
  for (const [i, hi, lo, w] of range.liveCombos(blockerMask)) {
    let keep = keepMade.has(classifyMade(hi, lo, board));
    if (!keep && keepDraws.size > 0) {
      for (const d of classifyDraws(hi, lo, board)) {
        if (keepDraws.has(d)) {
          keep = true;
          break;
        }
      }
    }
    if (keep) out[i] = w;
  }
  return out;
}

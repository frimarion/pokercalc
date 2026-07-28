// Комбо и модель диапазона.
//
// Комбо — неупорядоченная пара разных карт (всего C(52,2) = 1326).
// Каждое комбо имеет канонический индекс 0..1325.
// Диапазон — веса 0..1 на каждое из 1326 комбо (Float32Array).
//
// 169 стартовых рук (сетка 13×13) — это ярлыки (AA, AKs, AKo), каждый
// раскрывается в набор конкретных комбо (пара=6, suited=4, offsuit=12).

import { Card, cardRank, cardSuit, RANKS, makeCard } from "./cards";

export const NUM_COMBOS = 1326;

/** Все 1326 комбо как [hi, lo], hi > lo. Индекс массива = индекс комбо. */
export const ALL_COMBOS: ReadonlyArray<readonly [Card, Card]> = buildAllCombos();

// comboIndex[hi][lo] → индекс в ALL_COMBOS (hi > lo).
const COMBO_INDEX: Int32Array = buildComboIndexTable();

function buildAllCombos(): [Card, Card][] {
  const out: [Card, Card][] = [];
  for (let hi = 1; hi < 52; hi++) {
    for (let lo = 0; lo < hi; lo++) out.push([hi, lo]);
  }
  return out;
}

function buildComboIndexTable(): Int32Array {
  const table = new Int32Array(52 * 52).fill(-1);
  for (let i = 0; i < ALL_COMBOS.length; i++) {
    const [hi, lo] = ALL_COMBOS[i];
    table[hi * 52 + lo] = i;
    table[lo * 52 + hi] = i;
  }
  return table;
}

/** Индекс комбо по двум картам (порядок не важен). */
export function comboIndex(a: Card, b: Card): number {
  return COMBO_INDEX[a * 52 + b];
}

// ─────────────────────────────────────────────────────────────────────────
// 169-hand ярлыки
// ─────────────────────────────────────────────────────────────────────────

export type HandType = "pair" | "suited" | "offsuit";

/** Ярлык 169-hand для конкретного комбо: "AA" | "AKs" | "AKo". */
export function handLabel(a: Card, b: Card): string {
  const ra = cardRank(a);
  const rb = cardRank(b);
  if (ra === rb) return RANKS[ra] + RANKS[ra];
  const hi = Math.max(ra, rb);
  const lo = Math.min(ra, rb);
  const suited = cardSuit(a) === cardSuit(b);
  return RANKS[hi] + RANKS[lo] + (suited ? "s" : "o");
}

/**
 * Индексы комбо, принадлежащих ярлыку 169-hand.
 * "AA" → 6 комбо, "AKs" → 4, "AKo" → 12.
 */
export function comboIndicesForLabel(label: string): number[] {
  const parsed = parseLabel(label);
  const out: number[] = [];
  if (parsed.type === "pair") {
    const r = parsed.hi;
    for (let s1 = 0; s1 < 4; s1++)
      for (let s2 = s1 + 1; s2 < 4; s2++)
        out.push(comboIndex(makeCard(r, s1), makeCard(r, s2)));
  } else if (parsed.type === "suited") {
    for (let s = 0; s < 4; s++)
      out.push(comboIndex(makeCard(parsed.hi, s), makeCard(parsed.lo, s)));
  } else {
    for (let s1 = 0; s1 < 4; s1++)
      for (let s2 = 0; s2 < 4; s2++)
        if (s1 !== s2)
          out.push(comboIndex(makeCard(parsed.hi, s1), makeCard(parsed.lo, s2)));
  }
  return out;
}

interface ParsedLabel {
  type: HandType;
  hi: number; // rankIndex
  lo: number; // rankIndex
}

const RANK_OF: Record<string, number> = Object.fromEntries(
  RANKS.map((r, i) => [r, i]),
);

function parseLabel(label: string): ParsedLabel {
  const r1 = RANK_OF[label[0].toUpperCase()];
  const r2 = RANK_OF[label[1].toUpperCase()];
  if (r1 === undefined || r2 === undefined) throw new Error(`Bad hand label: "${label}"`);
  if (label.length === 2) {
    if (r1 !== r2) throw new Error(`Bad pair label: "${label}"`);
    return { type: "pair", hi: r1, lo: r1 };
  }
  const suffix = label[2].toLowerCase();
  const hi = Math.max(r1, r2);
  const lo = Math.min(r1, r2);
  if (suffix === "s") return { type: "suited", hi, lo };
  if (suffix === "o") return { type: "offsuit", hi, lo };
  throw new Error(`Bad hand label: "${label}"`);
}

// ─────────────────────────────────────────────────────────────────────────
// Сетка 13×13
// ─────────────────────────────────────────────────────────────────────────

export interface GridCell {
  label: string;
  type: HandType;
  row: number; // 0..12
  col: number; // 0..12
}

/**
 * Сетка 13×13 как во Flopzilla: строки/столбцы — ранги от A до 2.
 * Диагональ — пары, верхний треугольник — suited, нижний — offsuit.
 */
export function gridCells(): GridCell[][] {
  const ranksDesc = [...RANKS].reverse(); // A..2
  const grid: GridCell[][] = [];
  for (let row = 0; row < 13; row++) {
    const line: GridCell[] = [];
    for (let col = 0; col < 13; col++) {
      const rHi = ranksDesc[Math.min(row, col)];
      const rLo = ranksDesc[Math.max(row, col)];
      let label: string;
      let type: HandType;
      if (row === col) {
        label = rHi + rHi;
        type = "pair";
      } else if (row < col) {
        label = rHi + rLo + "s";
        type = "suited";
      } else {
        label = rHi + rLo + "o";
        type = "offsuit";
      }
      line.push({ label, type, row, col });
    }
    grid.push(line);
  }
  return grid;
}

// ─────────────────────────────────────────────────────────────────────────
// Диапазон
// ─────────────────────────────────────────────────────────────────────────

/** Диапазон — веса 0..1 на каждое из 1326 комбо. */
export class Range {
  readonly weights: Float32Array;

  constructor(weights?: Float32Array) {
    this.weights = weights ?? new Float32Array(NUM_COMBOS);
  }

  clone(): Range {
    return new Range(this.weights.slice());
  }

  clear(): void {
    this.weights.fill(0);
  }

  /** Установить вес для всех комбо ярлыка (напр. "AKs" → 0.5). */
  setHand(label: string, weight: number): void {
    for (const idx of comboIndicesForLabel(label)) this.weights[idx] = weight;
  }

  /** Средний вес ярлыка (для подсветки ячейки сетки). */
  handWeight(label: string): number {
    const idxs = comboIndicesForLabel(label);
    let sum = 0;
    for (const idx of idxs) sum += this.weights[idx];
    return sum / idxs.length;
  }

  /**
   * Сумма весов живых комбо (не заблокированных). Это «комбо в ренже».
   * blockerMask — bigint-маска занятых карт (борд + карты героя).
   */
  totalCombos(blockerMask = 0n): number {
    let sum = 0;
    for (let i = 0; i < NUM_COMBOS; i++) {
      const w = this.weights[i];
      if (w === 0) continue;
      const [hi, lo] = ALL_COMBOS[i];
      if ((blockerMask >> BigInt(hi)) & 1n) continue;
      if ((blockerMask >> BigInt(lo)) & 1n) continue;
      sum += w;
    }
    return sum;
  }

  /** Живые комбо как [index, hi, lo, weight], с учётом блокеров. */
  liveCombos(blockerMask = 0n): Array<[number, Card, Card, number]> {
    const out: Array<[number, Card, Card, number]> = [];
    for (let i = 0; i < NUM_COMBOS; i++) {
      const w = this.weights[i];
      if (w === 0) continue;
      const [hi, lo] = ALL_COMBOS[i];
      if ((blockerMask >> BigInt(hi)) & 1n) continue;
      if ((blockerMask >> BigInt(lo)) & 1n) continue;
      out.push([i, hi, lo, w]);
    }
    return out;
  }
}

/** Построить диапазон из списка ярлыков ("AA","AKs",...) с весом 1. */
export function rangeFromLabels(labels: string[], weight = 1): Range {
  const r = new Range();
  for (const l of labels) r.setHand(l, weight);
  return r;
}

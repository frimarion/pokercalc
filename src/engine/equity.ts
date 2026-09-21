// Эквити range vs range.
//
// Гибрид: если пространство раскладов небольшое (обычно тёрн/ривер) — точный
// перебор; иначе Monte Carlo (префлоп/флоп с широкими диапазонами).
// Только heads-up (два диапазона). Ничья делится пополам.

import { Card } from "./cards";
import { Range } from "./combos";
import { evaluate } from "./evaluator";

export interface EquitySide {
  win: number; // доля выигрышей (без учёта ничьих)
  tie: number; // доля ничьих
  equity: number; // win + tie/2
}

export interface EquityResult {
  a: EquitySide;
  b: EquitySide;
  total: number; // сколько взвешенных раскладов посчитано
  samples: number; // итераций (для MC) или раскладов (для точного)
  exact: boolean;
  valid: boolean; // false, если у стороны нет живых комбо
  combos?: { a: ComboEquity[]; b: ComboEquity[] };
  nextCards?: { card: Card; equity: number | null; exact: boolean }[];
}

export interface ComboEquity extends EquitySide {
  index: number;
  samples: number;
  weight: number;
}

export interface EquityOptions {
  dead?: Card[]; // дополнительные мёртвые карты (обычно борд входит отдельно)
  samples?: number; // цель для Monte Carlo
  exactLimit?: number; // порог работы для точного перебора
  rng?: () => number; // источник случайности (для тестов)
  detail?: boolean;
}

const DEFAULT_SAMPLES = 80_000;
const DEFAULT_EXACT_LIMIT = 4_000_000;

function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

function maskOf(cards: Card[]): bigint {
  let m = 0n;
  for (const c of cards) m |= 1n << BigInt(c);
  return m;
}

function isBlocked(mask: bigint, card: Card): boolean {
  return ((mask >> BigInt(card)) & 1n) === 1n;
}

type Live = [number, Card, Card, number]; // idx, hi, lo, weight

const EMPTY_SIDE: EquitySide = { win: 0, tie: 0, equity: 0 };

function invalid(): EquityResult {
  return { a: { ...EMPTY_SIDE }, b: { ...EMPTY_SIDE }, total: 0, samples: 0, exact: false, valid: false };
}

/** Точный перебор всех пар комбо × всех раскладов рантаймов. */
function equityExact(
  liveA: Live[],
  liveB: Live[],
  board: Card[],
  deadMask: bigint,
  detail: boolean,
): EquityResult {
  const need = 5 - board.length;
  let winA = 0;
  let winB = 0;
  let tie = 0;
  let total = 0;
  let samples = 0;
  const stats = detail ? new ComboStats() : null;

  for (const [ai, a1, a2, wa] of liveA) {
    for (const [bi, b1, b2, wb] of liveB) {
      if (a1 === b1 || a1 === b2 || a2 === b1 || a2 === b2) continue; // пересечение рук
      const w = wa * wb;
      const used = deadMask | (1n << BigInt(a1)) | (1n << BigInt(a2)) | (1n << BigInt(b1)) | (1n << BigInt(b2));

      // Оставшаяся колода.
      const remaining: Card[] = [];
      for (let c = 0; c < 52; c++) if (!isBlocked(used, c)) remaining.push(c);

      forEachRunout(remaining, need, (run) => {
        const full = board.concat(run);
        const ea = evaluate([a1, a2, ...full]);
        const eb = evaluate([b1, b2, ...full]);
        if (ea > eb) winA += w;
        else if (eb > ea) winB += w;
        else tie += w;
        total += w;
        samples++;
        stats?.add(ai, bi, ea, eb, w);
      });
    }
  }

  return withStats(finalize(winA, winB, tie, total, samples, true), stats, liveA, liveB);
}

/** Monte Carlo: сэмплируем комбо по весам + случайный рантайм. */
function equityMonteCarlo(
  liveA: Live[],
  liveB: Live[],
  board: Card[],
  deadMask: bigint,
  samples: number,
  rng: () => number,
  detail: boolean,
): EquityResult {
  const need = 5 - board.length;
  // Sample the joint distribution wa * wb over compatible pairs. Retrying
  // only B after choosing A biases A towards hands that block more of B.
  const conditionalB = liveA.map((a) => {
    let sum = 0;
    return liveB.map((b) => {
      if (a[1] !== b[1] && a[1] !== b[2] && a[2] !== b[1] && a[2] !== b[2]) sum += b[3];
      return sum;
    });
  });
  let mass = 0;
  const cumA = liveA.map((a, i) => (mass += a[3] * conditionalB[i][liveB.length - 1]));
  const totalWA = cumA[cumA.length - 1];
  if (totalWA <= 0) return invalid();
  const stats = detail ? new ComboStats() : null;

  let winA = 0;
  let winB = 0;
  let tie = 0;
  let counted = 0;

  const runout: Card[] = new Array(need);
  const deck = Array.from({ length: 52 }, (_, c) => c).filter((c) => !isBlocked(deadMask, c));

  for (let s = 0; s < samples; s++) {
    const ai = pick(cumA, rng() * totalWA);
    const a = liveA[ai];
    const cumB = conditionalB[ai];
    const b = liveB[pick(cumB, rng() * cumB[cumB.length - 1])];

    const remaining = deck.filter((c) => c !== a[1] && c !== a[2] && c !== b[1] && c !== b[2]);
    // Partial Fisher–Yates: uniform runout, even with many dead cards.
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(rng() * (remaining.length - i));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      runout[i] = remaining[i];
    }

    const full = board.concat(runout);
    const ea = evaluate([a[1], a[2], ...full]);
    const eb = evaluate([b[1], b[2], ...full]);
    if (ea > eb) winA++;
    else if (eb > ea) winB++;
    else tie++;
    counted++;
    stats?.add(a[0], b[0], ea, eb, 1);
  }

  return withStats(finalize(winA, winB, tie, counted, counted, false), stats, liveA, liveB);
}

class ComboStats {
  a = new Map<number, [number, number, number, number]>();
  b = new Map<number, [number, number, number, number]>();
  add(ai: number, bi: number, ea: number, eb: number, w: number) {
    for (const [map, idx, win] of [[this.a, ai, ea > eb], [this.b, bi, eb > ea]] as const) {
      const row = map.get(idx) ?? [0, 0, 0, 0];
      row[0] += win ? w : 0;
      row[1] += ea === eb ? w : 0;
      row[2] += w;
      row[3]++;
      map.set(idx, row);
    }
  }
}

function withStats(result: EquityResult, stats: ComboStats | null, a: Live[], b: Live[]): EquityResult {
  if (!stats || !result.valid) return result;
  const rows = (live: Live[], map: ComboStats["a"]): ComboEquity[] => live.flatMap(([index, , , weight]) => {
    const row = map.get(index);
    if (!row) return [];
    const [win, tie, total, samples] = row;
    return [{ index, weight, samples, win: win / total, tie: tie / total, equity: (win + tie / 2) / total }];
  });
  return { ...result, combos: { a: rows(a, stats.a), b: rows(b, stats.b) } };
}

function finalize(
  winA: number,
  winB: number,
  tie: number,
  total: number,
  samples: number,
  exact: boolean,
): EquityResult {
  if (total <= 0) return invalid();
  const a: EquitySide = {
    win: winA / total,
    tie: tie / total,
    equity: (winA + tie / 2) / total,
  };
  const b: EquitySide = {
    win: winB / total,
    tie: tie / total,
    equity: (winB + tie / 2) / total,
  };
  return { a, b, total, samples, exact, valid: true };
}

/** Бинарный поиск индекса по префиксным суммам. */
function pick(cum: number[], target: number): number {
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function forEachRunout(remaining: Card[], count: number, cb: (cards: Card[]) => void): void {
  if (count === 0) {
    cb([]);
    return;
  }
  if (count === 1) {
    for (const c of remaining) cb([c]);
    return;
  }
  if (count === 2) {
    for (let i = 0; i < remaining.length; i++)
      for (let j = i + 1; j < remaining.length; j++) cb([remaining[i], remaining[j]]);
    return;
  }
  // count >= 3 — общий случай (используется редко, точный перебор ограничен порогом).
  const idx: number[] = [];
  const rec = (start: number) => {
    if (idx.length === count) {
      cb(idx.map((i) => remaining[i]));
      return;
    }
    for (let i = start; i < remaining.length; i++) {
      idx.push(i);
      rec(i + 1);
      idx.pop();
    }
  };
  rec(0);
}

/**
 * Посчитать эквити диапазона A против диапазона B на борде.
 * board — известные карты (0..5). Диспетчер выбирает точный перебор или MC.
 */
export function computeEquity(
  a: Range,
  b: Range,
  board: Card[],
  opts: EquityOptions = {},
): EquityResult {
  const known = [...board, ...(opts.dead ?? [])];
  if (board.length > 5 || known.some((c) => !Number.isInteger(c) || c < 0 || c > 51)
    || new Set(known).size !== known.length || known.length + (5 - board.length) + 4 > 52) return invalid();
  const deadMask = maskOf([...board, ...(opts.dead ?? [])]);
  const liveA = a.liveCombos(deadMask);
  const liveB = b.liveCombos(deadMask);
  if (liveA.length === 0 || liveB.length === 0) return invalid();

  const need = 5 - board.length;
  const rem = 52 - board.length - 4; // грубая оценка оставшейся колоды
  const runouts = need <= 0 ? 1 : comb(rem, need);
  const work = liveA.length * liveB.length * runouts;

  const exactLimit = opts.exactLimit ?? DEFAULT_EXACT_LIMIT;
  if (board.length >= 3 && work <= exactLimit) {
    return equityExact(liveA, liveB, board, deadMask, opts.detail ?? false);
  }
  return equityMonteCarlo(
    liveA,
    liveB,
    board,
    deadMask,
    opts.samples ?? DEFAULT_SAMPLES,
    opts.rng ?? Math.random,
    opts.detail ?? false,
  );
}

/** Conditional equity after each possible turn/river; original range weights stay fixed. */
export function computeNextCards(a: Range, b: Range, board: Card[], opts: EquityOptions = {}): NonNullable<EquityResult["nextCards"]> {
  if (board.length !== 3 && board.length !== 4) return [];
  const used = new Set([...board, ...(opts.dead ?? [])]);
  return Array.from({ length: 52 }, (_, c) => c).filter((c) => !used.has(c)).map((card) => {
    const result = computeEquity(a, b, [...board, card], { ...opts, detail: false, samples: 10_000, exactLimit: 20_000 });
    return { card, equity: result.valid ? result.a.equity : null, exact: result.exact };
  });
}

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
}

export interface EquityOptions {
  dead?: Card[]; // дополнительные мёртвые карты (обычно борд входит отдельно)
  samples?: number; // цель для Monte Carlo
  exactLimit?: number; // порог работы для точного перебора
  rng?: () => number; // источник случайности (для тестов)
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
): EquityResult {
  const need = 5 - board.length;
  let winA = 0;
  let winB = 0;
  let tie = 0;
  let total = 0;

  for (const [, a1, a2, wa] of liveA) {
    for (const [, b1, b2, wb] of liveB) {
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
      });
    }
  }

  return finalize(winA, winB, tie, total, total, true);
}

/** Monte Carlo: сэмплируем комбо по весам + случайный рантайм. */
function equityMonteCarlo(
  liveA: Live[],
  liveB: Live[],
  board: Card[],
  deadMask: bigint,
  samples: number,
  rng: () => number,
): EquityResult {
  const need = 5 - board.length;
  const cumA = cumulative(liveA);
  const cumB = cumulative(liveB);
  const totalWA = cumA[cumA.length - 1];
  const totalWB = cumB[cumB.length - 1];
  if (totalWA <= 0 || totalWB <= 0) return invalid();

  let winA = 0;
  let winB = 0;
  let tie = 0;
  let counted = 0;

  const runout: Card[] = new Array(need);

  for (let s = 0; s < samples; s++) {
    const a = liveA[pick(cumA, rng() * totalWA)];
    // Виллана сэмплируем с отбраковкой пересечения с рукой A.
    let b: Live | null = null;
    for (let tries = 0; tries < 8; tries++) {
      const cand = liveB[pick(cumB, rng() * totalWB)];
      if (cand[1] !== a[1] && cand[1] !== a[2] && cand[2] !== a[1] && cand[2] !== a[2]) {
        b = cand;
        break;
      }
    }
    if (!b) continue;

    const used = deadMask | (1n << BigInt(a[1])) | (1n << BigInt(a[2])) | (1n << BigInt(b[1])) | (1n << BigInt(b[2]));

    // Случайный рантайм без повторов.
    let ok = true;
    let drawn = 0n;
    for (let i = 0; i < need; i++) {
      let card = -1;
      for (let tries = 0; tries < 20; tries++) {
        const c = Math.floor(rng() * 52);
        if (!isBlocked(used, c) && !isBlocked(drawn, c)) {
          card = c;
          break;
        }
      }
      if (card < 0) {
        ok = false;
        break;
      }
      drawn |= 1n << BigInt(card);
      runout[i] = card;
    }
    if (!ok) continue;

    const full = board.concat(runout);
    const ea = evaluate([a[1], a[2], ...full]);
    const eb = evaluate([b[1], b[2], ...full]);
    if (ea > eb) winA++;
    else if (eb > ea) winB++;
    else tie++;
    counted++;
  }

  return finalize(winA, winB, tie, counted, samples, false);
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

function cumulative(live: Live[]): number[] {
  const cum: number[] = new Array(live.length);
  let acc = 0;
  for (let i = 0; i < live.length; i++) {
    acc += live[i][3];
    cum[i] = acc;
  }
  return cum;
}

/** Бинарный поиск индекса по префиксным суммам. */
function pick(cum: number[], target: number): number {
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < target) lo = mid + 1;
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
    return equityExact(liveA, liveB, board, deadMask);
  }
  return equityMonteCarlo(
    liveA,
    liveB,
    board,
    deadMask,
    opts.samples ?? DEFAULT_SAMPLES,
    opts.rng ?? Math.random,
  );
}

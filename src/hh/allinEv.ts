// All-in EV: сколько герой «должен был» забрать из банка по эквити на момент,
// когда ставки кончились и остался только раннаут.
//
// Считается только для хедз-ап олл-инов со вскрытыми картами обоих. Многовей
// требует расчёта сайд-потов, а без него цифра врёт больше, чем помогает, —
// такие раздачи идут в EV своим фактическим результатом и помечаются как
// непосчитанные.
//
// Раннаут перебирается точно, если осталось ≤ 3 карт (это флоп- и тёрн-олл-ины,
// C(45,2) = 990 раскладов). Префлоп-олл-ин — это C(48,5) = 1.7 млн раскладов на
// раздачу, поэтому там Monte Carlo с генератором, засеянным номером раздачи:
// одна и та же раздача всегда даёт одну и ту же цифру, и импорт идемпотентен.

import { Card } from "../engine/cards";
import { evaluate } from "../engine/evaluator";
import { AllInSpot, Hand, Street, heroPlayer } from "./types";

export type { AllInSpot } from "./types";

const BOARD_AT: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };

const MC_SAMPLES = 60_000;

/** xorshift32 — быстрый детерминированный ГПСЧ, засеянный id раздачи. */
function seededRng(seed: string): () => number {
  let x = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    x ^= seed.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  x |= 0;
  if (x === 0) x = 0x9e3779b9;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) / 4294967296);
  };
}

/** Общее начало всех раннингов — то, что было известно до раздачи остатка. */
function commonPrefix(runs: Card[][]): number {
  if (runs.length === 0) return 0;
  let n = 0;
  outer: while (n < runs[0].length) {
    for (const r of runs) if (r[n] !== runs[0][n]) break outer;
    n++;
  }
  return n;
}

/** Доля банка, причитающаяся первой руке (ничья — пополам). */
export function headsUpEquity(
  a: [Card, Card],
  b: [Card, Card],
  board: Card[],
  rng: () => number,
): number {
  const used = new Set<Card>([...a, ...b, ...board]);
  const deck: Card[] = [];
  for (let c = 0; c < 52; c++) if (!used.has(c)) deck.push(c);
  const need = 5 - board.length;
  if (need === 0) {
    const va = evaluate([...a, ...board]);
    const vb = evaluate([...b, ...board]);
    return va === vb ? 0.5 : va > vb ? 1 : 0;
  }

  let score = 0;
  let n = 0;
  const run: Card[] = new Array(need);
  const tally = () => {
    const full = [...board, ...run];
    const va = evaluate([...a, ...full]);
    const vb = evaluate([...b, ...full]);
    score += va === vb ? 0.5 : va > vb ? 1 : 0;
    n++;
  };

  if (need <= 3) {
    // Точный перебор сочетаний оставшихся карт.
    const rec = (start: number, depth: number) => {
      if (depth === need) return tally();
      for (let i = start; i < deck.length; i++) {
        run[depth] = deck[i];
        rec(i + 1, depth + 1);
      }
    };
    rec(0, 0);
  } else {
    for (let s = 0; s < MC_SAMPLES; s++) {
      // Частичный Фишер–Йейтс: тасуем только нужные позиции.
      for (let i = 0; i < need; i++) {
        const j = i + Math.floor(rng() * (deck.length - i));
        [deck[i], deck[j]] = [deck[j], deck[i]];
        run[i] = deck[i];
      }
      tally();
    }
  }
  return score / n;
}

export type AllInKind =
  /** Олл-ина с участием героя и вскрытием не было — EV равен факту. */
  | "none"
  /** Деньги зашли на ривере: борд полный, EV и есть факт. */
  | "river"
  /** Многовей или карты соперника не вскрыты — сайд-поты не разбираем. */
  | "unsupported"
  /** Можно посчитать эквити раннаута. */
  | "spot";

/**
 * Классификация олл-ина — без расчёта эквити. Отделена от него намеренно:
 * решить, что раздача считаться не будет, стоит микросекунды, а сам расчёт
 * префлоп-раннаута — десятки миллисекунд, и на большой базе разница
 * определяет, живой интерфейс или нет.
 */
export function allInKind(h: Hand): AllInKind {
  const hero = heroPlayer(h);
  if (!hero || !hero.cards) return "none";

  const folded = new Set(h.actions.filter((a) => a.type === "fold").map((a) => a.player));
  const active = h.players.filter((p) => !folded.has(p.name));
  // Герой должен сам дойти до вскрытия: олл-ин двух соперников после его
  // фолда к его результату отношения не имеет.
  if (active.length < 2 || !active.includes(hero)) return "none";

  const live = new Set(active.map((p) => p.name));
  const acts = h.actions.filter((a) => live.has(a.player) && a.type !== "post");
  if (!acts.some((a) => a.allIn)) return "none";

  if (active.length > 2) return "unsupported";
  if (active.some((p) => !p.cards || p.cards.length !== 2)) return "unsupported";
  // Хедз-ап без сайд-пота: вложенное должно сойтись до цента.
  if (active[0].contributed !== active[1].contributed) return "unsupported";

  const street = acts[acts.length - 1]?.street ?? "preflop";
  return Math.min(BOARD_AT[street], commonPrefix(h.runs)) >= 5 ? "river" : "spot";
}

/** Олл-ин-спот раздачи или null, если считать нечего. Считает эквити. */
export function allInSpot(h: Hand): AllInSpot | null {
  if (allInKind(h) !== "spot") return null;
  const hero = heroPlayer(h)!;
  const folded = new Set(h.actions.filter((a) => a.type === "fold").map((a) => a.player));
  const active = h.players.filter((p) => !folded.has(p.name));
  const villain = active.find((p) => p !== hero)!;
  const acts = h.actions.filter((a) => a.type !== "post" && !folded.has(a.player));
  const street = acts[acts.length - 1].street;
  const known = Math.min(BOARD_AT[street], commonPrefix(h.runs));

  const equity = headsUpEquity(
    hero.cards as [Card, Card],
    villain.cards as [Card, Card],
    h.board.slice(0, known),
    seededRng(h.id),
  );
  const pot = h.players.reduce((s, p) => s + p.collected, 0);
  return {
    handId: h.id,
    street,
    equity,
    pot,
    actual: hero.collected - hero.contributed,
    ev: equity * pot - hero.contributed,
  };
}

/**
 * Разбор олл-ина с использованием того, что посчитано при импорте. Пересчёт
 * префлоп-олл-инов на каждой смене фильтра стоил бы секунды на большой базе.
 */
export function cachedAllInSpot(h: Hand): AllInSpot | null {
  return h.allIn !== undefined ? h.allIn : allInSpot(h);
}

/** Досчитать и запомнить разбор олл-ина. Вызывается один раз при импорте. */
export function withAllIn(h: Hand): Hand {
  return h.allIn !== undefined ? h : { ...h, allIn: allInSpot(h) };
}

export interface EvReport {
  /** Фактический итог по всем раздачам, центы. */
  actual: number;
  /** Итог с заменой олл-инов на их EV, центы. */
  ev: number;
  actualBb100: number;
  evBb100: number;
  spots: AllInSpot[];
  /**
   * Олл-ины героя, которые не удалось перевести в EV (многовей или карты
   * соперника не вскрыты) — они вошли в EV своим фактическим результатом.
   * Олл-ины на ривере сюда не входят: там EV и есть факт.
   */
  skipped: number;
}

/** EV-скорректированный итог по набору раздач. */
export function analyzeEv(hands: Hand[]): EvReport {
  let actual = 0;
  let ev = 0;
  let counted = 0;
  let skipped = 0;
  const spots: AllInSpot[] = [];
  const bb = hands[0]?.bb ?? 1;

  for (const h of hands) {
    const hero = heroPlayer(h);
    if (!hero) continue;
    counted++;
    const net = hero.collected - hero.contributed;
    actual += net;
    const cached = cachedAllInSpot(h);
    if (cached) {
      spots.push(cached);
      ev += cached.ev;
    } else {
      ev += net;
      if (allInKind(h) === "unsupported") skipped++;
    }
  }

  const per100 = (cents: number) => (counted === 0 ? 0 : (cents / bb / counted) * 100);
  return {
    actual,
    ev,
    actualBb100: per100(actual),
    evBb100: per100(ev),
    spots,
    skipped,
  };
}

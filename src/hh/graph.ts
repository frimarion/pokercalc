// Данные для графика выигрыша: накопленные линии по раздачам.
//
// Четыре линии, как в трекерах: факт, EV (олл-ины заменены своим EV),
// выигрыш на шоудауне («синяя») и без шоудауна («красная»). Факт = синяя +
// красная в каждой точке — это держит тест.
//
// Каждая линия хранится и в bb, и в центах: переключатель единиц в UI не
// должен пересчитывать 15 тысяч раздач. В bb сумма идёт по bb КАЖДОЙ раздачи,
// поэтому на смешанных лимитах $-линия и bb-линия могут расходиться формой.

import { cachedAllInSpot } from "./allinEv";
import { AllInSpot, Hand, heroPlayer } from "./types";

export type LineKey = "actual" | "ev" | "sd" | "nonSd";

export const LINE_KEYS: LineKey[] = ["actual", "ev", "sd", "nonSd"];

export type Unit = "bb" | "usd";

export interface GraphPoint {
  /** Номер раздачи с героем, с единицы. */
  n: number;
  handId: string;
  time: number;
  /** Большой блайнд раздачи, центы. */
  bb: number;
  /** Накопленные значения: [bb, центы]. */
  actual: [number, number];
  ev: [number, number];
  sd: [number, number];
  nonSd: [number, number];
  /** Итог этой раздачи, [bb, центы]. */
  net: [number, number];
  showdown: boolean;
  allIn: AllInSpot | null;
}

/** Раздача дошла до вскрытия с участием героя. Так же, как WTSD в stats.ts. */
export function isShowdown(h: Hand): boolean {
  const folded = new Set<string>();
  for (const a of h.actions) if (a.type === "fold") folded.add(a.player);
  if (!h.hero || folded.has(h.hero)) return false;
  return h.players.filter((p) => !folded.has(p.name)).length >= 2;
}

/** Накопленные линии по раздачам героя (hands уже по времени). */
export function buildGraph(hands: Hand[]): GraphPoint[] {
  const out: GraphPoint[] = [];
  const acc = { actual: [0, 0], ev: [0, 0], sd: [0, 0], nonSd: [0, 0] };
  const add = (k: keyof typeof acc, cents: number, bb: number) => {
    acc[k][0] += cents / bb;
    acc[k][1] += cents;
  };
  for (const h of hands) {
    const hero = heroPlayer(h);
    if (!hero) continue;
    const net = hero.collected - hero.contributed;
    const spot = cachedAllInSpot(h);
    const showdown = isShowdown(h);
    add("actual", net, h.bb);
    add("ev", spot ? spot.ev : net, h.bb);
    add(showdown ? "sd" : "nonSd", net, h.bb);
    out.push({
      n: out.length + 1,
      handId: h.id,
      time: h.time,
      bb: h.bb,
      actual: [acc.actual[0], acc.actual[1]],
      ev: [acc.ev[0], acc.ev[1]],
      sd: [acc.sd[0], acc.sd[1]],
      nonSd: [acc.nonSd[0], acc.nonSd[1]],
      net: [net / h.bb, net],
      showdown,
      allIn: spot,
    });
  }
  return out;
}

export function valueOf(p: GraphPoint, key: LineKey, unit: Unit): number {
  return p[key][unit === "bb" ? 0 : 1];
}

/** Прирост линии на отрезке [from, to] включительно (индексы в массиве точек). */
export function deltaOn(points: GraphPoint[], from: number, to: number, key: LineKey, unit: Unit): number {
  const before = from > 0 ? valueOf(points[from - 1], key, unit) : 0;
  return valueOf(points[to], key, unit) - before;
}

/**
 * Прореживание для отрисовки: на каждый «пиксель» оставляем минимум и
 * максимум в исходном порядке. Пики и провалы (а ради них график и смотрят)
 * сохраняются точно, а путь вместо 15 тысяч точек выходит в пару тысяч.
 * Возвращает индексы точек.
 */
export function downsample(values: number[], buckets: number): number[] {
  const n = values.length;
  if (n <= buckets * 2) return values.map((_, i) => i);
  const out: number[] = [0];
  const size = n / buckets;
  for (let b = 0; b < buckets; b++) {
    const lo = Math.floor(b * size);
    const hi = Math.min(n, Math.floor((b + 1) * size));
    if (hi <= lo) continue;
    let mi = lo;
    let ma = lo;
    for (let i = lo; i < hi; i++) {
      if (values[i] < values[mi]) mi = i;
      if (values[i] > values[ma]) ma = i;
    }
    const [a, c] = mi < ma ? [mi, ma] : [ma, mi];
    if (a !== out[out.length - 1]) out.push(a);
    if (c !== a) out.push(c);
  }
  if (out[out.length - 1] !== n - 1) out.push(n - 1);
  return out;
}

/** «Круглые» деления оси: 1, 2, 5 × 10^k, примерно count штук. */
export function niceTicks(lo: number, hi: number, count: number): number[] {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  // Ближайший «круглый» шаг в логарифмической шкале: всегда брать больший
  // давало бы на 6 запрошенных делений всего 3.
  let step = mag;
  for (const m of [2, 5, 10]) {
    if (Math.abs(Math.log(m * mag / raw)) < Math.abs(Math.log(step / raw))) step = m * mag;
  }
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) {
    out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  }
  return out;
}

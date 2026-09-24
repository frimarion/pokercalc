// Фильтры базы: период, лимит и состав стола.
//
// «Состав стола» — это VPIP соперников, сидевших в раздаче. Ники в выгрузке
// GG анонимизированы, но хэш у игрока стабилен между раздачами, поэтому VPIP
// соперника можно набрать по всей базе. Считается он именно по ВСЕЙ базе, а
// не по отфильтрованному периоду: иначе, сузив период до вечера, мы бы
// оставили у каждого соперника по десятку раздач и «фиш» определялся бы
// шумом, а не игроком.

import { Hand, streetActions } from "./types";

export interface PlayerVpip {
  hands: number;
  vpip: number;
}

/** Порог «за столом есть игрок с VPIP ≥ X». 0 — фильтра нет. */
export type FishThreshold = 0 | 40 | 50 | 60;

export const FISH_THRESHOLDS: FishThreshold[] = [40, 50, 60];

/** with — такой игрок за столом есть, without — ни одного. */
export type FishMode = "with" | "without";

export interface HandFilter {
  /** Границы периода, ms epoch; null — без ограничения. `to` не включительно. */
  from: number | null;
  to: number | null;
  /** Большие блайнды в центах (NL5 → 5). Пусто — все лимиты. */
  limits: number[];
  fish: FishThreshold;
  fishMode: FishMode;
  /** Сколько раздач нужно сопернику, чтобы его VPIP принимать всерьёз. */
  minHands: number;
}

export const EMPTY_FILTER: HandFilter = {
  from: null,
  to: null,
  limits: [],
  fish: 0,
  fishMode: "with",
  minHands: 30,
};

export function isFilterActive(f: HandFilter): boolean {
  return f.from !== null || f.to !== null || f.limits.length > 0 || f.fish !== 0;
}

/** Название лимита по большому блайнду в центах: 5 → «NL5». */
export function limitLabel(bb: number): string {
  return `NL${bb}`;
}

/** Лимиты, встречающиеся в базе, по возрастанию, с числом раздач. */
export function limitsOf(hands: Hand[]): { bb: number; count: number }[] {
  const m = new Map<number, number>();
  for (const h of hands) m.set(h.bb, (m.get(h.bb) ?? 0) + 1);
  return [...m].map(([bb, count]) => ({ bb, count })).sort((a, b) => a.bb - b.bb);
}

/**
 * VPIP каждого игрока по базе. Добровольное вложение — колл или рейз на
 * префлопе; постановка блайнда и чек на BB не в счёт (как в stats.ts).
 */
export function playerVpips(hands: Hand[]): Map<string, PlayerVpip> {
  const out = new Map<string, { hands: number; made: number }>();
  for (const h of hands) {
    const voluntary = new Set<string>();
    for (const a of streetActions(h, "preflop")) {
      if (a.type === "call" || a.type === "raise") voluntary.add(a.player);
    }
    for (const p of h.players) {
      const c = out.get(p.name) ?? { hands: 0, made: 0 };
      c.hands++;
      if (voluntary.has(p.name)) c.made++;
      out.set(p.name, c);
    }
  }
  const res = new Map<string, PlayerVpip>();
  for (const [name, c] of out) res.set(name, { hands: c.hands, vpip: (c.made / c.hands) * 100 });
  return res;
}

/** Самый высокий VPIP среди соперников героя в раздаче (с достаточной выборкой). */
export function maxOpponentVpip(h: Hand, vpips: Map<string, PlayerVpip>, minHands: number): number {
  let max = -1;
  for (const p of h.players) {
    if (p.name === h.hero) continue;
    const v = vpips.get(p.name);
    if (v && v.hands >= minHands && v.vpip > max) max = v.vpip;
  }
  return max;
}

export function applyFilter(hands: Hand[], f: HandFilter, vpips: Map<string, PlayerVpip>): Hand[] {
  if (!isFilterActive(f)) return hands;
  const limits = f.limits.length > 0 ? new Set(f.limits) : null;
  return hands.filter((h) => {
    if (f.from !== null && h.time < f.from) return false;
    if (f.to !== null && h.time >= f.to) return false;
    if (limits && !limits.has(h.bb)) return false;
    if (f.fish !== 0) {
      const has = maxOpponentVpip(h, vpips, f.minHands) >= f.fish;
      if (has !== (f.fishMode === "with")) return false;
    }
    return true;
  });
}

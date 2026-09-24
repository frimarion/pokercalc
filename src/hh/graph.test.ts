import { describe, it, expect } from "vitest";
import { buildGraph, downsample, isShowdown, niceTicks } from "./graph";
import { makeHand, foldsBefore } from "./fixtures";

const ALL: Parameters<typeof foldsBefore>[0] = ["SB", "BB", "UTG", "MP", "CO", "BU"];

// Герой на BU открывается и забирает блайнды без вскрытия.
const steal = makeHand({
  id: "s",
  hero: "BU",
  preflop: [...foldsBefore(ALL, "BU"), { who: "BU", type: "raise", to: 2.5 }, { who: "SB", type: "fold" }, { who: "BB", type: "fold" }],
  collected: { BU: 4 },
});

// Лимпед-пот SB против BB, дошли до вскрытия, банк забрал BB.
const showdown = makeHand({
  id: "d",
  hero: "SB",
  shows: { BB: "2c2d" },
  board: "AhKd7s5c3h",
  preflop: [...foldsBefore(ALL, "SB"), { who: "SB", type: "call", bb: 0.5 }, { who: "BB", type: "check" }],
  flop: [{ who: "SB", type: "check" }, { who: "BB", type: "check" }],
  turn: [{ who: "SB", type: "check" }, { who: "BB", type: "check" }],
  river: [{ who: "SB", type: "check" }, { who: "BB", type: "check" }],
  collected: { BB: 2 },
});

describe("график выигрыша", () => {
  it("вскрытие определяется так же, как WTSD", () => {
    expect(isShowdown(steal)).toBe(false);
    expect(isShowdown(showdown)).toBe(true);
  });

  it("факт = шоудаун + без шоудауна в каждой точке", () => {
    const g = buildGraph([steal, showdown, steal]);
    expect(g.map((p) => p.n)).toEqual([1, 2, 3]);
    for (const p of g) {
      expect(p.actual[0]).toBeCloseTo(p.sd[0] + p.nonSd[0]);
      expect(p.actual[1]).toBe(p.sd[1] + p.nonSd[1]);
    }
    expect(g[0].nonSd[0]).toBeCloseTo(1.5); // забрал 4bb, вложил 2.5
    expect(g[1].sd[0]).toBeCloseTo(-1);
    // Без олл-инов EV совпадает с фактом.
    expect(g[2].ev).toEqual(g[2].actual);
  });

  it("прореживание сохраняет края, минимум и максимум", () => {
    const vals = Array.from({ length: 10_000 }, (_, i) => Math.sin(i / 50) * i);
    vals[4321] = 1e9;
    vals[7777] = -1e9;
    const idx = downsample(vals, 200);
    expect(idx.length).toBeLessThanOrEqual(402);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(9999);
    expect(idx).toContain(4321);
    expect(idx).toContain(7777);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it("деления оси круглые и накрывают ноль", () => {
    expect(niceTicks(-37, 212, 5)).toEqual([0, 50, 100, 150, 200]);
    expect(niceTicks(-120, 30, 6)).toEqual([-120, -100, -80, -60, -40, -20, 0, 20]);
  });
});

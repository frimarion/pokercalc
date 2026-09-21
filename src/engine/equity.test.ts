import { describe, it, expect } from "vitest";
import { parseCards } from "./cards";
import { rangeFromLabels, Range, comboIndex } from "./combos";
import { computeEquity, computeNextCards } from "./equity";

/** Диапазон из одной конкретной руки (2 карты). */
function handRange(hand: string): Range {
  const [a, b] = parseCards(hand);
  const r = new Range();
  r.weights[comboIndex(a, b)] = 1;
  return r;
}

// Детерминированный ГПСЧ (mulberry32) для воспроизводимых MC-тестов.
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("river equity (exact)", () => {
  it("made flush beats top pair, 100/0", () => {
    // Борд из 5 карт → перебора рантаймов нет, только сравнение.
    const eq = computeEquity(
      handRange("AhKh"), // флеш
      handRange("KsQd"), // топ-пара
      parseCards("Th 7h 2h 9c 3d"),
    );
    expect(eq.exact).toBe(true);
    expect(eq.a.equity).toBeCloseTo(1, 5);
    expect(eq.b.equity).toBeCloseTo(0, 5);
  });

  it("exact tie splits 50/50", () => {
    // Оба играют один и тот же стрит на борде (роял-фон), руки не улучшают.
    const eq = computeEquity(
      handRange("2c3d"),
      handRange("4c5d"),
      parseCards("Ah Kh Qh Jh Th"), // роял-флеш на борде — оба играют борд
    );
    expect(eq.a.equity).toBeCloseTo(0.5, 5);
    expect(eq.b.equity).toBeCloseTo(0.5, 5);
  });
});

describe("preflop equity (Monte Carlo, эталоны)", () => {
  it("AA vs KK ≈ 82 / 18", () => {
    const eq = computeEquity(handRange("AhAs"), handRange("KhKs"), [], {
      samples: 120_000,
      rng: rng(42),
    });
    expect(eq.a.equity).toBeGreaterThan(0.80);
    expect(eq.a.equity).toBeLessThan(0.84);
  });

  it("AKs vs QQ ≈ 46 / 54 (флип чуть в пользу пары)", () => {
    const eq = computeEquity(handRange("AhKh"), handRange("QsQd"), [], {
      samples: 120_000,
      rng: rng(7),
    });
    expect(eq.a.equity).toBeGreaterThan(0.44);
    expect(eq.a.equity).toBeLessThan(0.48);
  });

  it("эквити сторон в сумме близко к 1", () => {
    const eq = computeEquity(handRange("AhKd"), handRange("7c7s"), [], {
      samples: 60_000,
      rng: rng(99),
    });
    expect(eq.a.equity + eq.b.equity).toBeCloseTo(1, 5);
  });
});

describe("range vs range", () => {
  it("next-card analysis excludes known cards and agrees with river enumeration", () => {
    const a = handRange("AhAd"), b = handRange("KcKd");
    const board = parseCards("3c 7s 9d Jc"), dead = parseCards("2s");
    const next = computeNextCards(a, b, board, { dead });
    expect(next).toHaveLength(47);
    expect(next.some((r) => [...board, ...dead].includes(r.card))).toBe(false);
    for (const row of next) {
      const eq = computeEquity(a, b, [...board, row.card], { dead });
      expect(row.equity).toBe(eq.valid ? eq.a.equity : null);
    }
    expect(computeNextCards(a, b, [])).toEqual([]);
  });
  it("MC matches weighted exact enumeration with asymmetric card removal", () => {
    const a = handRange("AhAd");
    const weak = handRange("2h2d");
    for (let i = 0; i < a.weights.length; i++) a.weights[i] += weak.weights[i];
    const b = handRange("AhQh");
    const other = handRange("KcKd");
    for (let i = 0; i < b.weights.length; i++) b.weights[i] += other.weights[i] * 0.25;
    const board = parseCards("3c 7s 9d Jc Qs");
    const exact = computeEquity(a, b, board, { detail: true });
    const mc = computeEquity(a, b, board, { exactLimit: 0, samples: 40_000, rng: rng(31), detail: true });
    expect(exact.a.equity).toBeCloseTo(1 / 6);
    expect(mc.a.equity).toBeCloseTo(exact.a.equity, 2);
    expect(exact.samples).toBe(3);
    expect(exact.total).toBe(1.5);
    expect(exact.combos?.a).toHaveLength(2);
    expect(exact.combos?.a.find((c) => c.equity === 1)?.samples).toBe(1);
    expect(mc.combos?.a.reduce((n, c) => n + c.samples, 0)).toBe(mc.samples);
  });

  it("handles dead cards, duplicate cards and entirely incompatible ranges", () => {
    const a = handRange("AhAd"), b = handRange("AhKh");
    expect(computeEquity(a, b, [], { samples: 10 }).valid).toBe(false);
    expect(computeEquity(a, handRange("KcKd"), [], { dead: parseCards("Ah") }).valid).toBe(false);
    expect(computeEquity(a, b, parseCards("2c2c3d")).valid).toBe(false);
  });

  it("includes combo ties and symmetry on a shared royal flush", () => {
    const r = rangeFromLabels(["22", "33"]);
    const eq = computeEquity(r, r, parseCards("Ah Kh Qh Jh Th"), { detail: true });
    expect(eq.a.equity).toBe(0.5);
    expect(eq.combos?.a.every((c) => c.tie === 1 && c.equity === 0.5)).toBe(true);
  });
  it("считает и возвращает валидный результат", () => {
    const hero = rangeFromLabels(["AA", "KK", "AKs"]);
    const villain = rangeFromLabels(["QQ", "JJ", "AQs", "KQs"]);
    const eq = computeEquity(hero, villain, parseCards("Kh 7c 2d"), {
      samples: 40_000,
      rng: rng(1),
    });
    expect(eq.valid).toBe(true);
    // Hero с сетами/оверпарами должен доминировать этот флоп.
    expect(eq.a.equity).toBeGreaterThan(0.6);
  });

  it("пустой диапазон → invalid", () => {
    const eq = computeEquity(new Range(), rangeFromLabels(["AA"]), []);
    expect(eq.valid).toBe(false);
  });
});

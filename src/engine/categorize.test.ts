import { describe, it, expect } from "vitest";
import { parseCards, cardsToMask } from "./cards";
import { rangeFromLabels } from "./combos";
import {
  classifyMade,
  classifyDraws,
  breakdownRange,
  filterRange,
  madeStrength,
} from "./categorize";
import { Range } from "./combos";

function made(hole: string, board: string) {
  const [a, b] = parseCards(hole);
  return classifyMade(a, b, parseCards(board));
}
function draws(hole: string, board: string) {
  const [a, b] = parseCards(hole);
  return classifyDraws(a, b, parseCards(board)).sort();
}

describe("MADE categories", () => {
  const B = "Kh Tc 2s"; // топ K, средняя T, младшая 2
  it("top pair", () => expect(made("Ah Ks", B)).toBe("top-pair"));
  it("middle pair", () => expect(made("Th 9s", B)).toBe("middle-pair"));
  it("weak pair", () => expect(made("2h 3s", B)).toBe("weak-pair"));
  it("overpair", () => expect(made("Ah As", B)).toBe("overpair"));
  it("underpair", () => expect(made("9h 9s", B)).toBe("underpair"));
  it("set/trips (pocket set)", () => expect(made("Tc Td", "Th 5c 2s")).toBe("set-trips"));
  it("set/trips (trips on paired board)", () =>
    expect(made("Kd Qs", "Kh Kc 2s")).toBe("set-trips") /* KKK + Q kicker = трипс */);
  it("two pair", () => expect(made("Kd Ts", B)).toBe("two-pair"));
  it("no pair / overcards", () => expect(made("Ah Qs", B)).toBe("no-pair"));
  it("plays board pair → no own pair", () => expect(made("Ah Qs", "Kh Kc 2s")).toBe("no-pair"));
  it("flush", () => expect(made("Ah 3h", "Kh Th 2h")).toBe("flush"));
  it("straight", () => expect(made("Qh Js", "Kc Tc 9d")).toBe("straight"));
  it("full house", () => expect(made("Tc Td", "Th Kc Ks")).toBe("full-house"));
  it("quads", () => expect(made("Tc Td", "Th Ts Ks")).toBe("quads"));
});

describe("draws", () => {
  it("flush draw (4 to flush, hole contributes)", () =>
    expect(draws("Ah Qh", "Kh 7h 2c")).toContain("flush-draw"));
  it("OESD", () => expect(draws("Qh Js", "Tc 9d 2s")).toContain("oesd"));
  it("gutshot", () => expect(draws("Qh Js", "9c 8d 2s")).toContain("gutshot"));
  it("backdoor flush on flop", () =>
    expect(draws("Ah Qh", "Kh 7c 2d")).toContain("bdfd"));
  it("no draws on river", () => expect(draws("Ah Qh", "Kh 7h 2c 9h 3s")).toHaveLength(0));
  it("made straight is not a straight draw", () =>
    expect(draws("Qh Js", "Kc Tc 9d")).not.toContain("oesd"));
});

describe("breakdownRange", () => {
  it("splits a range on a board with correct total", () => {
    const range = rangeFromLabels(["AA", "KK", "AKs", "72o"]);
    const board = parseCards("Kh Tc 2s");
    const mask = cardsToMask(board);
    const bd = breakdownRange(range, board, mask);
    // KK на Kh → часть комбо блокируется бордом (Kh), но остаются трипсы.
    expect(bd.total).toBeGreaterThan(0);
    // AA = оверпара.
    expect(bd.made["overpair"]).toBeGreaterThan(0);
    // KK (без Kh) даёт сет/трипс.
    expect(bd.made["set-trips"]).toBeGreaterThan(0);
    // Сумма категорий = total.
    const sumMade = Object.values(bd.made).reduce((x, y) => x + y, 0);
    expect(sumMade).toBeCloseTo(bd.total);
  });
  it("empty on <3 board cards", () => {
    const range = rangeFromLabels(["AA"]);
    const bd = breakdownRange(range, parseCards("Kh Tc"), cardsToMask(parseCards("Kh Tc")));
    expect(bd.total).toBe(0);
  });
});

describe("filterRange (морфинг)", () => {
  const board = parseCards("Kh 7c 2s");
  const mask = cardsToMask(board);

  it("оставляет только сеты/трипсы", () => {
    const range = rangeFromLabels(["AA", "KK", "72o"]);
    const w = filterRange(range, board, mask, new Set(["set-trips"]), new Set());
    const filtered = new Range(w);
    const bd = breakdownRange(filtered, board, mask);
    // KK → трипс остаётся, AA (оверпара) и 72o (две пары) вычищены.
    expect(bd.made["set-trips"]).toBeGreaterThan(0);
    expect(bd.made["overpair"]).toBe(0);
    expect(bd.made["two-pair"]).toBe(0);
  });

  it("может оставлять по дро", () => {
    const range = rangeFromLabels(["JTs", "AA"]);
    const b2 = parseCards("Qh 9c 2s"); // JTs = стрит-дро (9TJQ → OESD)
    const m2 = cardsToMask(b2);
    const w = filterRange(range, b2, m2, new Set(), new Set(["oesd", "gutshot"]));
    const filtered = new Range(w);
    expect(filtered.totalCombos(m2)).toBeGreaterThan(0);
    // AA (оверпара, не дро) должна уйти.
    const bd = breakdownRange(filtered, b2, m2);
    expect(bd.made["overpair"]).toBe(0);
  });

  it("до флопа не фильтрует", () => {
    const range = rangeFromLabels(["AA", "KK"]);
    const w = filterRange(range, [], 0n, new Set(["set-trips"]), new Set());
    expect(new Range(w).totalCombos()).toBe(12); // AA(6)+KK(6)
  });
});

describe("madeStrength", () => {
  it("сильные руки выше слабых", () => {
    expect(madeStrength("straight-flush")).toBe(1);
    expect(madeStrength("no-pair")).toBe(0);
    expect(madeStrength("set-trips")).toBeGreaterThan(madeStrength("top-pair"));
  });
});

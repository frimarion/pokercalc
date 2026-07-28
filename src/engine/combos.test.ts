import { describe, it, expect } from "vitest";
import { parseCards, cardsToMask } from "./cards";
import {
  ALL_COMBOS,
  NUM_COMBOS,
  comboIndex,
  comboIndicesForLabel,
  handLabel,
  gridCells,
  Range,
  rangeFromLabels,
} from "./combos";

describe("combo indexing", () => {
  it("has 1326 unique combos", () => {
    expect(ALL_COMBOS.length).toBe(NUM_COMBOS);
    const seen = new Set(ALL_COMBOS.map(([a, b]) => `${a}-${b}`));
    expect(seen.size).toBe(NUM_COMBOS);
  });
  it("comboIndex is order-independent", () => {
    const [hi, lo] = ALL_COMBOS[500];
    expect(comboIndex(hi, lo)).toBe(500);
    expect(comboIndex(lo, hi)).toBe(500);
  });
});

describe("label → combos", () => {
  it("pair has 6 combos", () => {
    expect(comboIndicesForLabel("AA")).toHaveLength(6);
  });
  it("suited has 4 combos", () => {
    expect(comboIndicesForLabel("AKs")).toHaveLength(4);
  });
  it("offsuit has 12 combos", () => {
    expect(comboIndicesForLabel("AKo")).toHaveLength(12);
  });
  it("all 169 hands cover 1326 combos exactly once", () => {
    const grid = gridCells().flat();
    const all = new Set<number>();
    let count = 0;
    for (const cell of grid) {
      for (const idx of comboIndicesForLabel(cell.label)) {
        all.add(idx);
        count++;
      }
    }
    expect(count).toBe(NUM_COMBOS);
    expect(all.size).toBe(NUM_COMBOS);
  });
});

describe("handLabel", () => {
  it("labels a pair", () => {
    const [a, b] = parseCards("AhAs");
    expect(handLabel(a, b)).toBe("AA");
  });
  it("labels suited", () => {
    const [a, b] = parseCards("AhKh");
    expect(handLabel(a, b)).toBe("AKs");
  });
  it("labels offsuit", () => {
    const [a, b] = parseCards("AhKs");
    expect(handLabel(a, b)).toBe("AKo");
  });
});

describe("grid", () => {
  it("is 13×13 with pairs on the diagonal", () => {
    const grid = gridCells();
    expect(grid).toHaveLength(13);
    expect(grid[0][0].label).toBe("AA");
    expect(grid[12][12].label).toBe("22");
    expect(grid[0][1].label).toBe("AKs"); // upper triangle
    expect(grid[1][0].label).toBe("AKo"); // lower triangle
  });
});

describe("Range", () => {
  it("counts combos accounting for blockers", () => {
    const r = rangeFromLabels(["AA"]);
    expect(r.totalCombos()).toBe(6);
    // Убрать один туз с борда → остаётся 3 комбо AA.
    const mask = cardsToMask(parseCards("Ah"));
    expect(r.totalCombos(mask)).toBe(3);
  });
  it("handWeight reflects set weight", () => {
    const r = new Range();
    r.setHand("AKs", 0.5);
    expect(r.handWeight("AKs")).toBeCloseTo(0.5);
    expect(r.handWeight("AKo")).toBe(0);
  });
  it("liveCombos filters blocked cards", () => {
    const r = rangeFromLabels(["AKs"]);
    const mask = cardsToMask(parseCards("Ah")); // блокирует AhKh
    const live = r.liveCombos(mask);
    expect(live).toHaveLength(3);
  });
});

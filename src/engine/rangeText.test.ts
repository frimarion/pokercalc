import { describe, expect, it } from "vitest";
import { parseCards } from "./cards";
import { comboIndex } from "./combos";
import { formatRangeText, parseRangeText } from "./rangeText";

describe("range text", () => {
  it("expands pairs, suited plus and weighted intervals", () => {
    const r = parseRangeText("QQ+, AJs+, KTs-KQs:50");
    expect(r.totalCombos()).toBe(18 + 12 + 6);
    expect(r.handWeight("KJs")).toBe(0.5);
    expect(r.handWeight("ATs")).toBe(0);
  });
  it("preserves individual combo overrides and fractional weights on export", () => {
    const r = parseRangeText("AKo:33.3, AhKd:75, QQ:0");
    expect(r.weights[comboIndex(...parseCards("AhKd") as [number, number])]).toBe(0.75);
    expect(parseRangeText(formatRangeText(r)).weights).toEqual(r.weights);
  });
  it.each(["AK", "AAs", "AKs-JTs", "AA:101", "AA:-1", "AA:", "AhAh", "garbage", "22++", "AA:NaN", "AA:20:30"])("rejects invalid input %s", (input) => {
    expect(() => parseRangeText(input)).toThrow();
  });
  it("accepts an empty range and descending pair intervals", () => {
    expect(parseRangeText("").totalCombos()).toBe(0);
    expect(parseRangeText("JJ-88").totalCombos()).toBe(24);
  });
});

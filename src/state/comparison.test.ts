import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseCards } from "../engine/cards";
import { parseRangeText } from "../engine/rangeText";
import { useStore } from "./store";

describe("comparison scenarios", () => {
  const saved = new Map<string, string>();
  beforeEach(() => {
    saved.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    });
    useStore.getState().resetAll();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("round-trips weighted ranges, dead cards and independent filters", () => {
    const s = useStore.getState();
    s.replaceRange("hero", parseRangeText("QQ+, AKs:50, AhKd:25"));
    s.replaceRange("villain", parseRangeText("TT+, AQs+"));
    s.setComparisonCards(parseCards("Qh7c2d"), parseCards("Ks"));
    s.setComparisonFilters("hero", { made: ["overpair"], draws: ["flush-draw"] });
    const weights = useStore.getState().ranges.hero.weights.slice();
    s.saveScenario();
    s.resetAll();
    expect(s.loadScenario()).toBe(true);
    const loaded = useStore.getState();
    expect(loaded.ranges.hero.weights).toEqual(weights);
    expect(loaded.comparisonBoard).toEqual(parseCards("Qh7c2d"));
    expect(loaded.comparisonDead).toEqual(parseCards("Ks"));
    expect(loaded.comparisonFilters.hero.made).toEqual(["overpair"]);
    expect(loaded.comparisonFilters.villain.made).toEqual([]);
    expect(loaded.heroCards).toEqual([null, null]);
  });

  it("loads legacy scenarios with empty comparison settings", () => {
    saved.set("pokercalc:scenario", JSON.stringify({ hero: Array(1326).fill(0), villain: Array(1326).fill(0), heroCards: [null, null], board: [null, null, null, null, null] }));
    expect(useStore.getState().loadScenario()).toBe(true);
    expect(useStore.getState().comparisonBoard).toEqual([]);
    expect(useStore.getState().comparisonFilters.hero).toEqual({ made: [], draws: [] });
  });

  it("copying a range does not couple later edits to the other side", () => {
    const s = useStore.getState();
    s.replaceRange("hero", parseRangeText("AA"));
    s.replaceRange("villain", useStore.getState().ranges.hero);
    s.setHandWeight("AA", 0.5, "hero");
    expect(useStore.getState().ranges.villain.handWeight("AA")).toBe(1);
  });
});

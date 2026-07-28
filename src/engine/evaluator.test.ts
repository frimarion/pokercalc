import { describe, it, expect } from "vitest";
import { parseCards } from "./cards";
import { evaluate, categoryOf, HAND_CATEGORIES } from "./evaluator";

function catName(cards: string): string {
  return HAND_CATEGORIES[categoryOf(evaluate(parseCards(cards)))];
}

describe("category detection", () => {
  it("straight flush", () => {
    expect(catName("9h8h7h6h5h2c2d")).toBe("Straight Flush");
  });
  it("wheel straight flush", () => {
    expect(catName("Ah2h3h4h5h Kd Qs")).toBe("Straight Flush");
  });
  it("quads", () => {
    expect(catName("7c7d7h7s Kd 2c 3c")).toBe("Quads");
  });
  it("full house", () => {
    expect(catName("7c7d7h KdKc 2c 3s")).toBe("Full House");
  });
  it("two trips make full house", () => {
    expect(catName("7c7d7h KdKcKs 2c")).toBe("Full House");
  });
  it("flush", () => {
    expect(catName("Ah Th 8h 5h 2h Ks Qd")).toBe("Flush");
  });
  it("straight", () => {
    expect(catName("9c 8d 7h 6s 5c Ah Kd")).toBe("Straight");
  });
  it("wheel straight", () => {
    expect(catName("Ac 2d 3h 4s 5c Kd Qs")).toBe("Straight");
  });
  it("trips", () => {
    expect(catName("7c7d7h Kd 9s 2c 3h")).toBe("Trips");
  });
  it("two pair", () => {
    expect(catName("7c7d KdKc 9s 2c 3h")).toBe("Two Pair");
  });
  it("pair", () => {
    expect(catName("7c7d Kd 9s 2c 3h 5s")).toBe("Pair");
  });
  it("high card", () => {
    expect(catName("Ac Td 8h 6s 4c 2d 9h")).toBe("High Card");
  });
});

describe("hand ranking order", () => {
  const order = [
    "Ac Td 8h 6s 4c", // high card
    "7c7d Kd 9s 2c", // pair
    "7c7d KdKc 9s", // two pair
    "7c7d7h Kd 9s", // trips
    "9c 8d 7h 6s 5c", // straight
    "Ah Th 8h 5h 2h", // flush
    "7c7d7h KdKc", // full house
    "7c7d7h7s Kd", // quads
    "9h8h7h6h5h", // straight flush
  ];
  it("each tier beats the previous", () => {
    for (let i = 1; i < order.length; i++) {
      const lo = evaluate(parseCards(order[i - 1]));
      const hi = evaluate(parseCards(order[i]));
      expect(hi).toBeGreaterThan(lo);
    }
  });
});

describe("kickers & tiebreaks", () => {
  it("higher pair wins", () => {
    expect(evaluate(parseCards("KcKd 5s 6h 7c"))).toBeGreaterThan(
      evaluate(parseCards("QcQd Ah Ks Jc")),
    );
  });
  it("kicker decides equal pairs", () => {
    expect(evaluate(parseCards("KcKd As 6h 7c"))).toBeGreaterThan(
      evaluate(parseCards("KhKs Qd 6c 7d")),
    );
  });
  it("ace-high flush beats king-high flush", () => {
    expect(evaluate(parseCards("Ah Th 8h 5h 2h"))).toBeGreaterThan(
      evaluate(parseCards("Kh Th 8h 5h 2h")),
    );
  });
  it("nut straight beats lower straight", () => {
    expect(evaluate(parseCards("Ac Kd Qh Js Tc"))).toBeGreaterThan(
      evaluate(parseCards("9c 8d 7h 6s 5c")),
    );
  });
  it("best 5 of 7 is chosen", () => {
    // Доска даёт стрит, шум в лишних картах не мешает.
    expect(categoryOf(evaluate(parseCards("Ac Kd Qh Js Tc 2d 2h")))).toBe(4);
  });
});

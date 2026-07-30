import { describe, it, expect } from "vitest";
import { handLog } from "./log";
import { decisionsOf } from "./deviations";
import { makeHand, foldsBefore, HandSpec } from "./fixtures";
import { Position } from "./types";
import { formatCard } from "../engine/cards";

const ALL: Position[] = ["SB", "BB", "UTG", "MP", "CO", "BU"];

/** Герой открывает с CO, BB коллирует, дальше два барреля и фолд на ривере. */
const SPEC: HandSpec = {
  hero: "CO",
  cards: "AhKh",
  board: "2h7d9sQcJd",
  preflop: [
    { who: "UTG", type: "fold" },
    { who: "MP", type: "fold" },
    { who: "CO", type: "raise", to: 2.5 },
    { who: "BU", type: "fold" },
    { who: "SB", type: "fold" },
    { who: "BB", type: "call", bb: 1.5 },
  ],
  flop: [
    { who: "BB", type: "check" },
    { who: "CO", type: "bet", bb: 2 },
    { who: "BB", type: "call", bb: 2 },
  ],
  turn: [
    { who: "BB", type: "check" },
    { who: "CO", type: "bet", bb: 5 },
    { who: "BB", type: "fold" },
  ],
};

describe("handLog", () => {
  it("раскладывает раздачу по улицам с блайндами в начале", () => {
    const log = handLog(makeHand(SPEC));
    expect(log.streets.map((s) => s.street)).toEqual(["preflop", "flop", "turn"]);
    // Постановка блайндов — часть лога, но помечена как не-решение.
    const pre = log.streets[0].actions;
    expect(pre.slice(0, 2)).toMatchObject([
      { position: "SB", text: "блайнд 0.5bb", isPost: true },
      { position: "BB", text: "блайнд 1bb", isPost: true },
    ]);
    expect(pre.some((a) => a.isPost && !a.text.startsWith("блайнд"))).toBe(false);
  });

  it("суммы переводит в bb, рейз показывает по «to»", () => {
    const log = handLog(makeHand(SPEC));
    const texts = log.streets[0].actions.map((a) => a.text);
    expect(texts).toContain("рейз до 2.5bb");
    expect(texts).toContain("колл 1.5bb");
    expect(texts).toContain("фолд");
    expect(log.streets[1].actions.map((a) => a.text)).toEqual([
      "чек", "бет 2bb", "колл 2bb",
    ]);
  });

  it("помечает олл-ин", () => {
    const log = handLog(makeHand({
      hero: "BU",
      cards: "AhAs",
      stacks: 20,
      preflop: [
        ...foldsBefore(ALL, "BU"),
        { who: "BU", type: "raise", to: 20, allIn: true },
        { who: "SB", type: "fold" },
        { who: "BB", type: "call", bb: 19, allIn: true },
      ],
    }));
    const texts = log.streets[0].actions.map((a) => a.text);
    expect(texts).toContain("рейз до 20bb · олл-ин");
    expect(texts).toContain("колл 19bb · олл-ин");
  });

  it("банк на начало улицы растёт по вложенному", () => {
    const log = handLog(makeHand(SPEC));
    // Префлоп начинается с пустого банка.
    expect(log.streets[0].potBefore).toBe(0);
    // К флопу: 0.5 SB + 2.5 опен + 2.5 колл BB = 5.5bb (SB сфолдил после поста).
    expect(log.streets[1].potBefore).toBeCloseTo(5.5, 5);
    // К тёрну добавились два бета по 2bb.
    expect(log.streets[2].potBefore).toBeCloseTo(9.5, 5);
  });

  it("борд показывает накопленным к улице", () => {
    const log = handLog(makeHand(SPEC));
    const show = (cs: number[]) => cs.map(formatCard).join(" ");
    expect(show(log.streets[0].board)).toBe("");
    expect(show(log.streets[1].board)).toBe("2h 7d 9s");
    expect(show(log.streets[2].board)).toBe("2h 7d 9s Qc");
  });

  it("в итогах отмечает героя, вскрытые карты и сфолдивших", () => {
    // Банк забирает герой (дефолт конструктора): 0.5 SB + 4.5 BB + 9.5 свои.
    const log = handLog(makeHand({ ...SPEC, shows: { BB: "QsQd" } }));
    const hero = log.results.find((r) => r.isHero)!;
    expect(hero.position).toBe("CO");
    expect(hero.folded).toBe(false);
    expect(log.pot).toBeCloseTo(14.5, 5);
    expect(hero.net).toBeCloseTo(14.5 - 9.5, 5);
    const bbPlayer = log.results.find((r) => r.position === "BB")!;
    expect(bbPlayer.folded).toBe(true);
    expect(bbPlayer.cards).not.toBeNull();
    // Кто не вскрывался — карт нет.
    expect(log.results.find((r) => r.position === "UTG")!.cards).toBeNull();
  });

  it("итоги идут в порядке ходов постфлопа, а не по номерам мест", () => {
    const log = handLog(makeHand(SPEC));
    expect(log.results.map((r) => r.position)).toEqual(["SB", "BB", "UTG", "MP", "CO", "BU"]);
  });
});

describe("привязка решения к ходу в логе", () => {
  it("actionIndex указывает на само решение героя", () => {
    const hand = makeHand(SPEC);
    const [d] = decisionsOf(hand);
    expect(hand.actions[d.actionIndex]).toMatchObject({
      player: "Hero", type: "raise", street: "preflop",
    });
    // Индекс должен находиться в логе — иначе подсветить нечего.
    const log = handLog(hand);
    const found = log.streets.flatMap((s) => s.actions).find((a) => a.index === d.actionIndex);
    expect(found).toMatchObject({ position: "CO", isHero: true, text: "рейз до 2.5bb" });
  });

  it("два решения одной раздачи указывают на разные ходы", () => {
    const hand = makeHand({
      hero: "CO",
      cards: "AhQh",
      preflop: [
        { who: "UTG", type: "fold" }, { who: "MP", type: "fold" },
        { who: "CO", type: "raise", to: 2.5 },
        { who: "BU", type: "fold" }, { who: "SB", type: "fold" },
        { who: "BB", type: "raise", to: 10 },
        { who: "CO", type: "fold" },
      ],
      collected: { BB: 4 },
    });
    const ds = decisionsOf(hand);
    expect(ds.map((d) => d.kind)).toEqual(["rfi", "def3bet"]);
    expect(ds[0].actionIndex).not.toBe(ds[1].actionIndex);
    expect(hand.actions[ds[0].actionIndex].type).toBe("raise"); // сам опен
    expect(hand.actions[ds[1].actionIndex].type).toBe("fold"); // ответ на 3бет
  });
});

import { describe, it, expect } from "vitest";
import { headsUpEquity, allInKind, allInSpot, analyzeEv } from "./allinEv";
import { makeHand, foldsBefore, HandSpec } from "./fixtures";
import { parseCards, Card } from "../engine/cards";
import { Position } from "./types";

const ALL: Position[] = ["SB", "BB", "UTG", "MP", "CO", "BU"];

const pair = (s: string) => parseCards(s) as [Card, Card];
const rng = () => 0.5;

describe("headsUpEquity", () => {
  it("сходится с эталонами префлоп-эквити", () => {
    // Классические ориентиры: они же проверяются в engine/equity.test.ts.
    // Префлоп считается по Monte Carlo, поэтому допуск — целый процент.
    expect(headsUpEquity(pair("AhAs"), pair("KhKs"), [], Math.random)).toBeCloseTo(0.826, 2);
    expect(headsUpEquity(pair("AhKh"), pair("QsQd"), [], Math.random)).toBeCloseTo(0.46, 2);
    // Масти важны: у QQ против AA в четыре разные масти эквити выше, чем
    // у общеизвестных «18.5%» — те про конфигурацию с двумя общими мастями.
    expect(headsUpEquity(pair("QcQs"), pair("AdAs"), [], Math.random)).toBeCloseTo(0.185, 2);
    expect(headsUpEquity(pair("QhQs"), pair("AdAc"), [], Math.random)).toBeCloseTo(0.191, 2);
  });

  it("на полном борде даёт 0, 1 или ничью", () => {
    const board = parseCards("2h7d9sKcQh");
    expect(headsUpEquity(pair("AhAs"), pair("3c4d"), board, rng)).toBe(1);
    expect(headsUpEquity(pair("3c4d"), pair("AhAs"), board, rng)).toBe(0);
    // Оба играют борд — ничья.
    expect(headsUpEquity(pair("3c4d"), pair("3s4h"), board, rng)).toBe(0.5);
  });

  it("на тёрне перебирает ривер точно", () => {
    // AA против 33 на 2h7d9sKc: тройки догоняют только тройкой (2 карты из 44).
    const eq = headsUpEquity(pair("AhAs"), pair("3c3d"), parseCards("2h7d9sKc"), rng);
    expect(eq).toBeCloseTo(42 / 44, 6);
    // А вот 22 на этом борде — уже сет, и в аутсайдерах тузы.
    expect(headsUpEquity(pair("AhAs"), pair("2c2d"), parseCards("2h7d9sKc"), rng)).toBeCloseTo(2 / 44, 6);
  });

  it("детерминирован: одна раздача — одна цифра", () => {
    const h = makeHand(ALLIN_SPEC);
    expect(allInSpot(h)!.equity).toBe(allInSpot(h)!.equity);
  });
});

/** Герой с BU пушит, BB коллирует; оба вскрылись, борд не роздан до конца. */
const ALLIN_SPEC: HandSpec = {
  id: "AI1",
  hero: "BU",
  cards: "AhAs",
  shows: { BB: "KhKs" },
  stacks: 20,
  board: "2h7d9sQcJh",
  preflop: [
    ...foldsBefore(ALL, "BU"),
    { who: "BU", type: "raise", to: 20, allIn: true },
    { who: "SB", type: "fold" },
    { who: "BB", type: "call", bb: 19, allIn: true },
  ],
  collected: { BU: 40.5 },
  rake: 0,
};

describe("allInKind", () => {
  it("считает EV префлоп-олл-ина по банку без рейка", () => {
    const s = allInSpot(makeHand(ALLIN_SPEC))!;
    expect(s.street).toBe("preflop");
    expect(s.equity).toBeCloseTo(0.82, 2);
    // Банк 40.5bb, герой вложил 20bb: EV ≈ 0.82 × 4050 − 2000.
    expect(s.pot).toBe(4050);
    expect(s.actual).toBe(2050);
    expect(s.ev / 100).toBeCloseTo(0.826 * 40.5 - 20, 0);
  });

  it("на флоп-олл-ине известны три карты борда", () => {
    const s = allInSpot(makeHand({
      ...ALLIN_SPEC,
      preflop: [
        ...foldsBefore(ALL, "BU"),
        { who: "BU", type: "raise", to: 2.5 },
        { who: "SB", type: "fold" },
        { who: "BB", type: "call", bb: 1.5 },
      ],
      flop: [
        { who: "BB", type: "bet", bb: 17.5, allIn: true },
        { who: "BU", type: "call", bb: 17.5, allIn: true },
      ],
    }))!;
    expect(s.street).toBe("flop");
    // AA против KK на 2h7d9s: короли добирают только королём.
    expect(s.equity).toBeGreaterThan(0.9);
  });

  it("олл-ин на ривере не считается — EV равен факту", () => {
    expect(allInKind(makeHand({
      ...ALLIN_SPEC,
      preflop: [
        ...foldsBefore(ALL, "BU"),
        { who: "BU", type: "raise", to: 2.5 },
        { who: "SB", type: "fold" },
        { who: "BB", type: "call", bb: 1.5 },
      ],
      river: [
        { who: "BB", type: "bet", bb: 17.5, allIn: true },
        { who: "BU", type: "call", bb: 17.5, allIn: true },
      ],
    }))).toBe("river");
  });

  it("без олл-ина считать нечего", () => {
    expect(allInKind(makeHand({
      hero: "BU",
      cards: "AhAs",
      shows: { BB: "KhKs" },
      board: "2h7d9sQcJh",
      preflop: [
        ...foldsBefore(ALL, "BU"),
        { who: "BU", type: "raise", to: 3 },
        { who: "SB", type: "fold" },
        { who: "BB", type: "call", bb: 2 },
      ],
      flop: [{ who: "BB", type: "check" }, { who: "BU", type: "check" }],
    }))).toBe("none");
  });

  it("олл-ин соперников после фолда героя к его EV не относится", () => {
    expect(allInKind(makeHand({
      hero: "UTG",
      cards: "7h2d",
      shows: { CO: "AhAs", BB: "KhKs" },
      stacks: 20,
      board: "2h7d9sQcJh",
      preflop: [
        { who: "UTG", type: "fold" }, { who: "MP", type: "fold" },
        { who: "CO", type: "raise", to: 20, allIn: true },
        { who: "BU", type: "fold" }, { who: "SB", type: "fold" },
        { who: "BB", type: "call", bb: 19, allIn: true },
      ],
      collected: { CO: 40.5 },
    }))).toBe("none");
  });

  it("многовей-олл-ин помечается как непосчитанный", () => {
    expect(allInKind(makeHand({
      hero: "BU",
      cards: "AhAs",
      shows: { CO: "KhKs", BB: "QhQs" },
      stacks: 20,
      board: "2h7d9sQcJh",
      preflop: [
        { who: "UTG", type: "fold" }, { who: "MP", type: "fold" },
        { who: "CO", type: "raise", to: 20, allIn: true },
        { who: "BU", type: "call", bb: 20, allIn: true },
        { who: "SB", type: "fold" },
        { who: "BB", type: "call", bb: 19, allIn: true },
      ],
      collected: { BU: 60 },
    }))).toBe("unsupported");
  });

  it("олл-ин без вскрытия соперника не посчитать", () => {
    const h = makeHand(ALLIN_SPEC);
    h.players.find((p) => p.position === "BB")!.cards = null;
    expect(allInKind(h)).toBe("unsupported");
  });

  it("run it twice: известен только общий префикс бордов", () => {
    const h = makeHand(ALLIN_SPEC);
    // Олл-ин на флопе, дальше два разных раннинга.
    h.actions = h.actions.map((a) => (a.type === "post" ? a : { ...a, street: "flop" as const }));
    h.board = parseCards("2h7d9sQcJh");
    h.runs = [parseCards("2h7d9sQcJh"), parseCards("2h7d9s4c5h")];
    const s = allInSpot(h)!;
    // Флоп общий, значит эквити считается от трёх карт, а не от пяти.
    expect(s.equity).toBeGreaterThan(0.9);
    expect(s.equity).toBeLessThan(1);
  });
});

describe("analyzeEv", () => {
  it("заменяет результат олл-инов на EV, остальное берёт фактом", () => {
    const flat = makeHand({
      id: "flat",
      hero: "BU",
      preflop: [...foldsBefore(ALL, "BU"), { who: "BU", type: "raise", to: 3 },
        { who: "SB", type: "fold" }, { who: "BB", type: "fold" }],
    });
    const r = analyzeEv([flat, makeHand(ALLIN_SPEC)]);
    expect(r.spots).toHaveLength(1);
    expect(r.skipped).toBe(0);
    // Факт: +1.5bb за блайнды и +20.5bb за выигранный олл-ин.
    expect(r.actual).toBe(150 + 2050);
    // EV: те же 1.5bb плюс EV олл-ина, который меньше факта.
    expect(r.ev).toBeLessThan(r.actual);
    expect(r.ev).toBeGreaterThan(150 + 1000);
    expect(r.evBb100).toBeCloseTo((r.ev / 100 / 2) * 100, 5);
  });
});

import { describe, it, expect } from "vitest";
import { computeStats, statsByPosition, pct, Stats, StatKey } from "./stats";
import { makeHand, foldsBefore, HandSpec } from "./fixtures";
import { Hand } from "./types";

const ALL: Parameters<typeof foldsBefore>[0] = ["SB", "BB", "UTG", "MP", "CO", "BU"];

/** Пара «сделал/возможностей» одним значением для читаемых ожиданий. */
const c = (s: Stats, k: StatKey) => `${s.counters[k].made}/${s.counters[k].opp}`;

const one = (spec: HandSpec) => computeStats([makeHand(spec)]);

describe("префлоп-счётчики", () => {
  it("VPIP не считает блайнд добровольным вложением", () => {
    // Герой на BB, все сфолдили: деньги в банке есть, но он их не выбирал.
    const s = one({
      hero: "BB",
      preflop: [...foldsBefore(ALL, "BB")],
    });
    expect(c(s, "vpip")).toBe("0/1");
    expect(c(s, "pfr")).toBe("0/1");
  });

  it("колл и рейз на префлопе — это VPIP", () => {
    const call = one({ hero: "BU", preflop: [...foldsBefore(ALL, "BU"), { who: "BU", type: "call", bb: 1 }] });
    expect(c(call, "vpip")).toBe("1/1");
    expect(c(call, "pfr")).toBe("0/1");

    const raise = one({ hero: "BU", preflop: [...foldsBefore(ALL, "BU"), { who: "BU", type: "raise", to: 2.5 }] });
    expect(c(raise, "vpip")).toBe("1/1");
    expect(c(raise, "pfr")).toBe("1/1");
  });

  it("3бет считается только когда перед героем был ровно один рейз", () => {
    // Один рейз до героя — возможность есть.
    const opened = one({
      hero: "BU",
      preflop: [
        { who: "UTG", type: "raise", to: 3 },
        { who: "MP", type: "fold" },
        { who: "CO", type: "fold" },
        { who: "BU", type: "raise", to: 10 },
      ],
    });
    expect(c(opened, "threeBet")).toBe("1/1");

    // Никто не рейзил — 3бетить не во что, возможности нет.
    const unopened = one({
      hero: "BU",
      preflop: [...foldsBefore(ALL, "BU"), { who: "BU", type: "raise", to: 2.5 }],
    });
    expect(c(unopened, "threeBet")).toBe("0/0");

    // Уже 3бет до нас: это спот для 4бета, в знаменатель 3бета он не идёт.
    const reRaised = one({
      hero: "BU",
      preflop: [
        { who: "UTG", type: "raise", to: 3 },
        { who: "MP", type: "raise", to: 10 },
        { who: "CO", type: "fold" },
        { who: "BU", type: "fold" },
      ],
    });
    expect(c(reRaised, "threeBet")).toBe("0/0");
  });

  it("ответ на 3бет делится на фолд и 4бет", () => {
    const spec = (type: "fold" | "raise"): HandSpec => ({
      hero: "CO",
      preflop: [
        { who: "UTG", type: "fold" },
        { who: "MP", type: "fold" },
        { who: "CO", type: "raise", to: 2.5 },
        { who: "BU", type: "fold" },
        { who: "SB", type: "fold" },
        { who: "BB", type: "raise", to: 10 },
        { who: "CO", type, to: type === "raise" ? 24 : undefined },
      ],
    });
    const folded = one(spec("fold"));
    expect(c(folded, "foldTo3Bet")).toBe("1/1");
    expect(c(folded, "fourBet")).toBe("0/1");

    const fourBet = one(spec("raise"));
    expect(c(fourBet, "foldTo3Bet")).toBe("0/1");
    expect(c(fourBet, "fourBet")).toBe("1/1");
  });

  it("стил — только опен первым в игру с трёх последних мест", () => {
    const bu = one({ hero: "BU", preflop: [...foldsBefore(ALL, "BU"), { who: "BU", type: "raise", to: 2.5 }] });
    expect(c(bu, "steal")).toBe("1/1");

    // С MP стилить нечего — место не стил-позиция.
    const mp = one({ hero: "MP", preflop: [...foldsBefore(ALL, "MP"), { who: "MP", type: "raise", to: 3 }] });
    expect(c(mp, "steal")).toBe("0/0");

    // Перед CO уже открыли — это не стил, а 3бет-спот.
    const vsOpen = one({
      hero: "CO",
      preflop: [{ who: "UTG", type: "raise", to: 3 }, { who: "MP", type: "fold" }, { who: "CO", type: "fold" }],
    });
    expect(c(vsOpen, "steal")).toBe("0/0");
  });

  it("фолд на стил считается только против стил-мест", () => {
    const vsBu = one({
      hero: "BB",
      preflop: [
        ...foldsBefore(ALL, "BU"),
        { who: "BU", type: "raise", to: 2.5 },
        { who: "SB", type: "fold" },
        { who: "BB", type: "fold" },
      ],
    });
    expect(c(vsBu, "foldToSteal")).toBe("1/1");

    // Опен с UTG — не стил, знаменатель не растёт.
    const vsUtg = one({
      hero: "BB",
      preflop: [
        { who: "UTG", type: "raise", to: 3 },
        { who: "MP", type: "fold" }, { who: "CO", type: "fold" },
        { who: "BU", type: "fold" }, { who: "SB", type: "fold" },
        { who: "BB", type: "fold" },
      ],
    });
    expect(c(vsUtg, "foldToSteal")).toBe("0/0");
  });
});

describe("постфлоп-счётчики", () => {
  const heroOpenedBbCalled = (rest: Partial<HandSpec>): HandSpec => ({
    hero: "CO",
    board: "2h7d9s",
    preflop: [
      { who: "UTG", type: "fold" }, { who: "MP", type: "fold" },
      { who: "CO", type: "raise", to: 2.5 },
      { who: "BU", type: "fold" }, { who: "SB", type: "fold" },
      { who: "BB", type: "call", bb: 1.5 },
    ],
    ...rest,
  });

  it("c-bet — ставка последнего агрессора префлопа", () => {
    const bet = one(heroOpenedBbCalled({ flop: [{ who: "BB", type: "check" }, { who: "CO", type: "bet", bb: 2 }] }));
    expect(c(bet, "cbetFlop")).toBe("1/1");

    const checked = one(heroOpenedBbCalled({ flop: [{ who: "BB", type: "check" }, { who: "CO", type: "check" }] }));
    expect(c(checked, "cbetFlop")).toBe("0/1");
  });

  it("если до героя уже поставили, это не спот для c-bet", () => {
    // Донк-бет от BB: возможности «поставить первым» у героя не было.
    const donk = one(heroOpenedBbCalled({ flop: [{ who: "BB", type: "bet", bb: 2 }, { who: "CO", type: "call", bb: 2 }] }));
    expect(c(donk, "cbetFlop")).toBe("0/0");
  });

  it("фолд на c-bet считается у того, кто не был агрессором", () => {
    const s = one({
      hero: "BB",
      board: "2h7d9s",
      preflop: [
        { who: "UTG", type: "fold" }, { who: "MP", type: "fold" },
        { who: "CO", type: "raise", to: 2.5 },
        { who: "BU", type: "fold" }, { who: "SB", type: "fold" },
        { who: "BB", type: "call", bb: 1.5 },
      ],
      flop: [{ who: "BB", type: "check" }, { who: "CO", type: "bet", bb: 2 }, { who: "BB", type: "fold" }],
      collected: { CO: 7 },
    });
    expect(c(s, "foldToCbetFlop")).toBe("1/1");
    expect(c(s, "cbetFlop")).toBe("0/0");
  });

  it("WTSD и W$SD: до шоудауна дошёл только тот, кто не сфолдил", () => {
    const showdown = one(heroOpenedBbCalled({
      board: "2h7d9sQcKh",
      flop: [{ who: "BB", type: "check" }, { who: "CO", type: "check" }],
      turn: [{ who: "BB", type: "check" }, { who: "CO", type: "check" }],
      river: [{ who: "BB", type: "check" }, { who: "CO", type: "check" }],
    }));
    expect(c(showdown, "wtsd")).toBe("1/1");
    expect(c(showdown, "wsd")).toBe("1/1"); // по умолчанию банк забирает герой
    expect(c(showdown, "wwsf")).toBe("1/1");

    const folded = one(heroOpenedBbCalled({
      flop: [{ who: "BB", type: "bet", bb: 2 }, { who: "CO", type: "fold" }],
      collected: { BB: 7 },
    }));
    expect(c(folded, "wtsd")).toBe("0/1");
    expect(c(folded, "wsd")).toBe("0/0");
    expect(c(folded, "wwsf")).toBe("0/1");
  });

  it("сфолдивший на префлопе флопа не видел", () => {
    const s = one({
      hero: "UTG",
      board: "2h7d9s",
      preflop: [{ who: "UTG", type: "fold" }, { who: "MP", type: "raise", to: 3 },
        { who: "CO", type: "fold" }, { who: "BU", type: "fold" },
        { who: "SB", type: "fold" }, { who: "BB", type: "call", bb: 2 }],
      collected: { MP: 6.5 },
    });
    expect(c(s, "wwsf")).toBe("0/0");
    expect(c(s, "wtsd")).toBe("0/0");
  });

  it("AF — агрессивные действия постфлопа делить на коллы", () => {
    const s = one(heroOpenedBbCalled({
      board: "2h7d9sQcKh",
      flop: [{ who: "BB", type: "check" }, { who: "CO", type: "bet", bb: 2 }, { who: "BB", type: "call", bb: 2 }],
      turn: [{ who: "BB", type: "bet", bb: 4 }, { who: "CO", type: "call", bb: 4 }],
      river: [{ who: "BB", type: "bet", bb: 8 }, { who: "CO", type: "raise", to: 20 }, { who: "BB", type: "fold" }],
    }));
    expect(s.aggressive).toBe(2); // bet на флопе + raise на ривере
    expect(s.passive).toBe(1); // единственный колл — на тёрне
    expect(s.af).toBe(2);
  });
});

describe("сводка", () => {
  it("bb/100 считается по итогу героя", () => {
    const hands: Hand[] = [
      makeHand({ id: "a", hero: "BU", preflop: [...foldsBefore(ALL, "BU"), { who: "BU", type: "raise", to: 3 },
        { who: "SB", type: "fold" }, { who: "BB", type: "fold" }] }),
      makeHand({ id: "b", hero: "BU", preflop: [...foldsBefore(ALL, "BU"), { who: "BU", type: "raise", to: 3 },
        { who: "SB", type: "fold" }, { who: "BB", type: "raise", to: 10 }, { who: "BU", type: "fold" }],
        collected: { BB: 6.5 } }),
    ];
    const s = computeStats(hands);
    // Первая: забрал 1.5bb блайндов. Вторая: отдал 3bb.
    expect(s.net).toBe(150 - 300);
    expect(s.bbPer100).toBeCloseTo(-75, 5);
  });

  it("bb/100 нормализует каждую раздачу по её собственному лимиту", () => {
    const nl100 = makeHand({ id: "nl100", hero: "BU", preflop: [
      ...foldsBefore(ALL, "BU"), { who: "BU", type: "raise", to: 3 },
      { who: "SB", type: "fold" }, { who: "BB", type: "fold" },
    ] });
    const nl200 = structuredClone(nl100);
    nl200.id = "nl200";
    nl200.sb *= 2;
    nl200.bb *= 2;
    for (const p of nl200.players) {
      p.stack *= 2;
      p.contributed *= 2;
      p.collected *= 2;
    }
    for (const a of nl200.actions) {
      a.amount *= 2;
      if (a.to !== undefined) a.to *= 2;
    }

    expect(computeStats([nl100, nl200]).bbPer100).toBeCloseTo(150, 5);
  });

  it("считает рейк из выплаты героя и переводит его в bb/100", () => {
    const won = makeHand({
      hero: "BU",
      rake: 0.5,
      preflop: [...foldsBefore(ALL, "BU"), { who: "BU", type: "raise", to: 3 },
        { who: "SB", type: "fold" }, { who: "BB", type: "call", bb: 2 }],
    });
    const lost = makeHand({
      hero: "BU",
      rake: 0.5,
      preflop: [...foldsBefore(ALL, "BU"), { who: "BU", type: "raise", to: 3 },
        { who: "SB", type: "fold" }, { who: "BB", type: "call", bb: 2 }],
      collected: { BB: 6 },
    });

    const s = computeStats([won, lost]);
    expect(s.rake).toBe(50);
    expect(s.rakeBbPer100).toBeCloseTo(25, 5);
  });

  it("при делёжке относит герою пропорциональную часть рейка", () => {
    const split = makeHand({
      hero: "BU",
      rake: 1,
      collected: { BU: 3, BB: 6 },
    });

    expect(computeStats([split]).rake).toBeCloseTo(100 / 3, 5);
  });

  it("разбивка по позициям не смешивает места", () => {
    const hands = [
      makeHand({ id: "a", hero: "BU", preflop: [...foldsBefore(ALL, "BU"), { who: "BU", type: "raise", to: 3 },
        { who: "SB", type: "fold" }, { who: "BB", type: "fold" }] }),
      makeHand({ id: "b", hero: "UTG", preflop: [{ who: "UTG", type: "fold" }] }),
    ];
    const by = statsByPosition(hands);
    expect(by.map((x) => x.position)).toEqual(["UTG", "BU"]);
    expect(pct(by.find((x) => x.position === "BU")!.stats.counters.pfr)).toBe(100);
    expect(pct(by.find((x) => x.position === "UTG")!.stats.counters.pfr)).toBe(0);
  });

  it("раздачи с ненадёжной позицией в разбивку не идут", () => {
    const h = makeHand({ id: "a", hero: "BU", preflop: [...foldsBefore(ALL, "BU"), { who: "BU", type: "raise", to: 3 }] });
    h.positionsReliable = false;
    expect(statsByPosition([h])).toEqual([]);
    // Но в общую статистику раздача попадает: место там не важно.
    expect(computeStats([h]).hands).toBe(1);
  });
});

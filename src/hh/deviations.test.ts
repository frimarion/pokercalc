import { describe, it, expect } from "vitest";
import { decisionsOf, analyzeDeviations, Decision, DEVIATIONS } from "./deviations";
import { makeHand, foldsBefore, HandSpec, ActSpec } from "./fixtures";
import { presetById } from "../presets/all";
import { handWeights } from "../presets/quiz";
import { Position } from "./types";

const ALL: Position[] = ["SB", "BB", "UTG", "MP", "CO", "BU"];

const only = (spec: HandSpec): Decision => {
  const d = decisionsOf(makeHand(spec));
  expect(d.length).toBeGreaterThan(0);
  return d[0];
};

/** Опен героя с указанного места после фолдов всех предыдущих. */
const rfi = (hero: Position, cards: string, type: "raise" | "fold" | "call"): HandSpec => ({
  hero,
  cards,
  preflop: [
    ...foldsBefore(ALL, hero),
    { who: hero, type, to: type === "raise" ? 2.5 : undefined, bb: type === "call" ? 1 : 0 },
  ],
});

describe("выбор чарта по споту", () => {
  it("RFI — по месту героя", () => {
    expect(only(rfi("CO", "AhKh", "raise"))).toMatchObject({
      kind: "rfi", presetId: "rfi-co", spot: "Опен с CO",
    });
    expect(only(rfi("SB", "AhKh", "raise")).presetId).toBe("rfi-sb");
  });

  it("BB против опена BU — чарт по фактическому сайзингу", () => {
    const vsBu = (to: number) => only({
      hero: "BB",
      cards: "AhKh",
      preflop: [
        ...foldsBefore(ALL, "BU"),
        { who: "BU", type: "raise", to },
        { who: "SB", type: "fold" },
        { who: "BB", type: "call", bb: to - 1 },
      ],
    });
    expect(vsBu(2.5).presetId).toBe("bbdef-vs-bu-25");
    expect(vsBu(3).presetId).toBe("bbdef-vs-bu-3");
  });

  it("SB против опена — чарт 3бет-защиты, а не BB-шный", () => {
    expect(only({
      hero: "SB",
      cards: "AhKh",
      preflop: [
        { who: "UTG", type: "fold" }, { who: "MP", type: "raise", to: 3 },
        { who: "CO", type: "fold" }, { who: "BU", type: "fold" },
        { who: "SB", type: "raise", to: 12 },
      ],
    })).toMatchObject({ kind: "sb3bet", presetId: "sb3bet-vs-mp" });
  });

  it("3бет в позиции — %-чарт подбирается по ширине опена соперника", () => {
    // UTG открывает ~14% → ближайший чарт «vs опен 15%».
    const vsUtg = only({
      hero: "BU",
      cards: "AhKh",
      preflop: [
        { who: "UTG", type: "raise", to: 3 }, { who: "MP", type: "fold" },
        { who: "CO", type: "fold" }, { who: "BU", type: "raise", to: 10 },
      ],
    });
    expect(vsUtg.presetId).toBe("3betip-15");
    expect(vsUtg.note).toMatch(/UTG открывает 1[34]\.\d% → чарт «vs опен 15%»/);

    // CO открывает ~26% → чарт «vs опен 26%».
    const vsCo = only({
      hero: "BU",
      cards: "AhKh",
      preflop: [
        { who: "UTG", type: "fold" }, { who: "MP", type: "fold" },
        { who: "CO", type: "raise", to: 2.5 }, { who: "BU", type: "raise", to: 9 },
      ],
    });
    expect(vsCo.presetId).toBe("3betip-26");
  });

  it("лимп до нас — чарт изолэйта по месту героя", () => {
    const iso = (hero: Position, act: ActSpec): Decision =>
      only({
        hero,
        cards: "AhKh",
        preflop: [
          { who: "UTG", type: "call", bb: 1 },
          ...(hero === "MP" ? [] : [{ who: "MP" as Position, type: "fold" as const }]),
          ...(hero === "MP" || hero === "CO" ? [] : [{ who: "CO" as Position, type: "fold" as const }]),
          act,
        ],
      });

    expect(iso("CO", { who: "CO", type: "raise", to: 5 })).toMatchObject({
      kind: "iso", presetId: "iso-co", spot: "Изолэйт с CO", action: "raise",
    });
    expect(iso("MP", { who: "MP", type: "raise", to: 6 }).presetId).toBe("iso-mp");
    // Число лимперов попадает в пояснение — от него зависит сайзинг.
    expect(iso("CO", { who: "CO", type: "raise", to: 5 }).note).toBe("лимперов: 1");
  });

  it("на BB отказ от изолэйта — это чек, а не фолд", () => {
    const d = only({
      hero: "BB",
      cards: "7h2d",
      preflop: [
        { who: "UTG", type: "call", bb: 1 }, { who: "MP", type: "fold" },
        { who: "CO", type: "fold" }, { who: "BU", type: "fold" },
        { who: "SB", type: "fold" },
        { who: "BB", type: "check" },
      ],
    });
    // Чек засчитан как отказ сыграть руку — и по чарту это верно.
    expect(d).toMatchObject({ kind: "iso", presetId: "iso-bb", action: "fold", verdict: "ok" });
  });

  it("на SB доставка блайнда — отдельное действие чарта", () => {
    const preset = presetById("iso-sb")!;
    expect(preset.actions.map((a) => a.kind)).toEqual(["raise", "call"]);
    // Рука, которую чарт только доставляет: колл по чарту, изолэйт — нет.
    const completeOnly = ["76s", "65s", "54s", "44", "33", "22"].find((h) => {
      const w = handWeights(preset, h);
      return w.call > 0.99 && w.raise < 0.01;
    });
    expect(completeOnly, "в iso-sb должна быть рука только на доставку").toBeDefined();
    const d = only({
      hero: "SB",
      cards: `${completeOnly![0]}h${completeOnly![1]}h`,
      preflop: [
        { who: "UTG", type: "call", bb: 1 }, { who: "MP", type: "fold" },
        { who: "CO", type: "fold" }, { who: "BU", type: "fold" },
        { who: "SB", type: "call", bb: 0.5 },
      ],
    });
    expect(d).toMatchObject({ kind: "iso", presetId: "iso-sb", action: "call", verdict: "ok" });
  });

  it("ответ на 3бет — второе решение той же раздачи", () => {
    const ds = decisionsOf(makeHand({
      hero: "CO",
      cards: "AhQh",
      preflop: [
        { who: "UTG", type: "fold" }, { who: "MP", type: "fold" },
        { who: "CO", type: "raise", to: 2.5 },
        { who: "BU", type: "fold" }, { who: "SB", type: "fold" },
        { who: "BB", type: "raise", to: 10 },
        { who: "CO", type: "fold" },
      ],
    }));
    expect(ds.map((d) => d.kind)).toEqual(["rfi", "def3bet"]);
    // 3бет пришёл из BB — постфлоп он ходит первым, значит опенер в позиции.
    expect(ds[1].presetId).toMatch(/^def3bet-ip-/);
    expect(ds[1].action).toBe("fold");
    expect(ds[1].note).toContain("в позиции");
  });

  it("SB открыл, BB 3бетнул — опенер остаётся вне позиции", () => {
    const ds = decisionsOf(makeHand({
      hero: "SB",
      cards: "AhQh",
      preflop: [
        ...foldsBefore(ALL, "SB"),
        { who: "SB", type: "raise", to: 3 },
        { who: "BB", type: "raise", to: 10 },
        { who: "SB", type: "call", bb: 7 },
      ],
    }));
    expect(ds[1].presetId).toMatch(/^def3bet-oop-/);
    expect(ds[1].note).toContain("вне позиции");
  });
});

describe("что чартом не покрыто", () => {
  const nothing = (spec: HandSpec) => expect(decisionsOf(makeHand(spec))).toEqual([]);

  it("лимп, а потом рейз до нас — это уже не изолэйт", () => {
    nothing({
      hero: "BU",
      preflop: [
        { who: "UTG", type: "call", bb: 1 }, { who: "MP", type: "raise", to: 4 },
        { who: "CO", type: "fold" }, { who: "BU", type: "fold" },
      ],
    });
  });

  it("сквиз против опена с коллом", () => {
    nothing({
      hero: "BU",
      preflop: [
        { who: "UTG", type: "raise", to: 3 }, { who: "MP", type: "call", bb: 3 },
        { who: "CO", type: "fold" }, { who: "BU", type: "raise", to: 12 },
      ],
    });
  });

  it("BB, когда все сфолдили — решения нет", () => {
    nothing({ hero: "BB", preflop: [...foldsBefore(ALL, "BB")] });
  });

  it("раздача с ненадёжной позицией не сверяется", () => {
    const h = makeHand(rfi("CO", "AhKh", "raise"));
    h.positionsReliable = false;
    expect(decisionsOf(h)).toEqual([]);
  });
});

describe("вердикт", () => {
  it("рука, которую чарт всегда открывает — «по чарту»", () => {
    expect(only(rfi("UTG", "AhAs", "raise")).verdict).toBe("ok");
  });

  it("фолд руки, которую чарт всегда открывает — «уже чарта»", () => {
    expect(only(rfi("UTG", "AhAs", "fold")).verdict).toBe("tight");
  });

  it("опен руки, которой в чарте нет — «шире чарта»", () => {
    expect(only(rfi("UTG", "7h2d", "raise"))).toMatchObject({ verdict: "loose", weight: 0 });
    // Её же фолд — ровно по чарту.
    expect(only(rfi("UTG", "7h2d", "fold")).verdict).toBe("ok");
  });

  it("рука в чарте есть, но играется другим действием", () => {
    // Ищем в BB-чарте руку, которую чарт только коллирует, и 3бетим её.
    const preset = presetById("bbdef-vs-co")!;
    const callOnly = ["A9s", "KJs", "QTs", "JTs", "T9s", "98s", "76s", "65s"].find((h) => {
      const w = handWeights(preset, h);
      return w.call > 0.99 && w.raise < 0.01;
    });
    expect(callOnly, "в чарте bbdef-vs-co должна быть чисто коллирующая рука").toBeDefined();
    const cards = `${callOnly![0]}h${callOnly![1]}h`;
    const d = only({
      hero: "BB",
      cards,
      preflop: [
        { who: "UTG", type: "fold" }, { who: "MP", type: "fold" },
        { who: "CO", type: "raise", to: 2.5 }, { who: "BU", type: "fold" },
        { who: "SB", type: "fold" }, { who: "BB", type: "raise", to: 10 },
      ],
    });
    expect(d.verdict).toBe("action");
  });

  it("смешанная рука — не ошибка ни в одну сторону", () => {
    const preset = presetById("rfi-co")!;
    const mixed = Object.keys({ ...preset.actions[0].situational.reduce((a, h) => ({ ...a, [h]: 1 }), {}) })[0];
    expect(mixed, "в чарте rfi-co должны быть ситуативные руки").toBeDefined();
    const cards = mixed.length === 2 ? `${mixed[0]}h${mixed[1]}s` : `${mixed[0]}h${mixed[1]}${mixed[2] === "s" ? "h" : "s"}`;
    const d = only(rfi("CO", cards, "raise"));
    expect(d.verdict).toBe("mixed");
    expect(only(rfi("CO", cards, "fold")).verdict).toBe("mixed");
  });
});

describe("сводный отчёт", () => {
  it("считает отклонения по спотам и по рукам", () => {
    const hands = [
      makeHand({ id: "a", ...rfi("UTG", "AhAs", "raise") }),
      makeHand({ id: "b", ...rfi("UTG", "7h2d", "raise") }),
      makeHand({ id: "c", ...rfi("CO", "AhAs", "raise") }),
      // Раздача без чарта — попадает в unmatched, а не в знаменатель.
      makeHand({ id: "d", hero: "BB", preflop: [...foldsBefore(ALL, "BB")] }),
    ];
    const r = analyzeDeviations(hands);
    expect(r.decisions).toHaveLength(3);
    expect(r.unmatched).toBe(1);
    expect(r.totals.ok).toBe(2);
    expect(r.totals.loose).toBe(1);

    const rfiKind = r.byKind.find((k) => k.kind === "rfi")!;
    expect(rfiKind.total).toBe(3);
    expect(rfiKind.deviationPct).toBeCloseTo(100 / 3, 5);

    const utg = r.bySpot.find((s) => s.spot === "Опен с UTG")!;
    expect(utg.total).toBe(2);
    expect(utg.deviationPct).toBe(50);

    expect(r.byHand.get("72o")).toMatchObject({ total: 1, deviations: 1 });
    expect(r.byHand.get("AA")).toMatchObject({ total: 2, deviations: 0 });
  });

  it("отклонениями считаются ровно три вердикта", () => {
    expect(DEVIATIONS).toEqual(["loose", "tight", "action"]);
  });
});

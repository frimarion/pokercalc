import { describe, expect, it } from "vitest";
import { icmValues } from "./icm";
import { doylePayouts } from "./payouts";
import { equityTable, H, HAND_LABELS, positionNames, rangeWidth, solvePushFold } from "./pushfold";

const idx = (l: string) => HAND_LABELS.indexOf(l);

describe("ICM", () => {
  it("сходится с расчётом вручную", () => {
    // 50/30/20, выплаты 50/30/20: P(1-й 2-м) = .3·50/70 + .2·50/80.
    const v = icmValues([50, 30, 20], [50, 30, 20]);
    const p2 = 0.3 * (50 / 70) + 0.2 * (50 / 80);
    expect(v[0]).toBeCloseTo(0.5 * 50 + p2 * 30 + (1 - 0.5 - p2) * 20, 9);
    expect(v.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
  });

  it("равные стеки делят фонд поровну, призы ниже числа игроков не раздаются", () => {
    const v = icmValues([10, 10, 10, 10], [40, 30, 20, 10, 5]);
    for (const x of v) expect(x).toBeCloseTo(25, 9);
  });

  it("вылетевший получает последнее место", () => {
    const v = icmValues([0, 60, 40], [50, 30, 20]);
    expect(v[0]).toBeCloseTo(20, 9);
  });

  it("фишки нелинейны: удвоение стека не удваивает оценку", () => {
    const [big, small] = icmValues([2000, 1000, 1000], [50, 30, 20]);
    expect(big).toBeLessThan(2 * small);
  });
});

describe("Рейтинг Doyle", () => {
  it("турнир 45: 60 входов, гарантия 800 и 1020 — как в миграции", () => {
    expect(doylePayouts({ entries: 60 }).payouts).toEqual([158, 126, 101, 80, 64, 51, 41, 33, 26]);
    expect(doylePayouts({ entries: 60, guarantee: 1020 }).payouts).toEqual([
      208, 166, 133, 106, 85, 68, 55, 44, 35,
    ]);
  });

  it("самотест админки: 100 входов", () => {
    const p = doylePayouts({ entries: 100 });
    expect(p).toMatchObject({ total: 1000, koPool: 200, itmPool: 800, places: 15, koValue: 2 });
    expect(p.payouts.reduce((a, b) => a + b, 0)).toBe(800);
  });

  it("ПКО: 4 очка за голову", () => {
    const p = doylePayouts({ entries: 40, pko: true });
    expect(p.koValue).toBe(4);
    expect(p.itmPool).toBe(800 - 160);
  });
});

describe("Таблица префлоп-эквити", () => {
  const eq = equityTable();
  const e = (a: string, b: string) => eq[idx(a) * H + idx(b)];

  it("эталоны", () => {
    expect(e("AA", "KK")).toBeCloseTo(0.82, 2);
    expect(e("AKs", "QQ")).toBeCloseTo(0.46, 1);
    expect(e("72o", "AA")).toBeGreaterThan(0.1);
    expect(e("72o", "AA")).toBeLessThan(0.14);
    expect(e("AKo", "AKo")).toBeCloseTo(0.5, 2);
  });

  it("антисимметрична", () => {
    for (let h = 0; h < H; h += 7)
      for (let g = 0; g < H; g += 5) expect(eq[h * H + g] + eq[g * H + h]).toBeCloseTo(1, 4);
  });
});

describe("Пуш-фолд", () => {
  it("позиции", () => {
    expect(positionNames(2)).toEqual(["SB", "BB"]);
    expect(positionNames(6)).toEqual(["LJ", "HJ", "CO", "BU", "SB", "BB"]);
  });

  // chipEV (победитель забирает всё) в хедз-апе — известный Нэш:
  // на 10bb SB пушит ~58%, BB коллирует ~37%.
  const hu = (bb: number) =>
    solvePushFold({ stacks: [bb * 100, bb * 100], sb: 50, bb: 100, ante: 0, anteMode: "bb", payouts: [1] });

  it("хедз-ап 10bb сходится с известным Нэшем", () => {
    const r = hu(10);
    const push = rangeWidth(r.push[0]);
    const call = rangeWidth(r.call[0][1]);
    expect(push).toBeGreaterThan(0.54);
    expect(push).toBeLessThan(0.62);
    expect(call).toBeGreaterThan(0.33);
    expect(call).toBeLessThan(0.41);
    expect(r.push[0][idx("AA")]).toBeCloseTo(1, 2);
    expect(r.push[0][idx("72o")]).toBeLessThan(0.05);
  });

  it("чем глубже стек, тем уже пуш", () => {
    expect(rangeWidth(hu(8).push[0])).toBeGreaterThan(rangeWidth(hu(15).push[0]));
  });

  it("chipEV — игра с нулевой суммой: оценки сохраняются", () => {
    const r = hu(10);
    expect(r.evAfter[0] + r.evAfter[1]).toBeCloseTo(1, 6);
  });

  it("ICM на баббле сжимает коллы по сравнению с chipEV", () => {
    // Трое, платят двоим; коротышка на 4bb пушит с SB, большой стек на BB.
    const base = { stacks: [3000, 400, 3000], sb: 50, bb: 100, ante: 0, anteMode: "bb" as const };
    const chip = solvePushFold({ ...base, payouts: [1] });
    const icm = solvePushFold({ ...base, payouts: [50, 50] });
    // BU (большой) против пуша SB (коротыш) — коллировать выгодно всегда…
    // а вот BB против пуша BU (второй большой) на баббле почти не коллирует.
    expect(rangeWidth(icm.call[0][2])).toBeLessThan(rangeWidth(chip.call[0][2]) - 0.1);
  });

  it("KO-очки расширяют колл против короткого", () => {
    const base = {
      stacks: [2000, 600, 2000, 2000],
      sb: 50,
      bb: 100,
      ante: 100,
      anteMode: "bb" as const,
      payouts: [158, 126, 101, 80],
    };
    const plain = solvePushFold(base);
    const ko = solvePushFold({ ...base, koBounty: 20 });
    // BB против пуша короткого BU (место 1).
    expect(rangeWidth(ko.call[1][3])).toBeGreaterThan(rangeWidth(plain.call[1][3]));
  });

  it("9 игроков: сошлось — 400 итераций совпадают с 1500", () => {
    const inp = {
      stacks: [20000, 15000, 30000, 12000, 25000, 40000, 18000, 22000, 9000],
      sb: 1000,
      bb: 2000,
      ante: 2000,
      anteMode: "bb" as const,
      payouts: doylePayouts({ entries: 60 }).payouts,
      koBounty: 2,
    };
    const a = solvePushFold(inp);
    const b = solvePushFold({ ...inp, iterations: 1500 });
    for (let i = 0; i < 8; i++) expect(Math.abs(rangeWidth(a.push[i]) - rangeWidth(b.push[i]))).toBeLessThan(0.005);
    // Смешанных ячеек почти нет: пуш-фолд равновесие почти чистое.
    const mixed = a.push.flat().filter((w) => w > 0.05 && w < 0.95).length;
    expect(mixed).toBeLessThan(20);
    // Оценки игроков — перераспределение того же фонда (плюс KO-очки).
    const sum = (v: number[]) => v.reduce((x, y) => x + y, 0);
    expect(sum(a.evAfter)).toBeGreaterThanOrEqual(sum(a.icmBefore) - 1e-6);
    expect(sum(a.evAfter)).toBeLessThan(sum(a.icmBefore) + 2);
  }, 30000);
});

import { describe, it, expect } from "vitest";
import {
  ALL_PRESETS,
  RFI_PRESETS,
  SB3BET_PRESETS,
  BBDEF_PRESETS,
  THREEBET_IP_PRESETS,
  SITUATIONAL_WEIGHT,
  RangePreset,
  ActionKind,
  ACTION_TREE,
  TreeNode,
  TreeOption,
  presetById,
  presetForPath,
} from ".";
import { QUIZ_SPOTS, questionWeights, isCorrect } from "./quiz";
import { Range, comboIndicesForLabel } from "../engine/combos";

/** Диапазон пресета: все действия (или только заданное) с их весами. */
function presetRange(p: RangePreset, kind?: ActionKind): Range {
  const r = new Range();
  for (const a of p.actions) {
    if (kind && a.kind !== kind) continue;
    for (const h of a.always) r.setHand(h, 1);
    for (const h of a.situational) {
      r.setHand(h, Math.min(1, r.handWeight(h) + SITUATIONAL_WEIGHT));
    }
  }
  return r;
}

const pct = (p: RangePreset, kind?: ActionKind) =>
  (presetRange(p, kind).totalCombos() / 1326) * 100;

describe("пресеты Green Charts — общее", () => {
  it("все ярлыки валидны, внутри действия без дублей", () => {
    for (const p of ALL_PRESETS) {
      for (const a of p.actions) {
        const all = [...a.always, ...a.situational];
        expect(new Set(all).size, `${p.id}/${a.kind}: дубликаты`).toBe(all.length);
        for (const label of all) {
          expect(() => comboIndicesForLabel(label), `${p.id}: ${label}`).not.toThrow();
        }
      }
    }
  });

  it("id уникальны и у каждого пресета есть действия", () => {
    const ids = ALL_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of ALL_PRESETS) expect(p.actions.length, p.id).toBeGreaterThan(0);
  });

  it("AA всегда разыгрывается агрессивно, а не пассивно", () => {
    for (const p of ALL_PRESETS) {
      const raiseAlways = p.actions
        .filter((a) => a.kind === "raise")
        .flatMap((a) => a.always);
      expect(raiseAlways, `${p.id}: AA не в рейзе`).toContain("AA");
    }
  });
});

describe("тренажёр", () => {
  const spot = (id: string) => QUIZ_SPOTS.find((s) => s.presetId === id)!;

  it("не спрашивает очевидное — ни мусор, ни премиум в середине зоны", () => {
    for (const id of ["rfi-utg", "rfi-mp", "sb3bet-vs-utg"]) {
      const hands = spot(id).hands;
      for (const junk of ["72o", "83o", "J2o", "92o", "42o"]) {
        expect(hands, `${id}: спрашивает мусор ${junk}`).not.toContain(junk);
      }
      for (const premium of ["AA", "KK"]) {
        expect(hands, `${id}: спрашивает очевидный ${premium}`).not.toContain(premium);
      }
    }
  });

  it("спрашивает пограничные руки — край диапазона", () => {
    // UTG открывает A5s, но не A4s: обе на границе, обе полезны.
    expect(spot("rfi-utg").hands).toContain("A5s");
    expect(spot("rfi-utg").hands).toContain("A4s");
  });

  it("спрашивает все руки со смешанной стратегией", () => {
    for (const p of ALL_PRESETS) {
      const hands = spot(p.id)?.hands ?? [];
      for (const a of p.actions) {
        const mixed = [...(a.threeQuarter ?? []), ...a.situational, ...(a.quarter ?? [])];
        for (const h of mixed) {
          expect(hands, `${p.id}: смешанная ${h} не спрашивается`).toContain(h);
        }
      }
    }
  });

  it("у каждого спота есть фолд и хотя бы одно активное действие", () => {
    expect(QUIZ_SPOTS.length).toBeGreaterThan(0);
    for (const s of QUIZ_SPOTS) {
      expect(s.answers.map((a) => a.key), s.presetId).toContain("fold");
      expect(s.answers.length, s.presetId).toBeGreaterThan(1);
      expect(s.situation.length, s.presetId).toBeGreaterThan(0);
    }
  });

  it("описание спота без служебных обрывков из position", () => {
    for (const s of QUIZ_SPOTS) {
      // «OOP vs 3bet 18% (SB vs BB)» не должно утекать в текст вопроса
      for (const junk of ["OOP", "IP vs", "3bet", "RFI ", "vs 3bet"]) {
        expect(s.situation, `${s.presetId}: «${s.situation}»`).not.toContain(junk);
      }
      expect(s.situation, s.presetId).toMatch(/^Вы /);
      expect(s.situation.endsWith("."), `${s.presetId}: «${s.situation}»`).toBe(true);
    }
  });

  it("на смешанной руке верны оба действия, а фолд — нет", () => {
    // BB vs UTG: часть рук играется наполовину 3бетом, наполовину коллом.
    const p = BBDEF_PRESETS.find((x) => x.id === "bbdef-vs-utg")!;
    const raise = p.actions.find((a) => a.kind === "raise")!;
    const both = raise.situational.find((h) =>
      p.actions.find((a) => a.kind === "call")!.situational.includes(h),
    );
    expect(both, "нет руки, делённой между 3бетом и коллом").toBeDefined();
    const q = { spot: spot(p.id), preset: p, hand: both!, weights: questionWeights(p, both!) };
    expect(isCorrect(q, "raise"), `${both}: 3бет`).toBe(true);
    expect(isCorrect(q, "call"), `${both}: колл`).toBe(true);
    expect(isCorrect(q, "fold"), `${both}: фолд`).toBe(false);
  });
});

describe("ветка событий", () => {
  /** Все опции дерева вместе с путём до них. */
  function walk(node: TreeNode, path: string[] = []): { path: string[]; option: TreeOption }[] {
    return node.options.flatMap((o) => {
      const here = [...path, o.key];
      return [{ path: here, option: o }, ...(o.next ? walk(o.next, here) : [])];
    });
  }

  const all = walk(ACTION_TREE);

  it("каждый чарт в дереве существует, а фильтр действия в нём есть", () => {
    for (const { option } of all) {
      if (!option.presetId) continue;
      const p = presetById(option.presetId);
      expect(p, `нет чарта ${option.presetId}`).toBeDefined();
      if (option.actionKind) {
        expect(
          p!.actions.some((a) => a.kind === option.actionKind),
          `${option.presetId}: нет действия ${option.actionKind}`,
        ).toBe(true);
      }
    }
  });

  it("ключи опций уникальны внутри своего шага", () => {
    const check = (node: TreeNode) => {
      const keys = node.options.map((o) => o.key);
      expect(new Set(keys).size, `дубли ключей в «${node.title}»`).toBe(keys.length);
      for (const o of node.options) if (o.next) check(o.next);
    };
    check(ACTION_TREE);
  });

  it("путь до листа выбирает непустой диапазон", () => {
    const leaves = all.filter(({ option }) => !option.next);
    expect(leaves.length).toBeGreaterThan(0);
    for (const { path } of leaves) {
      const { presetId, actionKind } = presetForPath(path);
      expect(presetId, `путь ${path.join("/")} без чарта`).toBeDefined();
      const p = presetById(presetId!)!;
      expect(pct(p, actionKind), `путь ${path.join("/")} пустой`).toBeGreaterThan(0);
    }
  });
});

describe("RFI", () => {
  it("диапазоны расширяются от UTG к SB", () => {
    const widths = RFI_PRESETS.map((p) => pct(p));
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i], `${RFI_PRESETS[i].id} шире`).toBeGreaterThan(widths[i - 1]);
    }
  });

  it("проценты совпадают с подписями в чартах", () => {
    const expected: Record<string, number> = {
      "rfi-utg": 14,
      "rfi-mp": 16,
      "rfi-co": 26,
      "rfi-bu": 42,
      "rfi-sb": 44,
    };
    for (const p of RFI_PRESETS) {
      const v = pct(p);
      expect(Math.abs(v - expected[p.id]), `${p.id}: ${v.toFixed(1)}%`).toBeLessThan(1);
    }
  });
});

describe("SB — 3бет защита", () => {
  it("расширяется по мере поздней позиции опенрейзера", () => {
    const widths = SB3BET_PRESETS.map((p) => pct(p));
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i], `${SB3BET_PRESETS[i].id} шире`).toBeGreaterThan(widths[i - 1]);
    }
  });

  it("уже RFI-диапазона оппонента", () => {
    const rfi = Object.fromEntries(RFI_PRESETS.map((p) => [p.position, pct(p)]));
    for (const [id, pos] of [
      ["sb3bet-vs-utg", "UTG"],
      ["sb3bet-vs-mp", "MP"],
      ["sb3bet-vs-co", "CO"],
      ["sb3bet-vs-bu", "BU"],
    ] as [string, string][]) {
      const p = SB3BET_PRESETS.find((x) => x.id === id)!;
      expect(pct(p), id).toBeLessThan(rfi[pos]);
    }
  });

  it("только 3бет-или-фолд — колла нет", () => {
    for (const p of SB3BET_PRESETS) {
      expect(
        p.actions.every((a) => a.kind === "raise"),
        p.id,
      ).toBe(true);
    }
  });
});

describe("BB — защита", () => {
  it("у каждого чарта есть и 3бет, и колл", () => {
    for (const p of BBDEF_PRESETS) {
      const kinds = p.actions.map((a) => a.kind);
      expect(kinds, p.id).toContain("raise");
      expect(kinds, p.id).toContain("call");
    }
  });

  it("сплит-руки входят в оба действия и не дублируют «всегда»", () => {
    for (const p of BBDEF_PRESETS) {
      const raise = p.actions.find((a) => a.kind === "raise")!;
      const call = p.actions.find((a) => a.kind === "call")!;
      // Частичные списки обоих действий — это одни и те же сплит-ячейки.
      expect(new Set(raise.situational), p.id).toEqual(new Set(call.situational));
      for (const h of raise.situational) {
        expect(call.always, `${p.id}: ${h} и в сплите, и в колле-всегда`).not.toContain(h);
        expect(raise.always, `${p.id}: ${h} и в сплите, и в 3бете-всегда`).not.toContain(h);
      }
    }
  });

  it("полная защита шире, чем только 3бет", () => {
    for (const p of BBDEF_PRESETS) {
      expect(pct(p), p.id).toBeGreaterThan(pct(p, "raise"));
    }
  });

  it("BB защищается шире, чем SB — закрывает торги и получает лучшие шансы", () => {
    const bb = BBDEF_PRESETS.find((p) => p.id === "bbdef-vs-bu-25")!;
    const sb = SB3BET_PRESETS.find((p) => p.id === "sb3bet-vs-bu")!;
    expect(pct(bb)).toBeGreaterThan(pct(sb));
  });
});

describe("3бет IP", () => {
  it("только 3бет-или-фолд — колла нет", () => {
    for (const p of THREEBET_IP_PRESETS) {
      expect(
        p.actions.every((a) => a.kind === "raise"),
        p.id,
      ).toBe(true);
    }
  });

  it("расширяется вместе с диапазоном опенрейзера оппонента", () => {
    const widths = THREEBET_IP_PRESETS.map((p) => pct(p));
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i], `${THREEBET_IP_PRESETS[i].id} шире`).toBeGreaterThan(widths[i - 1]);
    }
  });
});

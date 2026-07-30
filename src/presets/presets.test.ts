import { describe, it, expect } from "vitest";
import {
  ALL_PRESETS,
  RFI_PRESETS,
  SB3BET_PRESETS,
  BBDEF_PRESETS,
  THREEBET_IP_PRESETS,
  partialWeights,
  RangePreset,
  ActionKind,
  FORMATS,
  MTT_RFI_PRESETS,
  TreeNode,
  TreeOption,
  presetById,
  presetForPath,
} from ".";
import {
  QUIZ_SPOTS,
  questionWeights,
  isCorrect,
  actionEdges,
  handWeights,
  handFamily,
} from "./quiz";

/** Руки того же ряда, что стоят ниже указанной границы. */
function handsBelow(hand: string, edge: string): string[] {
  const family = handFamily(hand);
  const i = family.indexOf(edge);
  return i < 0 ? [] : family.slice(i + 1);
}
import { Range, comboIndicesForLabel } from "../engine/combos";

/** Диапазон пресета: все действия (или только заданное) с их весами. */
function presetRange(p: RangePreset, kind?: ActionKind): Range {
  const r = new Range();
  for (const a of p.actions) {
    if (kind && a.kind !== kind) continue;
    for (const h of a.always) r.setHand(h, 1);
    for (const [h, w] of partialWeights(a)) {
      r.setHand(h, Math.min(1, r.handWeight(h) + w));
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
        const all = [...a.always, ...a.situational, ...Object.keys(a.mixed ?? {})];
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

  it("AA разыгрывается преимущественно агрессивно", () => {
    // Порог, а не «всегда»: солверные MTT-чарты играют часть AA лимпом с SB,
    // но рейз всё равно должен оставаться основной линией.
    for (const p of ALL_PRESETS) {
      const w = handWeights(p, "AA");
      expect(w.raise, `${p.id}: AA рейзится лишь ${w.raise}`).toBeGreaterThan(0.5);
    }
  });

  it("веса лежат в 0..1 и в сумме не превышают единицу", () => {
    for (const p of ALL_PRESETS) {
      for (const a of p.actions) {
        for (const [h, w] of Object.entries(a.mixed ?? {})) {
          expect(w, `${p.id}/${a.kind}: ${h} = ${w}`).toBeGreaterThan(0);
          expect(w, `${p.id}/${a.kind}: ${h} = ${w}`).toBeLessThan(1);
        }
      }
      for (const label of ["AA", "72o", "K9s", "55"]) {
        const w = handWeights(p, label);
        expect(w.raise + w.call, `${p.id}: ${label} играется чаще, чем всегда`)
          .toBeLessThanOrEqual(1.01);
      }
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
        const mixed = [
          ...(a.threeQuarter ?? []),
          ...a.situational,
          ...(a.quarter ?? []),
          ...Object.keys(a.mixed ?? {}),
        ];
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

  it("граница действия — действительно самая слабая рука ряда", () => {
    for (const s of QUIZ_SPOTS) {
      const p = presetById(s.presetId)!;
      for (const hand of s.hands) {
        for (const e of actionEdges(p, hand)) {
          // сама граница играется
          expect(
            handWeights(p, e.weakest)[e.kind],
            `${p.id}/${hand}: граница ${e.weakest} не играется`,
          ).toBeGreaterThan(0);
          // а всё, что ниже неё в том же ряду, — уже нет
          for (const below of handsBelow(hand, e.weakest)) {
            expect(
              handWeights(p, below)[e.kind],
              `${p.id}/${hand}: ниже границы ${e.weakest} нашлась ${below}`,
            ).toBe(0);
          }
        }
      }
    }
  });

  it("UTG открывает Axo только до ATo — A2o подсказывает эту границу", () => {
    const p = presetById("rfi-utg")!;
    const raise = actionEdges(p, "A2o").find((e) => e.kind === "raise");
    expect(raise?.weakest).toBe("ATo");
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

describe.each(FORMATS)("ветка событий — $label", ({ tree, key: formatKey }) => {
  /** Все опции дерева вместе с путём до них. */
  function walk(node: TreeNode, path: string[] = []): { path: string[]; option: TreeOption }[] {
    return node.options.flatMap((o) => {
      const here = [...path, o.key];
      return [{ path: here, option: o }, ...(o.next ? walk(o.next, here) : [])];
    });
  }

  const all = walk(tree);

  // MTT-чарты пока заглушка (mtt/rfi.ts пустой), поэтому и дерево MTT пустое.
  // Тесты под него написаны заранее и включатся сами, как только
  // tools/gen_mtt_rfi.py заполнит пресеты, — снимать skip руками не нужно.
  const pending = all.length === 0;

  it.skipIf(pending)("непустое дерево", () => {
    expect(all.length, formatKey).toBeGreaterThan(0);
  });

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
    check(tree);
  });

  it.skipIf(pending)("путь до листа выбирает непустой диапазон", () => {
    const leaves = all.filter(({ option }) => !option.next);
    expect(leaves.length).toBeGreaterThan(0);
    for (const { path } of leaves) {
      const { presetId, actionKind } = presetForPath(path, tree);
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

// Тот же приём, что и с деревом: пока mtt/rfi.ts — заглушка, блок пропущен
// и включится сам после оцифровки. См. CLAUDE.md, раздел про MTT.
describe.skipIf(MTT_RFI_PRESETS.length === 0)("MTT RFI", () => {
  const seat = (s: string) => MTT_RFI_PRESETS.find((p) => p.position === s)!;

  it("оцифрованы все семь мест 8-max", () => {
    expect(MTT_RFI_PRESETS.map((p) => p.position)).toEqual([
      "UTG", "UTG1", "LJ", "HJ", "CO", "BTN", "SB",
    ]);
  });

  it("диапазоны расширяются от UTG к SB", () => {
    const widths = MTT_RFI_PRESETS.map((p) => pct(p));
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i], `${MTT_RFI_PRESETS[i].id} шире`).toBeGreaterThan(widths[i - 1]);
    }
  });

  it("частоты не округлены до четвертей — иначе это не солверный чарт", () => {
    const freqs = MTT_RFI_PRESETS.flatMap((p) =>
      p.actions.flatMap((a) => Object.values(a.mixed ?? {})),
    );
    expect(freqs.length, "нет ни одной смешанной руки").toBeGreaterThan(50);
    const offQuarter = freqs.filter((w) => Math.abs(w * 4 - Math.round(w * 4)) > 0.01);
    expect(offQuarter.length, "все частоты кратны 0.25").toBeGreaterThan(10);
  });

  it("лимп есть только на SB", () => {
    for (const p of MTT_RFI_PRESETS) {
      const hasCall = p.actions.some((a) => a.kind === "call");
      expect(hasCall, `${p.id}: лимп`).toBe(p.position === "SB");
    }
  });

  it("MTT-диапазоны ранних позиций шире кэшевых — антепот и меньше рейков", () => {
    // 8-max UTG против 6-max UTG: та же роль первого игрока, но за столом
    // больше соперников, а анте расширяет опен. Сверяем порядок величин.
    expect(pct(seat("UTG"))).toBeGreaterThan(10);
    expect(pct(seat("BTN"))).toBeGreaterThan(40);
    expect(pct(seat("SB"))).toBeGreaterThan(pct(seat("BTN")));
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

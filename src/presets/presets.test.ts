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
  MTT_ISO_PRESETS,
  MTT_VS_RFI_PRESETS,
  MTT_DEF3BET_PRESETS,
  MTT_BBDEF_PRESETS,
  MTT_PUSH_PRESETS,
  MTT_3BETPUSH_PRESETS,
  TreeNode,
  TreeOption,
  presetById,
  presetForPath,
  presetWidthPct,
  BLINDS4BET_PRESETS,
  MTT_STACKS,
} from ".";
import {
  QUIZ_SPOTS,
  questionWeights,
  isCorrect,
  actionEdges,
  handWeights,
  handFamily,
  TRAINER_SECTIONS,
} from "./quiz";

/** Руки того же ряда, что стоят ниже указанной границы. */
function handsBelow(hand: string, edge: string): string[] {
  const family = handFamily(hand);
  const i = family.indexOf(edge);
  return i < 0 ? [] : family.slice(i + 1);
}
import { Range, comboIndicesForLabel, gridCells } from "../engine/combos";

const GRID = gridCells();

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

  it("AA всегда в игре и никогда не фолдится", () => {
    for (const p of ALL_PRESETS) {
      const w = handWeights(p, "AA");
      expect(w.raise + w.call, `${p.id}: AA разыгрывается лишь ${w.raise + w.call}`)
        .toBeCloseTo(1, 5);
    }
  });

  it("AA разыгрывается преимущественно агрессивно", () => {
    // Порог, а не «всегда»: солверные MTT-чарты играют часть AA лимпом с SB,
    // но рейз всё равно должен оставаться основной линией.
    //
    // Защита блайндов от 4бета — исключение, и не техническое: там агрессия
    // это 5бет-пуш на 100bb, и чарт осознанно оставляет половину AA в колле,
    // чтобы не остаться без сильных рук в коллирующем диапазоне. Проверяем,
    // что пуш хотя бы наравне с коллом.
    for (const p of ALL_PRESETS) {
      const w = handWeights(p, "AA");
      const floor = p.group === "BLINDS4BET" ? 0.5 : 0.5001;
      expect(w.raise, `${p.id}: AA рейзится лишь ${w.raise}`).toBeGreaterThanOrEqual(floor);
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

  it("каждая группа чартов доступна в тренажёре", () => {
    // Именно этот инвариант однажды сломался молча: MTT-чарты оцифровались и
    // попали в QUIZ_SPOTS, но список групп в UI остался старым, и до них
    // нельзя было добраться ни одной кнопкой.
    const covered = new Set(TRAINER_SECTIONS.flatMap((s) => s.groups));
    const existing = new Set(ALL_PRESETS.map((p) => p.group));
    for (const g of existing) {
      expect(covered.has(g), `группа ${g} не попала ни в одну секцию тренажёра`).toBe(true);
    }
    for (const g of covered) {
      expect(existing.has(g), `секция тренажёра ссылается на пустую группу ${g}`).toBe(true);
    }
  });

  it("в каждой секции тренажёра есть о чём спрашивать", () => {
    for (const s of TRAINER_SECTIONS) {
      const spots = QUIZ_SPOTS.filter(
        (q) => s.groups.includes(presetById(q.presetId)!.group),
      );
      expect(spots.length, `секция ${s.key} пуста`).toBeGreaterThan(0);
      for (const spot of spots) {
        expect(spot.hands.length, `${spot.presetId}: не о чем спрашивать`).toBeGreaterThan(3);
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

// Каждый конфиг формата — своё дерево: у кэша он один (100bb), у MTT их
// пять по глубине стека, и на коротких стеках дерево совсем другое.
const TREE_CASES = FORMATS.flatMap((f) =>
  f.configs.map((c) => ({ name: `${f.label} · ${c.label}`, key: `${f.key}/${c.key}`, tree: c.tree })),
);

describe.each(TREE_CASES)("ветка событий — $name", ({ tree, key: formatKey }) => {
  /** Все опции дерева вместе с путём до них. */
  function walk(node: TreeNode, path: string[] = []): { path: string[]; option: TreeOption }[] {
    return node.options.flatMap((o) => {
      const here = [...path, o.key];
      return [{ path: here, option: o }, ...(o.next ? walk(o.next, here) : [])];
    });
  }

  const all = walk(tree);

  it("непустое дерево", () => {
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

  it("путь до листа выбирает непустой диапазон", () => {
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

// MTT-чарты FF START (charts/mtt, оцифровано tools/extract_ffstart.py).
describe("MTT — FF START", () => {
  const byId = (id: string) => presetById(id)!;
  const MTT_PRESETS = [
    ...MTT_RFI_PRESETS,
    ...MTT_ISO_PRESETS,
    ...MTT_VS_RFI_PRESETS,
    ...MTT_DEF3BET_PRESETS,
    ...MTT_BBDEF_PRESETS,
    ...MTT_PUSH_PRESETS,
    ...MTT_3BETPUSH_PRESETS,
  ];

  it("оцифрованы все страницы пака", () => {
    expect(MTT_RFI_PRESETS.map((p) => p.position)).toEqual([
      "EP+1", "EP+2", "MP", "HJ", "CO", "BU",
    ]);
    expect(MTT_ISO_PRESETS).toHaveLength(8);
    expect(MTT_VS_RFI_PRESETS).toHaveLength(4);
    expect(MTT_DEF3BET_PRESETS).toHaveLength(6);
    expect(MTT_BBDEF_PRESETS).toHaveLength(3);
    expect(MTT_PUSH_PRESETS).toHaveLength(10);
    expect(MTT_3BETPUSH_PRESETS).toHaveLength(5);
  });

  it("чарты бинарные — рука играется одним действием целиком", () => {
    // У FF START нет ни долей, ни составных ячеек (в отличие от Green Charts
    // и от солверных чартов). Если тут появятся дробные веса — значит, при
    // извлечении цвет ячейки прочитался неоднозначно.
    for (const p of MTT_PRESETS) {
      for (const a of p.actions) {
        expect(partialWeights(a), `${p.id}: дробные веса`).toEqual([]);
      }
      for (const cell of GRID.flat()) {
        const total = handWeights(p, cell.label).raise + handWeights(p, cell.label).call;
        expect(total === 0 || total === 1, `${p.id}/${cell.label}: вес ${total}`).toBe(true);
      }
    }
  });

  // Главная сверка оцифровки: процент подписан прямо на чарте, и он обязан
  // сойтись с фактической шириной диапазона. Проценты относятся к агрессивной
  // линии (изолейт/пуш/опен), пассивная линия на чартах не подписана.
  it.each([
    ["mtt-rfi-ep1", 16], ["mtt-rfi-ep2", 19], ["mtt-rfi-mp", 22],
    ["mtt-rfi-hj", 27], ["mtt-rfi-co", 37], ["mtt-rfi-bu", 54],
    ["mtt-iso-ep", 14], ["mtt-iso-mp", 19], ["mtt-iso-hj", 23],
    ["mtt-iso-multi", 17], ["mtt-iso-co", 26], ["mtt-iso-bu", 37],
    ["mtt-iso-sb", 12], ["mtt-iso-bb", 14],
    ["mtt-push-9-ep1", 14], ["mtt-push-9-mp", 23], ["mtt-push-9-co", 34],
    ["mtt-push-9-bu", 44], ["mtt-push-9-sb", 73],
    ["mtt-push-14-ep", 10], ["mtt-push-14-mp", 18], ["mtt-push-14-co", 28],
    ["mtt-push-14-bu", 34], ["mtt-push-14-sb", 63],
    ["mtt-threebetpush-early-vs-early", 5],
    ["mtt-threebetpush-mid-vs-early", 7],
    ["mtt-threebetpush-late-vs-late", 13],
    ["mtt-threebetpush-blinds-vs-early", 6],
    ["mtt-threebetpush-blinds-vs-late", 22],
  ])("%s — ширина сходится с подписанным процентом (%i%%)", (id, want) => {
    // Допуск 1.5 п.п., а не десятая доля: подписи на чартах округлены самим
    // автором, и на двух чартах (изолейт CO 25.5 против 26, пуш MP 24.1
    // против 23) расхождение больше половины процента. Ячейки там сверены
    // с картинкой поштучно — расходится подпись, а не оцифровка. Порог всё
    // равно ловит сдвиг на ряд или перепутанные местами чарты.
    const got = pct(byId(id), "raise");
    expect(Math.abs(got - want), `${id}: ${got.toFixed(1)}% против ${want}%`).toBeLessThan(1.5);
  });

  it("RFI вложены: каждая следующая позиция добавляет руки, не убирая", () => {
    for (let i = 1; i < MTT_RFI_PRESETS.length; i++) {
      const prev = presetRange(MTT_RFI_PRESETS[i - 1]);
      const cur = presetRange(MTT_RFI_PRESETS[i]);
      const lost = GRID.flat().filter(
        (c) => prev.handWeight(c.label) > cur.handWeight(c.label),
      ).map((c) => c.label);
      expect(lost, `${MTT_RFI_PRESETS[i].id} потерял руки`).toEqual([]);
    }
  });

  it("защита от 3бета умещается в опен того же места", () => {
    // Межстраничный инвариант: защищаться от 3бета можно только рукой,
    // которой ты и открылся. Ловит перепутанные местами чарты страницы №4.
    for (const p of MTT_DEF3BET_PRESETS) {
      const open = presetRange(byId(`mtt-rfi-${p.id.split("-").pop()}`));
      const def = presetRange(p);
      const extra = GRID.flat().filter(
        (c) => def.handWeight(c.label) > open.handWeight(c.label),
      ).map((c) => c.label);
      expect(extra, `${p.id}: защищаемся тем, чем не открывались`).toEqual([]);
    }
  });

  it("чем короче стек, тем шире пуш", () => {
    for (const seat of ["ep", "mp", "co", "bu", "sb"]) {
      // На 0-9bb первая позиция подписана EP+1, на 10-14bb — EP.
      const short = MTT_PUSH_PRESETS.find(
        (p) => p.id.startsWith("mtt-push-9-") && p.id.includes(seat),
      )!;
      const deep = byId(`mtt-push-14-${seat}`);
      expect(pct(short), `${seat}: 0-9bb против 10-14bb`).toBeGreaterThan(pct(deep));
    }
  });

  it("BB защищается тем шире, чем позднее позиция опенера", () => {
    const w = MTT_BBDEF_PRESETS.map((p) => pct(p, "call"));
    expect(w[0]).toBeLessThan(w[1]);
    expect(w[1]).toBeLessThan(w[2]);
    // 3бет при этом одинаковый на всех трёх чартах — так в оригинале.
    const three = MTT_BBDEF_PRESETS.map((p) => pct(p, "raise"));
    expect(new Set(three.map((x) => x.toFixed(2))).size).toBe(1);
  });

  it("каждый MTT-чарт достижим хотя бы на одной глубине стека", () => {
    // Дерево сознательно не показывает линии, под которые на этой глубине
    // нет чарта (на 16-22bb нет опена, на 25-40bb — игры против опена).
    // Обратная опасность — чарт, до которого не ведёт ни один путь: именно
    // так он и выпал бы из приложения незаметно.
    const reachable = new Set<string>();
    const walk = (n: TreeNode) => {
      for (const o of n.options) {
        if (o.presetId) reachable.add(o.presetId);
        if (o.next) walk(o.next);
      }
    };
    for (const s of MTT_STACKS) walk(s.tree);
    for (const p of MTT_PRESETS) {
      expect(reachable.has(p.id), `${p.id} недостижим ни на одной глубине`).toBe(true);
    }
  });

  it("на коротких стеках дерево одноходовое — других решений там нет", () => {
    for (const key of ["s09", "s1014", "s1622"]) {
      const s = MTT_STACKS.find((x) => x.key === key)!;
      // Один шаг: сразу позиция, без «что было до вас».
      expect(s.tree.options.every((o) => o.presetId && !o.next), key).toBe(true);
    }
  });

  it("MTT-опены шире кэшевых на тех же местах — анте и мелкий сайзинг", () => {
    expect(pct(byId("mtt-rfi-mp"))).toBeGreaterThan(pct(byId("rfi-mp")));
    expect(pct(byId("mtt-rfi-co"))).toBeGreaterThan(pct(byId("rfi-co")));
    expect(pct(byId("mtt-rfi-bu"))).toBeGreaterThan(pct(byId("rfi-bu")));
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

describe("Blinds Defense vs 4bet (стр. 8)", () => {
  const byId = (id: string) => ALL_PRESETS.find((x) => x.id === id)!;

  // На стр. 8 в заголовках чартов НЕТ подписанных процентов, поэтому обычная
  // сверка ширины тут невозможна. Вместо неё — структурный инвариант:
  // защищаться от 4бета можно только той рукой, которой ты и 3бетнул.
  // Чарты SB|BB объединяют оба блайнда, значит рука должна найтись хотя бы
  // в одном из двух 3бет-диапазонов.
  const SOURCES: [string, string[]][] = [
    ["blinds4bet-vs-utg", ["sb3bet-vs-utg", "bbdef-vs-utg"]],
    ["blinds4bet-vs-mp", ["sb3bet-vs-mp", "bbdef-vs-mp"]],
    ["blinds4bet-vs-co", ["sb3bet-vs-co", "bbdef-vs-co"]],
    ["blinds4bet-vs-bu-25", ["sb3bet-vs-bu", "bbdef-vs-bu-25"]],
    ["blinds4bet-vs-bu-3", ["sb3bet-vs-bu", "bbdef-vs-bu-3"]],
    ["blinds4bet-bb-vs-sb", ["bbdef-vs-sb"]],
  ];

  it.each(SOURCES)("%s — весь диапазон умещается в 3бет с блайнда", (id, sources) => {
    const defense = byId(id);
    for (const cell of GRID.flat()) {
      const w = handWeights(defense, cell.label);
      if (w.raise + w.call < 0.01) continue;
      const canThreeBet = sources.some(
        (s) => handWeights(byId(s), cell.label).raise > 0.01,
      );
      expect(canThreeBet, `${id}: ${cell.label} защищается, но не 3бетится`).toBe(true);
    }
  });

  it("против SB защищаемся шире, чем против UTG", () => {
    // Чем шире 4бет соперника, тем шире защита. SB 4бетит сильно шире UTG.
    const width = (id: string) => presetWidthPct(byId(id));
    expect(width("blinds4bet-bb-vs-sb")).toBeGreaterThan(width("blinds4bet-vs-co"));
    expect(width("blinds4bet-vs-co")).toBeGreaterThan(width("blinds4bet-vs-utg"));
  });

  it("жёлтый — это ситуативный колл, а не отдельное решение", () => {
    for (const p of BLINDS4BET_PRESETS) {
      const yellow = p.actions.filter((a) => a.color === "yellow");
      for (const a of yellow) {
        expect(a.kind, `${p.id}: жёлтое действие должно быть коллом`).toBe("call");
        // Жёлтые ячейки на чарте сплошные, но играются не всегда → вес 0.5.
        expect(a.always, `${p.id}: жёлтый не бывает полным весом`).toEqual([]);
        expect(a.situational.length).toBeGreaterThan(0);
      }
    }
  });

  it("пуш и колл вместе не превышают единицу", () => {
    for (const p of BLINDS4BET_PRESETS) {
      for (const cell of GRID.flat()) {
        const w = handWeights(p, cell.label);
        expect(w.raise + w.call, `${p.id}: ${cell.label}`).toBeLessThanOrEqual(1.0001);
      }
    }
  });
});

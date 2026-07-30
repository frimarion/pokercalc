// Сверка префлоп-решений героя с чартами Green Charts.
//
// Каждое решение отображается на конкретный чарт, дальше берётся вес руки в
// этом чарте (`handWeights` из тренажёра) и сравнивается с тем, что герой
// сделал за столом. Решения, для которых чарта нет (лимпед-поты, сквизы,
// 4бет+), не выдумываются, а честно помечаются как неразобранные.
//
// Почему для %-чартов позиция всё-таки подставляется. В ветке событий
// (presets/tree.ts) чарты «3бет IP» и «защита от 3бета» выбираются вручную:
// их процент — это ширина диапазона СОПЕРНИКА, а не наша позиция. Здесь
// соперник известен из истории, поэтому берётся тот чарт, чей процент ближе
// всего к ширине диапазона, с которым этот соперник по Green Charts и играет.
// Выбранный чарт всегда показывается в разборе — подстановка не молчаливая.

import { handLabel } from "../engine/combos";
import { presetById } from "../presets/all";
import { handWeights } from "../presets/quiz";
import { presetWidthPct } from "../presets/tree";
import { ActionKind, RangePreset } from "../presets/types";
import { Hand, HandAction, Position, heroPlayer } from "./types";

export type SpotKind = "rfi" | "iso" | "sb3bet" | "bbdef" | "3betip" | "def3bet";

export const SPOT_LABELS: Record<SpotKind, string> = {
  rfi: "Опен (RFI)",
  iso: "Изолэйт после лимпа",
  sb3bet: "SB — защита 3бетом",
  bbdef: "BB — защита",
  "3betip": "3бет в позиции",
  def3bet: "Ответ на 3бет",
};

export const SPOT_ORDER: SpotKind[] = [
  "rfi", "iso", "3betip", "sb3bet", "bbdef", "def3bet",
];

export type HeroAction = ActionKind | "fold";

export type Verdict =
  /** Чарт играет так всегда. */
  | "ok"
  /** Чарт играет так часть времени — смешанная стратегия, не ошибка. */
  | "mixed"
  /** Сыграл руку, которую чарт не играет вообще. */
  | "loose"
  /** Сфолдил руку, которую чарт всегда играет. */
  | "tight"
  /** Рука в чарте есть, но разыгрывается другим действием. */
  | "action";

export const VERDICT_LABELS: Record<Verdict, string> = {
  ok: "по чарту",
  mixed: "смешанная",
  loose: "шире чарта",
  tight: "уже чарта",
  action: "другое действие",
};

/** Отклонением считаются только эти три вердикта. */
export const DEVIATIONS: Verdict[] = ["loose", "tight", "action"];

export interface Decision {
  handId: string;
  time: number;
  /** Ярлык 169-hand: «AKs». */
  label: string;
  position: Position;
  kind: SpotKind;
  presetId: string;
  /** Человекочитаемый спот: «CO vs опен UTG». */
  spot: string;
  /** Пояснение к выбору %-чарта, если он подставлен по ширине соперника. */
  note?: string;
  action: HeroAction;
  /**
   * Индекс решающего действия в `hand.actions` — по нему разбор подсвечивает
   * в логе раздачи именно тот ход, к которому относится вердикт. Без него
   * в раздаче с двумя решениями героя непонятно, о каком речь.
   */
  actionIndex: number;
  /** Вес выбранного действия по чарту, 0..1. */
  weight: number;
  verdict: Verdict;
  /** За столом сидели все шестеро — чарты 6-max применимы буквально. */
  fullRing: boolean;
  /** Итог героя в этой раздаче, центы. */
  net: number;
}

const POSTFLOP_ORDER: Position[] = ["SB", "BB", "UTG", "MP", "CO", "BU"];

/** Ширина чарта в процентах, с кэшем: presetWidthPct перебирает 1326 комбо. */
const widthCache = new Map<string, number>();
function widthOf(id: string, kind?: ActionKind): number {
  const key = kind ? `${id}:${kind}` : id;
  let w = widthCache.get(key);
  if (w === undefined) {
    const p = presetById(id);
    w = p ? presetWidthPct(p, kind) : 0;
    widthCache.set(key, w);
  }
  return w;
}

/** Чарт из семейства, чей процент ближе всего к фактической ширине. */
function nearest(prefix: string, pcts: number[], width: number): { id: string; pct: number } {
  const best = pcts.reduce((a, b) => (Math.abs(b - width) < Math.abs(a - width) ? b : a));
  return { id: `${prefix}${best}`, pct: best };
}

const DEF_IP_PCTS = [6, 8, 10, 12, 14];
const DEF_OOP_PCTS = [8, 10, 12, 18];
const IP3BET_PCTS = [15, 18, 26];

/**
 * `checkDeclines` — считать ли чек отказом сыграть руку. В лимпед-поте у BB
 * фолда нет: не изолировать можно только чеком, и по чарту это ровно то же
 * самое. Без этого из выборки выпали бы все случаи, когда изолэйт пропущен,
 * и «уже чарта» на BB не нашлось бы никогда.
 */
function actionOf(a: HandAction, checkDeclines = false): HeroAction | null {
  if (a.type === "fold") return "fold";
  if (a.type === "call") return "call";
  if (a.type === "raise") return "raise";
  if (a.type === "check" && checkDeclines) return "fold";
  return null;
}

/** Как чарт относится к сыгранному действию. */
function judge(preset: RangePreset, label: string, action: HeroAction): { weight: number; verdict: Verdict } {
  const w = handWeights(preset, label);
  const fold = Math.max(0, 1 - w.raise - w.call);
  const weight = action === "fold" ? fold : w[action];
  if (weight > 0.99) return { weight, verdict: "ok" };
  if (weight > 0.01) return { weight, verdict: "mixed" };
  if (action === "fold") return { weight, verdict: "tight" };
  // Сыграли не как чарт: либо руки в чарте нет вовсе, либо она играется иначе.
  return { weight, verdict: w.raise + w.call > 0.01 ? "action" : "loose" };
}

interface Spot {
  kind: SpotKind;
  presetId: string;
  spot: string;
  note?: string;
}

/** Спот первого решения героя на префлопе. */
function openingSpot(h: Hand, pos: Position, before: HandAction[]): Spot | null {
  const raises = before.filter((a) => a.type === "raise");
  const limps = before.filter((a) => a.type === "call");
  if (raises.length > 1) return null; // сквиз-споты чартами не покрыты

  if (limps.length > 0) {
    // До нас долимпили и не подняли — это чарт Isolate. С UTG такого спота
    // не бывает: до него лимпить некому, и чарта для UTG в оригинале нет.
    if (raises.length > 0 || pos === "UTG") return null;
    return {
      kind: "iso",
      presetId: `iso-${pos.toLowerCase()}`,
      spot: `Изолэйт с ${pos}`,
      note: `лимперов: ${limps.length}`,
    };
  }

  if (raises.length === 0) {
    // Все сфолдили. У BB здесь либо ход бесплатный, либо опции нет.
    if (pos === "BB") return null;
    return { kind: "rfi", presetId: `rfi-${pos.toLowerCase()}`, spot: `Опен с ${pos}` };
  }

  const opener = h.players.find((p) => p.name === raises[0].player);
  if (!opener) return null;
  const op = opener.position;

  if (pos === "SB" && op !== "SB" && op !== "BB") {
    return { kind: "sb3bet", presetId: `sb3bet-vs-${op.toLowerCase()}`, spot: `SB vs опен ${op}` };
  }
  if (pos === "BB") {
    if (op === "BU") {
      // На BU у Green Charts два чарта под сайзинг опена — берём по факту.
      const big = (raises[0].to ?? 0) > h.bb * 2.75;
      return {
        kind: "bbdef",
        presetId: big ? "bbdef-vs-bu-3" : "bbdef-vs-bu-25",
        spot: `BB vs опен BU`,
        note: `опен ${((raises[0].to ?? 0) / h.bb).toFixed(1)}bb → чарт ${big ? "3bb" : "2.5bb"}`,
      };
    }
    if (op === "BB") return null;
    return { kind: "bbdef", presetId: `bbdef-vs-${op.toLowerCase()}`, spot: `BB vs опен ${op}` };
  }
  // Остались непозиционные места (BB уже обработан выше) и SB против опена
  // BB — последнего чартом не покрыть, там возврат null ниже.
  if (pos !== "SB") {
    // 3бет в позиции. Чарт выбирается по ширине опена соперника.
    const width = widthOf(`rfi-${op.toLowerCase()}`);
    const { id, pct } = nearest("3betip-", IP3BET_PCTS, width);
    return {
      kind: "3betip",
      presetId: id,
      spot: `${pos} vs опен ${op}`,
      note: `${op} открывает ${width.toFixed(1)}% → чарт «vs опен ${pct}%»`,
    };
  }
  return null;
}

/** Спот «герой открыл, его 3бетнули». */
function defenseSpot(pos: Position, raiser: Position): Spot | null {
  // Ширина 3бета соперника — по тому чарту, которым он этот 3бет и делает.
  let width: number;
  if (raiser === "SB") width = widthOf(`sb3bet-vs-${pos.toLowerCase()}`, "raise");
  else if (raiser === "BB") {
    const id = pos === "BU" ? "bbdef-vs-bu-25" : `bbdef-vs-${pos.toLowerCase()}`;
    width = widthOf(id, "raise");
  } else {
    width = widthOf(nearest("3betip-", IP3BET_PCTS, widthOf(`rfi-${pos.toLowerCase()}`)).id, "raise");
  }
  if (width === 0) return null;

  // Кто из двоих ходит постфлоп первым, тот и вне позиции.
  const ip = POSTFLOP_ORDER.indexOf(pos) > POSTFLOP_ORDER.indexOf(raiser);
  const { id, pct } = nearest(
    ip ? "def3bet-ip-" : "def3bet-oop-",
    ip ? DEF_IP_PCTS : DEF_OOP_PCTS,
    width,
  );
  return {
    kind: "def3bet",
    presetId: id,
    spot: `${pos} vs 3бет ${raiser}`,
    note: `${raiser} 3бетит ${width.toFixed(1)}% → чарт «vs 3бет ${pct}%», ${ip ? "в позиции" : "вне позиции"}`,
  };
}

function build(
  h: Hand,
  label: string,
  pos: Position,
  spot: Spot,
  action: HeroAction,
  actionIndex: number,
  net: number,
): Decision | null {
  const preset = presetById(spot.presetId);
  if (!preset) return null;
  const { weight, verdict } = judge(preset, label, action);
  return {
    handId: h.id,
    time: h.time,
    label,
    position: pos,
    kind: spot.kind,
    presetId: spot.presetId,
    spot: spot.spot,
    note: spot.note,
    action,
    actionIndex,
    weight,
    verdict,
    fullRing: h.players.length === 6,
    net,
  };
}

/**
 * Префлоп-решения героя, для которых нашёлся чарт. Одна раздача даёт до двух:
 * первое решение (опен или защита) и ответ на 3бет после своего опена.
 */
export function decisionsOf(h: Hand): Decision[] {
  const hero = heroPlayer(h);
  if (!hero || !hero.cards || hero.cards.length !== 2 || !h.positionsReliable) return [];
  const label = handLabel(hero.cards[0], hero.cards[1]);
  const pos = hero.position;
  const net = hero.collected - hero.contributed;

  // Индексы в hand.actions тащатся рядом с действиями: по ним разбор потом
  // подсвечивает нужный ход в логе раздачи.
  const pre = h.actions
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.street === "preflop" && a.type !== "post");
  const firstIdx = pre.findIndex(({ a }) => a.player === hero.name);
  if (firstIdx < 0) return [];

  const out: Decision[] = [];
  const opening = openingSpot(h, pos, pre.slice(0, firstIdx).map(({ a }) => a));
  // В лимпед-поте отказ от изолэйта у BB выглядит как чек, а не фолд.
  const firstAction = actionOf(pre[firstIdx].a, opening?.kind === "iso");
  if (opening && firstAction) {
    const d = build(h, label, pos, opening, firstAction, pre[firstIdx].i, net);
    if (d) out.push(d);
  }

  // Ответ на 3бет: герой открыл первым, кто-то переставил, ход снова к нему.
  if (opening?.kind === "rfi" && pre[firstIdx].a.type === "raise") {
    const tbIdx = pre.findIndex(({ a }, i) => i > firstIdx && a.type === "raise");
    if (tbIdx >= 0) {
      const answerIdx = pre.findIndex(({ a }, i) => i > tbIdx && a.player === hero.name);
      // Только первый 3бет: после 4бета и сквизов чарт уже не тот.
      const extraRaise = pre.some(({ a }, i) => i > tbIdx && i < answerIdx && a.type === "raise");
      const answer = answerIdx >= 0 ? actionOf(pre[answerIdx].a) : null;
      const raiser = h.players.find((p) => p.name === pre[tbIdx].a.player);
      if (answer && raiser && !extraRaise) {
        const spot = defenseSpot(pos, raiser.position);
        const d = spot && build(h, label, pos, spot, answer, pre[answerIdx].i, net);
        if (d) out.push(d);
      }
    }
  }
  return out;
}

export interface SpotSummary {
  kind: SpotKind;
  spot: string;
  presetId: string;
  total: number;
  counts: Record<Verdict, number>;
  /** Доля отклонений, %. */
  deviationPct: number;
  /** Суммарный итог героя по этим решениям, центы. */
  net: number;
}

export interface DecisionSummary {
  totals: Record<Verdict, number>;
  byKind: SpotSummary[];
  bySpot: SpotSummary[];
  /** Отклонения по 169 ярлыкам — для покраски матрицы. */
  byHand: Map<string, { total: number; deviations: number; net: number }>;
}

export interface DeviationReport extends DecisionSummary {
  decisions: Decision[];
  /** Раздачи, где решение героя не легло ни на один чарт. */
  unmatched: number;
}

function emptyVerdicts(): Record<Verdict, number> {
  return { ok: 0, mixed: 0, loose: 0, tight: 0, action: 0 };
}

function summarize(
  key: (d: Decision) => string,
  meta: (d: Decision) => Omit<SpotSummary, "total" | "counts" | "deviationPct" | "net">,
  decisions: Decision[],
): SpotSummary[] {
  const map = new Map<string, SpotSummary>();
  for (const d of decisions) {
    const k = key(d);
    let s = map.get(k);
    if (!s) {
      s = { ...meta(d), total: 0, counts: emptyVerdicts(), deviationPct: 0, net: 0 };
      map.set(k, s);
    }
    s.total++;
    s.counts[d.verdict]++;
    s.net += d.net;
  }
  for (const s of map.values()) {
    const dev = DEVIATIONS.reduce((n, v) => n + s.counts[v], 0);
    s.deviationPct = s.total === 0 ? 0 : (dev / s.total) * 100;
  }
  return [...map.values()];
}

/**
 * Сводки по готовому списку решений. Отдельно от analyzeDeviations, потому
 * что интерфейс фильтрует решения (по типу спота, по размеру стола) и должен
 * пересчитывать сводку, не перебирая заново все раздачи.
 */
export function summarizeDecisions(decisions: Decision[]): DecisionSummary {
  const totals = emptyVerdicts();
  const byHand = new Map<string, { total: number; deviations: number; net: number }>();
  for (const d of decisions) {
    totals[d.verdict]++;
    const cell = byHand.get(d.label) ?? { total: 0, deviations: 0, net: 0 };
    cell.total++;
    if (DEVIATIONS.includes(d.verdict)) cell.deviations++;
    cell.net += d.net;
    byHand.set(d.label, cell);
  }

  const byKind = summarize(
    (d) => d.kind,
    (d) => ({ kind: d.kind, spot: SPOT_LABELS[d.kind], presetId: "" }),
    decisions,
  ).sort((a, b) => SPOT_ORDER.indexOf(a.kind) - SPOT_ORDER.indexOf(b.kind));

  // Сортировка по ЧИСЛУ отклонений, а не по доле: спот с одним решением и
  // одной ошибкой даёт 100% и иначе занял бы первую строку, хотя чинить там
  // нечего. Наверх должно попадать то, что случается часто.
  const deviationsOf = (s: SpotSummary) => DEVIATIONS.reduce((n, v) => n + s.counts[v], 0);
  const bySpot = summarize(
    (d) => `${d.kind}|${d.spot}|${d.presetId}`,
    (d) => ({ kind: d.kind, spot: d.spot, presetId: d.presetId }),
    decisions,
  ).sort((a, b) => deviationsOf(b) - deviationsOf(a) || b.total - a.total);

  return { totals, byKind, bySpot, byHand };
}

export function analyzeDeviations(hands: Hand[]): DeviationReport {
  const decisions: Decision[] = [];
  let unmatched = 0;
  for (const h of hands) {
    const d = decisionsOf(h);
    if (d.length === 0 && h.hero) unmatched++;
    decisions.push(...d);
  }
  return { decisions, unmatched, ...summarizeDecisions(decisions) };
}

// Генератор вопросов тренажёра по префлопу на основе чартов Green Charts.
//
// Главный принцип: очевидные вопросы не задаются. «Открываем ли 72o с UTG»
// ничему не учит, потому что рука лежит глубоко внутри зоны фолда. В тест
// попадают только руки двух видов:
//
//   1. СМЕШАННЫЕ — чарт играет их частично (вес 0.25/0.5/0.75), то есть
//      правильных действий несколько;
//   2. ПОГРАНИЧНЫЕ — соседняя по сетке рука играется иначе. Это ровно край
//      диапазона: A5s открываем, A4s уже нет — обе попадают в тест.
//
// Всё, что окружено такими же руками с тем же действием (весь мусор и весь
// премиум в середине своей зоны), из выборки исключается.

import { ActionKind, RangePreset } from "./types";
import { ALL_PRESETS } from "./all";
import { gridCells, HandType } from "../engine/combos";

const GRID = gridCells();

/** Ярлык → координаты в сетке 13×13 и тип руки. */
const CELL_AT = new Map<string, { row: number; col: number; type: HandType }>();
GRID.forEach((row, r) =>
  row.forEach((cell, c) => CELL_AT.set(cell.label, { row: r, col: c, type: cell.type })),
);

function labelAt(row: number, col: number): string | undefined {
  return GRID[row]?.[col]?.label;
}

/**
 * Соседи руки по сетке. Переходы пара↔непара не считаем соседством: у них
 * разная природа, и «край» между ними не несёт смысла границы диапазона.
 * Зато suited↔offsuit одной пары рангов — важная граница (AJs играем, AJo нет).
 */
function neighbours(label: string): string[] {
  const at = CELL_AT.get(label);
  if (!at) return [];
  const { row, col, type } = at;
  const out: string[] = [];
  const push = (l?: string) => {
    if (!l) return;
    const t = CELL_AT.get(l)!.type;
    // пары дружат только с парами, непары — только с непарами
    if ((type === "pair") !== (t === "pair")) return;
    out.push(l);
  };
  push(labelAt(row - 1, col));
  push(labelAt(row + 1, col));
  push(labelAt(row, col - 1));
  push(labelAt(row, col + 1));
  if (type !== "pair") push(labelAt(col, row)); // зеркало: suited ↔ offsuit
  return out;
}

/** Вес ярлыка в одном действии чарта (0 / 0.25 / 0.5 / 0.75 / 1). */
function weightIn(action: RangePreset["actions"][number], label: string): number {
  if (action.always.includes(label)) return 1;
  if (action.threeQuarter?.includes(label)) return 0.75;
  if (action.situational.includes(label)) return 0.5;
  if (action.quarter?.includes(label)) return 0.25;
  return 0;
}

/**
 * Вес каждого ДЕЙСТВИЯ (по kind) для руки. Действия одного kind
 * складываются: в защите от 3бета «4бет-фолд» и «4бет-пуш» — один 4бет,
 * разделены они только ради цвета в легенде.
 */
export function handWeights(p: RangePreset, label: string): Record<ActionKind, number> {
  const w: Record<ActionKind, number> = { raise: 0, call: 0 };
  for (const a of p.actions) w[a.kind] = Math.min(1, w[a.kind] + weightIn(a, label));
  return w;
}

/** Доля руки, которая уходит в фолд. */
function foldWeight(w: Record<ActionKind, number>): number {
  return Math.max(0, 1 - w.raise - w.call);
}

/** Одинаково ли разыгрываются две руки (с точностью до долей). */
function samePlay(a: Record<ActionKind, number>, b: Record<ActionKind, number>): boolean {
  return Math.abs(a.raise - b.raise) < 0.01 && Math.abs(a.call - b.call) < 0.01;
}

/**
 * Руки, на которых имеет смысл спрашивать: смешанные либо на границе.
 * Именно они отличают знание чарта от здравого смысла.
 */
export function interestingHands(p: RangePreset): string[] {
  const out: string[] = [];
  for (const rowCells of GRID) {
    for (const { label } of rowCells) {
      const w = handWeights(p, label);
      const mixed = [w.raise, w.call, foldWeight(w)].some((x) => x > 0.01 && x < 0.99);
      const onEdge = neighbours(label).some((n) => !samePlay(w, handWeights(p, n)));
      if (mixed || onEdge) out.push(label);
    }
  }
  return out;
}

export type QuizAnswer = ActionKind | "fold";

export interface QuizSpot {
  presetId: string;
  /** Человекочитаемое описание ситуации за столом. */
  situation: string;
  /** Доступные ответы, включая фолд. */
  answers: { key: QuizAnswer; label: string }[];
  hands: string[];
}

/** Подпись действия зависит от типа чарта: raise на RFI — это открытие. */
function raiseLabel(p: RangePreset): string {
  switch (p.group) {
    case "RFI":
      return "Открыть рейзом";
    case "DEF3BETIP":
    case "DEF3BETOOP":
      return "4бет";
    default:
      return "3бет";
  }
}

/**
 * Описание спота для игрока. Собирается из position чарта, но не подстановкой
 * целиком: там встречается служебное («OOP vs 3bet 18% (SB vs BB)»), поэтому
 * позиция и процент вытаскиваются по отдельности.
 */
function situationOf(p: RangePreset): string {
  const percent = p.position.match(/(\d+)%/)?.[1];
  // «vs BU 2.5bb» → место + сайзинг опена
  const opener = p.position.replace(/^vs\s+/, "").match(/^([A-Z]+)\s*(.*)$/);
  const seat = opener?.[1] ?? "";
  const size = opener?.[2] ? ` (${opener[2]})` : "";

  switch (p.group) {
    case "RFI":
      return `Вы на ${p.position}. Все до вас сфолдили.`;
    case "SB3BET":
      return `Вы на SB. ${seat} открыл рейзом${size}, остальные сфолдили.`;
    case "BBDEF":
      return `Вы на BB. ${seat} открыл рейзом${size}, остальные сфолдили.`;
    case "3BETIP":
      return `Вы в позиции. Соперник открыл рейзом с диапазоном ${percent}%.`;
    case "DEF3BETIP":
      return `Вы открыли рейзом, блайнд 3бетнул. Его 3бет — ${percent}%, вы в позиции.`;
    case "DEF3BETOOP": {
      const sbVsBb = p.position.includes("SB vs BB");
      const who = sbVsBb ? "Вы открыли с SB, BB 3бетнул" : "Вы открыли рейзом, вас 3бетнули";
      return `${who}. 3бет соперника — ${percent}%, вы вне позиции.`;
    }
  }
}

/** Все споты, по которым можно спрашивать. */
export const QUIZ_SPOTS: QuizSpot[] = ALL_PRESETS.map((p) => {
  const answers: { key: QuizAnswer; label: string }[] = [{ key: "fold", label: "Фолд" }];
  if (p.actions.some((a) => a.kind === "call")) answers.push({ key: "call", label: "Колл" });
  if (p.actions.some((a) => a.kind === "raise")) {
    answers.push({ key: "raise", label: raiseLabel(p) });
  }
  return {
    presetId: p.id,
    situation: situationOf(p),
    answers,
    hands: interestingHands(p),
  };
}).filter((s) => s.hands.length > 0);

export interface Question {
  spot: QuizSpot;
  preset: RangePreset;
  hand: string;
  /** Вес каждого ответа по чарту — он же разбор после ответа. */
  weights: Record<QuizAnswer, number>;
}

export function questionWeights(p: RangePreset, hand: string): Record<QuizAnswer, number> {
  const w = handWeights(p, hand);
  return { raise: w.raise, call: w.call, fold: foldWeight(w) };
}

/** Ответ верен, если чарт играет руку так хоть какую-то долю времени. */
export function isCorrect(q: Question, answer: QuizAnswer): boolean {
  return q.weights[answer] > 0.01;
}

const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

/** Случайный вопрос из выбранных спотов. */
export function nextQuestion(spots: QuizSpot[]): Question | null {
  if (spots.length === 0) return null;
  const spot = pick(spots);
  const preset = ALL_PRESETS.find((p) => p.id === spot.presetId)!;
  const hand = pick(spot.hands);
  return { spot, preset, hand, weights: questionWeights(preset, hand) };
}

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

import { ActionKind, GROUP_LABELS, PresetGroup, RangePreset } from "./types";
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

/** Вес ярлыка в одном действии чарта: 0..1 (у кэш-чартов — кратно 0.25). */
function weightIn(action: RangePreset["actions"][number], label: string): number {
  if (action.always.includes(label)) return 1;
  if (action.threeQuarter?.includes(label)) return 0.75;
  if (action.situational.includes(label)) return 0.5;
  if (action.quarter?.includes(label)) return 0.25;
  return action.mixed?.[label] ?? 0;
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

/**
 * «Ряд» руки в матрице: те же старшая карта и тип. Для AJs это все Axs,
 * для AJo — все Axo, для 77 — все пары. Именно так чарты и запоминают
 * («Axs открываем до A5s»), поэтому подсказка о границе строится по ряду,
 * а не по всему диапазону: «самая слабая рука вообще» плохо определена —
 * непонятно, что слабее, 22 или 76s.
 *
 * Порядок — от сильной руки к слабой.
 */
export function handFamily(label: string): string[] {
  const at = CELL_AT.get(label);
  if (!at) return [];
  const { row, col, type } = at;
  const out: string[] = [];
  if (type === "pair") {
    for (let i = 0; i < 13; i++) out.push(GRID[i][i].label);
  } else if (type === "suited") {
    for (let c = row + 1; c < 13; c++) out.push(GRID[row][c].label);
  } else {
    for (let r = col + 1; r < 13; r++) out.push(GRID[r][col].label);
  }
  return out;
}

/** Подпись ряда для текста подсказки: «Axs», «Axo», «пары». */
export function familyLabel(label: string): string {
  const at = CELL_AT.get(label);
  if (!at) return label;
  if (at.type === "pair") return "пары";
  const hi = label[0];
  return `${hi}x${at.type === "suited" ? "s" : "o"}`;
}

export interface ActionEdge {
  kind: ActionKind;
  /** Самая слабая рука ряда, которую ещё играют этим действием. */
  weakest: string;
  /** Играется ли она лишь частично (смешанная стратегия). */
  partial: boolean;
}

/**
 * Докуда тянется каждое действие в ряду этой руки — «низ» колла и рейза.
 * Показывается при ошибке, чтобы было видно, где проходит граница.
 */
export function actionEdges(p: RangePreset, hand: string): ActionEdge[] {
  const family = handFamily(hand);
  const out: ActionEdge[] = [];
  for (const kind of ["call", "raise"] as ActionKind[]) {
    if (!p.actions.some((a) => a.kind === kind)) continue;
    let weakest: string | null = null;
    let weight = 0;
    for (const h of family) {
      const w = handWeights(p, h)[kind];
      if (w > 0.01) {
        weakest = h;
        weight = w;
      }
    }
    if (weakest) out.push({ kind, weakest, partial: weight < 0.99 });
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
    case "MTTRFI":
      return "Открыть рейзом";
    case "ISO":
    case "MTTISO":
      return "Изолировать рейзом";
    case "DEF3BETIP":
    case "DEF3BETOOP":
    case "MTTDEF3BET":
      return "4бет";
    case "BLINDS4BET":
      return "5бет-пуш";
    case "MTTPUSH":
      return "Олл-ин";
    case "MTT3BETPUSH":
      return "3бет-пуш";
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
    case "ISO":
      return `Вы на ${p.position}. До вас лимп.`;
    case "MTTRFI":
      return `Вы на ${p.position}, стек 25bb+. Все до вас сфолдили.`;
    // MTT-чарты FF START: спот задаётся не только позицией, но и глубиной
    // стека, и она уже вшита в position («EP · 10-14bb») или в группу.
    case "MTTISO":
      return p.position === "vs 2+"
        ? "Вы против двух и больше лимперов — все они уже влимпили."
        : `Вы на ${p.position}. До вас лимп.`;
    case "MTTVSRFI":
      return `Вы на позиции «${p.position}», стек 40bb+. Соперник открыл рейзом 2bb.`;
    case "MTTBBDEF":
      return `Вы на BB. Опен 2-2.2bb ${p.position.replace("vs ", "с ")} позиций.`;
    case "MTTDEF3BET":
      return `Вы открыли с ${p.position} и получили 3бет 5-7bb. Стек 40bb+.`;
    case "MTTPUSH": {
      // position здесь — «EP · 10-14bb»: место и стек, разделённые точкой.
      const [seat, stack] = p.position.split(" · ");
      return `Вы на ${seat}, стек ${stack}. Все до вас сфолдили, играем пуш или фолд.`;
    }
    case "MTT3BETPUSH":
      return `Вы в споте «${p.position}», стек 16-22bb. Соперник открыл рейзом 2bb.`;
    case "SB3BET":
      return `Вы на SB. ${seat} открыл рейзом${size}, остальные сфолдили.`;
    case "BBDEF":
      return `Вы на BB. ${seat} открыл рейзом${size}, остальные сфолдили.`;
    case "3BETIP":
      return `Вы в позиции. Соперник открыл рейзом с диапазоном ${percent}%.`;
    case "BLINDS4BET":
      // «BB vs SB» — отдельный чарт: 4бетит сам SB, а не опенер с поздней.
      return p.position.includes("BB vs SB")
        ? "Вы 3бетнули с BB против опена SB, и SB ответил 4бетом."
        : `Вы 3бетнули с блайнда, ${seat} ответил 4бетом${size}.`;
    case "DEF3BETIP":
      return `Вы открыли рейзом, блайнд 3бетнул. Его 3бет — ${percent}%, вы в позиции.`;
    case "DEF3BETOOP": {
      const sbVsBb = p.position.includes("SB vs BB");
      const who = sbVsBb ? "Вы открыли с SB, BB 3бетнул" : "Вы открыли рейзом, вас 3бетнули";
      return `${who}. 3бет соперника — ${percent}%, вы вне позиции.`;
    }
  }
}

/**
 * Подпись пассивного действия. «Колл» подходит не везде: на MTT-SB это лимп,
 * а на изолэйте с SB — доставка блайнда до целого, там подпись берётся из
 * самого чарта.
 */
function callLabel(p: RangePreset): string {
  if (p.group === "MTTISO") return "Оверлимп";
  if (p.group === "ISO") {
    const call = p.actions.find((a) => a.kind === "call");
    if (call) return call.label.charAt(0).toUpperCase() + call.label.slice(1);
  }
  return "Колл";
}

/**
 * Отказаться сыграть руку не везде значит сфолдить: в лимпед-поте у BB фолда
 * нет вообще — он уже поставил блайнд, и не изолировать можно только чеком.
 * Та же поправка стоит в разборе истории рук (`checkDeclines` в
 * `hh/deviations.ts`), а в тренажёре её не было: спрашивая «фолд?» на BB
 * против лимпа, тренажёр предлагал невозможное действие.
 *
 * На «vs 2+» позиция героя не задана — там фолд возможен и остаётся фолдом.
 */
export function declinesByCheck(p: RangePreset): boolean {
  return (p.group === "ISO" || p.group === "MTTISO") && p.position === "BB";
}

/** Все споты, по которым можно спрашивать. */
export const QUIZ_SPOTS: QuizSpot[] = ALL_PRESETS.map((p) => {
  const answers: { key: QuizAnswer; label: string }[] = [
    { key: "fold", label: declinesByCheck(p) ? "Чек" : "Фолд" },
  ];
  const call = p.actions.find((a) => a.kind === "call");
  // Пассивная линия называется по-разному: на MTT-SB это лимп, на изолэйте
  // с SB — доставка блайнда. Подпись берём из чарта, где она уже задана.
  if (call) answers.push({ key: "call", label: callLabel(p) });
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

/**
 * Разбиение спотов по форматам — им управляется, что тренировать.
 *
 * Живёт здесь, а не в Trainer.tsx, ради теста: список групп в тренажёре уже
 * один раз отстал от реальности — MTT-чарты оцифровались, попали в QUIZ_SPOTS,
 * но в UI остались недоступны, потому что их забыли дописать в кнопки. Тест
 * сверяет объединение секций со всеми группами, какие есть в чартах.
 */
export interface TrainerSection {
  key: "cash" | "mtt";
  label: string;
  note: string;
  groups: PresetGroup[];
}

export const TRAINER_SECTIONS: TrainerSection[] = [
  {
    key: "cash",
    label: "Кэш",
    note: "6-max · Green Charts",
    groups: [
      "RFI",
      "ISO",
      "SB3BET",
      "BBDEF",
      "3BETIP",
      "DEF3BETIP",
      "DEF3BETOOP",
      "BLINDS4BET",
    ],
  },
  {
    key: "mtt",
    label: "MTT",
    note: "FF START · по глубине стека",
    groups: [
      "MTTRFI",
      "MTTISO",
      "MTTVSRFI",
      "MTTDEF3BET",
      "MTTBBDEF",
      "MTTPUSH",
      "MTT3BETPUSH",
    ],
  },
];

/**
 * Подпись группы на кнопке внутри секции: префикс «MTT · » там лишний —
 * формат уже выбран переключателем выше.
 */
export function sectionGroupLabel(group: PresetGroup): string {
  return GROUP_LABELS[group].replace(/^MTT · /, "");
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

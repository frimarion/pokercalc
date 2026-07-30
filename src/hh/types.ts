// Модель раздачи из истории рук.
//
// Все суммы — ЦЕЛЫЕ ЧИСЛА В ЦЕНТАХ. Историю пишет сайт в долларах с двумя
// знаками, а копеечная арифметика на float даёт «$0.30000000000000004» и
// ломает сравнение «вложил ровно весь стек» (детект олл-ина). Поэтому на
// входе всё умножается на 100 и округляется один раз, а обратно в доллары
// переводится только в UI.

import { Card } from "../engine/cards";

/** Места за столом. Выводятся из места баттона, а не из порядка ходов. */
export type Position = "UTG" | "MP" | "CO" | "BU" | "SB" | "BB";

export const POSITIONS: Position[] = ["UTG", "MP", "CO", "BU", "SB", "BB"];

export type Street = "preflop" | "flop" | "turn" | "river";

export const STREETS: Street[] = ["preflop", "flop", "turn", "river"];

export type ActionType = "fold" | "check" | "call" | "bet" | "raise" | "post";

export interface HandAction {
  street: Street;
  player: string;
  type: ActionType;
  /** Сколько игрок доложил ЭТИМ действием (для рейза — только добавка). */
  amount: number;
  /** Для bet/raise — суммарная ставка игрока на улице («raises $X to $Y»). */
  to?: number;
  allIn: boolean;
}

export interface HandPlayer {
  seat: number;
  name: string;
  /** Стек до раздачи. */
  stack: number;
  position: Position;
  /** Известны только для Hero и для вскрывшихся на шоудауне. */
  cards: Card[] | null;
  /** Всего вложено в банк за раздачу (без возвращённой некольнутой ставки). */
  contributed: number;
  /** Всего забрано из банка (по всем раннингам при run-it-twice). */
  collected: number;
}

/** Разбор олл-ина: сколько герой «должен был» забрать по эквити. */
export interface AllInSpot {
  handId: string;
  /** Улица, на которой ставки кончились. */
  street: Street;
  equity: number;
  /** Банк, реально разошедшийся по игрокам (уже без рейка), центы. */
  pot: number;
  /** Фактический итог героя, центы. */
  actual: number;
  /** Итог по эквити: equity × pot − вложенное, центы. */
  ev: number;
}

export interface Hand {
  id: string;
  table: string;
  /** Размер стола из шапки: «6-max» → 6. */
  maxSeats: number;
  sb: number;
  bb: number;
  /** Время раздачи, ms epoch (локальная зона файла). */
  time: number;
  buttonSeat: number;
  players: HandPlayer[];
  /** Имя героя, если он был в раздаче и получил карты. */
  hero: string | null;
  /**
   * Борд первого раннинга. При run-it-twice остальные лежат в runs —
   * борд №0 дублируется, чтобы обычный код читал одно поле.
   */
  board: Card[];
  runs: Card[][];
  actions: HandAction[];
  /** Общий банк и рейк из строки SUMMARY (при RIT банк просуммирован по раннингам). */
  pot: number;
  rake: number;
  /**
   * Позиции сошлись с фактически выставленными блайндами. false бывает на
   * входе в игру с пропущенным блайндом — такие раздачи не идут в статистику
   * по позициям и в сверку с чартами.
   */
  positionsReliable: boolean;
  /**
   * Разбор олл-ина, посчитанный один раз при импорте и сохранённый вместе с
   * раздачей. Префлоп-олл-ин считается по Monte Carlo и стоит десятки
   * миллисекунд — пересчитывать его при каждой смене фильтра нельзя.
   * undefined — ещё не считали, null — считать нечего.
   */
  allIn?: AllInSpot | null;
}

/** Итог героя в центах: забрал − вложил. */
export function heroNet(h: Hand): number {
  const p = h.players.find((x) => x.name === h.hero);
  return p ? p.collected - p.contributed : 0;
}

export function playerOf(h: Hand, name: string): HandPlayer | undefined {
  return h.players.find((p) => p.name === name);
}

export function heroPlayer(h: Hand): HandPlayer | undefined {
  return h.hero ? playerOf(h, h.hero) : undefined;
}

/** Действия одной улицы без постановки блайндов. */
export function streetActions(h: Hand, street: Street): HandAction[] {
  return h.actions.filter((a) => a.street === street && a.type !== "post");
}

/** Доллары из центов — только для показа. */
export function toDollars(cents: number): number {
  return cents / 100;
}

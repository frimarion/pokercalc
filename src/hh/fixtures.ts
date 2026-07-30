// Конструктор синтетических раздач для тестов.
//
// Разбирать в каждом тесте простыню текста истории — нечитаемо, а главное
// хрупко: тест про 3бет не должен падать из-за опечатки в строке рейка.
// Поэтому споты собираются декларативно, а сам текстовый формат проверяется
// отдельно в parse.test.ts на реальных выгрузках GG.

import { parseCards } from "../engine/cards";
import { Hand, HandAction, HandPlayer, Position, Street } from "./types";

const SEAT_OF: Record<Position, number> = { SB: 1, BB: 2, UTG: 3, MP: 4, CO: 5, BU: 6 };

export interface ActSpec {
  who: Position;
  type: HandAction["type"];
  /** Доложенные фишки в больших блайндах. */
  bb?: number;
  /** Суммарная ставка на улице в bb (для рейзов). */
  to?: number;
  allIn?: boolean;
}

export interface HandSpec {
  id?: string;
  /** Места за столом; порядок не важен, позиции задаются явно. */
  seats?: Position[];
  hero: Position;
  /** Карты героя, «AhKh». */
  cards?: string;
  /** Карты соперников, если они вскрылись. */
  shows?: Partial<Record<Position, string>>;
  /** Стек каждого игрока в bb. */
  stacks?: number;
  board?: string;
  /** Действия по улицам; блайнды проставляются сами. */
  preflop?: ActSpec[];
  flop?: ActSpec[];
  turn?: ActSpec[];
  river?: ActSpec[];
  /** Кто сколько забрал, в bb. Если не задано — банк забирает герой. */
  collected?: Partial<Record<Position, number>>;
  rake?: number;
}

const BB = 100; // 1bb = 100 «центов», чтобы спецификации читались в bb

/** Собирает Hand из декларативного описания спота. */
export function makeHand(spec: HandSpec): Hand {
  const seats = spec.seats ?? ["SB", "BB", "UTG", "MP", "CO", "BU"];
  const stack = (spec.stacks ?? 100) * BB;
  const players: HandPlayer[] = seats.map((position) => ({
    seat: SEAT_OF[position],
    name: position === spec.hero ? "Hero" : `v${position}`,
    stack,
    position,
    cards:
      position === spec.hero
        ? parseCards(spec.cards ?? "AhKh")
        : spec.shows?.[position]
          ? parseCards(spec.shows[position]!)
          : null,
    contributed: 0,
    collected: 0,
  }));
  const byPos = new Map(players.map((p) => [p.position, p]));
  const nameOf = (p: Position) => byPos.get(p)!.name;

  const actions: HandAction[] = [];
  const onStreet = new Map<string, number>();
  const put = (p: Position, amount: number) => {
    const pl = byPos.get(p)!;
    pl.contributed += amount;
    onStreet.set(pl.name, (onStreet.get(pl.name) ?? 0) + amount);
  };

  if (byPos.has("SB")) {
    actions.push({ street: "preflop", player: nameOf("SB"), type: "post", amount: BB / 2, allIn: false });
    put("SB", BB / 2);
  }
  if (byPos.has("BB")) {
    actions.push({ street: "preflop", player: nameOf("BB"), type: "post", amount: BB, allIn: false });
    put("BB", BB);
  }

  for (const street of ["preflop", "flop", "turn", "river"] as Street[]) {
    const list = spec[street];
    if (street !== "preflop") onStreet.clear();
    if (!list) continue;
    for (const a of list) {
      const name = nameOf(a.who);
      const to = a.to === undefined ? undefined : a.to * BB;
      const amount =
        a.type === "raise" && to !== undefined
          ? to - (onStreet.get(name) ?? 0)
          : (a.bb ?? 0) * BB;
      actions.push({ street, player: name, type: a.type, amount, to, allIn: a.allIn ?? false });
      put(a.who, amount);
    }
  }

  const board = spec.board ? parseCards(spec.board) : [];
  const pot = players.reduce((s, p) => s + p.contributed, 0);
  const rake = (spec.rake ?? 0) * BB;
  if (spec.collected) {
    for (const [pos, amount] of Object.entries(spec.collected)) {
      byPos.get(pos as Position)!.collected = (amount as number) * BB;
    }
  } else {
    byPos.get(spec.hero)!.collected = pot - rake;
  }

  return {
    id: spec.id ?? "TEST",
    table: "Test",
    maxSeats: 6,
    sb: BB / 2,
    bb: BB,
    time: 0,
    buttonSeat: SEAT_OF.BU,
    players,
    hero: "Hero",
    board,
    runs: board.length > 0 ? [board] : [],
    actions,
    pot,
    rake,
    positionsReliable: true,
  };
}

/** Фолды всех, кто ходит до героя на префлопе. */
export function foldsBefore(seats: Position[], hero: Position): ActSpec[] {
  const order: Position[] = ["UTG", "MP", "CO", "BU", "SB", "BB"];
  const upto = order.indexOf(hero);
  return order
    .slice(0, upto)
    .filter((p) => seats.includes(p))
    .map((who) => ({ who, type: "fold" as const }));
}

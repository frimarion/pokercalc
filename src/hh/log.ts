// Раздача в читаемом виде — для разбора отклонения от чарта.
//
// Суммы переводятся в БОЛЬШИЕ БЛАЙНДЫ, а не в доллары: чарты, сайзинги и
// границы диапазонов живут в bb, и «рейз до 2.5bb» сразу сопоставим с
// подписью чарта, тогда как «$0.12» требует деления в голове.
//
// Индексы действий сохраняются из `hand.actions` — по ним разбор подсвечивает
// именно то решение, к которому относится вердикт.

import { Card } from "../engine/cards";
import { Hand, HandAction, Position, Street, STREETS } from "./types";

export interface LogAction {
  /** Индекс в hand.actions — для подсветки конкретного решения. */
  index: number;
  position: Position;
  isHero: boolean;
  /** «рейз до 2.5bb», «колл 1.5bb», «фолд». */
  text: string;
  /** Постановка блайнда — не решение, показывается приглушённо. */
  isPost: boolean;
}

export interface LogStreet {
  street: Street;
  label: string;
  /** Борд, открытый к этой улице целиком (флоп — три карты, тёрн — четыре). */
  board: Card[];
  /** Банк на начало улицы, в bb. */
  potBefore: number;
  actions: LogAction[];
}

export interface LogResult {
  position: Position;
  isHero: boolean;
  cards: Card[] | null;
  /** Итог игрока за раздачу, в bb. */
  net: number;
  folded: boolean;
}

export interface HandLog {
  streets: LogStreet[];
  results: LogResult[];
  /** Банк, разошедшийся по игрокам (без рейка), в bb. */
  pot: number;
  rake: number;
  /** Сколько раз разыгрывался борд (run-it-twice). */
  runs: Card[][];
}

const STREET_LABELS: Record<Street, string> = {
  preflop: "Префлоп",
  flop: "Флоп",
  turn: "Тёрн",
  river: "Ривер",
};

/** Сколько карт борда открыто к началу улицы. */
const BOARD_AT: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };

/**
 * Порядок мест для итогов. Игроки хранятся по номерам мест за столом, но
 * читать итог рядом с логом удобнее в том же порядке, в каком идут ходы
 * постфлопа, — иначе SB может оказаться последним.
 */
const SEAT_ORDER: Position[] = ["SB", "BB", "UTG", "MP", "CO", "BU"];

function actionText(a: HandAction, bb: number): string {
  const amount = (n: number) => `${+(n / bb).toFixed(2)}bb`;
  const allIn = a.allIn ? " · олл-ин" : "";
  switch (a.type) {
    case "post":
      // Мёртвые деньги входящего игрока GG пишет тем же «posts», но по сумме
      // видно, что это не обычный блайнд.
      return `блайнд ${amount(a.amount)}`;
    case "fold":
      return "фолд";
    case "check":
      return "чек";
    case "call":
      return `колл ${amount(a.amount)}${allIn}`;
    case "bet":
      return `бет ${amount(a.amount)}${allIn}`;
    case "raise":
      return `рейз до ${amount(a.to ?? a.amount)}${allIn}`;
  }
}

/** Раздача, разложенная по улицам, с суммами в bb. */
export function handLog(h: Hand): HandLog {
  const posOf = new Map(h.players.map((p) => [p.name, p.position]));
  const folded = new Set(h.actions.filter((a) => a.type === "fold").map((a) => a.player));

  // Банк на начало каждой улицы: сумма всего вложенного до её первого хода.
  const potAt = new Map<Street, number>();
  let committed = 0;
  for (const a of h.actions) {
    if (!potAt.has(a.street)) potAt.set(a.street, committed);
    committed += a.amount;
  }

  const streets: LogStreet[] = [];
  for (const street of STREETS) {
    const actions = h.actions
      .map((a, index) => ({ a, index }))
      .filter(({ a }) => a.street === street);
    if (actions.length === 0) continue;
    streets.push({
      street,
      label: STREET_LABELS[street],
      board: h.board.slice(0, BOARD_AT[street]),
      potBefore: (potAt.get(street) ?? 0) / h.bb,
      actions: actions.map(({ a, index }) => ({
        index,
        position: posOf.get(a.player) ?? "BU",
        isHero: a.player === h.hero,
        text: actionText(a, h.bb),
        isPost: a.type === "post",
      })),
    });
  }

  return {
    streets,
    results: h.players
      .map((p) => ({
        position: p.position,
        isHero: p.name === h.hero,
        cards: p.cards,
        net: (p.collected - p.contributed) / h.bb,
        folded: folded.has(p.name),
      }))
      .sort((a, b) => SEAT_ORDER.indexOf(a.position) - SEAT_ORDER.indexOf(b.position)),
    pot: h.players.reduce((s, p) => s + p.collected, 0) / h.bb,
    rake: h.rake / h.bb,
    runs: h.runs,
  };
}

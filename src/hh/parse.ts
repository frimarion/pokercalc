// Парсер истории рук GGPoker (текстовый экспорт из клиента).
//
// Формат — диалект PokerStars: шапка, места, блайнды, «*** FLOP ***» и
// SUMMARY. Отличия GG, из-за которых нельзя взять чужой парсер как есть:
//
//   • ники анонимизированы (hex-строки), герой всегда «Hero»;
//   • строка SUMMARY несёт свои поля (Jackpot / Bingo / Fortune / Tax);
//   • run-it-twice размечен префиксами улиц: FIRST / SECOND / THIRD FLOP.
//     Заголовок такой улицы содержит ВЕСЬ борд этого раннинга в скобках,
//     поэтому борд собирается из самого заголовка, а не накоплением.
//
// Позиции берутся от места баттона, а не от порядка ходов: порядок ходов
// на префлопе и постфлопе разный, а баттон в шапке указан всегда.

import { Card, parseCard } from "../engine/cards";
import { Hand, HandAction, HandPlayer, Position, Street } from "./types";

/** «$5» → 500, «$0.02» → 2. Деньги живут в целых центах (см. types.ts). */
function cents(s: string): number {
  return Math.round(parseFloat(s.replace(/[$,]/g, "")) * 100);
}

function cardsIn(text: string): Card[] {
  const out: Card[] = [];
  for (const m of text.matchAll(/\[([^\]]*)\]/g)) {
    for (const tok of m[1].trim().split(/\s+/)) {
      if (tok) out.push(parseCard(tok));
    }
  }
  return out;
}

const HEADER =
  /^Poker Hand #(\S+?):\s+.*?\(\$?([\d.]+)\/\$?([\d.]+).*?\)\s+-\s+(\d{4})\/(\d{2})\/(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/;
const TABLE = /^Table '(.+?)'\s+(\d+)-max.*?Seat #(\d+) is the button/;
const SEAT = /^Seat (\d+): (.+?) \(\$?([\d.]+) in chips\)/;
const STREET_HEADER = /^\*\*\* (FIRST |SECOND |THIRD )?(FLOP|TURN|RIVER) \*\*\*(.*)$/;
const UNCALLED = /^Uncalled bet \(\$?([\d.]+)\) returned to (.+)$/;
const COLLECTED = /^(.+?) collected \$?([\d.]+) from/;
const SUMMARY_POT = /^Total pot \$?([\d.]+).*?\|\s*Rake \$?([\d.]+)/;

const RUN_INDEX: Record<string, number> = { "": 0, "FIRST ": 0, "SECOND ": 1, "THIRD ": 2 };

/**
 * Места по кругу от баттона. Ранние позиции именуются НАЗАД от баттона
 * (…UTG, MP, CO, BU), поэтому на неполном столе пропадает UTG, а не CO —
 * так же считают трекеры, и так чарты Green Charts остаются применимы.
 */
function assignPositions(seats: number[], buttonSeat: number): Map<number, Position> {
  const sorted = [...seats].sort((a, b) => a - b);
  const btn = sorted.indexOf(buttonSeat);
  const order = btn < 0 ? sorted : [...sorted.slice(btn + 1), ...sorted.slice(0, btn + 1)];
  const n = order.length;
  const out = new Map<number, Position>();

  if (n === 2) {
    // Хедз-ап: баттон и есть малый блайнд.
    out.set(order[1], "SB");
    out.set(order[0], "BB");
    return out;
  }
  out.set(order[0], "SB");
  out.set(order[1], "BB");
  out.set(order[n - 1], "BU");
  const middle: Position[] = ["CO", "MP", "UTG"];
  for (let i = n - 2, k = 0; i >= 2; i--, k++) {
    out.set(order[i], middle[Math.min(k, middle.length - 1)]);
  }
  return out;
}

interface Draft {
  players: Map<string, HandPlayer>;
  bySeat: Map<number, HandPlayer>;
  actions: HandAction[];
  /** Ставка каждого игрока на ТЕКУЩЕЙ улице — из неё считается «to» рейза. */
  street: Street;
  onStreet: Map<string, number>;
  postedSb: string | null;
  postedBb: string | null;
}

function commit(d: Draft, p: HandPlayer, amount: number): void {
  p.contributed += amount;
  d.onStreet.set(p.name, (d.onStreet.get(p.name) ?? 0) + amount);
}

/** Разбирает одну раздачу. null — если текст не похож на раздачу холдема. */
export function parseHand(text: string): Hand | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const head = HEADER.exec(lines[0]);
  if (!head) return null;
  const [, id, sb, bbAmount, y, mo, da, hh, mi, ss] = head;

  const d: Draft = {
    players: new Map(),
    bySeat: new Map(),
    actions: [],
    street: "preflop",
    onStreet: new Map(),
    postedSb: null,
    postedBb: null,
  };

  let table = "";
  let maxSeats = 6;
  let buttonSeat = 0;
  let hero: string | null = null;
  const runs: Card[][] = [];
  let pot = 0;
  let rake = 0;
  let inSummary = false;

  for (const line of lines.slice(1)) {
    if (line.startsWith("*** SUMMARY ***")) {
      inSummary = true;
      continue;
    }

    const tbl = TABLE.exec(line);
    if (tbl) {
      table = tbl[1];
      maxSeats = Number(tbl[2]);
      buttonSeat = Number(tbl[3]);
      continue;
    }

    // «Seat N: имя ($X in chips)» — только до SUMMARY: там строки мест
    // повторяются, но уже с итогами раздачи, а не со стеками.
    const seat = !inSummary && SEAT.exec(line);
    if (seat) {
      const p: HandPlayer = {
        seat: Number(seat[1]),
        name: seat[2],
        stack: cents(seat[3]),
        position: "BU", // перезапишется после чтения всех мест
        cards: null,
        contributed: 0,
        collected: 0,
      };
      d.players.set(p.name, p);
      d.bySeat.set(p.seat, p);
      continue;
    }

    const st = STREET_HEADER.exec(line);
    if (st) {
      d.street = st[2].toLowerCase() as Street;
      d.onStreet.clear();
      // Заголовок несёт весь борд раннинга целиком: «[7c Jh 7h] [6c]».
      runs[RUN_INDEX[st[1] ?? ""]] = cardsIn(st[3]);
      continue;
    }

    if (inSummary) {
      const sum = SUMMARY_POT.exec(line);
      if (sum) {
        pot = cents(sum[1]);
        rake = cents(sum[2]);
      }
      continue;
    }

    const unc = UNCALLED.exec(line);
    if (unc) {
      const p = d.players.get(unc[2]);
      if (p) p.contributed -= cents(unc[1]);
      continue;
    }

    const col = COLLECTED.exec(line);
    if (col) {
      const p = d.players.get(col[1]);
      if (p) p.collected += cents(col[2]);
      continue;
    }

    const colon = line.indexOf(": ");
    if (colon < 0) continue;
    const name = line.slice(0, colon);
    const rest = line.slice(colon + 2);
    const p = d.players.get(name);
    if (!p) continue;

    if (rest.startsWith("posts")) {
      const amount = cents(/\$([\d.]+)/.exec(rest)?.[1] ?? "0");
      // Пропущенный блайнд — мёртвые деньги входящего игрока, он не задаёт
      // позицию и не считается добровольным вложением.
      if (rest.includes("small blind")) d.postedSb = name;
      else if (rest.includes("big blind") && !rest.includes("missed")) d.postedBb = name;
      d.actions.push({ street: "preflop", player: name, type: "post", amount, allIn: false });
      commit(d, p, amount);
      continue;
    }

    if (rest.startsWith("shows") || rest.startsWith("mucks")) {
      const c = cardsIn(rest);
      if (c.length === 2) p.cards = c;
      continue;
    }

    const allIn = rest.includes("all-in");
    const push = (type: HandAction["type"], amount: number, to?: number) => {
      d.actions.push({ street: d.street, player: name, type, amount, allIn, to });
      commit(d, p, amount);
    };

    if (rest.startsWith("folds")) push("fold", 0);
    else if (rest.startsWith("checks")) push("check", 0);
    else if (rest.startsWith("calls")) push("call", cents(/\$([\d.]+)/.exec(rest)![1]));
    else if (rest.startsWith("bets")) {
      const amount = cents(/\$([\d.]+)/.exec(rest)![1]);
      push("bet", amount, (d.onStreet.get(name) ?? 0) + amount);
    } else if (rest.startsWith("raises")) {
      // «raises $0.68 to $1.16»: первое число — надбавка над ставкой соперника,
      // а не доложенные фишки. Реально игрок кладёт «to» минус то, что у него
      // уже стоит на этой улице (блайнд, свой предыдущий рейз).
      const to = cents(/\$[\d.]+ to \$([\d.]+)/.exec(rest)![1]);
      push("raise", to - (d.onStreet.get(name) ?? 0), to);
    }
  }

  if (d.players.size === 0) return null;

  const positions = assignPositions([...d.bySeat.keys()], buttonSeat);
  for (const p of d.players.values()) p.position = positions.get(p.seat) ?? "BU";

  // Герой — тот, чьи карты видны с самого начала («Dealt to Hero [..]»).
  // Разбор ведётся только по нему, поэтому важно не спутать его со
  // вскрывшимся на шоудауне: карты из «shows» приходят позже по тексту.
  const dealt = /^Dealt to (.+?) \[([^\]]+)\]/m;
  for (const line of lines) {
    const m = dealt.exec(line);
    if (m && d.players.has(m[1])) {
      hero = m[1];
      d.players.get(m[1])!.cards = cardsIn(line);
      break;
    }
  }

  const seatsWithPos = [...d.bySeat.values()];
  const sbSeat = seatsWithPos.find((p) => p.position === "SB");
  const bbSeat = seatsWithPos.find((p) => p.position === "BB");
  const positionsReliable =
    d.postedSb !== null &&
    d.postedBb !== null &&
    sbSeat?.name === d.postedSb &&
    bbSeat?.name === d.postedBb;

  return {
    id,
    table,
    maxSeats,
    sb: cents(sb),
    bb: cents(bbAmount),
    time: new Date(
      Number(y), Number(mo) - 1, Number(da), Number(hh), Number(mi), Number(ss),
    ).getTime(),
    buttonSeat,
    players: [...d.players.values()].sort((a, b) => a.seat - b.seat),
    hero,
    board: runs[0] ?? [],
    runs: runs.filter(Boolean),
    actions: d.actions,
    pot,
    rake,
    positionsReliable,
  };
}

/** Разбирает файл целиком. Битые раздачи пропускаются молча. */
export function parseHandHistory(text: string): Hand[] {
  const out: Hand[] = [];
  const chunks = text.split(/(?=^Poker Hand #)/m);
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    try {
      const h = parseHand(chunk);
      if (h) out.push(h);
    } catch {
      // Одна нечитаемая раздача не должна ронять импорт всего файла.
    }
  }
  return out;
}

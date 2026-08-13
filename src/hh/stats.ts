// HUD-статистика героя по разобранным раздачам.
//
// Каждый показатель — пара «сколько раз сделал / сколько раз была возможность».
// Возможность считается честно: 3бет не делится на все раздачи, а только на те,
// где перед героем был ровно один рейз; c-bet — только когда герой был
// последним префлоп-агрессором и до него на флопе никто не поставил. Иначе
// цифры не сравнимы с трекерами.

import { Hand, HandAction, Position, POSITIONS, heroPlayer, streetActions } from "./types";

export interface Counter {
  made: number;
  opp: number;
}

export type StatKey =
  | "vpip"
  | "pfr"
  | "threeBet"
  | "foldTo3Bet"
  | "fourBet"
  | "steal"
  | "foldToSteal"
  | "cbetFlop"
  | "foldToCbetFlop"
  | "wwsf"
  | "wtsd"
  | "wsd";

export const STAT_LABELS: Record<StatKey, { short: string; full: string }> = {
  vpip: { short: "VPIP", full: "Добровольно вложил деньги на префлопе" },
  pfr: { short: "PFR", full: "Рейз на префлопе" },
  threeBet: { short: "3Bet", full: "3бет, когда перед вами был ровно один рейз" },
  foldTo3Bet: { short: "Fold to 3Bet", full: "Фолд на 3бет после своего опена" },
  fourBet: { short: "4Bet", full: "4бет после своего опена" },
  steal: { short: "Steal", full: "Стил-опен с CO / BU / SB, когда все сфолдили" },
  foldToSteal: { short: "Fold to Steal", full: "Фолд с блайнда против стил-опена" },
  cbetFlop: { short: "C-Bet Flop", full: "Ставка на флопе последним агрессором префлопа" },
  foldToCbetFlop: { short: "Fold to C-Bet", full: "Фолд на c-bet флопа" },
  wwsf: { short: "WWSF", full: "Выиграл банк, увидев флоп" },
  wtsd: { short: "WTSD", full: "Дошёл до шоудауна, увидев флоп" },
  wsd: { short: "W$SD", full: "Выиграл на шоудауне" },
};

export const STAT_ORDER: StatKey[] = [
  "vpip", "pfr", "threeBet", "foldTo3Bet", "fourBet", "steal", "foldToSteal",
  "cbetFlop", "foldToCbetFlop", "wwsf", "wtsd", "wsd",
];

export interface Stats {
  hands: number;
  /** Итог героя в центах. */
  net: number;
  /** Выигрыш в больших блайндах на 100 раздач. */
  bbPer100: number;
  counters: Record<StatKey, Counter>;
  /** Постфлоп-агрессия: (ставки + рейзы) / коллы. */
  af: number;
  aggressive: number;
  passive: number;
}

export function pct(c: Counter): number | null {
  return c.opp === 0 ? null : (c.made / c.opp) * 100;
}

function emptyCounters(): Record<StatKey, Counter> {
  return Object.fromEntries(STAT_ORDER.map((k) => [k, { made: 0, opp: 0 }])) as Record<
    StatKey,
    Counter
  >;
}

/** Разбор префлопа с точки зрения героя. */
interface Preflop {
  actions: HandAction[];
  hero: HandAction[];
  /** Индекс первого действия героя. -1, если он не действовал. */
  first: number;
  /** Сколько рейзов было ДО первого действия героя. */
  raisesBefore: number;
  /** Кто-то добровольно вложил деньги до героя (лимп или рейз). */
  actionBefore: boolean;
  /** Место первого рейзера в раздаче. */
  openerPos: Position | null;
}

export function preflopView(h: Hand): Preflop {
  const actions = streetActions(h, "preflop");
  const first = actions.findIndex((a) => a.player === h.hero);
  const before = first < 0 ? actions : actions.slice(0, first);
  const opener = actions.find((a) => a.type === "raise");
  return {
    actions,
    hero: actions.filter((a) => a.player === h.hero),
    first,
    raisesBefore: before.filter((a) => a.type === "raise").length,
    actionBefore: before.some((a) => a.type === "raise" || a.type === "call"),
    openerPos: opener ? h.players.find((p) => p.name === opener.player)?.position ?? null : null,
  };
}

/** Кто в этой раздаче сфолдил. */
function foldedSet(h: Hand): Set<string> {
  const out = new Set<string>();
  for (const a of h.actions) if (a.type === "fold") out.add(a.player);
  return out;
}

/** Последний, кто рейзил на префлопе — агрессор, от которого ждут c-bet. */
function preflopAggressor(h: Hand): string | null {
  let last: string | null = null;
  for (const a of streetActions(h, "preflop")) if (a.type === "raise") last = a.player;
  return last;
}

const STEAL_SEATS: Position[] = ["CO", "BU", "SB"];

/** Учесть одну раздачу в счётчиках. Возвращает позицию героя. */
function tally(h: Hand, c: Record<StatKey, Counter>, agg: { a: number; p: number }): void {
  const hero = heroPlayer(h);
  if (!hero) return;
  const pre = preflopView(h);
  const bump = (k: StatKey, made: boolean) => {
    c[k].opp++;
    if (made) c[k].made++;
  };

  // ── префлоп ──
  const voluntary = pre.hero.some((a) => a.type === "call" || a.type === "raise");
  bump("vpip", voluntary);
  bump("pfr", pre.hero.some((a) => a.type === "raise"));

  if (pre.first >= 0 && pre.raisesBefore === 1) {
    bump("threeBet", pre.actions[pre.first].type === "raise");
  }

  // Стил — только опен первым в игру с трёх последних мест.
  if (STEAL_SEATS.includes(hero.position) && pre.first >= 0 && !pre.actionBefore) {
    bump("steal", pre.actions[pre.first].type === "raise");
  }
  // Защита блайндов против стила: рейз первым в игру именно со стил-места.
  if (
    (hero.position === "SB" || hero.position === "BB") &&
    pre.first >= 0 &&
    pre.raisesBefore === 1 &&
    pre.openerPos !== null &&
    STEAL_SEATS.includes(pre.openerPos) &&
    pre.actions.slice(0, pre.first).filter((a) => a.type === "call").length === 0
  ) {
    bump("foldToSteal", pre.actions[pre.first].type === "fold");
  }

  // Ответ на 3бет: герой открыл, его переставили, и он снова получил ход.
  const openIdx = pre.actions.findIndex((a) => a.player === h.hero && a.type === "raise");
  if (openIdx >= 0 && pre.actions.slice(0, openIdx).every((a) => a.type !== "raise")) {
    const threeBet = pre.actions.findIndex((a, i) => i > openIdx && a.type === "raise");
    if (threeBet >= 0) {
      const answer = pre.actions.find((a, i) => i > threeBet && a.player === h.hero);
      if (answer) {
        bump("foldTo3Bet", answer.type === "fold");
        bump("fourBet", answer.type === "raise");
      }
    }
  }

  // ── постфлоп ──
  const folded = foldedSet(h);
  const heroFoldedPre = pre.hero.some((a) => a.type === "fold");
  const sawFlop = h.board.length >= 3 && !heroFoldedPre;
  if (!sawFlop) return;

  const won = hero.collected > 0;
  bump("wwsf", won);

  const showdown = !folded.has(hero.name) && h.players.filter((p) => !folded.has(p.name)).length >= 2;
  bump("wtsd", showdown);
  if (showdown) bump("wsd", won);

  const flop = streetActions(h, "flop");
  const pfa = preflopAggressor(h);
  const heroFlopIdx = flop.findIndex((a) => a.player === hero.name);
  if (heroFlopIdx >= 0) {
    const betBefore = flop.slice(0, heroFlopIdx).some((a) => a.type === "bet" || a.type === "raise");
    if (pfa === hero.name && !betBefore) {
      bump("cbetFlop", flop[heroFlopIdx].type === "bet");
    }
    if (pfa !== null && pfa !== hero.name) {
      const cbet = flop.findIndex((a) => a.player === pfa && a.type === "bet");
      if (cbet >= 0 && cbet < flop.length) {
        const answer = flop.find((a, i) => i > cbet && a.player === hero.name);
        if (answer) bump("foldToCbetFlop", answer.type === "fold");
      }
    }
  }

  for (const a of h.actions) {
    if (a.player !== hero.name || a.street === "preflop") continue;
    if (a.type === "bet" || a.type === "raise") agg.a++;
    else if (a.type === "call") agg.p++;
  }
}

function finish(
  hands: Hand[],
  counters: Record<StatKey, Counter>,
  agg: { a: number; p: number },
  net: number,
  netBb: number,
): Stats {
  return {
    hands: hands.length,
    net,
    bbPer100: hands.length === 0 ? 0 : (netBb / hands.length) * 100,
    counters,
    af: agg.p === 0 ? (agg.a > 0 ? Infinity : 0) : agg.a / agg.p,
    aggressive: agg.a,
    passive: agg.p,
  };
}

export function computeStats(hands: Hand[]): Stats {
  const counters = emptyCounters();
  const agg = { a: 0, p: 0 };
  let net = 0;
  let netBb = 0;
  for (const h of hands) {
    const hero = heroPlayer(h);
    if (!hero) continue;
    const handNet = hero.collected - hero.contributed;
    net += handNet;
    netBb += handNet / h.bb;
    tally(h, counters, agg);
  }
  return finish(hands.filter((h) => h.hero), counters, agg, net, netBb);
}

export interface PositionStats {
  position: Position;
  stats: Stats;
}

/** Те же статы в разбивке по местам за столом. */
export function statsByPosition(hands: Hand[]): PositionStats[] {
  const groups = new Map<Position, Hand[]>();
  for (const h of hands) {
    const hero = heroPlayer(h);
    // Позиция ненадёжна на входе в игру с пропущенным блайндом — такие
    // раздачи в разбивку не идут, иначе они смажут UTG и BB.
    if (!hero || !h.positionsReliable) continue;
    const list = groups.get(hero.position) ?? [];
    list.push(h);
    groups.set(hero.position, list);
  }
  return POSITIONS.filter((p) => groups.has(p)).map((position) => ({
    position,
    stats: computeStats(groups.get(position)!),
  }));
}

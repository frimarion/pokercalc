import { describe, it, expect } from "vitest";
import { parseHand, parseHandHistory } from "./parse";
import { heroNet } from "./types";
import { formatCard } from "../engine/cards";

const show = (cards: number[]) => cards.map(formatCard).join(" ");

// Обычная раздача: 4 игрока, герой на BB, дошли до ривера.
const SIMPLE = `Poker Hand #HD2971859807: Hold'em No Limit ($0.02/$0.05) - 2026/07/28 04:41:46
Table 'NLHYellow7' 6-max Seat #5 is the button
Seat 1: 4aa1a465 ($5 in chips)
Seat 2: Hero ($5.09 in chips)
Seat 4: 1601422c ($6.45 in chips)
Seat 5: a348844c ($5.3 in chips)
4aa1a465: posts small blind $0.02
Hero: posts big blind $0.05
*** HOLE CARDS ***
Dealt to 4aa1a465
Dealt to Hero [3d Kd]
Dealt to 1601422c
Dealt to a348844c
1601422c: raises $0.05 to $0.1
a348844c: folds
4aa1a465: folds
Hero: calls $0.05
*** FLOP *** [5d Jh 4h]
Hero: checks
1601422c: bets $0.08
Hero: calls $0.08
*** TURN *** [5d Jh 4h] [Jc]
Hero: checks
1601422c: checks
*** RIVER *** [5d Jh 4h Jc] [2c]
Hero: checks
1601422c: checks
Hero: shows [3d Kd] (a pair of Jacks)
1601422c: shows [Qs Ac] (a pair of Jacks)
*** SHOWDOWN ***
1601422c collected $0.37 from pot
*** SUMMARY ***
Total pot $0.38 | Rake $0.01 | Jackpot $0 | Bingo $0 | Fortune $0 | Tax $0
Board [5d Jh 4h Jc 2c]
Seat 1: 4aa1a465 (small blind) folded before Flop
Seat 2: Hero (big blind) showed [3d Kd] and lost with a pair of Jacks
Seat 4: 1601422c showed [Qs Ac] and won ($0.37) with a pair of Jacks
Seat 5: a348844c (button) folded before Flop (didn't bet)`;

// Олл-ин префлоп с возвратом некольнутой ставки: 6 игроков, герой вскрылся.
const ALLIN = `Poker Hand #HD2971335995: Hold'em No Limit ($0.02/$0.05) - 2026/07/27 19:57:55
Table 'NLHYellow63' 6-max Seat #6 is the button
Seat 1: 678ed1c8 ($1.35 in chips)
Seat 2: 6395182d ($6.86 in chips)
Seat 3: Hero ($5.62 in chips)
Seat 4: 8842dad3 ($4.83 in chips)
Seat 5: 30cfd15 ($5 in chips)
Seat 6: f226fe17 ($9.85 in chips)
678ed1c8: posts small blind $0.02
6395182d: posts big blind $0.05
*** HOLE CARDS ***
Dealt to Hero [Qh Qs]
Hero: raises $0.1 to $0.15
8842dad3: folds
30cfd15: folds
f226fe17: folds
678ed1c8: raises $0.27 to $0.42
6395182d: folds
Hero: raises $2.88 to $3.3
678ed1c8: calls $0.93 and is all-in
Uncalled bet ($1.95) returned to Hero
Hero: shows [Qh Qs]
678ed1c8: shows [Kd Qc]
*** FLOP *** [5h 9h Ac]
*** TURN *** [5h 9h Ac] [7d]
*** RIVER *** [5h 9h Ac 7d] [7c]
*** SHOWDOWN ***
Hero collected $2.57 from pot
*** SUMMARY ***
Total pot $2.75 | Rake $0.13 | Jackpot $0.05 | Bingo $0 | Fortune $0 | Tax $0
Board [5h 9h Ac 7d 7c]
Seat 1: 678ed1c8 (small blind) showed [Kd Qc] and lost with a pair of Sevens
Seat 3: Hero showed [Qh Qs] and won ($2.57) with two pair, Queens and Sevens
Seat 6: f226fe17 (button) folded before Flop (didn't bet)`;

// Run it twice: борд каждого раннинга целиком лежит в заголовке улицы.
const RIT = `Poker Hand #HD2971583577: Hold'em No Limit ($0.02/$0.05) - 2026/07/28 00:27:47
Table 'NLHYellow33' 6-max Seat #6 is the button
Seat 1: Hero ($5.04 in chips)
Seat 2: 17befc22 ($5.69 in chips)
Seat 3: 5fd6ba7c ($5.12 in chips)
Seat 4: ff7b5fe5 ($7.53 in chips)
Seat 6: ec369a24 ($5 in chips)
Hero: posts small blind $0.02
17befc22: posts big blind $0.05
*** HOLE CARDS ***
Dealt to Hero [Qc Qs]
5fd6ba7c: folds
ff7b5fe5: raises $0.1 to $0.15
ec369a24: raises $0.33 to $0.48
Hero: raises $0.68 to $1.16
17befc22: folds
ff7b5fe5: raises $0.73 to $1.89
ec369a24: folds
Hero: raises $3.15 to $5.04 and is all-in
ff7b5fe5: calls $3.15
Hero: shows [Qc Qs]
ff7b5fe5: shows [Ad As]
*** FIRST FLOP *** [7c Jh 7h]
*** FIRST TURN *** [7c Jh 7h] [6c]
*** FIRST RIVER *** [7c Jh 7h 6c] [Ah]
*** SECOND FLOP *** [Kd 7s 4s]
*** SECOND TURN *** [Kd 7s 4s] [3h]
*** SECOND RIVER *** [Kd 7s 4s 3h] [9d]
*** FIRST SHOWDOWN ***
ff7b5fe5 collected $5.03 from pot
*** SECOND SHOWDOWN ***
ff7b5fe5 collected $5.03 from pot
*** SUMMARY ***
Total pot $10.61 | Rake $0.5 | Jackpot $0.05 | Bingo $0 | Fortune $0 | Tax $0
Hand was run two times
FIRST Board [7c Jh 7h 6c Ah]
SECOND Board [Kd 7s 4s 3h 9d]
Seat 1: Hero (small blind) showed [Qc Qs] and lost with two pair, Queens and Sevens
Seat 4: ff7b5fe5 showed [Ad As] and won ($5.03) with a full house, Aces full of Sevens`;

describe("parseHand", () => {
  it("читает шапку, места и стеки", () => {
    const h = parseHand(SIMPLE)!;
    expect(h.id).toBe("HD2971859807");
    expect(h.table).toBe("NLHYellow7");
    expect(h.maxSeats).toBe(6);
    expect(h.sb).toBe(2);
    expect(h.bb).toBe(5);
    expect(h.buttonSeat).toBe(5);
    expect(h.hero).toBe("Hero");
    expect(h.players.map((p) => p.stack)).toEqual([500, 509, 645, 530]);
  });

  it("выводит позиции от баттона, а не от порядка ходов", () => {
    const h = parseHand(SIMPLE)!;
    const pos = Object.fromEntries(h.players.map((p) => [p.name, p.position]));
    // Места 1,2,4,5; баттон — 5. По кругу от него: 1=SB, 2=BB, 4=CO, 5=BU.
    expect(pos).toEqual({ "4aa1a465": "SB", Hero: "BB", "1601422c": "CO", a348844c: "BU" });
    expect(h.positionsReliable).toBe(true);
  });

  it("на 6-max столе полный набор позиций", () => {
    const h = parseHand(ALLIN)!;
    expect(h.players.map((p) => p.position)).toEqual(["SB", "BB", "UTG", "MP", "CO", "BU"]);
  });

  it("раскладывает действия по улицам", () => {
    const h = parseHand(SIMPLE)!;
    const pre = h.actions.filter((a) => a.street === "preflop" && a.type !== "post");
    expect(pre.map((a) => `${a.player} ${a.type}`)).toEqual([
      "1601422c raise", "a348844c fold", "4aa1a465 fold", "Hero call",
    ]);
    expect(pre[0].to).toBe(10); // «raises $0.05 to $0.1»
    expect(pre[0].amount).toBe(10); // доложено фишек, а не надбавка над ставкой
    const flop = h.actions.filter((a) => a.street === "flop");
    expect(flop.map((a) => a.type)).toEqual(["check", "bet", "call"]);
    expect(flop[1].to).toBe(8);
  });

  it("собирает борд по улицам", () => {
    const h = parseHand(SIMPLE)!;
    expect(show(h.board)).toBe("5d Jh 4h Jc 2c");
    expect(h.runs).toHaveLength(1);
  });

  it("вычитает возвращённую некольнутую ставку из вложенного", () => {
    const h = parseHand(ALLIN)!;
    const hero = h.players.find((p) => p.name === "Hero")!;
    // Дошёл до $3.30, но $1.95 вернули: реально в банке $1.35.
    expect(hero.contributed).toBe(135);
    expect(hero.collected).toBe(257);
    expect(heroNet(h)).toBe(122);
    expect(h.pot).toBe(275);
    expect(h.rake).toBe(13);
  });

  it("помечает олл-ин", () => {
    const h = parseHand(ALLIN)!;
    const call = h.actions.find((a) => a.player === "678ed1c8" && a.type === "call")!;
    expect(call.allIn).toBe(true);
    expect(h.actions.find((a) => a.player === "Hero" && a.type === "raise")!.allIn).toBe(false);
  });

  it("читает карты вскрывшихся соперников", () => {
    const h = parseHand(ALLIN)!;
    expect(show(h.players.find((p) => p.name === "678ed1c8")!.cards!)).toBe("Kd Qc");
    expect(show(h.players.find((p) => p.name === "Hero")!.cards!)).toBe("Qh Qs");
    // Кто не вскрывался — карты неизвестны.
    expect(h.players.find((p) => p.name === "f226fe17")!.cards).toBeNull();
  });

  it("run it twice: оба борда, банк сходится по забранному", () => {
    const h = parseHand(RIT)!;
    expect(h.runs).toHaveLength(2);
    expect(show(h.runs[0])).toBe("7c Jh 7h 6c Ah");
    expect(show(h.runs[1])).toBe("Kd 7s 4s 3h 9d");
    // Герой отдал весь стек; забранное соперником просуммировано по раннингам.
    expect(heroNet(h)).toBe(-504);
    expect(h.players.find((p) => p.name === "ff7b5fe5")!.collected).toBe(1006);
  });

  it("сумма всех итогов равна рейку со знаком минус", () => {
    for (const text of [SIMPLE, ALLIN, RIT]) {
      const h = parseHand(text)!;
      const net = h.players.reduce((s, p) => s + p.collected - p.contributed, 0);
      // Джекпот-взнос GG показывает отдельно от рейка — сходимся с точностью до него.
      expect(-net).toBeGreaterThanOrEqual(h.rake);
    }
  });
});

describe("parseHandHistory", () => {
  it("режет файл на раздачи", () => {
    const hands = parseHandHistory([SIMPLE, ALLIN, RIT].join("\n\n\n"));
    expect(hands.map((h) => h.id)).toEqual([
      "HD2971859807", "HD2971335995", "HD2971583577",
    ]);
  });

  it("мусор вместо раздачи не роняет импорт", () => {
    expect(parseHandHistory("это не история рук")).toEqual([]);
    expect(parseHandHistory(`${SIMPLE}\n\n\nPoker Hand #X1: обрезано`)).toHaveLength(1);
  });
});

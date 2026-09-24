import { describe, it, expect } from "vitest";
import { applyFilter, EMPTY_FILTER, HandFilter, playerVpips } from "./filters";
import { makeHand, foldsBefore } from "./fixtures";
import { Hand } from "./types";

const ALL: Parameters<typeof foldsBefore>[0] = ["SB", "BB", "UTG", "MP", "CO", "BU"];

/** Раздача, в которой соперник с заданным ником колирует (или сдаёт) на BU. */
function hand(id: string, fish: string, fishPlays: boolean, time = 0, bb = 100): Hand {
  const h = makeHand({
    id,
    hero: "BB",
    preflop: [
      ...foldsBefore(ALL, "BU"),
      fishPlays ? { who: "BU", type: "call", bb: 1 } : { who: "BU", type: "fold" },
      { who: "SB", type: "fold" },
      { who: "BB", type: "check" },
    ],
  });
  const renamed = h.players.map((p) => (p.position === "BU" ? { ...p, name: fish } : p));
  const actions = h.actions.map((a) => (a.player === "vBU" ? { ...a, player: fish } : a));
  return { ...h, players: renamed, actions, time, bb };
}

const f = (patch: Partial<HandFilter>): HandFilter => ({ ...EMPTY_FILTER, minHands: 1, ...patch });

describe("фильтры базы", () => {
  // «fish» играет 3 из 4 раздач (75%), «reg» — 1 из 4 (25%).
  const hands = [
    ...[true, true, true, false].map((p, i) => hand(`f${i}`, "fish", p, i * 1000, 5)),
    ...[true, false, false, false].map((p, i) => hand(`r${i}`, "reg", p, 10_000 + i * 1000, 10)),
  ];
  const vpips = playerVpips(hands);

  it("VPIP соперника набирается по всем раздачам", () => {
    expect(vpips.get("fish")).toEqual({ hands: 4, vpip: 75 });
    expect(vpips.get("reg")).toEqual({ hands: 4, vpip: 25 });
    // Герой только чекал на BB — это не добровольное вложение.
    expect(vpips.get("Hero")!.vpip).toBe(0);
  });

  it("пустой фильтр ничего не отсекает", () => {
    expect(applyFilter(hands, EMPTY_FILTER, vpips)).toBe(hands);
  });

  it("есть / нет игрока с VPIP выше порога", () => {
    expect(applyFilter(hands, f({ fish: 60 }), vpips).map((h) => h.id)).toEqual(["f0", "f1", "f2", "f3"]);
    expect(applyFilter(hands, f({ fish: 60, fishMode: "without" }), vpips).map((h) => h.id)).toEqual([
      "r0", "r1", "r2", "r3",
    ]);
  });

  it("игрок с малой выборкой фишем не считается", () => {
    expect(applyFilter(hands, f({ fish: 40, minHands: 5 }), vpips)).toHaveLength(0);
  });

  it("период: from включительно, to — нет", () => {
    expect(applyFilter(hands, f({ from: 1000, to: 3000 }), vpips).map((h) => h.id)).toEqual(["f1", "f2"]);
  });

  it("лимиты", () => {
    expect(applyFilter(hands, f({ limits: [10] }), vpips).every((h) => h.bb === 10)).toBe(true);
    expect(applyFilter(hands, f({ limits: [5, 10] }), vpips)).toHaveLength(8);
  });
});

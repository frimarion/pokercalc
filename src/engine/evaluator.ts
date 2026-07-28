// 7-карточный эвалуатор: лучшая 5 из 7.
//
// evaluate() возвращает целое — чем больше, тем сильнее рука. Значения можно
// напрямую сравнивать (>, <, ===) для определения победителя.
//
// Кодировка: value = категория * 16^5 + до 5 тайбрейкеров (ранги 0..12).
// Категории: 8 стрит-флеш, 7 каре, 6 фулхаус, 5 флеш, 4 стрит,
//            3 сет/трипс, 2 две пары, 1 пара, 0 старшая карта.

import { Card, cardRank, cardSuit } from "./cards";

export const HAND_CATEGORIES = [
  "High Card",
  "Pair",
  "Two Pair",
  "Trips",
  "Straight",
  "Flush",
  "Full House",
  "Quads",
  "Straight Flush",
] as const;

export type HandCategoryName = (typeof HAND_CATEGORIES)[number];

const CAT_UNIT = 16 ** 5; // 1_048_576

/** Категория (0..8) из значения evaluate(). */
export function categoryOf(value: number): number {
  return Math.floor(value / CAT_UNIT);
}

function pack(cat: number, a = 0, b = 0, c = 0, d = 0, e = 0): number {
  return ((((cat * 16 + a) * 16 + b) * 16 + c) * 16 + d) * 16 + e;
}

/** Старший бит стрита в маске рангов (учитывая колесо A2345). -1 если нет. */
export function straightHigh(mask: number): number {
  for (let hi = 12; hi >= 4; hi--) {
    const need =
      (1 << hi) | (1 << (hi - 1)) | (1 << (hi - 2)) | (1 << (hi - 3)) | (1 << (hi - 4));
    if ((mask & need) === need) return hi;
  }
  // Колесо: A(12) 5(3) 4(2) 3(1) 2(0) — старшая карта стрита это 5 (rankIndex 3).
  const wheel = (1 << 12) | (1 << 3) | (1 << 2) | (1 << 1) | (1 << 0);
  if ((mask & wheel) === wheel) return 3;
  return -1;
}

/** Топ-N рангов из маски (по убыванию), исключая заданные ранги. */
function topRanks(mask: number, count: number, exclude?: number[]): number[] {
  const out: number[] = [];
  for (let r = 12; r >= 0 && out.length < count; r--) {
    if (exclude && exclude.includes(r)) continue;
    if (mask & (1 << r)) out.push(r);
  }
  while (out.length < count) out.push(0);
  return out;
}

/**
 * Оценить руку из 5–7 карт. Возвращает сравнимое целое (больше = сильнее).
 */
export function evaluate(cards: Card[]): number {
  const rankCount = new Int8Array(13);
  const suitCount = new Int8Array(4);
  const suitRankMask = [0, 0, 0, 0];
  let rankMask = 0;

  for (const c of cards) {
    const r = cardRank(c);
    const s = cardSuit(c);
    rankCount[r]++;
    suitCount[s]++;
    suitRankMask[s] |= 1 << r;
    rankMask |= 1 << r;
  }

  // Флеш-масть (в 7 картах максимум одна масть может дать >=5).
  let flushSuit = -1;
  for (let s = 0; s < 4; s++) {
    if (suitCount[s] >= 5) {
      flushSuit = s;
      break;
    }
  }

  // Стрит-флеш.
  if (flushSuit >= 0) {
    const sh = straightHigh(suitRankMask[flushSuit]);
    if (sh >= 0) return pack(8, sh);
  }

  // Ранги, сгруппированные по количеству (byCount[c] — ранги с count==c, убыв.).
  const byCount: number[][] = [[], [], [], [], []];
  for (let r = 12; r >= 0; r--) {
    const c = rankCount[r];
    if (c > 0) byCount[c].push(r);
  }

  // Каре.
  if (byCount[4].length) {
    const quad = byCount[4][0];
    const kicker = topRanks(rankMask, 1, [quad])[0];
    return pack(7, quad, kicker);
  }

  // Фулхаус (трипс + пара; вторым трипсом может закрыться пара).
  if (byCount[3].length) {
    const trip = byCount[3][0];
    const pairCandidates: number[] = [];
    if (byCount[3].length >= 2) pairCandidates.push(byCount[3][1]);
    if (byCount[2].length) pairCandidates.push(byCount[2][0]);
    if (pairCandidates.length) {
      return pack(6, trip, Math.max(...pairCandidates));
    }
  }

  // Флеш.
  if (flushSuit >= 0) {
    const top5 = topRanks(suitRankMask[flushSuit], 5);
    return pack(5, top5[0], top5[1], top5[2], top5[3], top5[4]);
  }

  // Стрит.
  const sh = straightHigh(rankMask);
  if (sh >= 0) return pack(4, sh);

  // Трипс.
  if (byCount[3].length) {
    const trip = byCount[3][0];
    const k = topRanks(rankMask, 2, [trip]);
    return pack(3, trip, k[0], k[1]);
  }

  // Две пары.
  if (byCount[2].length >= 2) {
    const p1 = byCount[2][0];
    const p2 = byCount[2][1];
    const kicker = topRanks(rankMask, 1, [p1, p2])[0];
    return pack(2, p1, p2, kicker);
  }

  // Пара.
  if (byCount[2].length === 1) {
    const p = byCount[2][0];
    const k = topRanks(rankMask, 3, [p]);
    return pack(1, p, k[0], k[1], k[2]);
  }

  // Старшая карта.
  const top5 = topRanks(rankMask, 5);
  return pack(0, top5[0], top5[1], top5[2], top5[3], top5[4]);
}

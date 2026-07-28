// Модель карт. Карта — целое 0..51 для скорости перебора эквити.
//   cardId = rankIndex * 4 + suitIndex
//   rankIndex: 0..12  (2,3,4,5,6,7,8,9,T,J,Q,K,A)
//   suitIndex: 0..3   (c,d,h,s)

export type Card = number; // 0..51
export type RankIndex = number; // 0..12
export type SuitIndex = number; // 0..3

export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;
export const SUITS = ["c", "d", "h", "s"] as const;

/** Символы мастей для UI. */
export const SUIT_SYMBOLS = ["♣", "♦", "♥", "♠"] as const;

export const NUM_CARDS = 52;

export function makeCard(rank: RankIndex, suit: SuitIndex): Card {
  return rank * 4 + suit;
}

export function cardRank(card: Card): RankIndex {
  return (card / 4) | 0;
}

export function cardSuit(card: Card): SuitIndex {
  return card % 4;
}

const RANK_LOOKUP: Record<string, RankIndex> = Object.fromEntries(
  RANKS.map((r, i) => [r, i]),
);
const SUIT_LOOKUP: Record<string, SuitIndex> = Object.fromEntries(
  SUITS.map((s, i) => [s, i]),
);

/** Парсит "Ah", "td", "2C" → Card. Кидает при некорректном вводе. */
export function parseCard(str: string): Card {
  if (str.length !== 2) throw new Error(`Bad card: "${str}"`);
  const r = str[0].toUpperCase();
  const s = str[1].toLowerCase();
  const rank = RANK_LOOKUP[r];
  const suit = SUIT_LOOKUP[s];
  if (rank === undefined || suit === undefined) throw new Error(`Bad card: "${str}"`);
  return makeCard(rank, suit);
}

/** Парсит "AhKsQd" (пары символов) → Card[]. */
export function parseCards(str: string): Card[] {
  const clean = str.replace(/[\s,]/g, "");
  if (clean.length % 2 !== 0) throw new Error(`Bad card string: "${str}"`);
  const out: Card[] = [];
  for (let i = 0; i < clean.length; i += 2) out.push(parseCard(clean.slice(i, i + 2)));
  return out;
}

/** "Ah" — ранг + буква масти. */
export function formatCard(card: Card): string {
  return RANKS[cardRank(card)] + SUITS[cardSuit(card)];
}

/** "A♥" — ранг + символ масти, для UI. */
export function prettyCard(card: Card): string {
  return RANKS[cardRank(card)] + SUIT_SYMBOLS[cardSuit(card)];
}

/** Полная колода 0..51. */
export function fullDeck(): Card[] {
  return Array.from({ length: NUM_CARDS }, (_, i) => i);
}

/** Битовая маска 52 карт (bigint) — для быстрой проверки блокеров. */
export function cardsToMask(cards: Card[]): bigint {
  let m = 0n;
  for (const c of cards) m |= 1n << BigInt(c);
  return m;
}

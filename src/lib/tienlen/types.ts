export type Rank =
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A"
  | "2";

export type Suit = "S" | "C" | "D" | "H"; // spades < clubs < diamonds < hearts

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type ComboType =
  | "single"
  | "pair"
  | "triple"
  | "quad"
  | "sequence"
  | "double_sequence";

export interface Combo {
  type: ComboType;
  cards: Card[];
  /** Highest card in the combo (for ranking). */
  highCard: Card;
  /** Sequence length in ranks (pair-count for double_sequence). */
  length: number;
}

export const RANKS: Rank[] = [
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
  "2",
];

export const SUITS: Suit[] = ["S", "C", "D", "H"];

export function rankIndex(rank: Rank): number {
  return RANKS.indexOf(rank);
}

export function suitIndex(suit: Suit): number {
  return SUITS.indexOf(suit);
}

/** Total order: rank first, then suit. Higher = stronger. */
export function cardValue(card: Card): number {
  return rankIndex(card.rank) * 4 + suitIndex(card.suit);
}

export function cardId(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function parseCardId(id: string): Card | null {
  const m = id.match(/^(10|[3-9JQKA2])([SCDH])$/);
  if (!m) return null;
  return { rank: m[1] as Rank, suit: m[2] as Suit };
}

export function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => cardValue(a) - cardValue(b));
}

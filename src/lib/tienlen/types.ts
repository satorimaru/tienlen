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

export type CardKind = "std" | "joker" | "skip" | "reverse";

export interface Card {
  rank: Rank;
  suit: Suit;
  kind?: CardKind;
  /** Stable id for jokers / power-ups (JK1, SK2, …). */
  token?: string;
  /** Face a joker stands for when played. Required on play; never a 2. */
  as?: { rank: Rank; suit: Suit };
}

export type ComboType =
  | "single"
  | "pair"
  | "triple"
  | "quad"
  | "sequence"
  | "double_sequence"
  | "skip"
  | "reverse";

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

/** Ranks a joker may name. Heos are banned. */
export const WILD_RANKS: Rank[] = RANKS.filter((rank) => rank !== "2");

export function rankIndex(rank: Rank): number {
  return RANKS.indexOf(rank);
}

export function suitIndex(suit: Suit): number {
  return SUITS.indexOf(suit);
}

export function cardKind(card: Card): CardKind {
  return card.kind ?? "std";
}

export function isJoker(card: Card): boolean {
  return cardKind(card) === "joker";
}

export function isPowerUp(card: Card): boolean {
  const kind = cardKind(card);
  return kind === "skip" || kind === "reverse";
}

export function isSpecial(card: Card): boolean {
  return cardKind(card) !== "std";
}

/** Total order: rank first, then suit. Specials sort after 2s. */
export function cardValue(card: Card): number {
  if (cardKind(card) === "joker") return 200;
  if (cardKind(card) === "skip") return 201;
  if (cardKind(card) === "reverse") return 202;
  return rankIndex(card.rank) * 4 + suitIndex(card.suit);
}

export function cardId(card: Card): string {
  if (card.token) return card.token;
  if (isJoker(card)) return "JK";
  if (cardKind(card) === "skip") return "SK";
  if (cardKind(card) === "reverse") return "RV";
  return `${card.rank}${card.suit}`;
}

export function parseCardId(id: string): Card | null {
  const raw = String(id).toUpperCase();
  const special = raw.match(/^(JK|SK|RV)(\d+)?$/);
  if (special) {
    const kind =
      special[1] === "JK"
        ? "joker"
        : special[1] === "SK"
          ? "skip"
          : "reverse";
    return {
      rank: "3",
      suit: "S",
      kind,
      token: raw,
    };
  }
  const m = raw.match(/^(10|[3-9JQKA2])([SCDH])$/);
  if (!m) return null;
  return { rank: m[1] as Rank, suit: m[2] as Suit };
}

export function sameCard(a: Card, b: Card): boolean {
  if (isSpecial(a) || isSpecial(b)) return cardId(a) === cardId(b);
  return a.rank === b.rank && a.suit === b.suit;
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => cardValue(a) - cardValue(b));
}

export function isThreeSpades(card: Card): boolean {
  return card.rank === "3" && card.suit === "S";
}

const SUIT_SYMBOL: Record<Suit, string> = {
  S: "♠",
  C: "♣",
  D: "♦",
  H: "♥",
};

export function formatCard(card: Card): string {
  if (isJoker(card)) {
    if (card.as) {
      return `★=${card.as.rank}${SUIT_SYMBOL[card.as.suit]}`;
    }
    return "★";
  }
  if (cardKind(card) === "skip") return "⏭";
  if (cardKind(card) === "reverse") return "↻";
  return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
}

export function parseFace(input: unknown): { rank: Rank; suit: Suit } | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as { rank?: unknown; suit?: unknown };
  const rank = String(raw.rank ?? "").toUpperCase();
  const suit = String(raw.suit ?? "").toUpperCase();
  if (!WILD_RANKS.includes(rank as Rank)) return null;
  if (!SUITS.includes(suit as Suit)) return null;
  return { rank: rank as Rank, suit: suit as Suit };
}

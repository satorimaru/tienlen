import { type Card, RANKS, SUITS, sortCards } from "./types";

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/** Fisher–Yates shuffle (mutates and returns). */
export function shuffle<T>(arr: T[], random: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Deal equal hands for 2–4 players from a 52-card deck.
 * - 4 players: 13 each
 * - 3 players: 17 each (1 discarded)
 * - 2 players: 13 each (26 discarded)
 *
 * The discarded cards may include 3♠. The engine then lets the
 * lowest remaining card lead, with no 3♠ requirement.
 */
export function dealHands(
  playerCount: number,
  random: () => number = Math.random,
): Card[][] {
  if (playerCount < 2 || playerCount > 4) {
    throw new Error("playerCount must be 2–4");
  }

  const deck = shuffle(createDeck(), random);
  const perHand = playerCount === 3 ? 17 : 13;

  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  let i = 0;
  for (let p = 0; p < playerCount; p++) {
    for (let c = 0; c < perHand; c++) {
      hands[p].push(deck[i++]);
    }
  }

  return hands.map((h) => sortCards(h));
}

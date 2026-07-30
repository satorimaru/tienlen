import { detectCombo, beats } from "./combos";
import { dealHands } from "./deck";
import {
  type Card,
  type Combo,
  cardId,
  sameCard,
  sortCards,
} from "./types";

export interface HandState {
  /** Seat index → hand cards */
  hands: Card[][];
  pile: Combo | null;
  /** Seat of current player */
  currentSeat: number;
  /** Seat who last played (null if free lead after clear) */
  lastPlaySeat: number | null;
  passesInRow: number;
  /** Seats that finished, in order (1st, 2nd, …) */
  finishOrder: number[];
  /** First free lead of the game requires 3♠ */
  requireThreeSpades: boolean;
  playerCount: number;
}

export function createHandState(
  playerCount: number,
  random: () => number = Math.random,
): HandState {
  const hands = dealHands(playerCount, random);
  let threeSpadeSeat = 0;
  for (let s = 0; s < playerCount; s++) {
    if (hands[s].some((c) => c.rank === "3" && c.suit === "S")) {
      threeSpadeSeat = s;
      break;
    }
  }

  return {
    hands,
    pile: null,
    currentSeat: threeSpadeSeat,
    lastPlaySeat: null,
    passesInRow: 0,
    finishOrder: [],
    requireThreeSpades: true,
    playerCount,
  };
}

function activeSeats(state: HandState): number[] {
  return Array.from({ length: state.playerCount }, (_, i) => i).filter(
    (s) =>
      state.hands[s].length > 0 && !state.finishOrder.includes(s),
  );
}

function nextActiveSeat(state: HandState, from: number): number {
  const active = activeSeats(state);
  if (active.length === 0) return from;
  let s = (from + 1) % state.playerCount;
  for (let i = 0; i < state.playerCount; i++) {
    if (active.includes(s)) return s;
    s = (s + 1) % state.playerCount;
  }
  return from;
}

function cardsInHand(hand: Card[], cards: Card[]): boolean {
  const remaining = [...hand];
  for (const c of cards) {
    const idx = remaining.findIndex((h) => sameCard(h, c));
    if (idx === -1) return false;
    remaining.splice(idx, 1);
  }
  return true;
}

function removeCards(hand: Card[], cards: Card[]): Card[] {
  const remaining = [...hand];
  for (const c of cards) {
    const idx = remaining.findIndex((h) => sameCard(h, c));
    if (idx === -1) throw new Error("Card not in hand");
    remaining.splice(idx, 1);
  }
  return sortCards(remaining);
}

export function validatePlay(
  state: HandState,
  seat: number,
  cards: Card[],
): { ok: true; combo: Combo } | { ok: false; error: string } {
  if (state.finishOrder.length >= state.playerCount - 1) {
    return { ok: false, error: "Game already finished" };
  }
  if (seat !== state.currentSeat) {
    return { ok: false, error: "Not your turn" };
  }
  if (state.finishOrder.includes(seat)) {
    return { ok: false, error: "Already finished" };
  }

  const hand = state.hands[seat];
  if (!cardsInHand(hand, cards)) {
    return { ok: false, error: "Cards not in hand" };
  }

  const combo = detectCombo(cards);
  if (!combo) {
    return { ok: false, error: "Invalid combination" };
  }

  // Free lead (empty pile)
  if (!state.pile) {
    if (state.requireThreeSpades) {
      const has3S = cards.some((c) => c.rank === "3" && c.suit === "S");
      if (!has3S) {
        return {
          ok: false,
          error: "First play must include the 3 of spades",
        };
      }
    }
    return { ok: true, combo };
  }

  if (!beats(combo, state.pile)) {
    return { ok: false, error: "Must play a higher combination of the same type" };
  }

  return { ok: true, combo };
}

export function applyPlay(
  state: HandState,
  seat: number,
  cards: Card[],
): HandState {
  const result = validatePlay(state, seat, cards);
  if (!result.ok) throw new Error(result.error);

  const hands = state.hands.map((h, i) =>
    i === seat ? removeCards(h, cards) : [...h],
  );

  const finishOrder = [...state.finishOrder];
  if (hands[seat].length === 0 && !finishOrder.includes(seat)) {
    finishOrder.push(seat);
  }

  const next: HandState = {
    ...state,
    hands,
    pile: result.combo,
    lastPlaySeat: seat,
    passesInRow: 0,
    finishOrder,
    requireThreeSpades: false,
    currentSeat: seat, // may advance below
  };

  // Game over when only one player still has cards
  if (finishOrder.length >= state.playerCount - 1) {
    // Rank the last remaining player(s)
    for (let s = 0; s < state.playerCount; s++) {
      if (!finishOrder.includes(s)) finishOrder.push(s);
    }
    next.finishOrder = finishOrder;
    next.currentSeat = seat;
    return next;
  }

  next.currentSeat = nextActiveSeat(next, seat);
  return next;
}

export function validatePass(
  state: HandState,
  seat: number,
): { ok: true } | { ok: false; error: string } {
  if (finishOrderComplete(state)) {
    return { ok: false, error: "Game already finished" };
  }
  if (seat !== state.currentSeat) {
    return { ok: false, error: "Not your turn" };
  }
  if (!state.pile) {
    return { ok: false, error: "Cannot pass on a free lead" };
  }
  return { ok: true };
}

function finishOrderComplete(state: HandState): boolean {
  return state.finishOrder.length >= state.playerCount - 1;
}

export function applyPass(state: HandState, seat: number): HandState {
  const result = validatePass(state, seat);
  if (!result.ok) throw new Error(result.error);

  const active = activeSeats(state);
  // Others who can still act (excluding last player who played)
  const othersActive = active.filter((s) => s !== state.lastPlaySeat);
  const passesInRow = state.passesInRow + 1;

  // All other active players passed → clear pile, last player leads
  if (passesInRow >= othersActive.length) {
    const leader = state.lastPlaySeat ?? seat;
    return {
      ...state,
      pile: null,
      lastPlaySeat: null,
      passesInRow: 0,
      currentSeat: active.includes(leader)
        ? leader
        : nextActiveSeat(state, leader),
    };
  }

  return {
    ...state,
    passesInRow,
    currentSeat: nextActiveSeat(state, seat),
  };
}

export function isGameFinished(state: HandState): boolean {
  return state.finishOrder.length >= state.playerCount - 1;
}

export function handToIds(hand: Card[]): string[] {
  return hand.map(cardId);
}

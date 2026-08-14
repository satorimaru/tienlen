import { beats, detectCombo } from "./combos";
import { dealHands } from "./deck";
import {
  type Card,
  type Combo,
  cardValue,
  isThreeSpades,
  sameCard,
  sortCards,
} from "./types";

export interface HandState {
  hands: Card[][];
  pile: Combo | null;
  currentSeat: number;
  lastPlaySeat: number | null;
  passesInRow: number;
  finishOrder: number[];
  /** First free lead of the hand must include 3♠ when it was dealt. */
  requireThreeSpades: boolean;
  playerCount: number;
}

export function createHandState(
  playerCount: number,
  random: () => number = Math.random,
): HandState {
  const hands = dealHands(playerCount, random);
  return handStateFromHands(hands);
}

/** Build a new hand from already-dealt cards (tests + rematch). */
export function handStateFromHands(hands: Card[][]): HandState {
  const playerCount = hands.length;
  if (playerCount < 2 || playerCount > 4) {
    throw new Error("playerCount must be 2–4");
  }

  let threeSpadeSeat = -1;
  for (let s = 0; s < playerCount; s++) {
    if (hands[s].some(isThreeSpades)) {
      threeSpadeSeat = s;
      break;
    }
  }

  let currentSeat = 0;
  let requireThreeSpades = false;
  if (threeSpadeSeat >= 0) {
    currentSeat = threeSpadeSeat;
    requireThreeSpades = true;
  } else {
    currentSeat = seatWithLowestCard(hands);
  }

  return {
    hands: hands.map((h) => sortCards(h)),
    pile: null,
    currentSeat,
    lastPlaySeat: null,
    passesInRow: 0,
    finishOrder: [],
    requireThreeSpades,
    playerCount,
  };
}

function seatWithLowestCard(hands: Card[][]): number {
  let bestSeat = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let s = 0; s < hands.length; s++) {
    for (const card of hands[s]) {
      const value = cardValue(card);
      if (value < best) {
        best = value;
        bestSeat = s;
      }
    }
  }
  return bestSeat;
}

function activeSeats(state: HandState): number[] {
  return Array.from({ length: state.playerCount }, (_, i) => i).filter(
    (s) => state.hands[s].length > 0 && !state.finishOrder.includes(s),
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

function finishOrderComplete(state: HandState): boolean {
  return state.finishOrder.length >= state.playerCount - 1;
}

export function validatePlay(
  state: HandState,
  seat: number,
  cards: Card[],
): { ok: true; combo: Combo } | { ok: false; error: string } {
  if (finishOrderComplete(state)) {
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

  if (!state.pile) {
    if (state.requireThreeSpades && !cards.some(isThreeSpades)) {
      return {
        ok: false,
        error: "First play must include the 3 of spades",
      };
    }
    return { ok: true, combo };
  }

  if (!beats(combo, state.pile)) {
    return {
      ok: false,
      error: "Must play a higher combination of the same type",
    };
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
    currentSeat: seat,
  };

  if (finishOrder.length >= state.playerCount - 1) {
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

export function applyPass(state: HandState, seat: number): HandState {
  const result = validatePass(state, seat);
  if (!result.ok) throw new Error(result.error);

  const active = activeSeats(state);
  const othersActive = active.filter((s) => s !== state.lastPlaySeat);
  const passesInRow = state.passesInRow + 1;

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
  return finishOrderComplete(state);
}

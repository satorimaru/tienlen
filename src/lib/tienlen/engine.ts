import { DEFAULT_RULES, parseRules, teamOf, type GameRules } from "@/lib/rules";
import { beats, detectCombo } from "./combos";
import { dealHands } from "./deck";
import {
  type Card,
  type Combo,
  cardValue,
  isJoker,
  isSpecial,
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
  /** First lead of the hand must include this card. Cleared after that play. */
  leadCard: Card | null;
  playerCount: number;
  rules: GameRules;
  /** 1 = clockwise, -1 = reversed (power-up mode). */
  direction: 1 | -1;
}

export function isStuckOnLastTwo(hand: Card[], rules: GameRules): boolean {
  return rules.noFinishOnTwo && hand.length === 1 && hand[0]?.rank === "2";
}

function wouldFinishOnTwo(
  hand: Card[],
  cards: Card[],
  rules: GameRules,
): boolean {
  return (
    rules.noFinishOnTwo &&
    cards.length === hand.length &&
    cards.some((c) => c.rank === "2")
  );
}

export function lowestCardInPlay(
  hands: Card[][],
): { seat: number; card: Card } | null {
  let bestSeat = -1;
  let best: Card | null = null;
  for (let s = 0; s < hands.length; s++) {
    for (const card of hands[s]) {
      if (isSpecial(card)) continue;
      if (!best || cardValue(card) < cardValue(best)) {
        best = card;
        bestSeat = s;
      }
    }
  }
  return best ? { seat: bestSeat, card: best } : null;
}

export function createHandState(
  playerCount: number,
  random: () => number = Math.random,
  rules: Partial<GameRules> = DEFAULT_RULES,
): HandState {
  const nextRules = parseRules(rules);
  const hands = dealHands(playerCount, random, nextRules);
  return handStateFromHands(hands, nextRules);
}

/** Build a new hand from already-dealt cards (tests + rematch). */
export function handStateFromHands(
  hands: Card[][],
  rules: Partial<GameRules> = DEFAULT_RULES,
): HandState {
  const playerCount = hands.length;
  if (playerCount < 2 || playerCount > 4) {
    throw new Error("playerCount must be 2–4");
  }

  const opening = lowestCardInPlay(hands);

  return {
    hands: hands.map((h) => sortCards(h)),
    pile: null,
    currentSeat: opening?.seat ?? 0,
    lastPlaySeat: null,
    passesInRow: 0,
    finishOrder: [],
    leadCard: opening?.card ?? null,
    playerCount,
    rules: parseRules(rules),
    direction: 1,
  };
}

function activeSeats(state: HandState): number[] {
  return Array.from({ length: state.playerCount }, (_, i) => i).filter(
    (s) => state.hands[s].length > 0 && !state.finishOrder.includes(s),
  );
}

function nextActiveSeat(state: HandState, from: number): number {
  const active = activeSeats(state);
  if (active.length === 0) return from;
  const dir = state.direction >= 0 ? 1 : -1;
  let s = (from + dir + state.playerCount) % state.playerCount;
  for (let i = 0; i < state.playerCount; i++) {
    if (active.includes(s)) return s;
    s = (s + dir + state.playerCount) % state.playerCount;
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

function siegeTeamDone(state: HandState, team: 0 | 1): boolean {
  return [0, 1, 2, 3]
    .filter((s) => teamOf(s) === team)
    .every((s) => state.finishOrder.includes(s));
}

function finishOrderComplete(state: HandState): boolean {
  if (state.rules.siege && state.playerCount === 4) {
    return siegeTeamDone(state, 0) || siegeTeamDone(state, 1);
  }
  return state.finishOrder.length >= state.playerCount - 1;
}

function completeFinishOrder(state: HandState, finishOrder: number[]): number[] {
  const next = [...finishOrder];
  if (state.rules.siege && state.playerCount === 4) {
    const winner = siegeTeamDone({ ...state, finishOrder: next }, 0)
      ? 0
      : siegeTeamDone({ ...state, finishOrder: next }, 1)
        ? 1
        : null;
    if (winner == null) return next;
    const leftover = [0, 1, 2, 3]
      .filter((s) => !next.includes(s))
      .sort(
        (a, b) =>
          (state.hands[a]?.length ?? 0) - (state.hands[b]?.length ?? 0),
      );
    return [...next, ...leftover];
  }
  if (next.length >= state.playerCount - 1) {
    for (let s = 0; s < state.playerCount; s++) {
      if (!next.includes(s)) next.push(s);
    }
  }
  return next;
}

export function mustIncludeLeadCard(state: HandState, seat: number): boolean {
  if (state.pile || !state.leadCard) return false;
  return (state.hands[seat] ?? []).some((c) => sameCard(c, state.leadCard!));
}

export function validatePlay(
  state: HandState,
  seat: number,
  cards: Card[],
): { ok: true; combo: Combo } | { ok: false; error: string } {
  if (finishOrderComplete(state)) {
    return { ok: false, error: "err.finished" };
  }
  if (seat !== state.currentSeat) {
    return { ok: false, error: "err.notYourTurn" };
  }
  if (state.finishOrder.includes(seat)) {
    return { ok: false, error: "err.alreadyFinished" };
  }

  const hand = state.hands[seat];
  if (!cardsInHand(hand, cards)) {
    return { ok: false, error: "err.cardsNotInHand" };
  }

  const jokers = cards.filter(isJoker);
  if (jokers.some((card) => !card.as)) {
    return { ok: false, error: "err.jokerNeedFace" };
  }
  if (jokers.some((card) => card.as?.rank === "2")) {
    return { ok: false, error: "err.jokerNotTwo" };
  }

  const combo = detectCombo(cards);
  if (!combo) {
    return { ok: false, error: "err.invalidCombo" };
  }

  if (wouldFinishOnTwo(hand, cards, state.rules)) {
    return { ok: false, error: "err.cannotFinishOnTwo" };
  }

  if (combo.type === "skip" || combo.type === "reverse") {
    if (!state.rules.powerup) {
      return { ok: false, error: "err.invalidCombo" };
    }
    return { ok: true, combo };
  }

  if (!state.pile) {
    if (
      mustIncludeLeadCard(state, seat) &&
      state.leadCard &&
      !cards.some((c) => sameCard(c, state.leadCard!))
    ) {
      return {
        ok: false,
        error: "err.mustLead",
      };
    }
    return { ok: true, combo };
  }

  if (!beats(combo, state.pile)) {
    return {
      ok: false,
      error: "err.mustBeat",
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

  let finishOrder = [...state.finishOrder];
  if (hands[seat].length === 0 && !finishOrder.includes(seat)) {
    finishOrder.push(seat);
  }

  const power = result.combo.type === "skip" || result.combo.type === "reverse";
  let direction = state.direction;
  if (result.combo.type === "reverse") {
    direction = state.direction === 1 ? -1 : 1;
  }

  const next: HandState = {
    ...state,
    hands,
    pile: power ? state.pile : result.combo,
    lastPlaySeat: power ? state.lastPlaySeat : seat,
    passesInRow: power ? state.passesInRow : 0,
    finishOrder,
    leadCard: power ? state.leadCard : null,
    currentSeat: seat,
    direction,
  };

  finishOrder = completeFinishOrder(next, finishOrder);
  next.finishOrder = finishOrder;

  if (finishOrderComplete(next)) {
    next.currentSeat = seat;
    return next;
  }

  let after = nextActiveSeat(next, seat);
  if (result.combo.type === "skip") {
    after = nextActiveSeat({ ...next, currentSeat: after }, after);
  }
  next.currentSeat = after;
  return next;
}

export function validatePass(
  state: HandState,
  seat: number,
): { ok: true } | { ok: false; error: string } {
  if (finishOrderComplete(state)) {
    return { ok: false, error: "err.finished" };
  }
  if (seat !== state.currentSeat) {
    return { ok: false, error: "err.notYourTurn" };
  }
  if (!state.pile) {
    if (isStuckOnLastTwo(state.hands[seat] ?? [], state.rules)) {
      return { ok: true };
    }
    return { ok: false, error: "err.cannotPassLead" };
  }
  return { ok: true };
}

export function applyPass(state: HandState, seat: number): HandState {
  const result = validatePass(state, seat);
  if (!result.ok) throw new Error(result.error);

  const active = activeSeats(state);
  if (!state.pile) {
    return {
      ...state,
      pile: null,
      lastPlaySeat: null,
      passesInRow: 0,
      currentSeat: nextActiveSeat(state, seat),
    };
  }

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

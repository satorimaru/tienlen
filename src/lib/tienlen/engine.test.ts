import { describe, expect, it } from "vitest";
import {
  applyPass,
  applyPlay,
  createHandState,
  handStateFromHands,
  validatePlay,
} from "./engine";
import type { Card } from "./types";

function c(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

describe("createHandState", () => {
  it("gives the 3♠ holder the first lead", () => {
    const state = handStateFromHands([
      [c("4", "H"), c("5", "H")],
      [c("3", "S"), c("9", "D")],
    ]);
    expect(state.currentSeat).toBe(1);
    expect(state.requireThreeSpades).toBe(true);
  });

  it("falls back to the lowest card when 3♠ was discarded", () => {
    const state = handStateFromHands([
      [c("8", "H"), c("9", "H")],
      [c("4", "S"), c("K", "D")],
    ]);
    expect(state.currentSeat).toBe(1);
    expect(state.requireThreeSpades).toBe(false);
    const lead = validatePlay(state, 1, [c("4", "S")]);
    expect(lead.ok).toBe(true);
  });

  it("deals 13 cards to each of 4 players", () => {
    const state = createHandState(4, () => 0.5);
    expect(state.hands).toHaveLength(4);
    expect(state.hands.every((h) => h.length === 13)).toBe(true);
    expect(state.hands.flat().some((card) => card.rank === "3" && card.suit === "S")).toBe(
      true,
    );
  });
});

describe("play and pass", () => {
  it("requires 3♠ on the opening lead when it was dealt", () => {
    const state = handStateFromHands([
      [c("3", "S"), c("5", "H"), c("9", "D")],
      [c("4", "H"), c("6", "H"), c("8", "H")],
    ]);
    expect(validatePlay(state, 0, [c("5", "H")]).ok).toBe(false);
    const next = applyPlay(state, 0, [c("3", "S")]);
    expect(next.pile?.type).toBe("single");
    expect(next.currentSeat).toBe(1);
    expect(next.requireThreeSpades).toBe(false);
  });

  it("clears the pile after everyone else passes", () => {
    let state = handStateFromHands([
      [c("3", "S"), c("9", "H")],
      [c("4", "H"), c("5", "H")],
    ]);
    state = applyPlay(state, 0, [c("3", "S")]);
    state = applyPass(state, 1);
    expect(state.pile).toBeNull();
    expect(state.currentSeat).toBe(0);
  });

  it("finishes the hand when only one player has cards left", () => {
    let state = handStateFromHands([
      [c("3", "S")],
      [c("4", "H"), c("5", "H")],
    ]);
    state = applyPlay(state, 0, [c("3", "S")]);
    expect(state.finishOrder).toEqual([0, 1]);
  });

  it("rejects a pass on a free lead", () => {
    const state = handStateFromHands([
      [c("3", "S")],
      [c("4", "H")],
    ]);
    expect(() => applyPass(state, 0)).toThrow(/free lead/);
  });
});

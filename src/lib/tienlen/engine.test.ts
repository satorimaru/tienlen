import { describe, expect, it } from "vitest";
import {
  applyPass,
  applyPlay,
  createHandState,
  handStateFromHands,
  validatePass,
  validatePlay,
} from "./engine";
import type { Card } from "./types";

function c(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

describe("opening lead", () => {
  it("gives the 3♠ holder the first lead", () => {
    const state = handStateFromHands([
      [c("4", "H"), c("5", "H")],
      [c("3", "S"), c("9", "D")],
    ]);
    expect(state.currentSeat).toBe(1);
    expect(state.leadCard).toEqual(c("3", "S"));
  });

  it("falls through to the next lowest card when 3♠ is out of play", () => {
    const state = handStateFromHands([
      [c("3", "H"), c("8", "H")],
      [c("3", "C"), c("K", "D")],
    ]);
    expect(state.currentSeat).toBe(1);
    expect(state.leadCard).toEqual(c("3", "C"));
    expect(validatePlay(state, 1, [c("K", "D")]).ok).toBe(false);
    expect(validatePlay(state, 1, [c("3", "C")]).ok).toBe(true);
  });

  it("keeps walking the order: 3♦ before 4♠", () => {
    const state = handStateFromHands([
      [c("4", "S"), c("9", "H")],
      [c("3", "D"), c("K", "D")],
    ]);
    expect(state.currentSeat).toBe(1);
    expect(state.leadCard).toEqual(c("3", "D"));
  });

  it("deals 13 cards to each of 4 players and includes 3♠", () => {
    const state = createHandState(4, () => 0.5);
    expect(state.hands).toHaveLength(4);
    expect(state.hands.every((h) => h.length === 13)).toBe(true);
    expect(
      state.hands.flat().some((card) => card.rank === "3" && card.suit === "S"),
    ).toBe(true);
    expect(state.leadCard).toEqual(c("3", "S"));
  });
});

describe("play and pass", () => {
  it("requires the lead card on the opening play", () => {
    const state = handStateFromHands([
      [c("3", "S"), c("5", "H"), c("9", "D")],
      [c("4", "H"), c("6", "H"), c("8", "H")],
    ]);
    expect(validatePlay(state, 0, [c("5", "H")]).ok).toBe(false);
    const next = applyPlay(state, 0, [c("3", "S")]);
    expect(next.pile?.type).toBe("single");
    expect(next.currentSeat).toBe(1);
    expect(next.leadCard).toBeNull();
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
    const state = handStateFromHands([[c("3", "S")], [c("4", "H")]]);
    expect(() => applyPass(state, 0)).toThrow(/cannotPassLead/);
  });

  it("rejects going out with a 2 when the house rule is on", () => {
    const rules = { threePlayerSeventeen: true, noFinishOnTwo: true };
    let state = handStateFromHands(
      [[c("2", "H")], [c("3", "S"), c("5", "D")]],
      rules,
    );
    state = applyPlay(state, 1, [c("3", "S")]);
    const stuck = validatePlay(state, 0, [c("2", "H")]);
    expect(stuck.ok).toBe(false);
    if (!stuck.ok) expect(stuck.error).toBe("err.cannotFinishOnTwo");
    expect(validatePass(state, 0).ok).toBe(true);
  });

  it("lets a stuck last 2 pass on a free lead", () => {
    const state = handStateFromHands(
      [[c("2", "H")], [c("3", "S"), c("5", "D")]],
      { threePlayerSeventeen: true, noFinishOnTwo: true },
    );
    state.currentSeat = 0;
    state.leadCard = null;
    expect(validatePass(state, 0).ok).toBe(true);
    const next = applyPass(state, 0);
    expect(next.currentSeat).toBe(1);
    expect(next.pile).toBeNull();
  });
});

describe("deal size", () => {
  it("deals 17 to each of 3 players by default, or 13 when the rule is off", () => {
    const seventeen = createHandState(3, () => 0.5);
    expect(seventeen.hands.every((h) => h.length === 17)).toBe(true);

    const thirteen = createHandState(3, () => 0.5, {
      threePlayerSeventeen: false,
      noFinishOnTwo: false,
    });
    expect(thirteen.hands.every((h) => h.length === 13)).toBe(true);
  });
});

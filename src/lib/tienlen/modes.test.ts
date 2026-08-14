import { describe, expect, it } from "vitest";
import { detectCombo } from "./combos";
import {
  applyPlay,
  createHandState,
  handStateFromHands,
  isGameFinished,
  validatePlay,
} from "./engine";
import type { Card } from "./types";

function c(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

const joker = (n: number): Card => ({
  rank: "3",
  suit: "S",
  kind: "joker",
  token: `JK${n}`,
});

const skip = (n: number): Card => ({
  rank: "3",
  suit: "S",
  kind: "skip",
  token: `SK${n}`,
});

const reverse = (n: number): Card => ({
  rank: "3",
  suit: "S",
  kind: "reverse",
  token: `RV${n}`,
});

describe("chaos jokers", () => {
  it("lets a named joker complete a pair but not a quad, and never a 2", () => {
    expect(detectCombo([joker(1), c("5", "S")])).toBeNull();

    const pair = detectCombo([
      { ...joker(1), as: { rank: "5", suit: "H" } },
      c("5", "S"),
    ]);
    expect(pair?.type).toBe("pair");

    const asTwo = detectCombo([
      { ...joker(1), as: { rank: "2", suit: "H" } },
    ]);
    expect(asTwo).toBeNull();

    const quad = detectCombo([
      { ...joker(1), as: { rank: "5", suit: "H" } },
      c("5", "S"),
      c("5", "C"),
      c("5", "D"),
    ]);
    expect(quad).toBeNull();
  });

  it("deals two jokers in chaos mode", () => {
    const state = createHandState(4, () => 0.4, {
      threePlayerSeventeen: true,
      noFinishOnTwo: false,
      chaos: true,
      blitz: false,
      siege: false,
      powerup: false,
    });
    const jokers = state.hands.flat().filter((card) => card.kind === "joker");
    expect(jokers).toHaveLength(2);
  });

  it("rejects a joker play until a non-2 face is named", () => {
    const wild = joker(1);
    const state = handStateFromHands(
      [
        [wild, c("9", "H")],
        [c("3", "S"), c("5", "D")],
      ],
      { chaos: true },
    );
    state.currentSeat = 0;
    state.leadCard = null;
    expect(validatePlay(state, 0, [wild]).ok).toBe(false);
    expect(
      validatePlay(state, 0, [{ ...wild, as: { rank: "2", suit: "H" } }]).ok,
    ).toBe(false);
    expect(
      validatePlay(state, 0, [{ ...wild, as: { rank: "9", suit: "S" } }]).ok,
    ).toBe(true);
  });
});

describe("power-up skip and reverse", () => {
  it("skips the next seat", () => {
    const rules = {
      threePlayerSeventeen: true,
      noFinishOnTwo: false,
      chaos: false,
      blitz: false,
      siege: false,
      powerup: true,
    };
    const state = handStateFromHands(
      [
        [skip(1), c("9", "H")],
        [c("4", "H"), c("5", "H")],
        [c("6", "H"), c("7", "H")],
      ],
      rules,
    );
    state.currentSeat = 0;
    state.leadCard = null;
    const next = applyPlay(state, 0, [skip(1)]);
    expect(next.currentSeat).toBe(2);
  });

  it("reverses play direction", () => {
    const rules = {
      threePlayerSeventeen: true,
      noFinishOnTwo: false,
      chaos: false,
      blitz: false,
      siege: false,
      powerup: true,
    };
    const state = handStateFromHands(
      [
        [reverse(1), c("3", "S")],
        [c("4", "H"), c("5", "H")],
        [c("6", "H"), c("7", "H")],
      ],
      rules,
    );
    // 3S is in seat 0, they lead.
    expect(state.currentSeat).toBe(0);
    const next = applyPlay(state, 0, [reverse(1)]);
    expect(next.direction).toBe(-1);
    expect(next.currentSeat).toBe(2);
  });
});

describe("team siege", () => {
  it("ends when both partners are out", () => {
    const rules = {
      threePlayerSeventeen: true,
      noFinishOnTwo: false,
      chaos: false,
      blitz: false,
      siege: true,
      powerup: false,
    };
    const state = handStateFromHands(
      [
        [c("3", "S")],
        [c("4", "H"), c("8", "H")],
        [c("5", "D")],
        [c("6", "C"), c("9", "C")],
      ],
      rules,
    );
    expect(isGameFinished(state)).toBe(false);
    state.finishOrder = [0, 2];
    expect(isGameFinished(state)).toBe(true);
  });
});

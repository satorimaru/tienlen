import {
  type Card,
  type Combo,
  type ComboType,
  cardValue,
  rankIndex,
  sortCards,
} from "./types";

function highestCard(cards: Card[]): Card {
  return cards.reduce((best, c) =>
    cardValue(c) > cardValue(best) ? c : best,
  );
}

function isConsecutiveRanks(ranks: number[]): boolean {
  if (ranks.length < 2) return true;
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return true;
}

/**
 * Detect a single legal combo from the exact set of selected cards.
 * Returns null if cards do not form a valid combination.
 */
export function detectCombo(cards: Card[]): Combo | null {
  if (cards.length === 0) return null;
  const sorted = sortCards(cards);
  const n = sorted.length;

  // Single
  if (n === 1) {
    return {
      type: "single",
      cards: sorted,
      highCard: sorted[0],
      length: 1,
    };
  }

  // Pair / triple / quad
  if (n >= 2 && n <= 4) {
    const rank = sorted[0].rank;
    if (sorted.every((c) => c.rank === rank)) {
      const type: ComboType =
        n === 2 ? "pair" : n === 3 ? "triple" : "quad";
      return {
        type,
        cards: sorted,
        highCard: highestCard(sorted),
        length: n,
      };
    }
  }

  // Sequence: ≥3 consecutive ranks, no 2s, one card per rank
  if (n >= 3) {
    const ranks = sorted.map((c) => rankIndex(c.rank));
    if (
      sorted.every((c) => c.rank !== "2") &&
      new Set(ranks).size === n &&
      isConsecutiveRanks(ranks)
    ) {
      return {
        type: "sequence",
        cards: sorted,
        highCard: highestCard(sorted),
        length: n,
      };
    }
  }

  // Double sequence: ≥3 consecutive pairs, no 2s
  if (n >= 6 && n % 2 === 0) {
    const byRank = new Map<number, Card[]>();
    for (const c of sorted) {
      if (c.rank === "2") return null;
      const ri = rankIndex(c.rank);
      const list = byRank.get(ri) ?? [];
      list.push(c);
      byRank.set(ri, list);
    }
    const rankKeys = [...byRank.keys()].sort((a, b) => a - b);
    const pairCount = n / 2;
    if (
      rankKeys.length === pairCount &&
      rankKeys.every((k) => (byRank.get(k)?.length ?? 0) === 2) &&
      isConsecutiveRanks(rankKeys)
    ) {
      return {
        type: "double_sequence",
        cards: sorted,
        highCard: highestCard(sorted),
        length: pairCount,
      };
    }
  }

  return null;
}

/**
 * Can `play` beat `pile`?
 * - Same type & length (sequences), strictly higher highCard
 * - Bombs: quad or double_sequence (≥3) beat a single 2
 * - Higher bomb of same bomb type beats lower
 */
export function beats(play: Combo, pile: Combo | null): boolean {
  if (!pile) return true;

  // Bombs vs single 2
  if (pile.type === "single" && pile.highCard.rank === "2") {
    if (play.type === "quad") return true;
    if (play.type === "double_sequence" && play.length >= 3) return true;
  }

  // Bomb vs bomb (same type)
  if (play.type === "quad" && pile.type === "quad") {
    return cardValue(play.highCard) > cardValue(pile.highCard);
  }
  if (play.type === "double_sequence" && pile.type === "double_sequence") {
    if (play.length !== pile.length) return false;
    return cardValue(play.highCard) > cardValue(pile.highCard);
  }

  // Normal: same type, same length, higher
  if (play.type !== pile.type) return false;
  if (play.length !== pile.length) return false;
  return cardValue(play.highCard) > cardValue(pile.highCard);
}

export function isBomb(combo: Combo): boolean {
  return (
    combo.type === "quad" ||
    (combo.type === "double_sequence" && combo.length >= 3)
  );
}

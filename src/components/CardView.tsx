"use client";

import { cardKind, formatCard, type Card } from "@/lib/tienlen/types";

const SUIT_SYMBOL: Record<Card["suit"], string> = {
  S: "♠",
  C: "♣",
  D: "♦",
  H: "♥",
};

interface CardViewProps {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "hand";
  faceDown?: boolean;
}

const sizeClass = {
  sm: "h-11 w-8 text-[10px]",
  md: "h-[4.4rem] w-12 text-xs",
  hand: "h-[5.1rem] w-[3.45rem] text-[13px]",
};

export function CardView({
  card,
  selected,
  onClick,
  disabled,
  size = "md",
  faceDown,
}: CardViewProps) {
  if (faceDown) {
    return (
      <div
        className={`${sizeClass[size]} card-back rounded-[0.55rem] border border-[#3a0d16]`}
        aria-hidden
      />
    );
  }

  const kind = cardKind(card);
  const special =
    kind === "joker" ? "★" : kind === "skip" ? "⏭" : kind === "reverse" ? "↻" : null;
  const red = card.suit === "D" || card.suit === "H";
  const ink = special
    ? "text-[#6b2a86]"
    : red
      ? "text-[#c41e3a]"
      : "text-[#1a1612]";
  const symbol = SUIT_SYMBOL[card.suit];
  const interactive = Boolean(onClick) && !disabled;

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onClick}
      className={[
        sizeClass[size],
        "card-face relative flex flex-col items-center justify-between rounded-[0.55rem] px-[0.28rem] py-[0.22rem]",
        "select-none font-semibold touch-manipulation",
        ink,
        selected ? "-translate-y-3 ring-2 ring-[var(--gold)]" : "",
        interactive ? "active:brightness-95" : "cursor-default",
        disabled ? "opacity-45" : "",
      ].join(" ")}
      aria-pressed={selected}
      aria-label={formatCard(card)}
    >
      {special ? (
        <>
          <span className="self-start text-[10px] leading-none uppercase">
            {kind === "joker" ? "JK" : kind === "skip" ? "SK" : "RV"}
          </span>
          <span className="text-[1.35em] leading-none">{special}</span>
          <span className="self-end text-[10px] leading-none uppercase">
            {kind === "joker" && card.as
              ? `${card.as.rank}${SUIT_SYMBOL[card.as.suit]}`
              : kind === "joker"
                ? "JK"
                : kind === "skip"
                  ? "SK"
                  : "RV"}
          </span>
        </>
      ) : (
        <>
          <span className="self-start leading-none">{card.rank}</span>
          <span className="text-[1.15em] leading-none">{symbol}</span>
          <span className="self-end rotate-180 leading-none">{card.rank}</span>
        </>
      )}
    </button>
  );
}

"use client";

import { formatCard, type Card } from "@/lib/tienlen/types";

const SUIT_SYMBOL: Record<Card["suit"], string> = {
  S: "♠",
  C: "♣",
  D: "♦",
  H: "♥",
};

const SUIT_COLOR: Record<Card["suit"], string> = {
  S: "text-slate-900",
  C: "text-slate-900",
  D: "text-red-600",
  H: "text-red-600",
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
  sm: "h-12 w-9 text-[10px]",
  md: "h-16 w-12 text-xs sm:h-20 sm:w-14 sm:text-sm",
  hand: "h-[4.6rem] w-[3.25rem] text-xs",
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
        className={`${sizeClass[size]} rounded-lg border-2 border-indigo-800 bg-gradient-to-br from-indigo-600 to-indigo-900 shadow-md`}
        aria-hidden
      />
    );
  }

  const color = SUIT_COLOR[card.suit];
  const symbol = SUIT_SYMBOL[card.suit];
  const interactive = Boolean(onClick) && !disabled;

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onClick}
      className={[
        sizeClass[size],
        "relative flex flex-col items-center justify-between rounded-lg border bg-white px-1 py-1 shadow-md",
        "select-none font-semibold touch-manipulation",
        color,
        selected
          ? "-translate-y-3 border-amber-400 shadow-lg ring-2 ring-amber-300"
          : "border-slate-200",
        interactive ? "active:brightness-95" : "cursor-default",
        disabled ? "opacity-50" : "",
      ].join(" ")}
      aria-pressed={selected}
      aria-label={formatCard(card)}
    >
      <span className="self-start leading-none">{card.rank}</span>
      <span className="text-base leading-none sm:text-lg">{symbol}</span>
      <span className="self-end rotate-180 leading-none">{card.rank}</span>
    </button>
  );
}

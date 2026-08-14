"use client";

import type { Card } from "@/lib/tienlen/types";

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

const SUIT_NAME: Record<Card["suit"], string> = {
  S: "spades",
  C: "clubs",
  D: "diamonds",
  H: "hearts",
};

interface CardViewProps {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
}

const sizeClass = {
  sm: "h-14 w-10 text-xs",
  md: "h-20 w-14 text-sm",
  lg: "h-24 w-16 text-base",
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

  return (
    <button
      type="button"
      disabled={disabled || !onClick}
      onClick={onClick}
      className={[
        sizeClass[size],
        "relative flex flex-col items-center justify-between rounded-lg border bg-white px-1 py-1 shadow-md transition",
        "select-none font-semibold",
        color,
        selected
          ? "-translate-y-3 border-amber-400 shadow-lg ring-2 ring-amber-300"
          : "border-slate-200 hover:-translate-y-1",
        onClick && !disabled ? "cursor-pointer" : "cursor-default",
        disabled ? "opacity-50" : "",
      ].join(" ")}
      aria-pressed={selected}
      aria-label={`${card.rank} of ${SUIT_NAME[card.suit]}`}
    >
      <span className="self-start leading-none">{card.rank}</span>
      <span className="text-lg leading-none sm:text-xl">{symbol}</span>
      <span className="self-end rotate-180 leading-none">{card.rank}</span>
    </button>
  );
}

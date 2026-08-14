"use client";

import { useMemo, useState } from "react";
import type { RoomEvent, RoomView } from "@/lib/rooms/types";
import { beats, comboLabel, detectCombo } from "@/lib/tienlen/combos";
import {
  cardId,
  formatCard,
  sameCard,
  type Card,
} from "@/lib/tienlen/types";
import { CardView } from "./CardView";
import { Hand } from "./Hand";
import { ResultModal } from "./ResultModal";

interface GameTableProps {
  room: RoomView;
  playerId: string;
  onPlay: (cards: Card[]) => Promise<void>;
  onPass: () => Promise<void>;
  onRematch: () => Promise<void>;
  busy?: boolean;
  error?: string | null;
}

function eventText(room: RoomView, event: RoomEvent | null): string | null {
  if (!event) return null;
  const name =
    "playerId" in event
      ? (room.players.find((p) => p.id === event.playerId)?.name ?? "Someone")
      : "";
  switch (event.kind) {
    case "play":
      return `${name} played a ${comboLabel(event.comboType)}`;
    case "pass":
      return `${name} passed`;
    case "start":
      return "Hand started";
    default:
      return null;
  }
}

export function GameTable({
  room,
  playerId,
  onPlay,
  onPass,
  onRematch,
  busy,
  error,
}: GameTableProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const me = room.players.find((p) => p.id === playerId);
  const isMyTurn = room.currentPlayerId === playerId;
  const opponents = room.players.filter((p) => p.id !== playerId);

  const selectedCards: Card[] = useMemo(() => {
    return room.hand.filter((c) => selected.includes(cardId(c)));
  }, [room.hand, selected]);

  const combo = useMemo(() => detectCombo(selectedCards), [selectedCards]);

  const pileCombo = useMemo(() => {
    if (!room.pile.length || !room.pileType) return null;
    return detectCombo(room.pile);
  }, [room.pile, room.pileType]);

  const mustLeadCard =
    !room.pile.length &&
    room.leadCard &&
    room.hand.some((c) => sameCard(c, room.leadCard!))
      ? room.leadCard
      : null;

  const canPlay = useMemo(() => {
    if (!isMyTurn || !combo) return false;
    if (mustLeadCard && !selectedCards.some((c) => sameCard(c, mustLeadCard))) {
      return false;
    }
    return beats(combo, pileCombo);
  }, [isMyTurn, combo, mustLeadCard, selectedCards, pileCombo]);

  const canPass = isMyTurn && room.pile.length > 0;
  const banner = eventText(room, room.lastEvent);

  const toggle = (c: Card) => {
    if (!isMyTurn) return;
    const id = cardId(c);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const currentName =
    room.players.find((p) => p.id === room.currentPlayerId)?.name ?? "…";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {opponents.map((p) => (
          <div
            key={p.id}
            className={[
              "min-w-[5.75rem] flex-1 rounded-2xl border px-2 py-2 text-center",
              p.id === room.currentPlayerId
                ? "border-amber-400 bg-emerald-950/60 ring-2 ring-amber-300/40"
                : "border-emerald-800/60 bg-emerald-950/40",
            ].join(" ")}
          >
            <p className="truncate text-xs font-medium text-emerald-50 sm:text-sm">
              {p.name}
              {p.finishOrder != null && (
                <span className="ml-1 text-amber-300">#{p.finishOrder}</span>
              )}
            </p>
            <p className="mt-1 text-[11px] text-emerald-200/80">
              {p.cardCount} card{p.cardCount === 1 ? "" : "s"}
            </p>
          </div>
        ))}
      </div>

      <div className="my-2 flex min-h-0 flex-1 flex-col items-center justify-center rounded-3xl border border-emerald-800/50 bg-emerald-900/30 px-3 py-4">
        {banner && (
          <p className="mb-1 text-[11px] uppercase tracking-wide text-amber-200/80">
            {banner}
          </p>
        )}
        <p className="mb-3 text-center text-sm font-medium text-emerald-100/90">
          {room.status === "finished"
            ? "Game over"
            : isMyTurn
              ? room.pile.length
                ? "Your turn — beat the pile or pass"
                : mustLeadCard
                  ? `Your turn — lead with ${formatCard(mustLeadCard)}`
                  : "Your turn — lead any combo"
              : `Waiting for ${currentName}`}
        </p>
        {room.pile.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-1">
            {room.pile.map((c) => (
              <CardView key={cardId(c)} card={c} size="md" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-emerald-200/50">Empty pile · free lead</p>
        )}
        {room.pileType && (
          <p className="mt-2 text-[11px] uppercase tracking-wide text-emerald-300/70">
            {comboLabel(room.pileType)}
          </p>
        )}
      </div>

      <div className="rounded-t-3xl bg-white/95 px-3 pt-3 shadow-2xl ring-1 ring-slate-200 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-800">
            {me?.name ?? "You"} · {room.hand.length}
          </span>
          {selected.length > 0 && (
            <button
              type="button"
              className="min-h-8 px-2 text-xs text-slate-500 underline"
              onClick={() => setSelected([])}
            >
              Clear
            </button>
          )}
        </div>

        <Hand
          cards={room.hand}
          selected={selected}
          onToggle={toggle}
          disabled={!isMyTurn || busy}
        />

        {error && (
          <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={!canPlay || busy}
            onClick={() => {
              void onPlay(selectedCards).then(() => setSelected([]));
            }}
            className="min-h-12 flex-1 rounded-2xl bg-emerald-600 text-base font-semibold text-white touch-manipulation hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Play
            {combo ? ` · ${comboLabel(combo.type)}` : ""}
          </button>
          <button
            type="button"
            disabled={!canPass || busy}
            onClick={() => {
              void onPass().then(() => setSelected([]));
            }}
            className="min-h-12 flex-1 rounded-2xl bg-slate-200 text-base font-semibold text-slate-800 touch-manipulation hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Pass
          </button>
        </div>
      </div>

      {room.status === "finished" && (
        <ResultModal
          room={room}
          playerId={playerId}
          onRematch={onRematch}
          busy={busy}
        />
      )}
    </div>
  );
}

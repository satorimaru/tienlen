"use client";

import { useMemo, useState } from "react";
import type { RoomEvent, RoomView } from "@/lib/rooms/types";
import { beats, comboLabel, detectCombo } from "@/lib/tienlen/combos";
import { cardId, isThreeSpades, type Card } from "@/lib/tienlen/types";
import { CardView } from "./CardView";
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

  const canPlay = useMemo(() => {
    if (!isMyTurn || !combo) return false;
    if (room.requireThreeSpades && !room.pile.length) {
      if (!selectedCards.some(isThreeSpades)) return false;
    }
    return beats(combo, pileCombo);
  }, [
    isMyTurn,
    combo,
    room.requireThreeSpades,
    room.pile.length,
    selectedCards,
    pileCombo,
  ]);

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {opponents.map((p) => (
          <div
            key={p.id}
            className={[
              "rounded-2xl border bg-emerald-950/40 px-3 py-3 text-center backdrop-blur",
              p.id === room.currentPlayerId
                ? "border-amber-400 ring-2 ring-amber-300/50"
                : "border-emerald-800/60",
            ].join(" ")}
          >
            <p className="truncate text-sm font-medium text-emerald-50">
              {p.name}
              {p.finishOrder != null && (
                <span className="ml-1 text-amber-300">#{p.finishOrder}</span>
              )}
            </p>
            <div className="mt-2 flex justify-center gap-0.5">
              {Array.from({ length: Math.min(p.cardCount, 8) }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-5 rounded border border-indigo-700 bg-indigo-800 shadow-sm"
                  style={{ marginLeft: i ? -8 : 0 }}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-emerald-200/70">
              {p.cardCount} card{p.cardCount === 1 ? "" : "s"}
            </p>
          </div>
        ))}
      </div>

      <div className="my-4 flex flex-1 flex-col items-center justify-center rounded-3xl border border-emerald-800/50 bg-emerald-900/30 px-4 py-6">
        {banner && (
          <p className="mb-2 text-xs uppercase tracking-wide text-amber-200/80">
            {banner}
          </p>
        )}
        <p className="mb-3 text-sm font-medium text-emerald-100/90">
          {room.status === "finished"
            ? "Game over"
            : isMyTurn
              ? room.pile.length
                ? "Your turn — beat the pile or pass"
                : room.requireThreeSpades
                  ? "Your turn — lead with 3♠"
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
          <p className="mt-2 text-xs uppercase tracking-wide text-emerald-300/70">
            {comboLabel(room.pileType)}
          </p>
        )}
      </div>

      <div className="rounded-t-3xl bg-white/95 p-4 shadow-2xl ring-1 ring-slate-200">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-800">
            {me?.name ?? "You"} · {room.hand.length} cards
          </span>
          {selected.length > 0 && (
            <button
              type="button"
              className="text-xs text-slate-500 underline"
              onClick={() => setSelected([])}
            >
              Clear selection
            </button>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-1 pb-2">
          {room.hand.map((c) => (
            <CardView
              key={cardId(c)}
              card={c}
              size="md"
              selected={selected.includes(cardId(c))}
              onClick={() => toggle(c)}
              disabled={!isMyTurn || busy}
            />
          ))}
        </div>

        {error && (
          <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canPlay || busy}
            onClick={() => {
              void onPlay(selectedCards).then(() => setSelected([]));
            }}
            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Play
            {combo ? ` (${comboLabel(combo.type)})` : ""}
          </button>
          <button
            type="button"
            disabled={!canPass || busy}
            onClick={() => {
              void onPass().then(() => setSelected([]));
            }}
            className="flex-1 rounded-xl bg-slate-200 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
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

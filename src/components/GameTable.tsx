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
      return `${name} · ${comboLabel(event.comboType)}`;
    case "pass":
      return `${name} passed`;
    case "start":
      return "Cards are out";
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
      <div className="flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {opponents.map((p) => (
          <div
            key={p.id}
            className={[
              "min-w-[5.5rem] flex-1 rounded-2xl px-2 py-2 text-center",
              p.id === room.currentPlayerId
                ? "bg-[rgba(212,176,106,0.14)] ring-1 ring-[var(--gold)]"
                : "bg-black/20",
            ].join(" ")}
          >
            <p className="truncate text-xs font-medium text-[var(--ivory)]">
              {p.name}
              {p.finishOrder != null && (
                <span className="ml-1 text-[var(--gold)]">#{p.finishOrder}</span>
              )}
            </p>
            <p className="mt-1 text-[11px] text-[var(--mute)]">
              {p.cardCount}
            </p>
          </div>
        ))}
      </div>

      <div className="table-felt my-2 flex min-h-0 flex-1 flex-col items-center justify-center rounded-[1.6rem] px-3 py-4">
        {banner && (
          <p className="mb-1 text-[11px] tracking-wide text-[var(--gold)]">
            {banner}
          </p>
        )}
        <p className="mb-3 max-w-[16rem] text-center text-sm text-[var(--ivory)]">
          {room.status === "finished"
            ? "Hand over"
            : isMyTurn
              ? room.pile.length
                ? "Beat it or pass"
                : mustLeadCard
                  ? `Lead ${formatCard(mustLeadCard)}`
                  : "Your lead"
              : currentName}
        </p>
        {room.pile.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-1">
            {room.pile.map((c) => (
              <CardView key={cardId(c)} card={c} size="md" />
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--mute)]">Open table</p>
        )}
        {room.pileType && (
          <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[var(--gold-dim)]">
            {comboLabel(room.pileType)}
          </p>
        )}
      </div>

      <div className="rounded-t-[1.6rem] border-t border-[rgba(212,176,106,0.14)] bg-[rgba(8,14,12,0.94)] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-[var(--ivory)]">
            {me?.name ?? "You"}
            <span className="ml-2 text-[var(--mute)]">{room.hand.length}</span>
          </span>
          {selected.length > 0 && (
            <button
              type="button"
              className="min-h-8 px-2 text-xs text-[var(--gold)]"
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
          <p className="mb-2 rounded-lg bg-[rgba(196,30,58,0.12)] px-3 py-2 text-center text-sm text-[#f0b4bd]">
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
            className="btn-gold flex-1 touch-manipulation"
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
            className="btn-ghost flex-1 touch-manipulation"
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

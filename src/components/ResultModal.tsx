"use client";

import type { RoomView } from "@/lib/rooms/types";

const PLACE = ["1st", "2nd", "3rd", "4th"];

interface ResultModalProps {
  room: RoomView;
  playerId: string;
  onRematch: () => void;
  busy?: boolean;
}

export function ResultModal({
  room,
  playerId,
  onRematch,
  busy,
}: ResultModalProps) {
  const ranked = room.winners
    .map((id) => room.players.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center">
      <div className="glass-panel w-full max-w-sm rounded-[1.75rem] p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <p className="text-center text-[11px] uppercase tracking-[0.2em] text-[var(--gold-dim)]">
          Hand over
        </p>
        <h2 className="mt-1 text-center font-[family-name:var(--font-display)] text-3xl">
          Places
        </h2>
        <ol className="mt-5 space-y-2">
          {ranked.map((p, i) => (
            <li
              key={p!.id}
              className={[
                "flex items-center justify-between rounded-2xl px-4 py-3",
                p!.id === playerId
                  ? "bg-[rgba(212,176,106,0.12)]"
                  : "bg-black/25",
              ].join(" ")}
            >
              <span className="text-sm text-[var(--ivory)]">
                {PLACE[i] ?? `${i + 1}th`} · {p!.name}
                {p!.id === playerId ? " · you" : ""}
              </span>
              {i === 0 && (
                <span className="text-xs tracking-wide text-[var(--gold)]">
                  First
                </span>
              )}
            </li>
          ))}
        </ol>
        <button
          type="button"
          disabled={busy}
          onClick={onRematch}
          className="btn-gold mt-6 w-full"
        >
          Back to lobby
        </button>
        <p className="mt-3 text-center text-xs text-[var(--mute)]">
          Same table. Ready again when you are.
        </p>
      </div>
    </div>
  );
}

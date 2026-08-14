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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-center text-2xl font-semibold text-slate-900">
          Hand complete
        </h2>
        <ol className="mt-6 space-y-2">
          {ranked.map((p, i) => (
            <li
              key={p!.id}
              className={[
                "flex items-center justify-between rounded-2xl px-4 py-3",
                p!.id === playerId
                  ? "bg-emerald-50 ring-1 ring-emerald-200"
                  : "bg-slate-50",
              ].join(" ")}
            >
              <span className="font-medium text-slate-800">
                {PLACE[i] ?? `${i + 1}th`} · {p!.name}
                {p!.id === playerId && " (you)"}
              </span>
              {i === 0 && <span className="text-lg">🏆</span>}
            </li>
          ))}
        </ol>
        <button
          type="button"
          disabled={busy}
          onClick={onRematch}
          className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Rematch lobby
        </button>
        <p className="mt-3 text-center text-xs text-slate-400">
          Everyone stays in the room. Ready up again when you are back.
        </p>
      </div>
    </div>
  );
}

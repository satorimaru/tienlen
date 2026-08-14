"use client";

import { useState } from "react";
import type { RoomView } from "@/lib/rooms/types";

interface LobbyProps {
  room: RoomView;
  playerId: string;
  inviteUrl: string;
  onReady: (ready: boolean) => void;
  onStart: () => void;
  onLeave: () => void;
  busy?: boolean;
  error?: string | null;
}

export function Lobby({
  room,
  playerId,
  inviteUrl,
  onReady,
  onStart,
  onLeave,
  busy,
  error,
}: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const me = room.players.find((p) => p.id === playerId);
  const isHost = room.hostId === playerId;
  const allReady =
    room.players.length >= 2 && room.players.every((p) => p.ready);
  const seats = Array.from({ length: room.maxPlayers }, (_, i) => {
    return room.players.find((p) => p.seat === i) ?? null;
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-200/80 sm:p-8">
      <div className="mb-6 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
          Waiting room
        </p>
        <h1 className="mt-1 font-mono text-3xl font-semibold tracking-wide text-slate-900">
          {room.id}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {room.players.length}/{room.maxPlayers} players · share the code or
          link
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        <input
          readOnly
          value={inviteUrl}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
        />
        <button
          type="button"
          onClick={copy}
          className="min-h-11 shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white touch-manipulation hover:bg-slate-800"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <ul className="mb-6 space-y-2">
        {seats.map((p, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                {i + 1}
              </span>
              <p className="font-medium text-slate-900">
                {p ? p.name : "Empty seat"}
                {p?.id === room.hostId && (
                  <span className="ml-2 text-xs font-normal text-amber-600">
                    host
                  </span>
                )}
                {p?.id === playerId && (
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    you
                  </span>
                )}
              </p>
            </div>
            {p ? (
              <span
                className={
                  p.ready
                    ? "text-sm font-medium text-emerald-600"
                    : "text-sm text-slate-400"
                }
              >
                {p.ready ? "Ready" : "Not ready"}
              </span>
            ) : (
              <span className="text-sm text-slate-300">—</span>
            )}
          </li>
        ))}
      </ul>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {me && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onReady(!me.ready)}
            className={[
              "min-h-12 flex-1 rounded-xl px-4 text-sm font-semibold touch-manipulation transition",
              me.ready
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-emerald-600 text-white hover:bg-emerald-500",
            ].join(" ")}
          >
            {me.ready ? "Unready" : "Ready up"}
          </button>
        )}
        {isHost && (
          <button
            type="button"
            disabled={busy || !allReady}
            onClick={onStart}
            className="min-h-12 flex-1 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white touch-manipulation transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start game
          </button>
        )}
      </div>

      {isHost && !allReady && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Need at least 2 players, all ready, to start
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={onLeave}
        className="mt-4 w-full text-center text-xs text-slate-400 underline hover:text-slate-600"
      >
        Leave room
      </button>
    </div>
  );
}

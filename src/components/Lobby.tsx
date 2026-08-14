"use client";

import { useState } from "react";
import type { RoomView } from "@/lib/rooms/types";
import { ChatButton } from "./ChatSheet";

interface LobbyProps {
  room: RoomView;
  playerId: string;
  inviteUrl: string;
  onReady: (ready: boolean) => void;
  onStart: () => void;
  onLeave: () => void;
  onOpenChat: () => void;
  unread?: number;
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
  onOpenChat,
  unread = 0,
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
    <div className="glass-panel mx-auto w-full max-w-md rounded-[1.75rem] p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--gold-dim)]">
            Waiting
          </p>
          <h1 className="mt-1 font-mono text-[2rem] tracking-[0.18em] text-[var(--ivory)]">
            {room.id}
          </h1>
          <p className="mt-1 text-sm text-[var(--mute)]">
            {room.players.length}/{room.maxPlayers} seated
          </p>
        </div>
        <ChatButton
          unread={unread}
          onClick={onOpenChat}
          className="min-h-11 rounded-full border border-[rgba(212,176,106,0.22)] px-3 text-xs tracking-wide text-[var(--gold)]"
        />
      </div>

      <div className="mb-5 flex gap-2">
        <input
          readOnly
          value={inviteUrl}
          className="field min-w-0 flex-1 truncate text-xs"
        />
        <button
          type="button"
          onClick={() => void copy()}
          className="btn-ghost min-w-20 px-4 text-sm"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <ul className="mb-5 space-y-2">
        {seats.map((p, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-2xl bg-black/25 px-3 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(212,176,106,0.12)] text-sm text-[var(--gold)]">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--ivory)]">
                  {p ? p.name : "Open seat"}
                </p>
                <p className="text-[11px] text-[var(--mute)]">
                  {p?.id === room.hostId
                    ? "Host"
                    : p?.id === playerId
                      ? "You"
                      : p
                        ? "Seated"
                        : "Waiting"}
                </p>
              </div>
            </div>
            {p ? (
              <span
                className={
                  p.ready
                    ? "text-xs font-semibold text-[var(--gold)]"
                    : "text-xs text-[var(--mute)]"
                }
              >
                {p.ready ? "Ready" : "Not ready"}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {error && (
        <p className="mb-4 rounded-xl bg-[rgba(196,30,58,0.12)] px-3 py-2 text-sm text-[#f0b4bd]">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {me && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onReady(!me.ready)}
            className={me.ready ? "btn-ghost w-full" : "btn-gold w-full"}
          >
            {me.ready ? "Hold on" : "Ready"}
          </button>
        )}
        {isHost && (
          <button
            type="button"
            disabled={busy || !allReady}
            onClick={onStart}
            className="btn-ghost w-full"
          >
            Deal
          </button>
        )}
      </div>

      {isHost && !allReady && (
        <p className="mt-3 text-center text-xs text-[var(--mute)]">
          Everyone must ready before the deal
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={onLeave}
        className="mt-4 w-full text-center text-xs text-[var(--mute)]"
      >
        Leave table
      </button>
    </div>
  );
}

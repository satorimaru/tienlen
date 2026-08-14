"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClientMounted } from "@/lib/client";
import { createRoomRequest, postRoom } from "@/lib/rooms/client";
import {
  getOrCreatePlayerId,
  getPlayerName,
  setPlayerName,
} from "@/lib/player";

export default function HomePage() {
  const router = useRouter();
  const mounted = useClientMounted();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const name = nameDraft ?? (mounted ? getPlayerName() : "");
  const [joinCode, setJoinCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async () => {
    setCreating(true);
    setError(null);
    setPlayerName(name);
    try {
      const room = await createRoomRequest({
        playerId: getOrCreatePlayerId(),
        playerName: name || "Host",
        maxPlayers,
      });
      router.push(`/game/${room.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create room");
      setCreating(false);
    }
  };

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("Enter a room code");
      return;
    }
    setJoining(true);
    setError(null);
    setPlayerName(name);
    try {
      const room = await postRoom(code, {
        action: "join",
        playerId: getOrCreatePlayerId(),
        playerName: name || "Guest",
      });
      if (!room) throw new Error("Failed to join");
      router.push(`/game/${room.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join");
      setJoining(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-end px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:justify-center">
      <header className="mb-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--gold)]">
          Southern rules
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[2.75rem] leading-none tracking-tight">
          Tiến Lên
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--mute)]">
          Climbing cards. 2–4 friends. Bombs beat 2s.
        </p>
      </header>

      <section className="glass-panel rounded-[1.75rem] p-5">
        <label className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-[var(--gold-dim)]">
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => setNameDraft(e.target.value)}
          maxLength={24}
          placeholder="Player"
          className="field mb-5"
        />

        <label className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-[var(--gold-dim)]">
          Seats
        </label>
        <div className="mb-5 grid grid-cols-3 gap-2">
          {([2, 3, 4] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMaxPlayers(n)}
              className={[
                "min-h-12 rounded-xl text-sm font-semibold",
                maxPlayers === n
                  ? "bg-[var(--gold)] text-[#1a1408]"
                  : "bg-black/25 text-[var(--mute)]",
              ].join(" ")}
            >
              {n}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={creating}
          onClick={() => void createRoom()}
          className="btn-gold mb-5 w-full touch-manipulation"
        >
          {creating ? "Opening table…" : "Create table"}
        </button>

        <div className="mb-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-[var(--mute)]">
          <span className="h-px flex-1 bg-[rgba(244,234,216,0.1)]" />
          Join
          <span className="h-px flex-1 bg-[rgba(244,234,216,0.1)]" />
        </div>

        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ROOM"
            className="field min-w-0 flex-1 font-mono tracking-[0.2em]"
            onKeyDown={(e) => {
              if (e.key === "Enter") void joinRoom();
            }}
          />
          <button
            type="button"
            disabled={joining}
            onClick={() => void joinRoom()}
            className="btn-ghost min-w-20 touch-manipulation px-4"
          >
            {joining ? "…" : "Sit"}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-[rgba(196,30,58,0.12)] px-3 py-2 text-sm text-[#f0b4bd]">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}

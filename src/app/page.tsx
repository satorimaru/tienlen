"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getOrCreatePlayerId,
  getPlayerName,
  setPlayerName,
} from "@/lib/player";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrCreatePlayerId();
    setName(getPlayerName() || "");
  }, []);

  const createRoom = async () => {
    setCreating(true);
    setError(null);
    setPlayerName(name);
    try {
      const playerId = getOrCreatePlayerId();
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          playerName: name || "Host",
          maxPlayers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create room");
      router.push(`/game/${data.room.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create room");
      setCreating(false);
    }
  };

  const joinRoom = async () => {
    const code = joinCode.trim();
    if (!code) {
      setError("Enter a room code");
      return;
    }
    setJoining(true);
    setError(null);
    setPlayerName(name);
    try {
      const playerId = getOrCreatePlayerId();
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          playerId,
          playerName: name || "Guest",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join");
      router.push(`/game/${data.room.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join");
      setJoining(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12">
      <div className="rounded-3xl bg-white p-8 text-slate-900 shadow-2xl ring-1 ring-white/10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl shadow-lg shadow-emerald-200">
            🂡
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Tiến Lên (13)
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Vietnamese climbing card game · 2–4 players online. Southern rules
            with bombs vs 2s. Create a room and share the link.
          </p>
        </div>

        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="Player"
          className="mb-6 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-emerald-500 focus:ring-2"
        />

        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Max players
        </label>
        <div className="mb-6 flex gap-2">
          {([2, 3, 4] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMaxPlayers(n)}
              className={[
                "flex-1 rounded-xl py-2 text-sm font-semibold transition",
                maxPlayers === n
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              ].join(" ")}
            >
              {n}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={creating}
          onClick={createRoom}
          className="mb-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-500 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create room"}
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400">or join</span>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Room code"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none ring-emerald-500 focus:ring-2"
          />
          <button
            type="button"
            disabled={joining}
            onClick={joinRoom}
            className="shrink-0 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {joining ? "…" : "Join"}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <details className="mt-8 text-left text-xs text-slate-500">
          <summary className="cursor-pointer font-medium text-slate-600">
            Quick rules
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed">
            <li>Rank: 3 low → 2 high · Suit: ♠ &lt; ♣ &lt; ♦ &lt; ♥</li>
            <li>
              Combos: single, pair, triple, four-of-a-kind, sequence (≥3),
              double sequence (≥3 pairs)
            </li>
            <li>Beat the pile with the same shape, higher rank — or pass</li>
            <li>Four-of-a-kind / triple pairs beat a single 2</li>
            <li>First lead must include 3♠ · first to empty hand wins</li>
          </ul>
        </details>
      </div>
    </main>
  );
}

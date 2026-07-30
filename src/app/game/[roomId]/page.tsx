"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MultiplayerGame } from "@/components/MultiplayerGame";
import {
  getOrCreatePlayerId,
  getPlayerName,
  setPlayerName,
} from "@/lib/player";

export default function GamePage() {
  const params = useParams();
  const roomId = String(params.roomId ?? "");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setNameState] = useState("");
  const [nameReady, setNameReady] = useState(false);

  useEffect(() => {
    const id = getOrCreatePlayerId();
    setPlayerId(id);
    const stored = getPlayerName();
    if (stored) {
      setNameState(stored);
      setNameReady(true);
    }
  }, []);

  if (!roomId) {
    return (
      <div className="flex flex-1 items-center justify-center text-red-200">
        Invalid room
      </div>
    );
  }

  if (!playerId) {
    return (
      <div className="flex flex-1 items-center justify-center text-emerald-100">
        Loading…
      </div>
    );
  }

  if (!nameReady) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
        <div className="rounded-3xl bg-white p-6 text-slate-900 shadow-xl">
          <h1 className="text-lg font-semibold">Join game</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter a display name for room {roomId}
          </p>
          <input
            value={playerName}
            onChange={(e) => setNameState(e.target.value)}
            maxLength={24}
            placeholder="Your name"
            className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-emerald-500 focus:ring-2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && playerName.trim()) {
                setPlayerName(playerName);
                setNameReady(true);
              }
            }}
          />
          <button
            type="button"
            disabled={!playerName.trim()}
            onClick={() => {
              setPlayerName(playerName);
              setNameReady(true);
            }}
            className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </main>
    );
  }

  return (
    <MultiplayerGame
      roomId={roomId}
      playerId={playerId}
      playerName={playerName || "Player"}
    />
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { RoomView } from "@/lib/rooms/types";
import type { Card } from "@/lib/tienlen/types";
import { GameTable } from "./GameTable";
import { Lobby } from "./Lobby";

interface MultiplayerGameProps {
  roomId: string;
  playerId: string;
  playerName: string;
}

async function apiRoom(
  roomId: string,
  body: Record<string, unknown>,
): Promise<RoomView> {
  const res = await fetch(`/api/rooms/${roomId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data.room as RoomView;
}

export function MultiplayerGame({
  roomId,
  playerId,
  playerName,
}: MultiplayerGameProps) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setInviteUrl(`${window.location.origin}/game/${roomId}`);
    }
  }, [roomId]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const res = await fetch(
          `/api/rooms/${roomId}?playerId=${encodeURIComponent(playerId)}`,
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Room not found");
        }
        let { room: r } = (await res.json()) as { room: RoomView };

        if (!r.players.some((p) => p.id === playerId)) {
          r = await apiRoom(roomId, {
            action: "join",
            playerId,
            playerName,
          });
        }

        if (!cancelled) {
          setRoom(r);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load room");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [roomId, playerId, playerName]);

  // Poll for updates
  useEffect(() => {
    if (!room || room.status === "finished") return;

    const id = window.setInterval(async () => {
      try {
        const res = await fetch(
          `/api/rooms/${roomId}?playerId=${encodeURIComponent(playerId)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        setRoom(data.room as RoomView);
      } catch {
        /* ignore */
      }
    }, 900);

    return () => window.clearInterval(id);
  }, [room, roomId, playerId]);

  const run = useCallback(
    async (fn: () => Promise<RoomView>) => {
      setBusy(true);
      setError(null);
      try {
        const r = await fn();
        setRoom(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
        // Refetch on conflict
        try {
          const res = await fetch(
            `/api/rooms/${roomId}?playerId=${encodeURIComponent(playerId)}`,
          );
          if (res.ok) {
            const data = await res.json();
            setRoom(data.room as RoomView);
          }
        } catch {
          /* ignore */
        }
      } finally {
        setBusy(false);
      }
    },
    [roomId, playerId],
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-emerald-100">
        Loading room…
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-lg text-red-200">{error ?? "Room not found"}</p>
        <a href="/" className="text-sm text-emerald-200 underline">
          Back home
        </a>
      </div>
    );
  }

  if (room.status === "waiting") {
    return (
      <div className="flex flex-1 items-center px-4 py-8">
        <Lobby
          room={room}
          playerId={playerId}
          inviteUrl={inviteUrl}
          busy={busy}
          error={error}
          onReady={(ready) =>
            run(() =>
              apiRoom(roomId, { action: "ready", playerId, ready }),
            )
          }
          onStart={() =>
            run(() => apiRoom(roomId, { action: "start", playerId }))
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-3 py-4">
      <header className="mb-2 flex items-center justify-between text-emerald-100/80">
        <a href="/" className="text-xs hover:underline">
          ← Home
        </a>
        <span className="font-mono text-xs">Room {room.id}</span>
      </header>
      <GameTable
        room={room}
        playerId={playerId}
        busy={busy}
        error={error}
        onPlay={(cards: Card[]) =>
          run(() =>
            apiRoom(roomId, {
              action: "play",
              playerId,
              cards,
              turnVersion: room.turnVersion,
            }),
          )
        }
        onPass={() =>
          run(() =>
            apiRoom(roomId, {
              action: "pass",
              playerId,
              turnVersion: room.turnVersion,
            }),
          )
        }
        onRematch={() =>
          run(() => apiRoom(roomId, { action: "rematch", playerId }))
        }
      />
    </div>
  );
}

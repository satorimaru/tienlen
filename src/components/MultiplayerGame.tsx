"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClientMounted } from "@/lib/client";
import { fetchRoom, playBody, postRoom } from "@/lib/rooms/client";
import type { RoomView } from "@/lib/rooms/types";
import type { Card } from "@/lib/tienlen/types";
import { GameTable } from "./GameTable";
import { Lobby } from "./Lobby";

interface MultiplayerGameProps {
  roomId: string;
  playerId: string;
  playerName: string;
}

const POLL_MS = 800;

export function MultiplayerGame({
  roomId,
  playerId,
  playerName,
}: MultiplayerGameProps) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const mounted = useClientMounted();
  const inviteUrl = mounted
    ? `${window.location.origin}/game/${roomId}`
    : `/game/${roomId}`;
  const roomRef = useRef<RoomView | null>(null);

  const applyRoom = useCallback((next: RoomView) => {
    const prev = roomRef.current;
    if (
      prev &&
      prev.revision === next.revision &&
      prev.turnVersion === next.turnVersion &&
      prev.status === next.status
    ) {
      return;
    }
    roomRef.current = next;
    setRoom(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        let next = await fetchRoom(roomId, playerId);
        if (!next.players.some((p) => p.id === playerId)) {
          const joined = await postRoom(roomId, {
            action: "join",
            playerId,
            playerName,
          });
          if (joined) next = joined;
        }
        if (!cancelled) {
          applyRoom(next);
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

    void boot();
    return () => {
      cancelled = true;
    };
  }, [roomId, playerId, playerName, applyRoom]);

  useEffect(() => {
    if (!room) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const next = await fetchRoom(roomId, playerId);
        if (!cancelled) applyRoom(next);
      } catch {
        /* keep last good snapshot */
      }
    };

    const id = window.setInterval(() => {
      void tick();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [room, roomId, playerId, applyRoom]);

  const run = useCallback(
    async (fn: () => Promise<RoomView | null>) => {
      setBusy(true);
      setError(null);
      try {
        const next = await fn();
        if (next) applyRoom(next);
        return next;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
        try {
          applyRoom(await fetchRoom(roomId, playerId));
        } catch {
          /* ignore */
        }
        return null;
      } finally {
        setBusy(false);
      }
    },
    [applyRoom, roomId, playerId],
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
        <Link href="/" className="text-sm text-emerald-200 underline">
          Back home
        </Link>
      </div>
    );
  }

  if (room.status === "waiting") {
    return (
      <div className="flex min-h-dvh flex-1 items-center px-3 py-6 sm:px-4">
        <Lobby
          room={room}
          playerId={playerId}
          inviteUrl={inviteUrl}
          busy={busy}
          error={error}
          onReady={(ready) => {
            void run(() =>
              postRoom(roomId, { action: "ready", playerId, ready }),
            );
          }}
          onStart={() => {
            void run(() => postRoom(roomId, { action: "start", playerId }));
          }}
          onLeave={() => {
            void run(async () => {
              await postRoom(roomId, { action: "leave", playerId });
              router.push("/");
              return null;
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col overflow-hidden px-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-3">
      <header className="mb-1 flex shrink-0 items-center justify-between py-1 text-emerald-100/80">
        <Link href="/" className="min-h-8 text-xs hover:underline">
          ← Home
        </Link>
        <span className="font-mono text-xs">Room {room.id}</span>
      </header>
      <GameTable
        room={room}
        playerId={playerId}
        busy={busy}
        error={error}
        onPlay={(cards: Card[]) =>
          run(() =>
            postRoom(roomId, playBody(playerId, cards, room.turnVersion)),
          ).then(() => undefined)
        }
        onPass={() =>
          run(() =>
            postRoom(roomId, {
              action: "pass",
              playerId,
              turnVersion: room.turnVersion,
            }),
          ).then(() => undefined)
        }
        onRematch={() =>
          run(() => postRoom(roomId, { action: "rematch", playerId })).then(
            () => undefined,
          )
        }
      />
    </div>
  );
}

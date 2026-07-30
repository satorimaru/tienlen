import { NextResponse } from "next/server";
import { getRoom } from "@/lib/rooms/store";
import {
  joinRoom,
  passTurn,
  playCards,
  rematchRoom,
  setReady,
  startGame,
} from "@/lib/rooms/service";
import { toRoomView } from "@/lib/rooms/view";
import type { Card } from "@/lib/tienlen/types";

type Params = { params: Promise<{ roomId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { roomId } = await params;
  const playerId =
    new URL(request.url).searchParams.get("playerId") ?? "";

  const room = await getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (!playerId) {
    // Public lobby snapshot without hands
    return NextResponse.json({
      room: toRoomView(room, room.hostId),
    });
  }
  return NextResponse.json({ room: toRoomView(room, playerId) });
}

export async function POST(request: Request, { params }: Params) {
  const { roomId } = await params;
  try {
    const body = await request.json();
    const action = String(body.action ?? "");
    const playerId = String(body.playerId ?? "");

    if (!playerId) {
      return NextResponse.json({ error: "playerId required" }, { status: 400 });
    }

    switch (action) {
      case "join": {
        const room = await joinRoom(
          roomId,
          playerId,
          String(body.playerName ?? "Guest"),
        );
        return NextResponse.json({ room: toRoomView(room, playerId) });
      }
      case "ready": {
        const room = await setReady(roomId, playerId, Boolean(body.ready));
        return NextResponse.json({ room: toRoomView(room, playerId) });
      }
      case "start": {
        const room = await startGame(roomId, playerId);
        return NextResponse.json({ room: toRoomView(room, playerId) });
      }
      case "play": {
        const cards = (body.cards ?? []) as Card[];
        if (!Array.isArray(cards) || cards.length === 0) {
          return NextResponse.json(
            { error: "cards required" },
            { status: 400 },
          );
        }
        const room = await playCards(
          roomId,
          playerId,
          cards,
          body.turnVersion != null ? Number(body.turnVersion) : undefined,
        );
        return NextResponse.json({ room: toRoomView(room, playerId) });
      }
      case "pass": {
        const room = await passTurn(
          roomId,
          playerId,
          body.turnVersion != null ? Number(body.turnVersion) : undefined,
        );
        return NextResponse.json({ room: toRoomView(room, playerId) });
      }
      case "rematch": {
        const room = await rematchRoom(roomId, playerId);
        return NextResponse.json({ room: toRoomView(room, playerId) });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed";
    const status =
      message === "Room not found"
        ? 404
        : message === "Room is full" ||
            message === "Game already started" ||
            message === "Stale turn — refresh and try again"
          ? 409
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

import { usingRedis } from "./store";
import type { Room, RoomView } from "./types";

function publicPlayers(room: Room) {
  return room.players.map((p) => ({
    ...p,
    cardCount: room.hands[p.id]?.length ?? p.cardCount,
  }));
}

function baseView(room: Room): Omit<RoomView, "hand" | "you"> {
  return {
    id: room.id,
    revision: room.revision,
    status: room.status,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    players: publicPlayers(room),
    pile: room.pile,
    pileType: room.pileType,
    currentPlayerId: room.currentPlayerId,
    lastPlayPlayerId: room.lastPlayPlayerId,
    passesInRow: room.passesInRow,
    turnVersion: room.turnVersion,
    requireThreeSpades: room.requireThreeSpades,
    winners: room.winners,
    lastEvent: room.lastEvent,
    startedAt: room.startedAt,
    createdAt: room.createdAt,
    usingRedis: usingRedis(),
  };
}

/** Snapshot with no private hand — safe for invite pages and strangers. */
export function toPublicView(room: Room): RoomView {
  return {
    ...baseView(room),
    hand: [],
    you: null,
  };
}

/** Snapshot for a seated player: only that player's hand is included. */
export function toRoomView(room: Room, playerId: string): RoomView {
  const seated = room.players.some((p) => p.id === playerId);
  return {
    ...baseView(room),
    hand: seated ? (room.hands[playerId] ?? []) : [],
    you: seated ? playerId : null,
  };
}

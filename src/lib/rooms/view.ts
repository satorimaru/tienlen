import type { Room, RoomView } from "./types";

export function toRoomView(room: Room, playerId: string): RoomView {
  return {
    id: room.id,
    status: room.status,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    players: room.players.map((p) => ({
      ...p,
      // Recompute cardCount from hands for consistency
      cardCount: room.hands[p.id]?.length ?? p.cardCount,
    })),
    hand: room.hands[playerId] ?? [],
    pile: room.pile,
    pileType: room.pileType,
    currentPlayerId: room.currentPlayerId,
    lastPlayPlayerId: room.lastPlayPlayerId,
    passesInRow: room.passesInRow,
    turnVersion: room.turnVersion,
    requireThreeSpades: room.requireThreeSpades,
    winners: room.winners,
    startedAt: room.startedAt,
    createdAt: room.createdAt,
    you: playerId,
  };
}

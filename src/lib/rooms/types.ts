import type { Card, ComboType } from "@/lib/tienlen/types";

export type RoomStatus = "waiting" | "playing" | "finished";

export interface RoomPlayer {
  id: string;
  name: string;
  seat: number;
  ready: boolean;
  /** Cards left (public). Full hand only in Room.hands. */
  cardCount: number;
  /** Finish place 1..n when out; null if still playing. */
  finishOrder: number | null;
}

export interface Room {
  id: string;
  status: RoomStatus;
  hostId: string;
  maxPlayers: 2 | 3 | 4;
  players: RoomPlayer[];
  /** Full hands keyed by player id — never send all hands to every client. */
  hands: Record<string, Card[]>;
  pile: Card[];
  pileType: ComboType | null;
  currentPlayerId: string | null;
  lastPlayPlayerId: string | null;
  passesInRow: number;
  turnVersion: number;
  requireThreeSpades: boolean;
  /** Ordered player ids by finish place. */
  winners: string[];
  startedAt: number | null;
  createdAt: number;
}

/** Client-safe view: only your hand is included. */
export interface RoomView {
  id: string;
  status: RoomStatus;
  hostId: string;
  maxPlayers: 2 | 3 | 4;
  players: RoomPlayer[];
  hand: Card[];
  pile: Card[];
  pileType: ComboType | null;
  currentPlayerId: string | null;
  lastPlayPlayerId: string | null;
  passesInRow: number;
  turnVersion: number;
  requireThreeSpades: boolean;
  winners: string[];
  startedAt: number | null;
  createdAt: number;
  you: string;
}

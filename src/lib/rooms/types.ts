import type { Card, ComboType } from "@/lib/tienlen/types";

export type RoomStatus = "waiting" | "playing" | "finished";

export interface RoomPlayer {
  id: string;
  name: string;
  seat: number;
  ready: boolean;
  cardCount: number;
  /** Finish place 1..n when out; null if still playing. */
  finishOrder: number | null;
  lastSeenAt: number;
}

export type RoomEvent =
  | { kind: "join"; playerId: string }
  | { kind: "leave"; playerId: string }
  | { kind: "ready"; playerId: string; ready: boolean }
  | { kind: "start" }
  | { kind: "play"; playerId: string; comboType: ComboType; cards: Card[] }
  | { kind: "pass"; playerId: string }
  | { kind: "rematch" };

export interface Room {
  id: string;
  revision: number;
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
  /** Opening lead must include this card; null after the first play. */
  leadCard: Card | null;
  winners: string[];
  lastEvent: RoomEvent | null;
  startedAt: number | null;
  createdAt: number;
}

export interface RoomView {
  id: string;
  revision: number;
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
  leadCard: Card | null;
  winners: string[];
  lastEvent: RoomEvent | null;
  startedAt: number | null;
  createdAt: number;
  you: string | null;
  usingRedis: boolean;
}

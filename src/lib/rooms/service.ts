import { customAlphabet } from "nanoid";
import { detectCombo } from "@/lib/tienlen/combos";
import {
  applyPass,
  applyPlay,
  createHandState,
  isGameFinished,
  lowestCardInPlay,
  type HandState,
  validatePass,
  validatePlay,
} from "@/lib/tienlen/engine";
import { parseCardId, type Card } from "@/lib/tienlen/types";
import { RoomError } from "./errors";
import { deleteRoom, getRoom, saveRoom, updateRoom, withRoomLock } from "./store";
import type { Room, RoomPlayer } from "./types";

const roomCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

function now(): number {
  return Date.now();
}

function makePlayer(id: string, name: string, seat: number): RoomPlayer {
  return {
    id,
    name: name.trim().slice(0, 24) || "Player",
    seat,
    ready: false,
    cardCount: 0,
    finishOrder: null,
    lastSeenAt: now(),
  };
}

function playerById(room: Room, playerId: string): RoomPlayer | null {
  return room.players.find((p) => p.id === playerId) ?? null;
}

function requirePlayer(room: Room, playerId: string): RoomPlayer {
  const player = playerById(room, playerId);
  if (!player) throw new RoomError("Not a player in this room", 403);
  return player;
}

function touch(room: Room, playerId: string): void {
  const player = playerById(room, playerId);
  if (player) player.lastSeenAt = now();
}

function reseat(room: Room): void {
  room.players.forEach((p, i) => {
    p.seat = i;
  });
}

function handStateFromRoom(room: Room): HandState {
  const hands: Card[][] = Array.from({ length: room.players.length }, () => []);
  for (const p of room.players) {
    hands[p.seat] = room.hands[p.id] ?? [];
  }

  const pile =
    room.pile.length > 0 && room.pileType ? detectCombo(room.pile) : null;

  const finishOrder = room.players
    .filter((p) => p.finishOrder != null)
    .sort((a, b) => (a.finishOrder ?? 0) - (b.finishOrder ?? 0))
    .map((p) => p.seat);

  const current = room.players.find((p) => p.id === room.currentPlayerId);
  const last = room.players.find((p) => p.id === room.lastPlayPlayerId);

  return {
    hands,
    pile,
    currentSeat: current?.seat ?? 0,
    lastPlaySeat: last?.seat ?? null,
    passesInRow: room.passesInRow,
    finishOrder,
    leadCard: room.leadCard,
    playerCount: room.players.length,
  };
}

function applyHandStateToRoom(room: Room, state: HandState): void {
  for (const p of room.players) {
    room.hands[p.id] = state.hands[p.seat] ?? [];
    p.cardCount = room.hands[p.id].length;
    const place = state.finishOrder.indexOf(p.seat);
    p.finishOrder = place >= 0 ? place + 1 : null;
  }

  room.pile = state.pile?.cards ?? [];
  room.pileType = state.pile?.type ?? null;
  room.passesInRow = state.passesInRow;
  room.leadCard = state.leadCard;
  room.turnVersion += 1;

  const cur = room.players.find((p) => p.seat === state.currentSeat);
  room.currentPlayerId = cur?.id ?? null;

  if (state.lastPlaySeat != null) {
    const last = room.players.find((p) => p.seat === state.lastPlaySeat);
    room.lastPlayPlayerId = last?.id ?? null;
  } else {
    room.lastPlayPlayerId = null;
  }

  room.winners = state.finishOrder.map(
    (seat) => room.players.find((p) => p.seat === seat)!.id,
  );

  if (isGameFinished(state)) {
    room.status = "finished";
  }
}

export function parseCards(input: unknown): Card[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new RoomError("cards required", 400);
  }

  const cards: Card[] = [];
  for (const item of input) {
    if (typeof item === "string") {
      const card = parseCardId(item);
      if (!card) throw new RoomError("Invalid card", 400);
      cards.push(card);
      continue;
    }
    if (item && typeof item === "object" && "rank" in item && "suit" in item) {
      const raw = item as { rank: unknown; suit: unknown };
      const card = parseCardId(`${String(raw.rank)}${String(raw.suit)}`);
      if (!card) throw new RoomError("Invalid card", 400);
      cards.push(card);
      continue;
    }
    throw new RoomError("Invalid card", 400);
  }
  return cards;
}

export async function createRoom(
  hostId: string,
  hostName: string,
  maxPlayers: 2 | 3 | 4 = 4,
): Promise<Room> {
  if (![2, 3, 4].includes(maxPlayers)) {
    throw new RoomError("maxPlayers must be 2, 3, or 4", 400);
  }
  if (!hostId.trim()) {
    throw new RoomError("playerId required", 400);
  }

  const room: Room = {
    id: roomCode(),
    revision: 1,
    status: "waiting",
    hostId,
    maxPlayers,
    players: [makePlayer(hostId, hostName || "Host", 0)],
    hands: {},
    pile: [],
    pileType: null,
    currentPlayerId: null,
    lastPlayPlayerId: null,
    passesInRow: 0,
    turnVersion: 0,
    leadCard: null,
    winners: [],
    lastEvent: { kind: "join", playerId: hostId },
    startedAt: null,
    createdAt: now(),
  };

  await saveRoom(room);
  return room;
}

const HEARTBEAT_MS = 4000;

export async function getRoomForPlayer(
  roomId: string,
  playerId?: string,
): Promise<Room> {
  const room = await getRoom(roomId);
  if (!room) throw new RoomError("Room not found", 404);
  if (!playerId) return room;

  const seated = playerById(room, playerId);
  if (!seated) return room;
  if (now() - seated.lastSeenAt < HEARTBEAT_MS) return room;

  return withRoomLock(roomId, async () => {
    const latest = await getRoom(roomId);
    if (!latest) throw new RoomError("Room not found", 404);
    const player = playerById(latest, playerId);
    if (player && now() - player.lastSeenAt >= HEARTBEAT_MS) {
      player.lastSeenAt = now();
      await saveRoom(latest);
    }
    return latest;
  });
}

export async function joinRoom(
  roomId: string,
  playerId: string,
  playerName: string,
): Promise<Room> {
  return updateRoom(roomId, (room) => {
    touch(room, playerId);
    if (playerById(room, playerId)) return;

    if (room.status !== "waiting") {
      throw new RoomError("Game already started", 409);
    }
    if (room.players.length >= room.maxPlayers) {
      throw new RoomError("Room is full", 409);
    }

    room.players.push(
      makePlayer(playerId, playerName || "Guest", room.players.length),
    );
    room.lastEvent = { kind: "join", playerId };
  });
}

export async function leaveRoom(
  roomId: string,
  playerId: string,
): Promise<Room | null> {
  return withRoomLock(roomId, async () => {
    const room = await getRoom(roomId);
    if (!room) throw new RoomError("Room not found", 404);

    const player = requirePlayer(room, playerId);
    if (room.status === "playing") {
      throw new RoomError("Cannot leave in the middle of a hand", 409);
    }

    room.players = room.players.filter((p) => p.id !== playerId);
    delete room.hands[player.id];
    room.lastEvent = { kind: "leave", playerId };
    room.revision += 1;

    if (room.players.length === 0) {
      await deleteRoom(roomId);
      return null;
    }

    reseat(room);
    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
    }
    if (room.status === "finished") {
      room.status = "waiting";
      room.hands = {};
      room.pile = [];
      room.pileType = null;
      room.currentPlayerId = null;
      room.lastPlayPlayerId = null;
      room.passesInRow = 0;
      room.turnVersion = 0;
      room.leadCard = null;
      room.winners = [];
      room.startedAt = null;
      for (const p of room.players) {
        p.ready = false;
        p.cardCount = 0;
        p.finishOrder = null;
      }
    }

    await saveRoom(room);
    return room;
  });
}

export async function setReady(
  roomId: string,
  playerId: string,
  ready: boolean,
): Promise<Room> {
  return updateRoom(roomId, (room) => {
    if (room.status !== "waiting") {
      throw new RoomError("Game already started", 409);
    }
    const player = requirePlayer(room, playerId);
    player.ready = ready;
    touch(room, playerId);
    room.lastEvent = { kind: "ready", playerId, ready };
  });
}

export async function startGame(
  roomId: string,
  playerId: string,
): Promise<Room> {
  return updateRoom(roomId, (room) => {
    if (room.hostId !== playerId) {
      throw new RoomError("Only the host can start", 403);
    }
    if (room.status !== "waiting") {
      throw new RoomError("Game already started", 409);
    }
    if (room.players.length < 2) {
      throw new RoomError("Need at least 2 players", 400);
    }
    if (room.players.some((p) => !p.ready)) {
      throw new RoomError("All players must be ready", 400);
    }

    reseat(room);
    const state = createHandState(room.players.length);
    room.status = "playing";
    room.startedAt = now();
    room.winners = [];
    room.turnVersion = 0;
    room.hands = {};
    room.lastEvent = { kind: "start" };

    for (const p of room.players) {
      p.finishOrder = null;
      p.ready = false;
      room.hands[p.id] = state.hands[p.seat] ?? [];
      p.cardCount = room.hands[p.id].length;
    }

    room.pile = [];
    room.pileType = null;
    room.passesInRow = 0;
    room.lastPlayPlayerId = null;
    assignOpeningLead(room);
    touch(room, playerId);
  });
}

function assignOpeningLead(room: Room): void {
  const bySeat: Card[][] = Array.from(
    { length: room.players.length },
    () => [],
  );
  for (const p of room.players) {
    bySeat[p.seat] = room.hands[p.id] ?? [];
  }
  const opening = lowestCardInPlay(bySeat);
  if (!opening) {
    room.currentPlayerId = room.players[0]?.id ?? null;
    room.leadCard = null;
    return;
  }
  const player = room.players.find((p) => p.seat === opening.seat);
  room.currentPlayerId = player?.id ?? null;
  room.leadCard = opening.card;
}

function assertFreshTurn(room: Room, expectedVersion?: number): void {
  if (expectedVersion != null && expectedVersion !== room.turnVersion) {
    throw new RoomError("Stale turn — refresh and try again", 409);
  }
}

export async function playCards(
  roomId: string,
  playerId: string,
  cards: Card[],
  expectedVersion?: number,
): Promise<Room> {
  return updateRoom(roomId, (room) => {
    if (room.status !== "playing") {
      throw new RoomError("Game not in progress", 409);
    }
    assertFreshTurn(room, expectedVersion);
    const player = requirePlayer(room, playerId);
    touch(room, playerId);

    const state = handStateFromRoom(room);
    const check = validatePlay(state, player.seat, cards);
    if (!check.ok) throw new RoomError(check.error, 400);

    const next = applyPlay(state, player.seat, cards);
    applyHandStateToRoom(room, next);
    room.lastEvent = {
      kind: "play",
      playerId,
      comboType: check.combo.type,
      cards,
    };
  });
}

export async function passTurn(
  roomId: string,
  playerId: string,
  expectedVersion?: number,
): Promise<Room> {
  return updateRoom(roomId, (room) => {
    if (room.status !== "playing") {
      throw new RoomError("Game not in progress", 409);
    }
    assertFreshTurn(room, expectedVersion);
    const player = requirePlayer(room, playerId);
    touch(room, playerId);

    const state = handStateFromRoom(room);
    const check = validatePass(state, player.seat);
    if (!check.ok) throw new RoomError(check.error, 400);

    const next = applyPass(state, player.seat);
    applyHandStateToRoom(room, next);
    room.lastEvent = { kind: "pass", playerId };
  });
}

export async function rematchRoom(
  roomId: string,
  playerId: string,
): Promise<Room> {
  return updateRoom(roomId, (room) => {
    requirePlayer(room, playerId);
    if (room.status === "playing") {
      throw new RoomError("Finish the hand before a rematch", 409);
    }

    room.status = "waiting";
    room.hands = {};
    room.pile = [];
    room.pileType = null;
    room.currentPlayerId = null;
    room.lastPlayPlayerId = null;
    room.passesInRow = 0;
    room.turnVersion = 0;
    room.leadCard = null;
    room.winners = [];
    room.startedAt = null;
    room.lastEvent = { kind: "rematch" };
    touch(room, playerId);

    for (const p of room.players) {
      p.ready = false;
      p.cardCount = 0;
      p.finishOrder = null;
    }
  });
}

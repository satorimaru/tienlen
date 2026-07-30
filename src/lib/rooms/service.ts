import { nanoid } from "nanoid";
import { detectCombo } from "@/lib/tienlen/combos";
import {
  applyPass,
  applyPlay,
  createHandState,
  isGameFinished,
  type HandState,
  validatePass,
  validatePlay,
} from "@/lib/tienlen/engine";
import type { Card } from "@/lib/tienlen/types";
import { getRoom, saveRoom } from "./store";
import type { Room, RoomPlayer } from "./types";

function makePlayer(id: string, name: string, seat: number): RoomPlayer {
  return {
    id,
    name: name.trim().slice(0, 24) || "Player",
    seat,
    ready: false,
    cardCount: 0,
    finishOrder: null,
  };
}

function playerById(room: Room, playerId: string): RoomPlayer | null {
  return room.players.find((p) => p.id === playerId) ?? null;
}

function handStateFromRoom(room: Room): HandState {
  const hands: Card[][] = Array.from({ length: room.players.length }, () => []);
  for (const p of room.players) {
    hands[p.seat] = room.hands[p.id] ?? [];
  }

  const pileCards = room.pile;
  let pile = null as HandState["pile"];
  if (pileCards.length > 0 && room.pileType) {
    pile = detectCombo(pileCards);
  }

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
    requireThreeSpades: room.requireThreeSpades,
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
  room.requireThreeSpades = state.requireThreeSpades;
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

export async function createRoom(
  hostId: string,
  hostName: string,
  maxPlayers: 2 | 3 | 4 = 4,
): Promise<Room> {
  if (![2, 3, 4].includes(maxPlayers)) {
    throw new Error("maxPlayers must be 2, 3, or 4");
  }

  const room: Room = {
    id: nanoid(10),
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
    requireThreeSpades: true,
    winners: [],
    startedAt: null,
    createdAt: Date.now(),
  };

  await saveRoom(room);
  return room;
}

export async function joinRoom(
  roomId: string,
  playerId: string,
  playerName: string,
): Promise<Room> {
  const room = await getRoom(roomId);
  if (!room) throw new Error("Room not found");

  if (playerById(room, playerId)) return room;

  if (room.status !== "waiting") {
    throw new Error("Game already started");
  }
  if (room.players.length >= room.maxPlayers) {
    throw new Error("Room is full");
  }

  const seat = room.players.length;
  room.players.push(makePlayer(playerId, playerName || "Guest", seat));
  await saveRoom(room);
  return room;
}

export async function setReady(
  roomId: string,
  playerId: string,
  ready: boolean,
): Promise<Room> {
  const room = await getRoom(roomId);
  if (!room) throw new Error("Room not found");
  if (room.status !== "waiting") throw new Error("Game already started");

  const player = playerById(room, playerId);
  if (!player) throw new Error("Not a player in this room");

  player.ready = ready;
  await saveRoom(room);
  return room;
}

export async function startGame(
  roomId: string,
  playerId: string,
): Promise<Room> {
  const room = await getRoom(roomId);
  if (!room) throw new Error("Room not found");
  if (room.hostId !== playerId) throw new Error("Only the host can start");
  if (room.status !== "waiting") throw new Error("Game already started");
  if (room.players.length < 2) {
    throw new Error("Need at least 2 players");
  }

  const notReady = room.players.filter((p) => !p.ready);
  // Host can start if all seated players are ready (or force if all ready except host auto)
  if (notReady.length > 0) {
    throw new Error("All players must be ready");
  }

  const state = createHandState(room.players.length);
  room.status = "playing";
  room.startedAt = Date.now();
  room.winners = [];
  room.turnVersion = 0;

  for (const p of room.players) {
    p.finishOrder = null;
    p.ready = false;
    room.hands[p.id] = state.hands[p.seat];
    p.cardCount = state.hands[p.seat].length;
  }

  room.pile = [];
  room.pileType = null;
  room.passesInRow = 0;
  room.requireThreeSpades = true;
  room.lastPlayPlayerId = null;

  const leader = room.players.find((p) => p.seat === state.currentSeat);
  room.currentPlayerId = leader?.id ?? room.players[0].id;

  await saveRoom(room);
  return room;
}

export async function playCards(
  roomId: string,
  playerId: string,
  cards: Card[],
  expectedVersion?: number,
): Promise<Room> {
  const room = await getRoom(roomId);
  if (!room) throw new Error("Room not found");
  if (room.status !== "playing") throw new Error("Game not in progress");

  if (
    expectedVersion != null &&
    expectedVersion !== room.turnVersion
  ) {
    throw new Error("Stale turn — refresh and try again");
  }

  const player = playerById(room, playerId);
  if (!player) throw new Error("Not a player in this room");

  const state = handStateFromRoom(room);
  const check = validatePlay(state, player.seat, cards);
  if (!check.ok) throw new Error(check.error);

  const next = applyPlay(state, player.seat, cards);
  applyHandStateToRoom(room, next);
  await saveRoom(room);
  return room;
}

export async function passTurn(
  roomId: string,
  playerId: string,
  expectedVersion?: number,
): Promise<Room> {
  const room = await getRoom(roomId);
  if (!room) throw new Error("Room not found");
  if (room.status !== "playing") throw new Error("Game not in progress");

  if (
    expectedVersion != null &&
    expectedVersion !== room.turnVersion
  ) {
    throw new Error("Stale turn — refresh and try again");
  }

  const player = playerById(room, playerId);
  if (!player) throw new Error("Not a player in this room");

  const state = handStateFromRoom(room);
  const check = validatePass(state, player.seat);
  if (!check.ok) throw new Error(check.error);

  const next = applyPass(state, player.seat);
  applyHandStateToRoom(room, next);
  await saveRoom(room);
  return room;
}

export async function rematchRoom(
  roomId: string,
  playerId: string,
): Promise<Room> {
  const room = await getRoom(roomId);
  if (!room) throw new Error("Room not found");
  if (!playerById(room, playerId)) throw new Error("Not a player in this room");

  room.status = "waiting";
  room.hands = {};
  room.pile = [];
  room.pileType = null;
  room.currentPlayerId = null;
  room.lastPlayPlayerId = null;
  room.passesInRow = 0;
  room.turnVersion = 0;
  room.requireThreeSpades = true;
  room.winners = [];
  room.startedAt = null;

  for (const p of room.players) {
    p.ready = false;
    p.cardCount = 0;
    p.finishOrder = null;
  }

  await saveRoom(room);
  return room;
}

import { Redis } from "@upstash/redis";
import type { Room } from "./types";

const ROOM_TTL_SECONDS = 60 * 60 * 24; // 24h
const KEY_PREFIX = "tl:room:";

function hasRedis(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getRedis(): Redis {
  return Redis.fromEnv();
}

/** In-memory fallback for local dev without Upstash. */
const memory = globalThis as typeof globalThis & {
  __tienlenRooms?: Map<string, Room>;
};

function memMap(): Map<string, Room> {
  if (!memory.__tienlenRooms) {
    memory.__tienlenRooms = new Map();
  }
  return memory.__tienlenRooms;
}

export async function getRoom(id: string): Promise<Room | null> {
  if (hasRedis()) {
    const data = await getRedis().get<Room>(KEY_PREFIX + id);
    return data ?? null;
  }
  return memMap().get(id) ?? null;
}

export async function saveRoom(room: Room): Promise<void> {
  if (hasRedis()) {
    await getRedis().set(KEY_PREFIX + room.id, room, {
      ex: ROOM_TTL_SECONDS,
    });
    return;
  }
  memMap().set(room.id, room);
}

export async function deleteRoom(id: string): Promise<void> {
  if (hasRedis()) {
    await getRedis().del(KEY_PREFIX + id);
    return;
  }
  memMap().delete(id);
}

export function usingRedis(): boolean {
  return hasRedis();
}

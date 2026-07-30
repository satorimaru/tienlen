# Tiến Lên (13) — Online Multiplayer

Browser multiplayer **Tiến Lên** (Thirteen), the classic Vietnamese climbing card game.

- **2–4 players** · Southern (Miền Nam) rules · bombs vs 2s  
- **Next.js** + **Upstash Redis** · deploy on **Vercel**  
- Room codes + invite links · no accounts (display name only)

## Stack

| Layer | Tech |
|-------|------|
| UI | Next.js App Router, React, Tailwind CSS |
| Game logic | Pure TypeScript engine (`src/lib/tienlen`) |
| Rooms | Upstash Redis JSON (`src/lib/rooms`) with in-memory fallback |
| Hosting | Vercel + GitHub |

## Local development

```bash
cd documents/tienlen
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Upstash env vars, rooms live **in memory** (fine for one machine / two browser tabs on the same `next dev` process).

### Multiplayer with Upstash (recommended)

1. Create a Redis DB at [console.upstash.com](https://console.upstash.com).
2. Copy REST URL + token into `.env.local`:

```env
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxx
```

3. Restart `npm run dev`.

## Rules (v1)

- **Rank (low → high):** 3 4 5 6 7 8 9 10 J Q K A 2  
- **Suit (low → high):** ♠ ♣ ♦ ♥ → lowest `3♠`, highest `2♥`  
- **Combos:** single, pair, triple, four-of-a-kind, sequence (≥3 consecutive, no 2s), double sequence (≥3 consecutive pairs, no 2s)  
- Beat the pile with the **same shape** and a **higher** top card, or **pass**  
- When everyone else passes, the pile clears and the last player leads freely  
- **Bombs:** four-of-a-kind or double sequence (≥3 pairs) beat a **single 2**  
- First lead of the hand must include **3♠**  
- First player to empty their hand places 1st; play continues for remaining ranks  

Instant-win specials (four 2s, dragon, etc.) are **not** enabled in v1.

## Deploy to Vercel

1. Push this repo to GitHub (public `tienlen`).
2. [Import](https://vercel.com/new) the repo on Vercel.
3. Add env vars `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`  
   (or use **Vercel Marketplace → Upstash** integration).
4. Deploy.

## Project layout

```
src/
  app/                 # pages + API routes
  components/          # Lobby, table, cards
  lib/
    tienlen/           # pure game engine
    rooms/             # Redis store + multiplayer service
    player.ts          # localStorage player id / name
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/rooms` | Create room `{ playerId, playerName, maxPlayers }` |
| `GET` | `/api/rooms/:id?playerId=` | Poll room (filtered hand) |
| `POST` | `/api/rooms/:id` | Actions: `join`, `ready`, `start`, `play`, `pass`, `rematch` |

## License

MIT — play with friends.

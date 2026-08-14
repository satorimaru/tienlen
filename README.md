# Tiến Lên (13) — Online Multiplayer

Browser multiplayer **Tiến Lên** (Thirteen). Create a room, share a 6-character code, play 2–4 friends.

- Southern (Miền Nam) rules · bombs vs 2s
- Next.js + Upstash Redis · deploy on Vercel
- No accounts — a display name and a browser id are enough

## Stack

| Layer | Tech |
|-------|------|
| UI | Next.js App Router, React, Tailwind CSS |
| Game logic | Pure TypeScript engine (`src/lib/tienlen`) |
| Rooms | Upstash Redis with an in-memory fallback (`src/lib/rooms`) |
| Hosting | Vercel + GitHub |

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Upstash env vars, rooms live **in memory** on that one `next dev` process (two browser tabs on the same machine work; two laptops do not).

```bash
npm test
npm run lint
```

### Multiplayer across devices

1. Create a Redis database at [console.upstash.com](https://console.upstash.com).
2. Copy the REST URL and token into `.env.local`:

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
- **Bombs:** four-of-a-kind or 3+ consecutive pairs beat a **single 2**; 4+ pairs beat a pair of 2s; 5+ pairs beat a triple of 2s
- First lead of the hand must include **3♠** when it was dealt. In 2- and 3-player deals some cards are discarded — if 3♠ is out of play, the lowest remaining card leads with no 3♠ requirement
- First player to empty their hand places 1st; play continues for remaining ranks

Instant-win specials (four 2s, dragon, etc.) are **not** enabled in v1.

## Deploy to Vercel

Repo: [github.com/satorimaru/tienlen](https://github.com/satorimaru/tienlen)

1. [Import](https://vercel.com/new) the repo on Vercel (Framework: Next.js).
2. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or **Vercel Marketplace → Upstash**).
3. Deploy.

Without Redis on Vercel, rooms will not stay in sync across serverless instances.

## Project layout

```
src/
  app/                 # pages + API routes
  components/          # lobby, table, cards
  lib/
    tienlen/           # pure game engine
    rooms/             # Redis store + multiplayer service
    player.ts          # localStorage player id / name
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/rooms` | Create room `{ playerId, playerName, maxPlayers }` |
| `GET` | `/api/rooms/:id?playerId=` | Poll room (your hand only; public snapshot if omitted) |
| `POST` | `/api/rooms/:id` | `join`, `leave`, `ready`, `start`, `play`, `pass`, `rematch` |

## License

MIT — play with friends.

# GitHub + Vercel

Source is on GitHub: **https://github.com/satorimaru/tienlen**

Local project: `C:\Users\kianp\documents\tienlen`

## Sync local git (optional)

If you want local `main` to match remote after GitHub CLI login:

```powershell
cd C:\Users\kianp\documents\tienlen
& "C:\Program Files\GitHub CLI\gh.exe" auth login
& "C:\Program Files\Git\bin\git.exe" fetch origin
& "C:\Program Files\Git\bin\git.exe" pull origin main --allow-unrelated-histories
# or force-push local as source of truth:
# & "C:\Program Files\Git\bin\git.exe" push -u origin main --force
```

## Vercel

1. Open https://vercel.com/new and import `satorimaru/tienlen`
2. Add env vars from [Upstash](https://console.upstash.com):
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Deploy

Local multiplayer without Redis: `npm run dev` (in-memory rooms, same machine only).

# Push full source to GitHub

Public repo (partial upload already done via API):  
https://github.com/satorimaru/tienlen

Complete local project:  
`C:\Users\kianp\documents\tienlen`

Git is initialized with a full local commit. Finish the upload after GitHub login:

```powershell
cd C:\Users\kianp\documents\tienlen
& "C:\Program Files\GitHub CLI\gh.exe" auth login
& "C:\Program Files\Git\bin\git.exe" push -u origin main --force
```

Then on [Vercel](https://vercel.com/new): import `satorimaru/tienlen`, add:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

(from [Upstash Console](https://console.upstash.com) or Vercel Marketplace → Upstash)

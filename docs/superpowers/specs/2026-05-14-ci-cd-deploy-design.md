# CI/CD Deploy ke VPS — Design

## Konteks

Project next-absen belum punya CI/CD. Deploy manual ke VPS via SSH + PM2. GitHub Actions dipilih sebagai platform CI/CD.

## Requirements

- **Trigger**: push ke branch `main` + manual via `workflow_dispatch`
- **CI job**: lint + type-check
- **CD job**: SSH ke VPS, git pull, install deps, prisma generate, prisma migrate deploy, build, pm2 restart
- **Database safety**: selalu pakai `prisma migrate deploy` (bukan `db push`) — no data loss, no auto-accept destructive changes
- **Simpel**: tanpa maintenance page, backup, rollback

## Files

| File | Purpose |
|------|---------|
| `.github/workflows/deploy.yml` | GitHub Actions workflow |
| `scripts/safe-deploy.sh` | Deploy script dijalankan di VPS via SSH |
| `ecosystem.config.js` | PM2 config buat `absensi-pkp` |
| `app/api/health/route.ts` | Health check endpoint (`/api/health`) |

## Flow

```
push to main
  → build-and-test (lint, type-check)
    → deploy (SSH ke VPS, jalankan safe-deploy.sh)
      → git fetch + reset --hard
      → npm ci
      → npx prisma generate
      → npx prisma migrate deploy  (safe, no data loss)
      → npm run build
      → pm2 reload absensi-pkp
      → curl health check
```

## Secrets (GitHub)

| Secret | Keterangan |
|--------|------------|
| `SSH_HOST` | VPS hostname/IP |
| `SSH_USER` | VPS user (absen-ssh) |
| `SSH_KEY` | Private SSH key |
| `SSH_PORT` | SSH port (22) |

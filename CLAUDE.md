# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # prisma generate + db push + next dev --port 3004 --hostname 0.0.0.0
npm run build            # prisma generate + next build
npm run clean            # rm -rf .next (see "Stale .next cache" below)
npm run lint             # ESLint --max-warnings 0
npm run type-check       # tsc --noEmit
npm test                 # Jest (ts-jest, node environment)
npm run db:generate      # prisma generate
npm run db:push          # prisma db push (schema changes without migration history)
npm run db:migrate       # prisma migrate dev (creates migration files)
npm run db:studio        # Prisma Studio
npm run db:seed          # seed demo users
npm run db:seed:attendance  # seed attendance data
```

Run a single test file: `npx jest lib/auth.test.ts`

Dev server runs on **port 3004** (not 3000).

### Stale `.next` cache

If `next dev` answers **404 with Next's own HTML error page** on routes that
exist — the giveaway is every `/api/auth/*` endpoint 404ing so login is
impossible, while `next build` + `next start` serve the same routes fine —
the dev cache is stale, not the code. Run `npm run clean`, then `npm run dev`.

`.next` survives Next upgrades and holds dev and production artifacts side by
side, so it can keep entries from a much older layout (this repo carried
compiled `middleware.ts` output months after the file became `proxy.ts`).
Nothing in the app or in next-auth needs changing when this happens.

## Architecture

**Next.js 16 App Router** with TypeScript. MySQL via Prisma v6. next-auth v4 with `CredentialsProvider`.

### API Pattern

Route handlers in `app/api/` are thin shells:
1. Auth check via `validateSession()` (throws `HttpError` on failure)
2. Parse and validate input with Zod
3. Delegate to `services.ts` in the same folder
4. Return `NextResponse.json()`

Services throw `HttpError` (from `lib/errors.ts`) with a `message` and HTTP `status`. Errors bubble up and are caught in route handlers.

### Auth & Session

- Sessions use next-auth with `CredentialsProvider`. The session cookie holds a DB-backed UUID (not a verifiable JWT), so `getToken()` cannot be used in middleware.
- `PersistedSessionToken` stores AES-256-GCM encrypted tokens in the DB.
- Auth for **pages** is enforced in `proxy.ts` by checking cookie presence only (Prisma cannot run in Edge Runtime). Real authorization is enforced per-request inside route handlers via `validateSession()`.
- Auth for **API routes** is handled entirely inside each route handler — the proxy passes all `/api/` requests through.
- `role` and `department` are re-read from the database on every session read (`readSessionToken` in `lib/session-token-store.ts`), not trusted from the stored token — a role change takes effect on the next request, without a re-login.

### Permission System

`lib/permissions.ts` defines `Permission` enum and `rolePermissions` map. Roles: `superadmin > admin > manager > user`. Use `hasPermission(userRole, Permission.X)` in services.

- `superadmin`: all permissions including `ABSENSI_MANAGE`
- `admin`: all except `ABSENSI_MANAGE`
- `manager`: read users, read/create/update attendance, read/export reports, read settings
- `user`: create/read own attendance, read reports

### Proxy (formerly middleware)

Next 16 renamed `middleware.ts` to `proxy.ts`; the file at the repo root is `proxy.ts`. It handles three things:

1. Rate-limits `/api/auth/` POST endpoints (5 req/min per IP).
2. Adds CORS headers (and answers preflight) for `/api/external/` routes.
3. Redirects page requests with no session cookie to `/auth/signin` — presence check only, since Prisma cannot run on the Edge.

Everything under `/api/` otherwise passes straight through; those routes do their own auth.

### Key Schema Details

- `AbsensiRecord` has `@@unique([userId, date])` — one record per user per day.
- GPS coordinates (`checkInLatitude`, etc.) use `Prisma.Decimal` — never `Float`.
- Soft delete: set `isActive: false` on users, never hard-delete.
- `ActivityLog` must be written manually via `prisma.activityLog.create()` after write operations.
- `Setting` is a generic key-value store (key unique, value Json). `SystemSettings` holds structured config (businessHours, location, notifications, security as Json fields).
- `ApiKey` model supports external API access with scoped keys.

### External API

`/api/external/` routes are authenticated via `x-api-key` header and open to CORS. These serve third-party integrations.

## Code Style

- Functional and declarative TypeScript; avoid classes.
- Descriptive variable names with auxiliary verbs (`isLoading`, `hasError`).
- Minimize `'use client'`, `useEffect`, `useState` — prefer React Server Components.
- Use early returns for error conditions; guard clauses before business logic.
- Validate Zod schemas at API boundaries.
- Before adding `orderBy` to `findFirst` queries, check schema for unique constraints that make sorting redundant.

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | MySQL connection string |
| `NEXTAUTH_SECRET` | Yes | next-auth secret + fallback session encryption key |
| `SESSION_TOKEN_ENCRYPTION_KEY` | No | 32-byte hex/base64 key for session token encryption |
| `GOOGLE_MAPS_API_KEY` | No | Reverse geocoding |
| `SESSION_MAX_AGE_SECONDS` | No | Override JWT lifetime (default 30 days) |
| `SESSION_UPDATE_AGE_SECONDS` | No | Override session refresh interval (default 12h) |

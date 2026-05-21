# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # prisma generate + db push + next dev --port 3004 --hostname 0.0.0.0
npm run build            # prisma generate + next build
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

## Architecture

**Next.js 15 App Router** with TypeScript. MySQL via Prisma v6. next-auth v4 with `CredentialsProvider`.

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
- Auth for **pages** is enforced in `middleware.ts` by checking cookie presence only (Prisma cannot run in Edge Runtime). Real authorization is enforced per-request inside route handlers via `validateSession()`.
- Auth for **API routes** is handled entirely inside each route handler — middleware passes all `/api/` requests through.

### Permission System

`lib/permissions.ts` defines `Permission` enum and `rolePermissions` map. Roles: `superadmin > admin > manager > user`. Use `hasPermission(userRole, Permission.X)` in services.

- `superadmin`: all permissions including `ABSENSI_MANAGE`
- `admin`: all except `ABSENSI_MANAGE`
- `manager`: read users, read/create/update attendance, read/export reports, read settings
- `user`: create/read own attendance, read reports

### Middleware

`middleware.ts` handles only two things: rate-limiting `/api/auth/` POST endpoints (5 req/min per IP) and adding CORS headers to `/api/external/` routes.

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

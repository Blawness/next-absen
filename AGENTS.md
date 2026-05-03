# AGENTS.md — next-absen

## Commands

```bash
npm run dev              # prisma generate + db push + next dev --port 3004
npm run build            # prisma generate + next build
npm run lint             # ESLint (next/core-web-vitals + next/typescript)
npm run type-check       # tsc --noEmit
npm test                # Jest (ts-jest, node environment)
npm run db:generate      # prisma generate
npm run db:push          # prisma db push
npm run db:migrate       # prisma migrate dev
npm run db:studio        # prisma studio
npm run db:seed          # tsx prisma/seed.ts
npm run db:seed:attendance # tsx prisma/seed-attendance.ts
```

- Dev server runs on **port 3004**, not 3000.
- Before building or running dev, run `npm run db:generate` (it's baked into `dev` and `build`).

## Architecture

- **Next.js 15 App Router** (not Pages Router) with TypeScript.
- **MySQL** with **Prisma** ORM (`@prisma/client` v6).
- **next-auth v3** with `CredentialsProvider`. JWT sessions but persisted in DB (`PersistedSessionToken` model) using AES-256-GCM encryption. Default session lifetime is 10 years.
- **shadcn/ui** (Radix UI primitives) + Tailwind CSS.
- **Leaflet** (via `react-leaflet`) for GPS maps.
- Path alias `@/*` → root directory.
- No `middleware.ts` — auth checks happen in each route handler via `getServerSession(authOptions)`.
- **Database**: `datasource db { provider = "mysql" }` — needs `DATABASE_URL` env var.

## Project Layout

```
app/                  # Next.js App Router pages & routes
  api/                # API routes (auth, users, attendance, reports, settings, kpi, etc.)
    {resource}/       # Each resource has route.ts for CRUD
      {action}/       # Sub-actions get their own folder with route.ts
      services.ts     # Business logic extracted from route handlers
components/
  layout/             # AppLayout, Sidebar
  providers/          # SessionProvider (next-auth wrapper)
  ui/                 # shadcn components (data-table, map, etc.)
lib/                  # auth.ts, prisma.ts, permissions.ts, location.ts, utils.ts, constants.ts
prisma/
  schema.prisma       # Single source of truth for DB models
  seed.ts             # Demo users (admin@demo.com, manager@demo.com, user1-5@demo.com)
types/                # next-auth.d.ts, data-table-types.ts
documentation/        # Design docs (may be outdated — trust the code)
```

## Key Patterns

- **API pattern**: Route handlers are thin — auth check → parse input → delegate to `services.ts` → return `NextResponse.json()`. Services throw `HttpError` (custom class with `message` + `status`).
- **Activity logging**: Manual via `prisma.activityLog.create()` after write operations (not automatic).
- **Soft delete**: Setting `isActive: false` on users (never hard-delete).
- **Prisma Decimal for GPS**: `AbsensiRecord.checkInLatitude` etc. use `Decimal` (not `Float`).
- **Password hashing**: `bcryptjs` with salt 12.
- **Permission system**: `lib/permissions.ts` — check `hasPermission(userRole, Permission.X)` in services.

## Schema Notes

- `AbsensiRecord` has `@@unique([userId, date])` — one record per user per day.
- `ActivityLog.details` is `Json` type.
- `Setting` is a key-value store (key unique, value Json).
- `SystemSettings` stores businessHours, location, notifications, security as Json fields.

## Environment

- `DATABASE_URL` — MySQL connection
- `NEXTAUTH_SECRET` — next-auth secret (also used as fallback encryption key)
- `SESSION_TOKEN_ENCRYPTION_KEY` — optional 32-byte key (hex or base64) for session encryption
- `GOOGLE_MAPS_API_KEY` — for reverse geocoding
- `SESSION_MAX_AGE_SECONDS` / `SESSION_UPDATE_AGE_SECONDS` — overrides for JWT lifetime

## Existing Instruction Sources

- `.cursor/rules/general-rules.mdc` — code style guidelines
- `.jules/bolt.md` — historical learning (avoid redundant orderBy on unique constraints)
- `documentation/` — design docs; trust executable code over prose when they conflict

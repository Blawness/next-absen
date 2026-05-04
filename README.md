# next-absen

Attendance management system built with Next.js 15 App Router, MySQL, and Prisma ORM.

## Features

- **Attendance tracking** — GPS check-in/out with Leaflet maps and reverse geocoding
- **Role-based access** — admin, manager, and user roles with granular permissions
- **Reports & KPIs** — attendance analytics and export functionality
- **Activity logging** — audit trail for all write operations
- **Session persistence** — JWT sessions stored in DB with AES-256-GCM encryption

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL 8+

### Setup

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` — MySQL connection string
- `NEXTAUTH_SECRET` — secret for session encryption

Optional:
- `SESSION_TOKEN_ENCRYPTION_KEY` — 32-byte hex/base64 key for session encryption
- `GOOGLE_MAPS_API_KEY` — for reverse geocoding
- `SESSION_MAX_AGE_SECONDS` — override default session lifetime (10 years)

3. Initialize the database:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3004](http://localhost:3004).

### Demo Users

| Email | Password | Role |
|-------|----------|------|
| admin@demo.com | password | admin |
| manager@demo.com | password | manager |
| user1@demo.com | password | user |

## Commands

```bash
npm run dev              # prisma generate + db push + next dev
npm run build            # prisma generate + next build
npm run lint             # ESLint (--max-warnings 0)
npm run type-check       # tsc --noEmit
npm test                # Jest
npm run db:studio        # Prisma Studio
npm run db:seed          # Seed demo users
npm run db:seed:attendance  # Seed attendance data
```

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **UI**: shadcn/ui, Radix UI, Tailwind CSS, Framer Motion, Lucide icons
- **Database**: MySQL, Prisma ORM v6
- **Auth**: next-auth v4 (CredentialsProvider)
- **Maps**: Leaflet, react-leaflet
- **Validation**: Zod
- **Testing**: Jest, ts-jest

## Architecture

Route handlers are thin — they delegate to `services.ts` files for business logic. Auth checks use `getServerSession()` in each handler (no middleware). GPS coordinates use `Prisma.Decimal` for precision. Soft deletes set `isActive: false` on users.

## Project Structure

```
app/          # Next.js App Router pages & API routes
components/   # shadcn/ui primitives, layout, providers
lib/          # auth, prisma, permissions, utilities
prisma/       # schema, seeds
types/        # TypeScript declarations
```

See `AGENTS.md` for detailed development guidance.

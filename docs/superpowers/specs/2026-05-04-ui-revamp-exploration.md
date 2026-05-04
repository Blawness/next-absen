# UI Revamp — Exploration Findings
> Date: 2026-05-04 | Phase: Brainstorming — Step 1 (Explore Project Context)

---

## Current Architecture Overview

**Stack**: Next.js 15 App Router + TypeScript + MySQL/Prisma + next-auth v4
**UI**: shadcn/ui (Radix) + Tailwind CSS v4 + framer-motion + Leaflet + lucide-react
**Pattern**: 100% Client-Side Rendering (CSR) — all 8 pages are `"use client"`

---

## Page Routes

| Route | Purpose | Lines |
|-------|---------|-------|
| `/` | Redirect to `/auth/signin` | 20 |
| `/auth/signin` | Email + password login | ~200 |
| `/dashboard` | Today's attendance + GPS map + activity log | **714** |
| `/dashboard/kpi` | KPI analytics (weekly/monthly) | ~350 |
| `/attendance` | Check-in/out + GPS + history | **540** |
| `/reports` | Filterable attendance reports + CSV export | ~400 |
| `/users` | User CRUD + bulk actions + advanced data table | **546** |
| `/profile` | Edit profile + change password | ~400 |
| `/settings` | System settings (4 tabs) | ~300 |
| `/activity-logs` | Paginated activity timeline | ~150 |

---

## Heavy Dependencies

| Package | Size | Used In | Concern |
|---------|------|---------|---------|
| **framer-motion** | 3.3 MB | 22 files | Used for trivial fade/slide/hover animations |
| **leaflet** | 3.9 MB | dashboard, attendance | Dynamically imported but CDN marker icons |
| **lucide-react** | 44 MB (node_modules) | 24 files | Tree-shakeable but all icons bundled |
| **date-fns** | 39 MB (25 MB locales) | Multiple pages | Only `id` locale needed, rest is bloat |
| **@prisma/client** | 74 MB | 29 API files | Server-only, not in client bundle |
| **react-leaflet** | 220 KB | map components | Bundled alongside leaflet |

---

## Performance Issues (Ranked by Impact)

### 1. Critical: 100% CSR — No Server Components
- All pages marked `"use client"`
- Data fetched in `useEffect` on every mount
- No SSR, ISR, SSG, or Server Components
- First paint: blank → skeleton → data → content
- No `loading.tsx`, no `Suspense` boundaries
- Every navigation causes full loading states

### 2. High: No Data Caching Layer
- No SWR, React Query, or similar
- Every navigation re-fetches everything fresh
- Sequential fetches in dashboard (not parallel)
- No `AbortController` on several pages

### 3. Medium: Bundle Optimization Missing
- `next.config.ts` has zero optimization config
- No `optimizePackageImports`
- No `removeConsole` in production

### 4. Medium: framer-motion Overuse
- 3.3 MB for animations already achievable with pure CSS
- App has CSS keyframes (fadeIn, slideIn, scaleIn, float) but still uses framer-motion

### 5. Medium: Heavy State Management
- 11-13 `useState` calls per large page
- No `useReducer`, `useDeferredValue`, or `useTransition`

### 6. Low: Leaflet CDN Marker Icons
- External CDN dependency for marker images

### 7. Low: date-fns Locale Bloat
- 25 MB of locale files, only `id` is used

### 8. Low: No middleware.ts
- Per-page client-side auth checks cause redirect flicker

---

## Visual Design Pattern

**Identity**: Dark Elegant Green Glassmorphism
- Background: `#022c22` → `#064e3b` gradient
- Cards: `backdrop-filter: blur(15px)`, semi-transparent border
- Accent: Emerald green (`hue 160`)
- Animated elements: 3 floating glass orbs, gradient text
- All cards use `variant="glass"`

---

## CSS Concerns for Low-Spec Devices

| Issue | Impact |
|-------|--------|
| `backdrop-filter: blur()` on all cards/nav | GPU compositing overhead |
| Multiple `radial-gradient` overlays on background | Expensive paint |
| 3 floating orb animations running constantly | Continuous repaint |
| `@keyframes` with `transform` and `opacity` | Moderate |

---

## What Already Works Well

- Leaflet is dynamically imported with `ssr: false` + loading skeleton
- Reports hook (`use-reports.ts`) uses `useCallback`/`useMemo` properly
- Attendance page uses `AbortController` with timeout
- Inter font loaded via `next/font/google` (auto-optimized)
- Skeleton loaders exist for every page (9 variants)
- `prefers-reduced-motion: reduce` respected in CSS

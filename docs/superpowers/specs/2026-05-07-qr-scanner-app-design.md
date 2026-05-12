# QR Scanner App — Design Spec

**Date:** 2026-05-07
**Status:** Draft
**Author:** AI assistant (brainstorming session with user)

## Overview

App baru terpisah (Next.js) untuk QR code-based attendance. Setiap member punya **static QR** di ID card. Scan QR → tampil foto + nama → ambil GPS browser → panggil external attendance API (dari app absensi) untuk auto check-in.

Dashboard admin untuk CRUD member, upload foto (UploadThing), dan generate QR per member.

**Consumes:** External Attendance API dari `next-absen` (sudah jadi, port 3004)

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router |
| DB | PostgreSQL (Neon) |
| ORM | Drizzle ORM |
| File storage | UploadThing |
| QR generation | `qrcode` (npm) — generate PNG/SVG |
| Auth (admin) | Simple password-based (env var), atau next-auth sederhana |
| Styling | Tailwind CSS (+ shadcn/ui opsional) |
| Deployment | Vercel |

## Architecture

```
qr-scanner/                          # App baru
├── src/
│   ├── app/
│   │   ├── scan/
│   │   │   └── page.tsx            # Public: /scan?userId=xxx&name=John
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Admin: CRUD member, daftar QR
│   │   │   └── layout.tsx          # Admin auth guard
│   │   └── api/
│   │       └── members/
│   │           ├── route.ts        # GET list, POST create
│   │           └── [id]/
│   │               └── route.ts    # PUT update, DELETE
│   ├── components/
│   │   ├── scan-view.tsx           # Halaman scan (foto + nama + tombol absen)
│   │   ├── member-table.tsx        # Tabel member di dashboard
│   │   ├── member-form.tsx         # Form add/edit (upload foto)
│   │   └── qr-display.tsx          # Tampil/download QR per member
│   ├── db/
│   │   ├── schema.ts              # Drizzle schema
│   │   └── index.ts               # Neon connection
│   └── lib/
│       ├── absensi.ts             # API client: fetch ke external absensi
│       └── uploadthing.ts         # UploadThing router
├── .env                           # DATABASE_URL, ABSENSI_API_KEY, ABSENSI_BASE_URL, ADMIN_PASSWORD
```

## Database — Drizzle + Neon

### Table: `members`

| Column | Type | Constraint |
|---|---|---|
| `id` | serial | PK |
| `userId` | varchar(36) | FK → User di absensi DB, unique |
| `name` | varchar(255) | NOT NULL |
| `email` | varchar(255) | |
| `photoUrl` | varchar(512) | UploadThing URL |
| `qrCodeUrl` | varchar(512) | UploadThing URL (generated QR image) |
| `createdAt` | timestamp | default now() |
| `updatedAt` | timestamp | auto-update |

### Drizzle Schema

```typescript
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  photoUrl: varchar("photo_url", { length: 512 }),
  qrCodeUrl: varchar("qr_code_url", { length: 512 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})
```

## Components

### 1. Scan Page — `/scan?userId=xxx&name=John%20Doe`

Public route, no auth. Mobile-first.

**UI:**
- Foto member (dari `photoUrl` di DB, di-fetch via API)
- Nama member (dari query param + dikonfirmasi dari DB)
- Tombol "Absen Sekarang" (besar, pusat)
- Status feedback: loading spinner, ✅ berhasil, ❌ gagal + reason

**Logic:**
1. Ambil `userId` dari URL params
2. Fetch data member dari `/api/members?userId=xxx` (dapet photoUrl, name)
3. Tampil loading → foto + nama
4. User klik "Absen Sekarang"
5. Browser minta GPS (`navigator.geolocation.getCurrentPosition`)
6. Kirim ke external API: `POST {ABSENSI_BASE_URL}/api/external/attendance/auto-checkin`
   - Header: `x-api-key`
   - Body: `{ userId, latitude, longitude, accuracy }`
7. Tampil hasil (berhasil/gagal + pesan error)

**Edge cases:**
- GPS ditolak → "Izinkan akses lokasi untuk absen"
- GPS timeout → "Gagal mendapatkan lokasi. Coba lagi."
- User sudah absen → tampil "Anda sudah absen hari ini"
- API key invalid → "Sistem sedang bermasalah. Hubungi admin."
- Loading state, retry button

### 2. Dashboard Page — `/dashboard`

Admin only (simple password guard).

**UI:**
- Header: "QR Scanner Dashboard"
- Button "Tambah Member" (membuka modal/form)
- Table: Nama, Email, User ID, QR (icon), Foto (thumbnail), Aksi (edit/hapus)
- Per row: button download QR, link scan

**Member form (modal):**
- Nama (text input)
- Email (text input)
- User ID (text input, UUID dari absensi DB)
- Upload foto (UploadThing button)
- Submit → simpan ke DB → auto-generate QR → upload QR image ke UploadThing → simpan `qrCodeUrl`

### 3. QR Display Component

**Display:**
- QR code image (dari `qrCodeUrl`)
- Nama member
- Link scan yg bisa di-copy
- Download button (PNG)

**Generate flow (saat create member):**
1. QR content = `{BASE_URL}/scan?userId={uuid}&name={encodeURIComponent(name)}`
2. Generate QR PNG via `qrcode` library
3. Upload ke UploadThing
4. Simpan URL di `qrCodeUrl` column

### 4. Member Table Component

| Column | Source |
|---|---|
| Nama | members.name |
| Email | members.email |
| User ID | members.userId |
| QR | icon QR → klik tampil QR Display |
| Foto | thumbnail dari members.photoUrl |
| Aksi | edit (buka form), hapus (konfirmasi) |

### 5. UploadThing Integration

**Router:**
- `photoUploader` — foto member (max 4MB, image only)
- `qrUploader` — QR image (max 1MB, image/png)

**Config di `lib/uploadthing.ts`.**

## API Client — `lib/absensi.ts`

Wrapper untuk panggil external attendance API:

```typescript
const ABSENSI_BASE = process.env.ABSENSI_BASE_URL // http://localhost:3004
const API_KEY = process.env.ABSENSI_API_KEY

export async function autoCheckIn(userId: string, lat: number, lng: number, acc: number) {
  const res = await fetch(`${ABSENSI_BASE}/api/external/attendance/auto-checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
    body: JSON.stringify({ userId, latitude: lat, longitude: lng, accuracy: acc }),
  })
  return res.json()
}
```

## Auth — Admin Dashboard

Simple password check via environment variable:

```
ADMIN_PASSWORD=secret123
```

Dashboard layout cek password via cookie-session sederhana. Atau bisa upgrade ke next-auth nanti.

Login page: `/dashboard/login` → input password → set cookie → redirect ke `/dashboard`.

## Environment Variables

```env
DATABASE_URL=postgres://...           # Neon
ABSENSI_API_KEY=api_live_xxxxx       # Dari app absensi
ABSENSI_BASE_URL=http://localhost:3004
ADMIN_PASSWORD=secret123
UPLOADTHING_SECRET=...
UPLOADTHING_APP_ID=...
NEXT_PUBLIC_APP_URL=http://localhost:3005  # URL app ini sendiri (buat QR link)
```

## Response Format (Internal API `/api/members`)

```json
// GET /api/members
{
  "members": [
    { "id": 1, "userId": "uuid", "name": "John", "email": "john@example.com",
      "photoUrl": "https://uploadthing.com/...", "qrCodeUrl": "https://uploadthing.com/..." }
  ]
}

// POST /api/members
// Body: { userId, name, email, photoUrl, qrCodeUrl }
// Response: { member: { ... } }

// DELETE /api/members/[id]
// Response: { success: true }
```

## Scan Page Flow Detail

```
URL: /scan?userId={uuid}&name={encoded_name}

1. Page load
   - Parse userId dari URL
   - GET /api/members?userId=xxx (cek member exists, dapet photoUrl)
   - Optional: validasi name dari DB vs URL (anti-tamper)

2. Tampil
   - Foto member (center, rounded, ukuran besar)
   - Nama member (di bawah foto)
   - Tombol "Absen Sekarang" (primary, full-width di mobile)

3. User klik "Absen Sekarang"
   - Request geolocation
   - Loading state (spinner di tombol)

4. GPS didapat
   - POST ke external absensi API
   - Loading state

5. Hasil
   - Success: ✅ hijau, nama + jam
   - Error: ❌ merah, pesan error + "Coba Lagi" button

6. Edge cases
   - GPS denied: tampil ikon lokasi dicoret + "Izinkan akses lokasi"
   - GPS unavailable: "GPS tidak tersedia di perangkat ini"
   - Already checked in (409): "Anda sudah absen hari ini"
   - Network error: "Gagal terhubung. Periksa koneksi."
```

## Testing

- Unit test: `autoCheckIn()` wrapper, member CRUD handlers
- Test scan page: mock geolocation + mock fetch
- Manual: scan QR di HP, cek absensi tercatat di dashboard absensi

## Files to Create

```
qr-scanner/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── .env.example
├── drizzle.config.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Redirect ke /scan? (atau landing)
│   │   ├── scan/
│   │   │   └── page.tsx              # Public scan page
│   │   ├── dashboard/
│   │   │   ├── layout.tsx            # Auth guard
│   │   │   ├── page.tsx              # Member list + CRUD
│   │   │   └── login/
│   │   │       └── page.tsx          # Simple password login
│   │   └── api/
│   │       ├── uploadthing/
│   │       │   └── route.ts          # UploadThing API handler
│   │       └── members/
│   │           ├── route.ts          # GET list + POST create
│   │           └── [id]/
│   │               └── route.ts      # PUT + DELETE
│   ├── components/
│   │   ├── scan-view.tsx             # Scan page UI
│   │   ├── member-table.tsx          # Dashboard table
│   │   ├── member-form.tsx           # Add/edit form modal
│   │   └── qr-display.tsx            # QR display + download
│   ├── db/
│   │   ├── schema.ts                # Drizzle schema
│   │   └── index.ts                 # DB connection
│   └── lib/
│       ├── absensi.ts               # External API client
│       ├── qr.ts                    # QR generation helper
│       └── uploadthing.ts           # UploadThing router
```

## Not in Scope
- Real-time absensi status di dashboard (bisa ditambah nanti — fetch dari API absensi)
- Multi-tenant / multi organisasi
- Role-based access (hanya single admin)
- Notifikasi / alert
- Export laporan

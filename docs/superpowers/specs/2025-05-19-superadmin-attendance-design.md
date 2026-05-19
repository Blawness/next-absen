# Superadmin Role + Attendance CRUD Management

**Date:** 2025-05-19
**Status:** Draft

## Overview

Tambahkan role `superadmin` sebagai role tertinggi di atas `admin`, dengan akses eksklusif ke fitur manajemen absensi (full CRUD): edit jam masuk/keluar, hapus record, dan buat record manual untuk user manapun. Fitur ini tidak tersedia untuk admin/manager/user.

## Role & Permission

### Prisma Schema

Tambahkan `superadmin` ke enum `UserRole`:

```prisma
enum UserRole {
  superadmin
  admin
  manager
  user
}
```

### Permission

Permission baru:

```ts
ABSENSI_MANAGE = 'absensi:manage'
```

Mapping:

| Permission | superadmin | admin | manager | user |
|---|---|---|---|---|
| Semua existing | yes | yes | partial | partial |
| absensi:manage | **yes** | no | no | no |

`ABSENSI_MANAGE` = full CRUD pada record absensi user manapun (create, read, update, delete).

## API — `/api/superadmin/attendance`

Semua endpoint diproteksi: cek `hasPermission(role, ABSENSI_MANAGE)`.

### Endpoints

| Method | Body/Query | Response |
|---|---|---|
| `GET` | query: `userId`, `dateFrom`, `dateTo`, `status`, `page`, `limit` | `{ data: AbsensiRecord[], total, page, limit }` |
| `POST` | `{ userId, date, checkInTime?, checkOutTime?, status?, notes? }` | created record |
| `PUT` | `{ id, checkInTime?, checkOutTime?, status?, notes? }` | updated record |
| `DELETE` | `{ id }` | `{ success: true }` |

### Validasi

- POST: `userId` + `date` required. Cek unique constraint `@@unique([userId, date])`. `date` gak boleh future.
- PUT: `id` required. Minimal satu field yg diupdate. Kalau `checkInTime` dan `checkOutTime` diisi, `checkOutTime` harus > `checkInTime`.
- DELETE: `id` required, record harus ada.
- Semua aksi di-log via `prisma.activityLog.create()`.

### File

- `app/api/superadmin/attendance/route.ts` — routing
- `app/api/superadmin/attendance/services.ts` — business logic

## UI — `/superadmin/attendance`

### Page (`app/superadmin/attendance/page.tsx`)

Client component dengan:
1. Header: "Kelola Absensi" + tombol "Tambah Record"
2. Filter bar: dropdown user, date range picker, status filter, search
3. DataTable (shadcn) dengan kolom:
   - User (nama)
   - Tanggal
   - Jam Masuk
   - Jam Keluar
   - Jam Kerja
   - Status (badge)
   - Actions (✏️ Edit, 🗑 Delete)
4. Pagination

### Edit Dialog (`components/superadmin/attendance-edit-dialog.tsx`)

Modal/dialog dengan field:
- Tanggal (readonly)
- Jam Masuk — time picker
- Jam Keluar — time picker
- Status — dropdown (present/late/absent)
- Catatan — textarea
- Tombol Simpan / Batal

### Create Dialog (`components/superadmin/attendance-create-dialog.tsx`)

Mirip edit dialog, tambah:
- Pilih User — combobox search
- Tanggal — date picker

### Sidebar

Section baru di sidebar setelah menu admin:
```
Superadmin
  └── Kelola Absensi
```

Digate dengan `hasPermission(role, ABSENSI_MANAGE)`. Superadmin juga lihat semua menu admin.

### Activity Log

Tiap operasi create/update/delete dicatat:
```ts
{
  action: "MANAGE_ATTENDANCE",
  details: {
    type: "create" | "update" | "delete",
    recordId,
    targetUserId,
    changes // field yg berubah
  }
}
```

## Files Changed

| File | Action |
|---|---|
| `prisma/schema.prisma` | Tambah `superadmin` ke enum UserRole |
| `lib/permissions.ts` | Tambah `ABSENSI_MANAGE`, update role mapping |
| `lib/constants.ts` | Tambah label superadmin + menu labels |
| `components/layout/sidebar.tsx` | Tambah section Superadmin |
| `app/api/superadmin/attendance/route.ts` | CRUD endpoint |
| `app/api/superadmin/attendance/services.ts` | Business logic |
| `app/superadmin/attendance/page.tsx` | Halaman utama |
| `components/superadmin/attendance-edit-dialog.tsx` | Modal edit |
| `components/superadmin/attendance-create-dialog.tsx` | Modal tambah |
| `types/next-auth.d.ts` | Tambah `superadmin` type |
| `prisma/seed.ts` | Seed akun superadmin |

## Misc

- `canManageUsers()` di `lib/permissions.ts` juga return true untuk superadmin
- Seed: akun `superadmin@demo.com` / `password123` / role `superadmin`
- `validateSession()` gak butuh perubahan — existing helper tetep jalan

## Non-Functional

- **Middleware**: `/superadmin/*` ditambah ke matcher untuk auth gate (cek session cookie)
- **Error handling**: `HttpError` pattern existing — services throw, route handler catch
- **Type-safe**: Semua Prisma type, input divalidasi dengan Zod

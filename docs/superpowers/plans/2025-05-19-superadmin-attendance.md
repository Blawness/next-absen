# Superadmin Attendance Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `superadmin` role (above admin) with exclusive full-CRUD attendance management for any user.

**Architecture:** New `superadmin` UserRole enum value, `ABSENSI_MANAGE` permission, `/api/superadmin/attendance` CRUD endpoints, and `/superadmin/attendance` page with edit/create dialogs. Follows existing patterns (services.ts, withErrorHandling, HttpError).

**Tech Stack:** Next.js 15 App Router, Prisma, shadcn/ui, Zod, next-auth v4

---

### Task 1: Prisma Schema — Add `superadmin` role

**Files:**
- Modify: `prisma/schema.prisma:13-17`

- [ ] **Step 1: Add `superadmin` to UserRole enum**

Edit `prisma/schema.prisma`, line 13-17, add `superadmin` as first value:

```prisma
enum UserRole {
  superadmin
  admin
  manager
  user
}
```

- [ ] **Step 2: Generate Prisma Client and push DB**

```bash
npm run db:generate && npm run db:push
```

Expected: No errors. Prisma Client regenerated with `UserRole.superadmin`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add superadmin role to UserRole enum"
```

---

### Task 2: Permissions — Add `ABSENSI_MANAGE` + update mapping

**Files:**
- Modify: `lib/permissions.ts`

- [ ] **Step 1: Add `ABSENSI_MANAGE` permission and update role mapping**

Replace the content of `lib/permissions.ts`:

```ts
import { UserRole } from "@prisma/client"

export enum Permission {
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  ABSENSI_CREATE = 'absensi:create',
  ABSENSI_READ = 'absensi:read',
  ABSENSI_UPDATE = 'absensi:update',
  ABSENSI_DELETE = 'absensi:delete',
  ABSENSI_MANAGE = 'absensi:manage',

  REPORT_READ = 'report:read',
  REPORT_EXPORT = 'report:export',

  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update'
}

const rolePermissions: Record<UserRole, Permission[]> = {
  superadmin: Object.values(Permission),
  admin: Object.values(Permission).filter(p => p !== Permission.ABSENSI_MANAGE),
  manager: [
    Permission.USER_READ,
    Permission.ABSENSI_CREATE,
    Permission.ABSENSI_READ,
    Permission.ABSENSI_UPDATE,
    Permission.REPORT_READ,
    Permission.REPORT_EXPORT,
    Permission.SETTINGS_READ
  ],
  user: [
    Permission.ABSENSI_CREATE,
    Permission.ABSENSI_READ,
    Permission.REPORT_READ
  ]
}

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return rolePermissions[userRole].includes(permission)
}

export function canAccess(userRole: UserRole, resource: string, action: string): boolean {
  const permission = `${resource}:${action}` as Permission
  return hasPermission(userRole, permission)
}

export function getRolePermissions(role: UserRole): Permission[] {
  return rolePermissions[role]
}

export function isAdmin(role: UserRole): boolean {
  return role === UserRole.admin || role === UserRole.superadmin
}

export function isManagerOrAdmin(role: UserRole): boolean {
  return role === UserRole.manager || role === UserRole.admin || role === UserRole.superadmin
}

export function canManageUsers(role: UserRole): boolean {
  return role === UserRole.admin || role === UserRole.superadmin
}

export function canExportReports(role: UserRole): boolean {
  return hasPermission(role, Permission.REPORT_EXPORT)
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/permissions.ts
git commit -m "feat: add ABSENSI_MANAGE permission and superadmin role mapping"
```

---

### Task 3: Constants — Add superadmin labels

**Files:**
- Modify: `lib/constants.ts`

- [ ] **Step 1: Add superadmin role label and navigation items**

In `ROLE_LABELS` (line 28-32), add `SUPERADMIN`:

```ts
export const ROLE_LABELS = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  USER: "Pengguna"
} as const
```

In `NAVIGATION` (line 3-19), add:

```ts
export const NAVIGATION = {
  DASHBOARD: "Dashboard",
  ATTENDANCE: "Absensi",
  REPORTS: "Laporan",
  USERS: "Pengguna",
  PROFILE: "Profil",
  SETTINGS: "Pengaturan",
  LOGOUT: "Keluar",
  LOGIN: "Masuk",
  CHECK_IN: "Check In",
  CHECK_OUT: "Check Out",
  MY_ATTENDANCE: "Absensi Saya",
  ADMIN_PANEL: "Panel Admin",
  MANAGER_PANEL: "Panel Manager",
  ACTIVITY_LOG: "Log Aktivitas",
  API_KEYS: "Kunci API",
  SUPERADMIN: "Superadmin",
  MANAGE_ATTENDANCE: "Kelola Absensi"
} as const
```

In `MESSAGES` (line 34-77), add:

```ts
  // Attendance Management
  ATTENDANCE_CREATED: "Record absensi berhasil dibuat",
  ATTENDANCE_UPDATED: "Record absensi berhasil diperbarui",
  ATTENDANCE_DELETED: "Record absensi berhasil dihapus",
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/constants.ts
git commit -m "feat: add superadmin labels and attendance management messages"
```

---

### Task 4: Validation Schemas — Add attendance CRUD schemas

**Files:**
- Modify: `lib/validation.ts`

- [ ] **Step 1: Add attendance management schemas**

Append to `lib/validation.ts` (after line 117):

```ts
export const attendanceCreateSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  date: z.string().min(1, "Date is required"),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  status: z.enum(["present", "late", "absent", "half_day"]).optional(),
  notes: z.string().max(500).optional(),
})

export const attendanceUpdateSchema = z.object({
  id: z.string().min(1, "Record ID is required"),
  checkInTime: z.string().nullable().optional(),
  checkOutTime: z.string().nullable().optional(),
  status: z.enum(["present", "late", "absent", "half_day"]).optional(),
  notes: z.string().max(500).nullable().optional(),
}).refine(
  (data) => data.checkInTime !== undefined || data.checkOutTime !== undefined || data.status !== undefined || data.notes !== undefined,
  { message: "At least one field to update is required" }
)

export const attendanceDeleteSchema = z.object({
  id: z.string().min(1, "Record ID is required"),
})
```

Also update `userCreateSchema` (line 63-71) and `userUpdateSchema` (line 73-81) to include `superadmin` in the role enum:

In `userCreateSchema`:
```ts
export const userCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["superadmin", "admin", "manager", "user"]).default("user"),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
})
```

In `userUpdateSchema`:
```ts
export const userUpdateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email("Invalid email format"),
  role: z.enum(["superadmin", "admin", "manager", "user"]),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
})
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/validation.ts
git commit -m "feat: add attendance CRUD validation schemas"
```

---

### Task 5: API Services — Business logic

**Files:**
- Create: `app/api/superadmin/attendance/services.ts`

- [ ] **Step 1: Create services.ts**

Create `app/api/superadmin/attendance/services.ts`:

```ts
import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { HttpError } from "@/lib/errors"
import { hasPermission, Permission } from "@/lib/permissions"
import { startOfDay, endOfDay } from "date-fns"

async function checkPermission() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new HttpError("Unauthorized", 401)
  }
  if (!hasPermission(session.user.role, Permission.ABSENSI_MANAGE)) {
    throw new HttpError("Forbidden", 403)
  }
  return session
}

async function logManageActivity(
  superadminId: string,
  action: string,
  details: Record<string, unknown>
) {
  await prisma.activityLog.create({
    data: {
      userId: superadminId,
      action: "MANAGE_ATTENDANCE",
      resourceType: "absensi_record",
      resourceId: (details.recordId as string) ?? undefined,
      details: details as Prisma.InputJsonValue,
    },
  })
}

export interface ListAttendanceParams {
  userId?: string
  dateFrom?: string
  dateTo?: string
  status?: string
  page?: number
  limit?: number
}

export async function listAttendance(params: ListAttendanceParams) {
  await checkPermission()

  const { userId, dateFrom, dateTo, status, page = 1, limit = 20 } = params
  const where: Record<string, unknown> = {}

  if (userId) {
    where.userId = userId
  }
  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) (where.date as Record<string, Date>).gte = new Date(dateFrom)
    if (dateTo) (where.date as Record<string, Date>).lte = new Date(dateTo)
  }
  if (status) {
    where.status = status
  }

  const [data, total] = await Promise.all([
    prisma.absensiRecord.findMany({
      where: where as any,
      include: {
        user: {
          select: { id: true, name: true, email: true, department: true },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.absensiRecord.count({ where: where as any }),
  ])

  const records = data.map((r) => ({
    ...r,
    workHours: r.workHours ? Number(r.workHours) : null,
    overtimeHours: Number(r.overtimeHours),
    checkInLatitude: r.checkInLatitude ? Number(r.checkInLatitude) : null,
    checkInLongitude: r.checkInLongitude ? Number(r.checkInLongitude) : null,
    checkInAccuracy: r.checkInAccuracy ? Number(r.checkInAccuracy) : null,
    checkOutLatitude: r.checkOutLatitude ? Number(r.checkOutLatitude) : null,
    checkOutLongitude: r.checkOutLongitude ? Number(r.checkOutLongitude) : null,
    checkOutAccuracy: r.checkOutAccuracy ? Number(r.checkOutAccuracy) : null,
  }))

  return { data: records, total, page, limit }
}

export interface CreateAttendanceData {
  userId: string
  date: string
  checkInTime?: string
  checkOutTime?: string
  status?: string
  notes?: string
}

export async function createAttendance(data: CreateAttendanceData) {
  const session = await checkPermission()

  const user = await prisma.user.findUnique({ where: { id: data.userId } })
  if (!user) {
    throw new HttpError("User not found", 404)
  }

  const dateObj = new Date(data.date)
  if (isNaN(dateObj.getTime())) {
    throw new HttpError("Invalid date format", 400)
  }

  const checkInTime = data.checkInTime ? new Date(data.checkInTime) : null
  const checkOutTime = data.checkOutTime ? new Date(data.checkOutTime) : null

  if (checkInTime && isNaN(checkInTime.getTime())) {
    throw new HttpError("Invalid checkInTime format", 400)
  }
  if (checkOutTime && isNaN(checkOutTime.getTime())) {
    throw new HttpError("Invalid checkOutTime format", 400)
  }
  if (checkInTime && checkOutTime && checkOutTime <= checkInTime) {
    throw new HttpError("checkOutTime must be after checkInTime", 400)
  }

  try {
    const record = await prisma.absensiRecord.create({
      data: {
        userId: data.userId,
        date: dateObj,
        checkInTime,
        checkOutTime,
        status: (data.status as any) ?? "absent",
        notes: data.notes ?? null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    await logManageActivity(session.user.id, "create", {
      type: "create",
      recordId: record.id,
      targetUserId: data.userId,
    })

    return record
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as any).code === "P2002") {
      throw new HttpError("Attendance record for this user and date already exists", 409)
    }
    throw error
  }
}

export interface UpdateAttendanceData {
  id: string
  checkInTime?: string | null
  checkOutTime?: string | null
  status?: string
  notes?: string | null
}

export async function updateAttendance(data: UpdateAttendanceData) {
  const session = await checkPermission()

  const existing = await prisma.absensiRecord.findUnique({
    where: { id: data.id },
    include: { user: { select: { id: true, name: true } } },
  })
  if (!existing) {
    throw new HttpError("Attendance record not found", 404)
  }

  const updateData: Record<string, unknown> = {}
  const changes: Record<string, unknown> = {}

  if (data.checkInTime !== undefined) {
    updateData.checkInTime = data.checkInTime ? new Date(data.checkInTime) : null
    changes.checkInTime = data.checkInTime
  }
  if (data.checkOutTime !== undefined) {
    updateData.checkOutTime = data.checkOutTime ? new Date(data.checkOutTime) : null
    changes.checkOutTime = data.checkOutTime
  }
  if (data.status !== undefined) {
    updateData.status = data.status
    changes.status = data.status
  }
  if (data.notes !== undefined) {
    updateData.notes = data.notes
    changes.notes = data.notes
  }

  if (Object.keys(updateData).length === 0) {
    throw new HttpError("No fields to update", 400)
  }

  const record = await prisma.absensiRecord.update({
    where: { id: data.id },
    data: updateData as any,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  await logManageActivity(session.user.id, "update", {
    type: "update",
    recordId: record.id,
    targetUserId: existing.userId,
    targetUserName: existing.user.name,
    changes,
  })

  return record
}

export async function deleteAttendance(id: string) {
  const session = await checkPermission()

  const existing = await prisma.absensiRecord.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true } } },
  })
  if (!existing) {
    throw new HttpError("Attendance record not found", 404)
  }

  await prisma.absensiRecord.delete({ where: { id } })

  await logManageActivity(session.user.id, "delete", {
    type: "delete",
    recordId: id,
    targetUserId: existing.userId,
    targetUserName: existing.user.name,
    deletedRecord: {
      date: existing.date,
      checkInTime: existing.checkInTime,
      checkOutTime: existing.checkOutTime,
    },
  })

  return { success: true }
}

export async function getUsers() {
  await checkPermission()
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, department: true },
    orderBy: { name: "asc" },
  })
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: No errors (may need to run `npm run db:generate` first if Prisma types are stale).

- [ ] **Step 3: Commit**

```bash
git add app/api/superadmin/attendance/services.ts
git commit -m "feat: add superadmin attendance CRUD services"
```

---

### Task 6: API Route — CRUD endpoint

**Files:**
- Create: `app/api/superadmin/attendance/route.ts`

- [ ] **Step 1: Create route.ts**

```ts
import { NextRequest, NextResponse } from "next/server"
import { withErrorHandling } from "@/lib/errors"
import { parseBody } from "@/lib/validation"
import {
  attendanceCreateSchema,
  attendanceUpdateSchema,
  attendanceDeleteSchema,
} from "@/lib/validation"
import {
  listAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getUsers,
} from "./services"

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)

  if (searchParams.get("users") === "true") {
    const users = await getUsers()
    return NextResponse.json(users)
  }

  const userId = searchParams.get("userId") ?? undefined
  const dateFrom = searchParams.get("dateFrom") ?? undefined
  const dateTo = searchParams.get("dateTo") ?? undefined
  const status = searchParams.get("status") ?? undefined
  const page = parseInt(searchParams.get("page") ?? "1", 10)
  const limit = parseInt(searchParams.get("limit") ?? "20", 10)

  const result = await listAttendance({ userId, dateFrom, dateTo, status, page, limit })
  return NextResponse.json(result)
}, "fetching attendance records")

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await parseBody(request, attendanceCreateSchema)
  const record = await createAttendance(body)
  return NextResponse.json(record, { status: 201 })
}, "creating attendance record")

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const body = await parseBody(request, attendanceUpdateSchema)
  const record = await updateAttendance(body)
  return NextResponse.json(record)
}, "updating attendance record")

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const body = await parseBody(request, attendanceDeleteSchema)
  const result = await deleteAttendance(body.id)
  return NextResponse.json(result)
}, "deleting attendance record")
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/superadmin/attendance/route.ts
git commit -m "feat: add superadmin attendance CRUD API endpoints"
```

---

### Task 7: UI — Edit Dialog Component

**Files:**
- Create: `components/superadmin/attendance-edit-dialog.tsx`

- [ ] **Step 1: Create edit dialog component**

```tsx
"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"
import { MESSAGES, FORM_LABELS, STATUS_LABELS } from "@/lib/constants"
import { AttendanceStatus } from "@prisma/client"

interface AttendanceRecord {
  id: string
  date: string | Date
  checkInTime: string | Date | null
  checkOutTime: string | Date | null
  status: AttendanceStatus
  notes: string | null
}

interface Props {
  open: boolean
  record: AttendanceRecord | null
  onClose: () => void
  onSaved: () => void
}

function toTimeString(value: string | Date | null): string {
  if (!value) return ""
  const d = typeof value === "string" ? new Date(value) : value
  if (isNaN(d.getTime())) return ""
  return format(d, "HH:mm")
}

function toDateString(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value
  return format(d, "yyyy-MM-dd")
}

export function AttendanceEditDialog({ open, record, onClose, onSaved }: Props) {
  const [checkInTime, setCheckInTime] = useState("")
  const [checkOutTime, setCheckOutTime] = useState("")
  const [status, setStatus] = useState<AttendanceStatus>("present")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
      return
    }
    if (record) {
      setCheckInTime(toTimeString(record.checkInTime))
      setCheckOutTime(toTimeString(record.checkOutTime))
      setStatus(record.status)
      setNotes(record.notes ?? "")
      setError("")
    }
  }

  const handleSave = async () => {
    if (!record) return
    setSaving(true)
    setError("")

    try {
      const checkInISO = checkInTime
        ? `${toDateString(record.date)}T${checkInTime}:00.000Z`
        : null
      const checkOutISO = checkOutTime
        ? `${toDateString(record.date)}T${checkOutTime}:00.000Z`
        : null

      const res = await fetch("/api/superadmin/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          checkInTime: checkInISO,
          checkOutTime: checkOutISO,
          status,
          notes: notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || MESSAGES.ERROR)
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : MESSAGES.ERROR)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Record Absensi</DialogTitle>
          <DialogDescription>
            {record && (
              <span>
                {toDateString(record.date)} — {format(new Date(record.date), "dd MMM yyyy")}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{FORM_LABELS.CHECK_IN_TIME || "Check-in"}</Label>
              <Input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{FORM_LABELS.CHECK_OUT_TIME || "Check-out"}</Label>
              <Input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{FORM_LABELS.STATUS}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">{STATUS_LABELS.present}</SelectItem>
                <SelectItem value="late">{STATUS_LABELS.late}</SelectItem>
                <SelectItem value="absent">{STATUS_LABELS.absent}</SelectItem>
                <SelectItem value="half_day">{STATUS_LABELS.half_day}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{FORM_LABELS.NOTES}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan..."
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              {MESSAGES.CANCEL}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {MESSAGES.SAVE}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

Note: If `FORM_LABELS` doesn't have `CHECK_IN_TIME` / `CHECK_OUT_TIME`, use the inline fallback string.

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/superadmin/attendance-edit-dialog.tsx
git commit -m "feat: add attendance edit dialog component"
```

---

### Task 8: UI — Create Dialog Component

**Files:**
- Create: `components/superadmin/attendance-create-dialog.tsx`

- [ ] **Step 1: Create create dialog component**

```tsx
"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { MESSAGES, FORM_LABELS, STATUS_LABELS } from "@/lib/constants"
import { AttendanceStatus } from "@prisma/client"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface UserOption {
  id: string
  name: string
  email: string
  department: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function AttendanceCreateDialog({ open, onClose, onSaved }: Props) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)
  const [userSearchOpen, setUserSearchOpen] = useState(false)
  const [date, setDate] = useState("")
  const [checkInTime, setCheckInTime] = useState("")
  const [checkOutTime, setCheckOutTime] = useState("")
  const [status, setStatus] = useState<AttendanceStatus>("present")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/attendance?users=true")
      if (res.ok) {
        setUsers(await res.json())
      }
    } catch {
      // silent
    }
  }, [])

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
      return
    }
    loadUsers()
    setDate(new Date().toISOString().split("T")[0])
    setCheckInTime("")
    setCheckOutTime("")
    setStatus("present")
    setNotes("")
    setSelectedUser(null)
    setError("")
  }

  const handleSave = async () => {
    if (!selectedUser) {
      setError("Pilih user terlebih dahulu")
      return
    }
    if (!date) {
      setError("Tanggal wajib diisi")
      return
    }
    setSaving(true)
    setError("")

    try {
      const checkInISO = checkInTime
        ? `${date}T${checkInTime}:00.000Z`
        : null
      const checkOutISO = checkOutTime
        ? `${date}T${checkOutTime}:00.000Z`
        : null

      const res = await fetch("/api/superadmin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          date: new Date(date).toISOString(),
          checkInTime: checkInISO,
          checkOutTime: checkOutISO,
          status,
          notes: notes || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || MESSAGES.ERROR)
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : MESSAGES.ERROR)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Record Absensi</DialogTitle>
          <DialogDescription>
            Buat record absensi manual untuk user
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>User</Label>
            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedUser
                    ? `${selectedUser.name} (${selectedUser.email})`
                    : "Cari user..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Cari user..." />
                  <CommandList>
                    <CommandEmpty>Tidak ditemukan</CommandEmpty>
                    <CommandGroup>
                      {users.map((u) => (
                        <CommandItem
                          key={u.id}
                          value={`${u.name} ${u.email}`}
                          onSelect={() => {
                            setSelectedUser(u)
                            setUserSearchOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedUser?.id === u.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div>
                            <p>{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>{FORM_LABELS.DATE}</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in</Label>
              <Input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Check-out</Label>
              <Input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{FORM_LABELS.STATUS}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">{STATUS_LABELS.present}</SelectItem>
                <SelectItem value="late">{STATUS_LABELS.late}</SelectItem>
                <SelectItem value="absent">{STATUS_LABELS.absent}</SelectItem>
                <SelectItem value="half_day">{STATUS_LABELS.half_day}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{FORM_LABELS.NOTES}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan..."
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              {MESSAGES.CANCEL}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {MESSAGES.SAVE}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/superadmin/attendance-create-dialog.tsx
git commit -m "feat: add attendance create dialog component"
```

---

### Task 9: UI — Page `/superadmin/attendance`

**Files:**
- Create: `app/superadmin/attendance/page.tsx`

- [ ] **Step 1: Create the page component**

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { AttendanceStatus, UserRole } from "@prisma/client"
import { hasPermission, Permission } from "@/lib/permissions"
import { NAVIGATION, STATUS_LABELS, TABLE_HEADERS, MESSAGES } from "@/lib/constants"
import { AttendanceEditDialog } from "@/components/superadmin/attendance-edit-dialog"
import { AttendanceCreateDialog } from "@/components/superadmin/attendance-create-dialog"

interface UserOption {
  id: string
  name: string
  email: string
  department: string | null
}

interface AttendanceRecord {
  id: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  workHours: number | null
  status: AttendanceStatus
  notes: string | null
  user: {
    id: string
    name: string
    email: string
    department: string | null
  }
}

export default function SuperadminAttendancePage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserOption[]>([])
  const [filters, setFilters] = useState({
    userId: "",
    dateFrom: "",
    dateTo: "",
    status: "",
  })
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const limit = 15

  useEffect(() => {
    if (sessionStatus === "loading") return
    if (!session || !hasPermission(session.user.role as UserRole, Permission.ABSENSI_MANAGE)) {
      router.replace("/dashboard")
      return
    }
    loadUsers()
  }, [session, sessionStatus])

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/superadmin/attendance?users=true")
      if (res.ok) setUsers(await res.json())
    } catch {
      // silent
    }
  }

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.userId) params.set("userId", filters.userId)
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
      if (filters.dateTo) params.set("dateTo", filters.dateTo)
      if (filters.status) params.set("status", filters.status)
      params.set("page", String(page))
      params.set("limit", String(limit))

      const res = await fetch(`/api/superadmin/attendance?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRecords(data.data)
        setTotal(data.total)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    if (session) loadRecords()
  }, [session, loadRecords])

  const handleEdit = (record: AttendanceRecord) => {
    setEditRecord(record)
    setEditOpen(true)
  }

  const handleDelete = async (record: AttendanceRecord) => {
    if (!confirm(`Hapus record ${record.user.name} tanggal ${format(new Date(record.date), "dd MMM yyyy")}?`)) return

    try {
      const res = await fetch("/api/superadmin/attendance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id }),
      })
      if (res.ok) {
        setMessage({ type: "success", text: MESSAGES.ATTENDANCE_DELETED })
        loadRecords()
      } else {
        const data = await res.json()
        setMessage({ type: "error", text: data.error || MESSAGES.ERROR })
      }
    } catch {
      setMessage({ type: "error", text: MESSAGES.ERROR })
    }
  }

  const totalPages = Math.ceil(total / limit)

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold glass-title">{NAVIGATION.MANAGE_ATTENDANCE}</h1>
          <p className="text-white/70">Edit, tambah, dan hapus record absensi user</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} variant="glass">
          <Plus className="mr-2 h-4 w-4" />
          Tambah Record
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === "success" ? "default" : "destructive"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card variant="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Select
              value={filters.userId}
              onValueChange={(v) => { setFilters({ ...filters, userId: v }); setPage(1) }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua User</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => { setFilters({ ...filters, dateFrom: e.target.value }); setPage(1) }}
              placeholder="Dari tanggal"
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => { setFilters({ ...filters, dateTo: e.target.value }); setPage(1) }}
              placeholder="Sampai tanggal"
            />
            <Select
              value={filters.status}
              onValueChange={(v) => { setFilters({ ...filters, status: v }); setPage(1) }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="present">{STATUS_LABELS.present}</SelectItem>
                <SelectItem value="late">{STATUS_LABELS.late}</SelectItem>
                <SelectItem value="absent">{STATUS_LABELS.absent}</SelectItem>
                <SelectItem value="half_day">{STATUS_LABELS.half_day}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadRecords}>
              Terapkan Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-white/40" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 text-white/60">
              Tidak ada data absensi ditemukan
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{TABLE_HEADERS.USER}</TableHead>
                      <TableHead>{TABLE_HEADERS.DATE}</TableHead>
                      <TableHead>{TABLE_HEADERS.CHECK_IN}</TableHead>
                      <TableHead>{TABLE_HEADERS.CHECK_OUT}</TableHead>
                      <TableHead>{TABLE_HEADERS.WORK_HOURS}</TableHead>
                      <TableHead>{TABLE_HEADERS.STATUS}</TableHead>
                      <TableHead>{TABLE_HEADERS.ACTIONS}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">{r.user.name}</p>
                            <p className="text-xs text-white/50">{r.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-white/80">
                          {format(new Date(r.date), "dd MMM yyyy", { locale: id })}
                        </TableCell>
                        <TableCell className="text-white/80">
                          {r.checkInTime
                            ? format(new Date(r.checkInTime), "HH:mm", { locale: id })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-white/80">
                          {r.checkOutTime
                            ? format(new Date(r.checkOutTime), "HH:mm", { locale: id })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-white/80">
                          {r.workHours != null ? `${r.workHours}j` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === "present" ? "default" :
                              r.status === "late" ? "destructive" :
                              "secondary"
                            }
                          >
                            {STATUS_LABELS[r.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-white/70 hover:text-white"
                              onClick={() => handleEdit(r)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300"
                              onClick={() => handleDelete(r)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                  <p className="text-sm text-white/60">
                    {total} record — Halaman {page} dari {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AttendanceEditDialog
        open={editOpen}
        record={editRecord}
        onClose={() => { setEditOpen(false); setEditRecord(null) }}
        onSaved={() => { loadRecords(); setMessage({ type: "success", text: MESSAGES.ATTENDANCE_UPDATED }) }}
      />

      <AttendanceCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => { loadRecords(); setMessage({ type: "success", text: MESSAGES.ATTENDANCE_CREATED }) }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/superadmin/attendance/page.tsx
git commit -m "feat: add superadmin attendance management page"
```

---

### Task 10: Sidebar — Add Superadmin section

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Add superadmin navigation items and section**

In the `navigationItems` array, add admin-role to the first item to also show for superadmin (since `isAdmin` now returns true for superadmin in sidebar filtering, this should work automatically if the sidebar uses `isAdmin` or role checks).

Actually, update the sidebar role display to handle superadmin properly. Add at the end of the navigation items array (before `];`):

```tsx
    // ... existing items remain the same ...
```

And add a superadmin section header and item after the main nav. In the JSX, after the existing navigation `</nav>` (line 128), add BEFORE it:

Replace the entire `filteredNavItems` usage section. The key change is adding one item for superadmin:

After the last existing nav item (`/settings/api-keys`), add:

```tsx
    {
      href: "/superadmin/attendance",
      label: NAVIGATION.MANAGE_ATTENDANCE,
      icon: Clock,
      roles: [UserRole.superadmin]
    },
```

And add a section label before this item. Modify the JSX to include a section header.

Actually, the simpler approach: just add the item to the array with `roles: [UserRole.superadmin]` and the existing `filteredNavItems` filter will handle it. No need for a visual section header.

Also, update the role label display to handle superadmin. At line 93, the `ROLE_LABELS` lookup needs the superadmin mapping. The existing code is:

```tsx
{ROLE_LABELS[userRole?.toUpperCase() as keyof typeof ROLE_LABELS] ?? userRole}
```

This already works with our new `ROLE_LABELS.SUPERADMIN` since `userRole` is `"superadmin"` (lowercase) and we do `.toUpperCase()` → `"SUPERADMIN"`.

So the only change needed in `sidebar.tsx`: add the navigation item:

Find the `navigationItems` array and append before the closing `]`:

```tsx
    {
      href: "/superadmin/attendance",
      label: NAVIGATION.MANAGE_ATTENDANCE,
      icon: Clock,
      roles: [UserRole.superadmin]
    },
```

- [ ] **Step 2: Run lint and type-check**

```bash
npm run lint && npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat: add superadmin attendance management to sidebar"
```

---

### Task 11: Middleware — Add `/superadmin/*` route protection

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Add `/superadmin/:path*` to the matcher**

In `middleware.ts`, add to the `config.matcher` array:

```ts
export const config = {
  matcher: [
    "/api/auth/:path*",
    "/api/external/:path*",
    "/dashboard/:path*",
    "/attendance/:path*",
    "/reports/:path*",
    "/users/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/activity-logs/:path*",
    "/superadmin/:path*",
  ],
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add /superadmin route to middleware matcher"
```

---

### Task 12: Seed — Add superadmin demo account

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add superadmin seed**

Add to the `demoUsers` array in `prisma/seed.ts`, right after the `admin@demo.com` entry (after line 25):

```ts
    {
      email: 'superadmin@demo.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'superadmin' as const,
      department: 'IT',
      position: 'Super Administrator',
      phone: '+62-811-0000-0000',
      isActive: true,
    },
```

- [ ] **Step 2: Run seed to verify**

```bash
npm run db:seed
```

Expected: `✅ Created/Updated user: Super Admin (superadmin@demo.com) - Role: superadmin`

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add superadmin demo account to seed"
```

---

### Task 13: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run full lint and type-check**

```bash
npm run lint && npm run type-check
```

Expected: Both pass clean.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: final verification fixes"
git push
```

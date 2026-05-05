# External Attendance API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CORS-enabled external API for attendance with API key auth — auto check-in (8hr) and read all attendance data.

**Architecture:** Dedicated `app/api/external/` namespace. CORS handled in root `middleware.ts` (Edge). API key auth via shared `validateApiKey()` helper per route handler (Node.js). New `ApiKey` Prisma model with bcryptjs hashing. Admin manages keys via `/settings/api-keys` page.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma (MySQL), bcryptjs, next-auth v4, shadcn/ui, Tailwind CSS

---

### Task 1: Prisma Schema — Add ApiKey model and migrate

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ApiKey model to schema**

Append to the end of `prisma/schema.prisma`, after the `SystemSettings` model:

```prisma
model ApiKey {
  id          String    @id @default(uuid())
  key         String    @unique
  prefix      String
  name        String
  scope       String    @default("attendance:readwrite")
  isActive    Boolean   @default(true)
  createdBy   String    @map("created_by")
  lastUsedAt  DateTime? @map("last_used_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  creator User @relation(fields: [createdBy], references: [id])

  @@map("api_keys")
}
```

- [ ] **Step 2: Generate Prisma client and push to DB**

```bash
npm run db:generate && npm run db:push
```

Expected: No errors, `ApiKey` model available.

- [ ] **Step 3: Verify schema types exist**

```bash
npx prisma validate
```

Expected: "The database schema is valid."

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add ApiKey model for external API authentication"
```

---

### Task 2: External API shared utilities

**Files:**
- Create: `app/api/external/utils.ts`

- [ ] **Step 1: Write the utility file**

```typescript
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { HttpError } from "@/lib/errors"

const VALID_SCOPES = ["attendance:readwrite", "attendance:read", "attendance:auto-checkin"] as const
export type ApiKeyScope = (typeof VALID_SCOPES)[number]

export interface ValidatedApiKey {
  id: string
  prefix: string
  name: string
  scope: ApiKeyScope
  createdBy: string
}

export async function validateApiKey(
  request: Request,
  requiredScopes: ApiKeyScope[]
): Promise<ValidatedApiKey> {
  const apiKey = request.headers.get("x-api-key")

  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new HttpError("Missing API key", 401)
  }

  const trimmedKey = apiKey.trim()
  const prefix = trimmedKey.slice(0, 8)

  const candidates = await prisma.apiKey.findMany({
    where: { prefix, isActive: true },
  })

  let matched: ValidatedApiKey | null = null

  for (const candidate of candidates) {
    const isValid = await bcrypt.compare(trimmedKey, candidate.key)
    if (isValid) {
      matched = {
        id: candidate.id,
        prefix: candidate.prefix,
        name: candidate.name,
        scope: candidate.scope as ApiKeyScope,
        createdBy: candidate.createdBy,
      }
      break
    }
  }

  if (!matched) {
    throw new HttpError("Invalid API key", 401)
  }

  const hasRequiredScope = requiredScopes.includes(matched.scope) ||
    (requiredScopes.includes("attendance:auto-checkin") && matched.scope === "attendance:readwrite") ||
    (requiredScopes.includes("attendance:read") && matched.scope === "attendance:readwrite")

  if (!hasRequiredScope) {
    throw new HttpError("Insufficient API key scope", 403)
  }

  // Update lastUsedAt asynchronously (don't block response)
  prisma.apiKey
    .update({ where: { id: matched.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {})

  return matched
}

export function externalSuccessResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function externalErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status }
    )
  }
  console.error("External API error:", error)
  return NextResponse.json(
    { success: false, error: "Internal server error" },
    { status: 500 }
  )
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npm run type-check
```

Expected: No errors related to `app/api/external/utils.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/api/external/utils.ts
git commit -m "feat: add external API shared utilities (validateApiKey, response wrappers)"
```

---

### Task 3: Root Middleware — CORS headers for /api/external routes

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Update middleware.ts**

Replace the content of `middleware.ts` with:

```typescript
import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Handle /api/external/* routes — CORS headers + OPTIONS preflight
  if (pathname.startsWith("/api/external/")) {
    const origin = request.headers.get("origin") ?? "*"

    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin === "null" ? "*" : origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-api-key",
          "Access-Control-Max-Age": "86400",
        },
      })
    }

    const response = NextResponse.next()
    response.headers.set("Access-Control-Allow-Origin", origin === "null" ? "*" : origin)
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key")
    return response
  }

  // Existing page route protection
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    const signInUrl = new URL("/auth/signin", request.url)
    signInUrl.searchParams.set("callbackUrl", request.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/api/external/:path*",
    "/dashboard/:path*",
    "/attendance/:path*",
    "/reports/:path*",
    "/users/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/activity-logs/:path*",
  ],
}
```

- [ ] **Step 2: Verify middleware imports are clean**

```bash
npm run type-check
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add CORS headers and OPTIONS preflight for /api/external routes"
```

---

### Task 4: Auto Check-In Service

**Files:**
- Create: `app/api/external/attendance/auto-checkin/services.ts`

- [ ] **Step 1: Write the auto check-in services file**

```typescript
import { prisma } from "@/lib/prisma"
import { reverseGeocode } from "@/lib/location"
import { HttpError } from "@/lib/errors"
import { startOfDay, endOfDay } from "date-fns"
import { Prisma } from "@prisma/client"
import type { ValidatedApiKey } from "@/app/api/external/utils"

export { HttpError }

export interface AutoCheckInInput {
  userId: string
  latitude: number
  longitude: number
  accuracy: number
  notes?: string
}

export function validateLocationData(body: {
  latitude?: number
  longitude?: number
  accuracy?: number
}) {
  const { latitude, longitude, accuracy } = body

  if (latitude === undefined || longitude === undefined || accuracy === undefined) {
    throw new HttpError("Location data is required (latitude, longitude, accuracy)", 400)
  }

  if (accuracy > 5000) {
    throw new HttpError(
      "Akurasi GPS tidak mencukupi. Pastikan GPS aktif dan akurat.",
      400
    )
  }
}

export async function autoCheckIn(input: AutoCheckInInput, apiKey: ValidatedApiKey) {
  const { userId, latitude, longitude, accuracy, notes } = input

  // Validate user exists and is active
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user || !user.isActive) {
    throw new HttpError("User not found or inactive", 404)
  }

  // Check for existing record today
  const now = new Date()
  const existing = await prisma.absensiRecord.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay(now),
        lte: endOfDay(now),
      },
    },
  })

  if (existing) {
    throw new HttpError("Attendance already exists for today", 409)
  }

  // Reverse geocode
  const address = await reverseGeocode(latitude, longitude)

  // Create record with auto checkout at now + 8 hours
  const checkInTime = now
  const checkOutTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const status = "present" as const

  const attendance = await prisma.absensiRecord.create({
    data: {
      userId,
      date: now,
      checkInTime,
      checkOutTime,
      checkInLatitude: latitude,
      checkInLongitude: longitude,
      checkInAddress: address,
      checkInAccuracy: accuracy,
      workHours: 8.00,
      overtimeHours: 0.00,
      lateMinutes: 0,
      status,
      notes: notes ?? null,
    },
  })

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: apiKey.createdBy,
      action: "EXTERNAL_API_AUTO_CHECKIN",
      resourceType: "absensi_record",
      resourceId: attendance.id,
      details: {
        apiKeyId: apiKey.id,
        prefix: apiKey.prefix,
        endpoint: "POST /api/external/attendance/auto-checkin",
        attendanceUserId: userId,
      } as unknown as Prisma.InputJsonValue,
    },
  })

  return {
    id: attendance.id,
    checkInTime: attendance.checkInTime,
    checkOutTime: attendance.checkOutTime,
    workHours: attendance.workHours?.toString() ?? "8.00",
    status: attendance.status,
    checkInAddress: attendance.checkInAddress,
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npm run type-check
```

- [ ] **Step 3: Commit**

```bash
git add app/api/external/attendance/auto-checkin/services.ts
git commit -m "feat: add auto check-in service with 8-hour work duration"
```

---

### Task 5: Auto Check-In Route Handler

**Files:**
- Create: `app/api/external/attendance/auto-checkin/route.ts`

- [ ] **Step 1: Write the route handler**

```typescript
import { NextRequest } from "next/server"
import { validateApiKey, externalSuccessResponse, externalErrorResponse } from "@/app/api/external/utils"
import { validateLocationData, autoCheckIn, HttpError } from "./services"

export async function POST(request: NextRequest) {
  try {
    const apiKey = await validateApiKey(request, [
      "attendance:auto-checkin",
      "attendance:readwrite",
    ])

    const body = await request.json()
    const { userId, latitude, longitude, accuracy, notes } = body

    if (!userId || typeof userId !== "string") {
      throw new HttpError("userId is required", 400)
    }

    validateLocationData(body)

    const result = await autoCheckIn(
      { userId, latitude, longitude, accuracy, notes },
      apiKey
    )

    return externalSuccessResponse(result, 201)
  } catch (error) {
    return externalErrorResponse(error)
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npm run type-check
```

- [ ] **Step 3: Commit**

```bash
git add app/api/external/attendance/auto-checkin/route.ts
git commit -m "feat: add POST /api/external/attendance/auto-checkin route handler"
```

---

### Task 6: Auto Check-In Tests

**Files:**
- Create: `app/api/external/attendance/auto-checkin/services.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
import { prisma } from "@/lib/prisma"
import { reverseGeocode } from "@/lib/location"
import { validateLocationData, autoCheckIn, HttpError } from "./services"
import type { ValidatedApiKey } from "@/app/api/external/utils"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    absensiRecord: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}))

jest.mock("@/lib/location", () => ({
  reverseGeocode: jest.fn(),
}))

const mockApiKey: ValidatedApiKey = {
  id: "key-1",
  prefix: "api_live",
  name: "Test Key",
  scope: "attendance:readwrite",
  createdBy: "admin-1",
}

describe("Auto Check-In Service", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("validateLocationData", () => {
    it("should not throw for valid location data", () => {
      expect(() =>
        validateLocationData({ latitude: 1, longitude: 1, accuracy: 10 })
      ).not.toThrow()
    })

    it("should throw for missing data", () => {
      expect(() =>
        validateLocationData({ latitude: 1, longitude: 1 } as any)
      ).toThrow(HttpError)
    })

    it("should throw for poor accuracy", () => {
      expect(() =>
        validateLocationData({ latitude: 1, longitude: 1, accuracy: 9999 })
      ).toThrow(HttpError)
    })
  })

  describe("autoCheckIn", () => {
    const validInput = {
      userId: "user-1",
      latitude: -6.2088,
      longitude: 106.8456,
      accuracy: 12.5,
      notes: "via QR",
    }

    it("should throw 404 if user not found", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(autoCheckIn(validInput, mockApiKey)).rejects.toThrow(
        "User not found or inactive"
      )
    })

    it("should throw 404 if user is inactive", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        isActive: false,
      })

      await expect(autoCheckIn(validInput, mockApiKey)).rejects.toThrow(
        "User not found or inactive"
      )
    })

    it("should throw 409 if attendance exists today", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        isActive: true,
      })
      ;(prisma.absensiRecord.findFirst as jest.Mock).mockResolvedValue({
        id: "rec-1",
      })

      await expect(autoCheckIn(validInput, mockApiKey)).rejects.toThrow(
        "Attendance already exists for today"
      )
    })

    it("should create attendance record and return data", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        isActive: true,
      })
      ;(prisma.absensiRecord.findFirst as jest.Mock).mockResolvedValue(null)
      ;(reverseGeocode as jest.Mock).mockResolvedValue("Jl. Sudirman, Jakarta")
      ;(prisma.absensiRecord.create as jest.Mock).mockResolvedValue({
        id: "rec-1",
        checkInTime: new Date("2026-05-05T08:00:00Z"),
        checkOutTime: new Date("2026-05-05T16:00:00Z"),
        workHours: { toString: () => "8.00" },
        status: "present",
        checkInAddress: "Jl. Sudirman, Jakarta",
      })
      ;(prisma.activityLog.create as jest.Mock).mockResolvedValue({})

      const result = await autoCheckIn(validInput, mockApiKey)

      expect(result.id).toBe("rec-1")
      expect(result.status).toBe("present")
      expect(prisma.absensiRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            workHours: 8.00,
            status: "present",
          }),
        })
      )
      expect(prisma.activityLog.create).toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail/pass**

```bash
npm test -- --testPathPattern="services.test.ts"
```

Expected: 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/api/external/attendance/auto-checkin/services.test.ts
git commit -m "test: add unit tests for auto check-in service"
```

---

### Task 7: Attendance Read Service

**Files:**
- Create: `app/api/external/attendance/services.ts`

- [ ] **Step 1: Write the read attendance services file**

```typescript
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"
import { Prisma } from "@prisma/client"
import type { ValidatedApiKey } from "@/app/api/external/utils"

export interface GetAttendanceParams {
  date?: string
  dateFrom?: string
  dateTo?: string
  userId?: string
  limit?: number
  offset?: number
}

export async function getAttendanceData(
  params: GetAttendanceParams,
  apiKey: ValidatedApiKey
) {
  const { date, dateFrom, dateTo, userId, limit = 50, offset = 0 } = params

  const effectiveLimit = Math.min(Math.max(1, limit), 200)
  const effectiveOffset = Math.max(0, offset)

  const where: Prisma.AbsensiRecordWhereInput = {}

  if (date) {
    const d = new Date(date)
    if (!isNaN(d.getTime())) {
      where.date = {
        gte: startOfDay(d),
        lte: endOfDay(d),
      }
    }
  } else {
    const dateFilter: { gte?: Date; lte?: Date } = {}

    if (dateFrom) {
      const from = new Date(dateFrom)
      if (!isNaN(from.getTime())) {
        dateFilter.gte = startOfDay(from)
      }
    }
    if (dateTo) {
      const to = new Date(dateTo)
      if (!isNaN(to.getTime())) {
        dateFilter.lte = endOfDay(to)
      }
    }

    if (dateFilter.gte || dateFilter.lte) {
      where.date = dateFilter
    } else {
      // Default: today if no filter
      const today = new Date()
      where.date = {
        gte: startOfDay(today),
        lte: endOfDay(today),
      }
    }
  }

  if (userId) {
    where.userId = userId
  }

  const [total, records] = await Promise.all([
    prisma.absensiRecord.count({ where }),
    prisma.absensiRecord.findMany({
      where,
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: { date: "desc" },
      take: effectiveLimit,
      skip: effectiveOffset,
    }),
  ])

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: apiKey.createdBy,
      action: "EXTERNAL_API_READ_ATTENDANCE",
      resourceType: "absensi_record",
      resourceId: "batch",
      details: {
        apiKeyId: apiKey.id,
        prefix: apiKey.prefix,
        endpoint: "GET /api/external/attendance",
        filters: { date, dateFrom, dateTo, userId },
      } as unknown as Prisma.InputJsonValue,
    },
  })

  const data = records.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    date: r.date,
    checkInTime: r.checkInTime,
    checkOutTime: r.checkOutTime,
    checkInLatitude: r.checkInLatitude,
    checkInLongitude: r.checkInLongitude,
    checkInAddress: r.checkInAddress,
    checkOutLatitude: r.checkOutLatitude,
    checkOutLongitude: r.checkOutLongitude,
    checkOutAddress: r.checkOutAddress,
    workHours: r.workHours?.toString() ?? null,
    overtimeHours: r.overtimeHours?.toString() ?? "0.00",
    lateMinutes: r.lateMinutes,
    status: r.status,
  }))

  return {
    data,
    pagination: {
      total,
      limit: effectiveLimit,
      offset: effectiveOffset,
    },
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npm run type-check
```

- [ ] **Step 3: Commit**

```bash
git add app/api/external/attendance/services.ts
git commit -m "feat: add external attendance read service with pagination"
```

---

### Task 8: Attendance Read Route Handler

**Files:**
- Create: `app/api/external/attendance/route.ts`

- [ ] **Step 1: Write the route handler**

```typescript
import { NextRequest } from "next/server"
import {
  validateApiKey,
  externalSuccessResponse,
  externalErrorResponse,
} from "@/app/api/external/utils"
import { getAttendanceData } from "./services"

export async function GET(request: NextRequest) {
  try {
    const apiKey = await validateApiKey(request, [
      "attendance:read",
      "attendance:readwrite",
    ])

    const { searchParams } = new URL(request.url)

    const result = await getAttendanceData(
      {
        date: searchParams.get("date") ?? undefined,
        dateFrom: searchParams.get("dateFrom") ?? undefined,
        dateTo: searchParams.get("dateTo") ?? undefined,
        userId: searchParams.get("userId") ?? undefined,
        limit: searchParams.get("limit")
          ? parseInt(searchParams.get("limit")!, 10)
          : 50,
        offset: searchParams.get("offset")
          ? parseInt(searchParams.get("offset")!, 10)
          : 0,
      },
      apiKey
    )

    return externalSuccessResponse(result)
  } catch (error) {
    return externalErrorResponse(error)
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npm run type-check
```

- [ ] **Step 3: Commit**

```bash
git add app/api/external/attendance/route.ts
git commit -m "feat: add GET /api/external/attendance route handler"
```

---

### Task 9: Attendance Read Tests

**Files:**
- Create: `app/api/external/attendance/services.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
import { prisma } from "@/lib/prisma"
import { getAttendanceData } from "./services"
import type { ValidatedApiKey } from "@/app/api/external/utils"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    absensiRecord: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}))

const mockApiKey: ValidatedApiKey = {
  id: "key-1",
  prefix: "api_live",
  name: "Test Key",
  scope: "attendance:readwrite",
  createdBy: "admin-1",
}

describe("getAttendanceData", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should return paginated attendance data", async () => {
    const mockRecord = {
      id: "rec-1",
      userId: "user-1",
      user: { name: "John Doe" },
      date: new Date("2026-05-05"),
      checkInTime: new Date("2026-05-05T08:00:00Z"),
      checkOutTime: new Date("2026-05-05T16:00:00Z"),
      checkInLatitude: { toString: () => "-6.20880000" },
      checkInLongitude: { toString: () => "106.84560000" },
      checkInAddress: "Jl. Sudirman",
      checkOutLatitude: null,
      checkOutLongitude: null,
      checkOutAddress: null,
      workHours: { toString: () => "8.00" },
      overtimeHours: { toString: () => "0.00" },
      lateMinutes: 0,
      status: "present",
    }

    ;(prisma.absensiRecord.count as jest.Mock).mockResolvedValue(1)
    ;(prisma.absensiRecord.findMany as jest.Mock).mockResolvedValue([mockRecord])
    ;(prisma.activityLog.create as jest.Mock).mockResolvedValue({})

    const result = await getAttendanceData({}, mockApiKey)

    expect(result.data).toHaveLength(1)
    expect(result.data[0].userName).toBe("John Doe")
    expect(result.pagination.total).toBe(1)
    expect(result.pagination.limit).toBe(50)
    expect(result.pagination.offset).toBe(0)
    expect(prisma.absensiRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { user: { select: { name: true } } },
      })
    )
  })

  it("should enforce max limit of 200", async () => {
    ;(prisma.absensiRecord.count as jest.Mock).mockResolvedValue(0)
    ;(prisma.absensiRecord.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.activityLog.create as jest.Mock).mockResolvedValue({})

    const result = await getAttendanceData({ limit: 500 }, mockApiKey)

    // Verify it used capped limit in response
    expect(result.pagination.limit).toBe(200)
  })

  it("should filter by date param", async () => {
    ;(prisma.absensiRecord.count as jest.Mock).mockResolvedValue(0)
    ;(prisma.absensiRecord.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.activityLog.create as jest.Mock).mockResolvedValue({})

    await getAttendanceData({ date: "2026-05-05" }, mockApiKey)

    expect(prisma.absensiRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.any(Object),
        }),
      })
    )
  })

  it("should filter by userId", async () => {
    ;(prisma.absensiRecord.count as jest.Mock).mockResolvedValue(0)
    ;(prisma.absensiRecord.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.activityLog.create as jest.Mock).mockResolvedValue({})

    await getAttendanceData({ userId: "user-1" }, mockApiKey)

    expect(prisma.absensiRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      })
    )
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npm test -- --testPathPattern="services.test.ts"
```

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/api/external/attendance/services.test.ts
git commit -m "test: add unit tests for external attendance read service"
```

---

### Task 10: API Keys Management — Internal CRUD API

**Files:**
- Create: `app/api/settings/api-keys/route.ts`
- Create: `app/api/settings/api-keys/[id]/route.ts`

- [ ] **Step 1: Write the list + create route handler**

```typescript
// app/api/settings/api-keys/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { randomBytes } from "crypto"
import bcrypt from "bcryptjs"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

// GET /api/settings/api-keys — List all API keys (prefix only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const keys = await prisma.apiKey.findMany({
      select: {
        id: true,
        prefix: true,
        name: true,
        scope: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(keys)
  } catch (error) {
    console.error("Error fetching API keys:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/settings/api-keys — Generate new API key
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, scope } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    const validScopes = ["attendance:readwrite", "attendance:read", "attendance:auto-checkin"]
    const resolvedScope = validScopes.includes(scope) ? scope : "attendance:readwrite"

    // Generate key: api_live_ + 48 random chars
    const rawKey = "api_live_" + randomBytes(36).toString("base64url")

    // Hash with bcryptjs (salt 12)
    const hashedKey = await bcrypt.hash(rawKey, 12)

    const prefix = rawKey.slice(0, 8)

    const apiKey = await prisma.apiKey.create({
      data: {
        key: hashedKey,
        prefix,
        name: name.trim(),
        scope: resolvedScope,
        createdBy: session.user.id,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_API_KEY",
        resourceType: "api_key",
        resourceId: apiKey.id,
        details: {
          name: apiKey.name,
          scope: apiKey.scope,
          prefix: apiKey.prefix,
        },
      },
    })

    // Return the raw key (only time it's shown)
    return NextResponse.json({
      id: apiKey.id,
      prefix: apiKey.prefix,
      name: apiKey.name,
      scope: apiKey.scope,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
      rawKey, // shown once
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating API key:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Write the single key route handler**

```typescript
// app/api/settings/api-keys/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

// PUT /api/settings/api-keys/[id] — Update name or toggle active
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.apiKey.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      )
    }

    const data: { name?: string; isActive?: boolean } = {}

    if (typeof body.name === "string" && body.name.trim().length > 0) {
      data.name = body.name.trim()
    }

    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data,
      select: {
        id: true,
        prefix: true,
        name: true,
        scope: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: data.isActive === false ? "REVOKE_API_KEY" : "UPDATE_API_KEY",
        resourceType: "api_key",
        resourceId: id,
        details: {
          changes: Object.keys(data),
          active: data.isActive,
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating API key:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/api-keys/[id] — Soft delete (set isActive = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const { id } = await params

    const existing = await prisma.apiKey.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      )
    }

    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_API_KEY",
        resourceType: "api_key",
        resourceId: id,
        details: {
          prefix: existing.prefix,
          name: existing.name,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting API key:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Verify compilation**

```bash
npm run type-check
```

- [ ] **Step 4: Commit**

```bash
git add app/api/settings/api-keys/
git commit -m "feat: add API keys CRUD endpoints (GET/POST/PUT/DELETE)"
```

---

### Task 11: Constants and Sidebar — Add API Keys navigation

**Files:**
- Modify: `lib/constants.ts`
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Add API_KEYS constant**

In `lib/constants.ts`, add to the `NAVIGATION` object:

```typescript
// Add this line inside the NAVIGATION object, after ACTIVITY_LOG
API_KEYS: "Kunci API",
```

Place it right after `ACTIVITY_LOG` line:
```typescript
  ACTIVITY_LOG: "Log Aktivitas",
  API_KEYS: "Kunci API",
```

- [ ] **Step 2: Add sidebar navigation item**

In `components/layout/sidebar.tsx`, import `Key` from `lucide-react`:
```typescript
// Add Key to the existing lucide-react import
import {
  LayoutDashboard,
  Clock,
  FileText,
  Users,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Activity,
  Key,
} from "lucide-react"
```

Add a new nav item to the `navigationItems` array after the activity-logs entry:
```typescript
    {
      href: "/settings/api-keys",
      label: NAVIGATION.API_KEYS,
      icon: Key,
      roles: [UserRole.admin]
    },
```

- [ ] **Step 3: Verify compilation**

```bash
npm run type-check
```

- [ ] **Step 4: Commit**

```bash
git add lib/constants.ts components/layout/sidebar.tsx
git commit -m "feat: add API Keys navigation item to sidebar (admin only)"
```

---

### Task 12: API Keys Table Component

**Files:**
- Create: `components/settings/api-keys-table.tsx`

- [ ] **Step 1: Write the table component**

```typescript
"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface ApiKeyRow {
  id: string
  prefix: string
  name: string
  scope: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
}

interface ApiKeysTableProps {
  keys: ApiKeyRow[]
  onToggleActive: (id: string, isActive: boolean) => void
}

const SCOPE_LABELS: Record<string, string> = {
  "attendance:readwrite": "Read + Auto Check-in",
  "attendance:read": "Read Only",
  "attendance:auto-checkin": "Auto Check-in Only",
}

export function ApiKeysTable({ keys, onToggleActive }: ApiKeysTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Prefix</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead>Terakhir Digunakan</TableHead>
          <TableHead>Dibuat</TableHead>
          <TableHead className="text-right">Aktif</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              Belum ada API key.
            </TableCell>
          </TableRow>
        )}
        {keys.map((key) => (
          <TableRow key={key.id}>
            <TableCell className="font-mono text-sm">{key.prefix}...</TableCell>
            <TableCell>{key.name}</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">
                {SCOPE_LABELS[key.scope] ?? key.scope}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {key.lastUsedAt
                ? format(new Date(key.lastUsedAt), "dd MMM yyyy HH:mm", { locale: id })
                : "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {format(new Date(key.createdAt), "dd MMM yyyy", { locale: id })}
            </TableCell>
            <TableCell className="text-right">
              <Switch
                checked={key.isActive}
                onCheckedChange={(checked) => onToggleActive(key.id, checked)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 2: Verify compilation**

```bash
npm run type-check
```

- [ ] **Step 3: Commit**

```bash
git add components/settings/api-keys-table.tsx
git commit -m "feat: add API keys table component"
```

---

### Task 13: Generate API Key Dialog Component

**Files:**
- Create: `components/settings/generate-key-dialog.tsx`

- [ ] **Step 1: Write the dialog component**

```typescript
"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Check } from "lucide-react"

interface GenerateKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerated: () => void
}

export function GenerateKeyDialog({
  open,
  onOpenChange,
  onGenerated,
}: GenerateKeyDialogProps) {
  const [name, setName] = useState("")
  const [scope, setScope] = useState("attendance:readwrite")
  const [loading, setLoading] = useState(false)
  const [rawKey, setRawKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  const handleGenerate = async () => {
    if (!name.trim()) {
      setError("Nama wajib diisi")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scope }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Gagal membuat API key")
      }

      const data = await res.json()
      setRawKey(data.rawKey)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat API key")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (rawKey) {
      await navigator.clipboard.writeText(rawKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDone = () => {
    setName("")
    setScope("attendance:readwrite")
    setRawKey(null)
    setError("")
    setCopied(false)
    onOpenChange(false)
    onGenerated()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {rawKey ? "API Key Berhasil Dibuat" : "Buat API Key Baru"}
          </DialogTitle>
          <DialogDescription>
            {rawKey
              ? "Simpan key ini sekarang — tidak akan ditampilkan lagi."
              : "API key digunakan untuk mengakses API absensi dari aplikasi eksternal."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {rawKey ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <code className="text-sm break-all select-all">{rawKey}</code>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Tersalin
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Salin Key
                </>
              )}
            </Button>
            <p className="text-xs text-destructive text-center">
              Key ini hanya ditampilkan sekali. Pastikan Anda sudah menyimpannya.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Nama</Label>
              <Input
                id="key-name"
                placeholder="Contoh: QR Scanner App"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-scope">Scope</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger id="key-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance:readwrite">
                    Read + Auto Check-in
                  </SelectItem>
                  <SelectItem value="attendance:read">
                    Read Only
                  </SelectItem>
                  <SelectItem value="attendance:auto-checkin">
                    Auto Check-in Only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? "Membuat..." : "Buat API Key"}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleDone}>
            {rawKey ? "Selesai" : "Batal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify compilation**

```bash
npm run type-check
```

- [ ] **Step 3: Commit**

```bash
git add components/settings/generate-key-dialog.tsx
git commit -m "feat: add generate API key dialog component"
```

---

### Task 14: API Keys Page

**Files:**
- Create: `app/settings/api-keys/page.tsx`

- [ ] **Step 1: Write the settings API keys page**

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { NAVIGATION } from "@/lib/constants"
import { ApiKeysTable } from "@/components/settings/api-keys-table"
import { GenerateKeyDialog } from "@/components/settings/generate-key-dialog"

interface ApiKeyRow {
  id: string
  prefix: string
  name: string
  scope: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
}

export default function ApiKeysPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/api-keys")
      if (res.ok) {
        const data = await res.json()
        setKeys(data)
      }
    } catch (e) {
      console.error("Failed to fetch API keys:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== "loading") {
      fetchKeys()
    }
  }, [status, fetchKeys])

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/settings/api-keys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      if (res.ok) {
        await fetchKeys()
      }
    } catch (e) {
      console.error("Failed to toggle API key:", e)
    }
  }

  if (status === "loading") {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
        <div className="h-64 bg-white/5 rounded animate-pulse" />
      </div>
    )
  }

  if (!session || session.user.role !== "admin") {
    router.push("/dashboard")
    return null
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 animate-fade-down">
        <h1 className="text-4xl font-bold glass-title text-center lg:text-left">
          {NAVIGATION.API_KEYS}
        </h1>
        <p className="text-white/80 text-lg">
          Kelola API key untuk akses eksternal ke API absensi
        </p>
      </div>

      <div className="animate-fade-up anim-delay-200">
        <div className="solid-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-white/60">
              API key digunakan oleh aplikasi eksternal (QR scanner, website lain) untuk
              mengakses API absensi. Simpan key dengan aman.
            </p>
            <Button
              variant="glassOutline"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Buat Key
            </Button>
          </div>

          {loading ? (
            <div className="h-32 bg-white/5 rounded animate-pulse" />
          ) : (
            <ApiKeysTable keys={keys} onToggleActive={handleToggleActive} />
          )}
        </div>
      </div>

      <GenerateKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onGenerated={fetchKeys}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify compilation**

```bash
npm run type-check
```

- [ ] **Step 3: Commit**

```bash
git add app/settings/api-keys/page.tsx
git commit -m "feat: add API keys management page (/settings/api-keys)"
```

---

### Task 15: Final Integration Test — Run full test suite

**Files:**
- All new + modified files

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All existing tests + new tests pass.

- [ ] **Step 2: Run type check**

```bash
npm run type-check
```

Expected: No TypeScript errors.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: No lint errors.

- [ ] **Step 4: Start dev server and verify**

```bash
npm run dev
```

Manual verification checklist:
1. Login as admin → Settings → API Keys visible in sidebar
2. Create API key → copy key → verify it appears in table
3. Toggle revoke → API key becomes inactive
4. Test `curl -X OPTIONS http://localhost:3004/api/external/attendance` → returns 204 with CORS headers
5. Test `curl -H "x-api-key: $KEY" http://localhost:3004/api/external/attendance` → returns attendance data
6. Test `curl -X POST -H "Content-Type: application/json" -H "x-api-key: $KEY" -d '{"userId":"...","latitude":-6.2,"longitude":106.8,"accuracy":10}' http://localhost:3004/api/external/attendance/auto-checkin` → returns 201 with auto check-in record

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete external attendance API with CORS, API key auth, and management UI"
```

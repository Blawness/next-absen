import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AttendanceStatus, UserRole, Prisma } from "@prisma/client"

export class HttpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function validateSession() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new HttpError("Unauthorized", 401)
  }

  return session
}

export type PeriodType = "weekly" | "monthly"
export type ScopeType = "org" | "department" | "user"

export interface DateRange {
  start: Date
  end: Date
}

function getMonday(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = date.getUTCDay()
  const diff = (day === 0 ? -6 : 1) - day // adjust so Monday is first day, Sunday -> -6
  date.setUTCDate(date.getUTCDate() + diff)
  return date
}

export function resolveRange(period: PeriodType, today = new Date(), customStart?: string, customEnd?: string): DateRange {
  if (customStart || customEnd) {
    const start = customStart ? new Date(customStart) : today
    const end = customEnd ? new Date(customEnd) : today
    const clampedEnd = end > today ? today : end
    return { start, end: clampedEnd }
  }

  const now = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  if (period === "weekly") {
    const start = getMonday(now)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)
    const clampedEnd = end > now ? now : end
    return { start, end: clampedEnd }
  }

  // monthly
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
  const clampedEnd = end > now ? now : end
  return { start, end: clampedEnd }
}

function isBusinessDay(date: Date): boolean {
  const day = date.getUTCDay()
  return day !== 0 && day !== 6 // Mon-Fri only
}

export function countBusinessDays(range: DateRange): number {
  let count = 0
  const d = new Date(range.start)
  while (d <= range.end) {
    if (isBusinessDay(d)) count++
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return count
}

export interface KpiMetrics {
  period: PeriodType
  range: { start: string; end: string }
  scope: ScopeType
  metrics: {
    attendanceRate: number
    onTimeRate: number
    avgWorkHours: number
    totalOvertime: number
    lateCount: number
    absentCount: number
  }
  timeseries: Array<{ date: string; attendanceRate: number; onTimeRate: number }>
}

export interface KpiQuery {
  period: PeriodType
  scope?: ScopeType
  department?: string | null
  userId?: string | null
  start?: string
  end?: string
}

async function getGracePeriodMinutes(): Promise<number> {
  try {
    const settings = await prisma.systemSettings.findFirst()
    const businessHours = settings?.businessHours as Record<string, unknown> | null
    const minutes = businessHours?.gracePeriodMinutes
    const num = typeof minutes === "number" ? minutes : parseInt(String(minutes || 0))
    return Number.isFinite(num) && num >= 0 ? num : 15
  } catch {
    return 15
  }
}

export async function getKpi(query: KpiQuery): Promise<KpiMetrics> {
  const session = await validateSession()

  const effectiveScope: ScopeType = (() => {
    if (session.user.role === UserRole.admin) return query.scope ?? "org"
    if (session.user.role === UserRole.manager) return "department"
    return "user"
  })()

  const { start, end } = resolveRange(query.period, new Date(), query.start, query.end)
  const businessDays = countBusinessDays({ start, end })

  const where: Prisma.AbsensiRecordWhereInput = {
    date: {
      gte: start,
      lte: end,
    },
  }

  if (effectiveScope === "user") {
    where.userId = query.userId ?? session.user.id
  } else if (effectiveScope === "department") {
    const dept = query.department ?? (session.user.department || undefined)
    if (dept) {
      where.user = { department: dept }
    }
  }
  // For org scope, no additional filtering needed - all users included

  const records = await prisma.absensiRecord.findMany({
    where,
    select: {
      userId: true,
      date: true,
      workHours: true,
      overtimeHours: true,
      lateMinutes: true,
      status: true,
      user: { select: { department: true } },
    },
    orderBy: { date: "asc" },
  })

  const distinctUsers = new Set(records.map(r => r.userId))
  const denominator = Math.max(1, businessDays * Math.max(1, distinctUsers.size))

  const attended = records.filter(r => r.status !== AttendanceStatus.absent)
  const lateCount = records.filter(r => r.status === AttendanceStatus.late).length
  const absentCount = records.filter(r => r.status === AttendanceStatus.absent).length

  const totalOvertime = records.reduce((sum, r) => sum + Number(r.overtimeHours || 0), 0)
  const workHoursValues = records.map(r => (r.workHours == null ? null : Number(r.workHours))).filter((v): v is number => v != null)
  const avgWorkHours = workHoursValues.length > 0
    ? workHoursValues.reduce((a, b) => a + b, 0) / workHoursValues.length
    : 0

  const grace = await getGracePeriodMinutes()
  const onTime = attended.filter(r => (r.lateMinutes ?? 0) <= grace).length

  const attendanceRate = attended.length / denominator
  const onTimeRate = attended.length > 0 ? onTime / attended.length : 0

  // timeseries per day
  const byDate = new Map<string, { attended: number; onTime: number; users: Set<string> }>()
  for (const r of records) {
    const key = r.date.toISOString().slice(0, 10)
    if (!byDate.has(key)) byDate.set(key, { attended: 0, onTime: 0, users: new Set() })
    const entry = byDate.get(key)!
    entry.users.add(r.userId)
    if (r.status !== "absent") {
      entry.attended += 1
      if ((r.lateMinutes ?? 0) <= grace) entry.onTime += 1
    }
  }

  const timeseries: Array<{ date: string; attendanceRate: number; onTimeRate: number }> = []
  const iter = new Date(start)
  while (iter <= end) {
    const k = iter.toISOString().slice(0, 10)
    const entry = byDate.get(k)
    const dayUsers = (entry?.users.size ?? distinctUsers.size) || 1
    timeseries.push({
      date: k,
      attendanceRate: entry ? entry.attended / Math.max(1, dayUsers) : 0,
      onTimeRate: entry && entry.attended > 0 ? entry.onTime / entry.attended : 0,
    })
    iter.setUTCDate(iter.getUTCDate() + 1)
  }

  const round2 = (n: number) => Math.round(n * 100) / 100

  return {
    period: query.period,
    scope: effectiveScope,
    range: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
    metrics: {
      attendanceRate: round2(attendanceRate),
      onTimeRate: round2(onTimeRate),
      avgWorkHours: round2(avgWorkHours),
      totalOvertime: round2(totalOvertime),
      lateCount,
      absentCount,
    },
    timeseries: timeseries.map(d => ({
      date: d.date,
      attendanceRate: round2(d.attendanceRate),
      onTimeRate: round2(d.onTimeRate),
    })),
  }
}



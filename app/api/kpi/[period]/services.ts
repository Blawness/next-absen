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
    // Set end to end of day
    end.setUTCHours(23, 59, 59, 999)
    const clampedEnd = end > today ? today : end
    return { start, end: clampedEnd }
  }

  const now = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  if (period === "weekly") {
    const start = getMonday(now)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)
    // Set end to end of day
    end.setUTCHours(23, 59, 59, 999)
    const clampedEnd = end > now ? now : end
    return { start, end: clampedEnd }
  }

  // monthly
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
  // Set end to end of day
  end.setUTCHours(23, 59, 59, 999)
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
  trends: {
    attendanceRate: { direction: "up" | "down" | "neutral"; change: number }
    onTimeRate: { direction: "up" | "down" | "neutral"; change: number }
    avgWorkHours: { direction: "up" | "down" | "neutral"; change: number }
    totalOvertime: { direction: "up" | "down" | "neutral"; change: number }
    lateCount: { direction: "up" | "down" | "neutral"; change: number }
    absentCount: { direction: "up" | "down" | "neutral"; change: number }
  }
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

  // 1. Resolve Date Range
  const { start, end } = resolveRange(query.period, new Date(), query.start, query.end)
  const businessDays = countBusinessDays({ start, end })

  // 2. Get Total Active Users (Denominator)
  const userWhere: Prisma.UserWhereInput = { isActive: true }
  if (effectiveScope === "user") {
    userWhere.id = query.userId ?? session.user.id
  } else if (effectiveScope === "department") {
    const dept = query.department ?? (session.user.department || undefined)
    if (dept) {
      userWhere.department = dept
    }
  }
  const totalActiveUsers = await prisma.user.count({ where: userWhere })
  const denominator = Math.max(1, businessDays * totalActiveUsers)

  // 3. Fetch Records
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

  // 4. Calculate Metrics
  const attended = records.filter(r => r.status !== AttendanceStatus.absent)
  const lateCount = records.filter(r => r.status === AttendanceStatus.late).length
  // Absent count is total potential attendance slots minus actual attendance
  // But we also need to account for explicit "absent" records if any, though usually absence is lack of record?
  // If the system creates "absent" records, we count them.
  // If "silent absence", we infer it.
  // Let's stick to explicit records for now, BUT the denominator is fixed.
  // Wait, if we use totalActiveUsers, we can calculate "silent absences" as (denominator - attended.length).
  // However, `absentCount` in the UI usually refers to explicit absence records or days missed.
  // Let's calculate absentCount as (denominator - attended.length).
  const absentCount = Math.max(0, denominator - attended.length)

  const totalOvertime = records.reduce((sum, r) => sum + Number(r.overtimeHours || 0), 0)
  const workHoursValues = records.map(r => (r.workHours == null ? null : Number(r.workHours))).filter((v): v is number => v != null)
  const avgWorkHours = workHoursValues.length > 0
    ? workHoursValues.reduce((a, b) => a + b, 0) / workHoursValues.length
    : 0

  const grace = await getGracePeriodMinutes()
  const onTime = attended.filter(r => (r.lateMinutes ?? 0) <= grace).length

  const attendanceRate = attended.length / denominator
  const onTimeRate = attended.length > 0 ? onTime / attended.length : 0

  // 5. Timeseries
  const byDate = new Map<string, { attended: number; onTime: number }>()
  for (const r of records) {
    const key = r.date.toISOString().slice(0, 10)
    if (!byDate.has(key)) byDate.set(key, { attended: 0, onTime: 0 })
    const entry = byDate.get(key)!
    if (r.status !== "absent") {
      entry.attended += 1
      if ((r.lateMinutes ?? 0) <= grace) entry.onTime += 1
    }
  }

  const timeseries: Array<{ date: string; attendanceRate: number; onTimeRate: number }> = []
  const iter = new Date(start)
  while (iter <= end) {
    if (isBusinessDay(iter)) {
      const k = iter.toISOString().slice(0, 10)
      const entry = byDate.get(k)
      // Daily denominator is totalActiveUsers
      timeseries.push({
        date: k,
        attendanceRate: entry ? entry.attended / totalActiveUsers : 0,
        onTimeRate: entry && entry.attended > 0 ? entry.onTime / entry.attended : 0,
      })
    }
    iter.setUTCDate(iter.getUTCDate() + 1)
  }

  const round2 = (n: number) => Math.round(n * 100) / 100

  // 6. Calculate Trends (Previous Period)
  // Calculate previous period range
  const duration = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - duration)

  // Recursive call for previous period would be expensive and complex due to infinite recursion risk if not careful.
  // Instead, let's just do a simplified query for previous period metrics.
  // We need: attendanceRate, onTimeRate, avgWorkHours, totalOvertime, lateCount, absentCount

  const prevBusinessDays = countBusinessDays({ start: prevStart, end: prevEnd })
  const prevDenominator = Math.max(1, prevBusinessDays * totalActiveUsers)

  const prevWhere = { ...where, date: { gte: prevStart, lte: prevEnd } }
  const prevRecords = await prisma.absensiRecord.findMany({
    where: prevWhere,
    select: {
      workHours: true,
      overtimeHours: true,
      lateMinutes: true,
      status: true,
    }
  })

  const prevAttended = prevRecords.filter(r => r.status !== AttendanceStatus.absent)
  const prevLateCount = prevRecords.filter(r => r.status === AttendanceStatus.late).length
  const prevAbsentCount = Math.max(0, prevDenominator - prevAttended.length)
  const prevTotalOvertime = prevRecords.reduce((sum, r) => sum + Number(r.overtimeHours || 0), 0)
  const prevWorkHoursValues = prevRecords.map(r => (r.workHours == null ? null : Number(r.workHours))).filter((v): v is number => v != null)
  const prevAvgWorkHours = prevWorkHoursValues.length > 0
    ? prevWorkHoursValues.reduce((a, b) => a + b, 0) / prevWorkHoursValues.length
    : 0
  const prevOnTime = prevAttended.filter(r => (r.lateMinutes ?? 0) <= grace).length

  const prevAttendanceRate = prevAttended.length / prevDenominator
  const prevOnTimeRate = prevAttended.length > 0 ? prevOnTime / prevAttended.length : 0

  const getTrend = (current: number, previous: number) => {
    const diff = current - previous

    // For rates (0-1), diff * 100 gives percentage point difference.
    // For counts, we might want percentage change.
    // Let's stick to simple difference for rates, and percentage change for counts?
    // The UI expects a "change" number.
    // Let's normalize:
    // Rates: percentage points (e.g. 0.8 vs 0.7 -> 10% change)
    // Counts: percentage change (e.g. 10 vs 8 -> 25% change)

    let calculatedChange = 0
    if (current <= 1 && previous <= 1 && current >= 0 && previous >= 0) {
      // It's likely a rate
      calculatedChange = Math.round(Math.abs(current - previous) * 100)
    } else {
      // It's a count or hours
      if (previous === 0) calculatedChange = current === 0 ? 0 : 100
      else calculatedChange = Math.round(Math.abs((current - previous) / previous) * 100)
    }

    return {
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
      change: calculatedChange
    } as const
  }

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
    trends: {
      attendanceRate: getTrend(attendanceRate, prevAttendanceRate),
      onTimeRate: getTrend(onTimeRate, prevOnTimeRate),
      avgWorkHours: getTrend(avgWorkHours, prevAvgWorkHours),
      totalOvertime: getTrend(totalOvertime, prevTotalOvertime),
      lateCount: getTrend(lateCount, prevLateCount),
      absentCount: getTrend(absentCount, prevAbsentCount),
    }
  }
}



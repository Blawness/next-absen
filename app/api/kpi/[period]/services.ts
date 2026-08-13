import { validateSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AttendanceStatus, UserRole, Prisma } from "@prisma/client"

import { HttpError } from "@/lib/errors"
import { getUtcDateKey, getUtcDayBounds } from "@/lib/date-bounds"
import { getBusinessHoursConfig } from "@/lib/business-hours"

export { HttpError }

export type PeriodType = "weekly" | "monthly"
export type ScopeType = "org" | "department" | "user"

export interface DateRange {
  start: Date
  end: Date
}

function getUtcMonday(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = date.getUTCDay()
  const diff = (day === 0 ? -6 : 1) - day // Monday-first week, Sunday wraps back
  date.setUTCDate(date.getUTCDate() + diff)
  return date
}

export function resolveRange(
  period: PeriodType,
  today = new Date(),
  customStart?: string,
  customEnd?: string,
): DateRange {
  if (customStart || customEnd) {
    // Treat custom dates as UTC calendar dates (YYYY-MM-DD) for consistency
    // with how the rest of the API handles date-only comparisons.
    const startStr = customStart ?? customEnd!
    const endStr = customEnd ?? customStart!
    const start = new Date(`${startStr}T00:00:00.000Z`)
    const end = new Date(`${endStr}T00:00:00.000Z`)
    end.setUTCDate(end.getUTCDate() + 1) // include end date
    return { start, end }
  }

  if (period === "weekly") {
    const start = getUtcMonday(today)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)
    end.setUTCHours(23, 59, 59, 999)
    return { start, end }
  }

  // monthly
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0))
  end.setUTCHours(23, 59, 59, 999)
  return { start, end }
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
  const config = await getBusinessHoursConfig()
  return config.gracePeriodMinutes
}

export async function getKpi(query: KpiQuery): Promise<KpiMetrics> {
  const session = await validateSession()

  const role = session.user.role

  // ---- 1. Resolve effective scope & filter ----
  //
  // SECURITY: For non-admin/non-manager roles, we IGNORE any userId passed
  // in the query string and force scope to "user" of the caller. Previously
  // a regular user could pass `?userId=<other-id>` and read someone else's
  // attendance via the API. (BUG-FIX)
  const isOrgWideRole = role === UserRole.admin || role === UserRole.superadmin

  const effectiveScope: ScopeType = (() => {
    // An org-wide role that drills into one employee is a "user" scope query.
    // Previously userId was silently dropped here, so the employee filter in
    // the KPI UI had no effect.
    if (isOrgWideRole) {
      if (query.userId) return "user"
      if (query.department) return "department"
      return query.scope ?? "org"
    }
    if (role === UserRole.manager) return "department"
    return "user" // user
  })()

  // Hardcode userId for role=user. Managers can only query their department.
  let effectiveUserId: string | undefined
  if (effectiveScope === "user") {
    effectiveUserId = isOrgWideRole && query.userId ? query.userId : session.user.id
  }
  let effectiveDepartment: string | undefined
  if (effectiveScope === "department") {
    effectiveDepartment = query.department ?? session.user.department ?? undefined
  }

  // ---- 2. Resolve Date Range ----
  const { start, end } = resolveRange(query.period, new Date(), query.start, query.end)
  const businessDays = countBusinessDays({ start, end })

  // ---- 3. Get Total Active Users (Denominator) ----
  const userWhere: Prisma.UserWhereInput = { isActive: true }
  if (effectiveScope === "user") {
    userWhere.id = effectiveUserId
  } else if (effectiveScope === "department" && effectiveDepartment) {
    userWhere.department = effectiveDepartment
  }
  const totalActiveUsers = await prisma.user.count({ where: userWhere })
  const denominator = Math.max(1, businessDays * totalActiveUsers)

  // ---- 4. Fetch Records ----
  const where: Prisma.AbsensiRecordWhereInput = {
    date: {
      gte: start,
      lte: end,
    },
  }

  if (effectiveScope === "user") {
    where.userId = effectiveUserId
  } else if (effectiveScope === "department" && effectiveDepartment) {
    where.user = { department: effectiveDepartment }
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

  // ---- 5. Calculate Metrics ----
  const attended = records.filter(r => r.status !== AttendanceStatus.absent)
  const lateCount = records.filter(r => r.status === AttendanceStatus.late).length
  // Silent absences = expected attendance slots - actual attended records.
  const absentCount = Math.max(0, denominator - attended.length)

  const totalOvertime = records.reduce((sum, r) => sum + Number(r.overtimeHours || 0), 0)
  const workHoursValues = records
    .map(r => (r.workHours == null ? null : Number(r.workHours)))
    .filter((v): v is number => v != null)
  const avgWorkHours = workHoursValues.length > 0
    ? workHoursValues.reduce((a, b) => a + b, 0) / workHoursValues.length
    : 0

  const grace = await getGracePeriodMinutes()
  const onTime = attended.filter(r => (r.lateMinutes ?? 0) <= grace).length

  const attendanceRate = attended.length / denominator
  const onTimeRate = attended.length > 0 ? onTime / attended.length : 0

  // ---- 6. Timeseries (per business day) ----
  const byDate = new Map<string, { attended: number; onTime: number }>()
  for (const r of records) {
    const key = getUtcDateKey(r.date)
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
      const k = getUtcDateKey(iter)
      const entry = byDate.get(k)
      timeseries.push({
        date: k,
        attendanceRate: entry ? entry.attended / totalActiveUsers : 0,
        onTimeRate: entry && entry.attended > 0 ? entry.onTime / entry.attended : 0,
      })
    }
    iter.setUTCDate(iter.getUTCDate() + 1)
  }

  const round2 = (n: number) => Math.round(n * 100) / 100

  // ---- 7. Trends (Previous Period) ----
  //
  // BUG-FIX: previously, prevBusinessDays was multiplied by the CURRENT
  // period's totalActiveUsers, which makes the denominator inaccurate
  // when users have been added/removed between periods. We now compute
  // the previous period's active user count independently.
  const duration = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - duration)

  const prevUserWhere: Prisma.UserWhereInput = { isActive: true }
  if (effectiveScope === "user") {
    prevUserWhere.id = effectiveUserId
  } else if (effectiveScope === "department" && effectiveDepartment) {
    prevUserWhere.department = effectiveDepartment
  }
  const prevTotalActiveUsers = await prisma.user.count({ where: prevUserWhere })
  const prevBusinessDays = countBusinessDays({ start: prevStart, end: prevEnd })
  const prevDenominator = Math.max(1, prevBusinessDays * prevTotalActiveUsers)

  const prevWhere: Prisma.AbsensiRecordWhereInput = {
    date: { gte: prevStart, lte: prevEnd },
  }
  if (effectiveScope === "user") {
    prevWhere.userId = effectiveUserId
  } else if (effectiveScope === "department" && effectiveDepartment) {
    prevWhere.user = { department: effectiveDepartment }
  }

  const prevRecords = await prisma.absensiRecord.findMany({
    where: prevWhere,
    select: {
      workHours: true,
      overtimeHours: true,
      lateMinutes: true,
      status: true,
    },
  })

  const prevAttended = prevRecords.filter(r => r.status !== AttendanceStatus.absent)
  const prevLateCount = prevRecords.filter(r => r.status === AttendanceStatus.late).length
  const prevAbsentCount = Math.max(0, prevDenominator - prevAttended.length)
  const prevTotalOvertime = prevRecords.reduce((sum, r) => sum + Number(r.overtimeHours || 0), 0)
  const prevWorkHoursValues = prevRecords
    .map(r => (r.workHours == null ? null : Number(r.workHours)))
    .filter((v): v is number => v != null)
  const prevAvgWorkHours = prevWorkHoursValues.length > 0
    ? prevWorkHoursValues.reduce((a, b) => a + b, 0) / prevWorkHoursValues.length
    : 0
  const prevOnTime = prevAttended.filter(r => (r.lateMinutes ?? 0) <= grace).length

  const prevAttendanceRate = prevAttended.length / prevDenominator
  const prevOnTimeRate = prevAttended.length > 0 ? prevOnTime / prevAttended.length : 0

  const getTrend = (current: number, previous: number) => {
    const diff = current - previous

    // Rates (0..1) → percentage point difference. Counts/hours → % change.
    let calculatedChange = 0
    if (current <= 1 && previous <= 1 && current >= 0 && previous >= 0) {
      calculatedChange = Math.round(Math.abs(current - previous) * 100)
    } else {
      if (previous === 0) calculatedChange = current === 0 ? 0 : 100
      else calculatedChange = Math.round(Math.abs((current - previous) / previous) * 100)
    }

    return {
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
      change: calculatedChange,
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
    },
  }
}

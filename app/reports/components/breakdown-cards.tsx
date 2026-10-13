"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building, ChevronDown, ChevronUp } from "lucide-react"
import { formatRate } from "@/lib/report-view"
import { ReportSummary, UserAttendanceStat } from "../types"
import { getRateColor } from "./rate-color"
import { STATUS_ORDER, STATUS_STYLE } from "./status-style"

interface BreakdownCardsProps {
  summary: ReportSummary
  /** Off for regular users — a "per employee" list of one is just noise. */
  showPerEmployee: boolean
}

/** Employees shown before "Lihat semua" — the list is sorted worst-first, so these are the ones to look at. */
const COLLAPSED_EMPLOYEE_COUNT = 5

type StatCountKey = Extract<keyof UserAttendanceStat, "present" | "late" | "halfDay" | "absent">

const STAT_KEY_BY_STATUS = {
  present: "present",
  late: "late",
  half_day: "halfDay",
  absent: "absent",
} as const satisfies Record<(typeof STATUS_ORDER)[number], StatCountKey>

const percentOf = (count: number, total: number) =>
  total === 0 ? 0 : Math.round((count / total) * 1000) / 10

const StatusDistribution = ({ summary }: { summary: ReportSummary }) => {
  const total = summary.totalRecords
  const parts = STATUS_ORDER.map((status) => {
    const count = summary.statusBreakdown[status] ?? 0
    return { status, count, percent: percentOf(count, total) }
  })

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-white">Distribusi Status</CardTitle>
        <CardDescription className="text-white/70">Dari {total} record dalam periode</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="flex h-3 w-full overflow-hidden rounded-full bg-white/10"
          role="img"
          aria-label={parts.map(({ status, percent }) => `${STATUS_STYLE[status].label} ${formatRate(percent)}%`).join(", ")}
        >
          {parts.map(({ status, percent }) =>
            percent > 0 ? (
              <div key={status} className={STATUS_STYLE[status].dot} style={{ width: `${percent}%` }} />
            ) : null
          )}
        </div>
        <ul className="grid grid-cols-2 gap-2">
          {parts.map(({ status, count, percent }) => (
            <li
              key={status}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm text-white/80">
                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${STATUS_STYLE[status].dot}`} />
                <span className="truncate">{STATUS_STYLE[status].label}</span>
              </span>
              <span className="text-right tabular-nums">
                <span className="font-semibold text-white">{count}</span>
                <span className="ml-1.5 text-xs text-white/50">{formatRate(percent)}%</span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

const EmployeeRow = ({ stat }: { stat: UserAttendanceStat }) => (
  <li className="rounded-lg border border-white/10 bg-white/5 p-3">
    <div className="flex items-baseline justify-between gap-3">
      <span className="truncate text-sm font-medium text-white">{stat.name}</span>
      <span className={`font-semibold tabular-nums ${getRateColor(stat.attendanceRate)}`}>
        {formatRate(Math.round(stat.attendanceRate * 10) / 10)}%
      </span>
    </div>
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/60">
      {stat.department && (
        <span className="flex items-center gap-1 text-white/45">
          <Building className="h-3 w-3 flex-shrink-0" />
          {stat.department}
        </span>
      )}
      {STATUS_ORDER.map((status) => {
        const count = stat[STAT_KEY_BY_STATUS[status]]
        // Skip zeroes — a row of "0 tidak hadir" is noise, not information.
        if (count === 0) return null
        return (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[status].dot}`} />
            {count} {STATUS_STYLE[status].label.toLowerCase()}
          </span>
        )
      })}
    </div>
  </li>
)

const PerEmployee = ({ stats }: { stats: UserAttendanceStat[] }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasMore = stats.length > COLLAPSED_EMPLOYEE_COUNT
  const visible = isExpanded ? stats : stats.slice(0, COLLAPSED_EMPLOYEE_COUNT)

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-white">Kehadiran per Karyawan</CardTitle>
        <CardDescription className="text-white/70">Diurutkan dari kehadiran terendah</CardDescription>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <p className="text-sm text-white/50">Belum ada data karyawan di periode ini.</p>
        ) : (
          <>
            <ul className={`space-y-2 ${isExpanded ? "max-h-[28rem] overflow-y-auto pr-1" : ""}`}>
              {visible.map((stat) => <EmployeeRow key={stat.userId} stat={stat} />)}
            </ul>
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded((value) => !value)}
                className="mt-3 w-full text-white/70 hover:scale-100 hover:bg-white/10 hover:text-white active:scale-100"
              >
                {isExpanded ? (
                  <><ChevronUp className="mr-2 h-4 w-4" />Tampilkan lebih sedikit</>
                ) : (
                  <><ChevronDown className="mr-2 h-4 w-4" />Lihat semua ({stats.length})</>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export const BreakdownCards = ({ summary, showPerEmployee }: BreakdownCardsProps) => (
  <div className={`grid items-start gap-4 ${showPerEmployee ? "md:grid-cols-2" : ""}`}>
    <StatusDistribution summary={summary} />
    {showPerEmployee && <PerEmployee stats={summary.userBreakdown} />}
  </div>
)

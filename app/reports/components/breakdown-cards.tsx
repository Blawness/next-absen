"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building } from "lucide-react"
import { ReportSummary, UserAttendanceStat } from "../types"
import { STATUS_LABELS } from "@/lib/constants"
import { AttendanceStatus } from "@prisma/client"
interface BreakdownCardsProps {
  summary: ReportSummary
}

/** Which count maps to which status badge, in the order they read best. */
type StatCountKey = Extract<keyof UserAttendanceStat, "present" | "late" | "halfDay" | "absent">

const STAT_PARTS: Array<{ key: StatCountKey; status: AttendanceStatus }> = [
  { key: "present", status: "present" },
  { key: "late", status: "late" },
  { key: "halfDay", status: "half_day" },
  { key: "absent", status: "absent" },
]

/** Whole numbers stay whole — "100%" reads better than "100.0%". */
const formatRate = (rate: number) =>
  Number.isInteger(rate) ? String(rate) : rate.toFixed(1)

const getRateColor = (rate: number) => {
  if (rate >= 90) return "text-emerald-300"
  if (rate >= 75) return "text-yellow-300"
  return "text-red-300"
}

export const BreakdownCards = ({ summary }: BreakdownCardsProps) => {
  const statusBreakdown = Object.entries(summary.statusBreakdown).map(([status, count]) => ({
    status: status as AttendanceStatus,
    count,
    percentage: ((count / summary.totalRecords) * 100).toFixed(1)
  }))

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'bg-emerald-400'
      case 'late': return 'bg-yellow-400'
      case 'absent': return 'bg-red-400'
      case 'half_day': return 'bg-purple-400'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 animate-fade-up anim-delay-300">
      {/* Status Breakdown */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white">Status Breakdown</CardTitle>
          <CardDescription className="text-white/70">
            Distribusi status absensi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statusBreakdown.map(({ status, count, percentage }) => (
              <div key={status} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}></div>
                  <Badge
                    variant={status === 'present' ? 'default' : 'secondary'}
                    className={status === 'present' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : ''}
                  >
                    {STATUS_LABELS[status]}
                  </Badge>
                  <span className="text-sm text-white/60">
                    {count} record
                  </span>
                </div>
                <span className="font-semibold text-white">
                  {percentage}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Per-employee attendance */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white">Statistik Kehadiran per Karyawan</CardTitle>
          <CardDescription className="text-white/70">
            Diurutkan dari kehadiran terendah
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.userBreakdown.map((stat) => (
              <div key={stat.userId} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex justify-between items-baseline gap-3">
                  <span className="text-sm font-medium text-white truncate">{stat.name}</span>
                  <span className={`font-semibold tabular-nums ${getRateColor(stat.attendanceRate)}`}>
                    {formatRate(stat.attendanceRate)}%
                  </span>
                </div>
                {stat.department && (
                  <p className="flex items-center gap-1.5 text-xs text-white/50 mt-0.5">
                    <Building className="h-3 w-3 flex-shrink-0" />
                    {stat.department}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  {STAT_PARTS.map(({ key, status }) => {
                    const count = stat[key]
                    // Skip zeroes — a row of "0 absen" is noise, not information.
                    if (count === 0) return null
                    return (
                      <span key={key} className="flex items-center gap-1.5 text-xs text-white/60">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                        {count} {STATUS_LABELS[status].toLowerCase()}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

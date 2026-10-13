"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Clock, TrendingUp, UserX, AlarmClock } from "lucide-react"
import { computeOverallRate, formatRate } from "@/lib/report-view"
import { getRateColor } from "./rate-color"
import { ReportSummary } from "../types"

interface StatCardsProps {
  summary: ReportSummary
}

const shareOf = (count: number, total: number) =>
  total === 0 ? "—" : `${formatRate(Math.round((count / total) * 1000) / 10)}% dari record`

export const StatCards = ({ summary }: StatCardsProps) => {
  const rate = computeOverallRate(summary.statusBreakdown)
  const late = summary.statusBreakdown.late ?? 0
  const absent = summary.statusBreakdown.absent ?? 0

  const cards = [
    {
      title: "Tingkat Kehadiran",
      value: rate === null ? "—" : `${formatRate(Math.round(rate * 10) / 10)}%`,
      valueClass: rate === null ? "text-white" : getRateColor(rate),
      description: `${summary.totalRecords} record · ${summary.totalUsers} karyawan`,
      icon: TrendingUp,
    },
    {
      title: "Terlambat",
      value: late,
      valueClass: late > 0 ? "text-amber-300" : "text-white",
      description: shareOf(late, summary.totalRecords),
      icon: AlarmClock,
    },
    {
      title: "Tidak Hadir",
      value: absent,
      valueClass: absent > 0 ? "text-rose-300" : "text-white",
      description: shareOf(absent, summary.totalRecords),
      icon: UserX,
    },
    {
      title: "Jam Kerja",
      value: `${summary.totalWorkHours}j`,
      valueClass: "text-white",
      description: `Rata-rata ${summary.averageWorkHours}j/hari · lembur ${summary.totalOvertimeHours}j`,
      icon: Clock,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title} variant="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1 sm:p-6 sm:pb-2">
              <h3 className="text-xs font-medium text-white/80 sm:text-sm">{card.title}</h3>
              <Icon className="h-4 w-4 text-white/60" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className={`text-2xl font-bold tabular-nums ${card.valueClass}`}>{card.value}</div>
              <p className="text-xs text-white/60">{card.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, Clock, AlertTriangle, CheckCircle } from "lucide-react"
import { KpiResponse } from "../../api/kpi/[period]/types"

interface KpiChartsProps {
  data: KpiResponse | null
  isLoading?: boolean
}

export function KpiCharts({ data, isLoading = false }: KpiChartsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} variant="glass" animate={true}>
            <CardHeader>
              <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-3 bg-gray-700 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <div className="text-white/60">Tidak ada data KPI untuk ditampilkan</div>
      </div>
    )
  }

  const formatPercent = (n: number) => `${Math.round(n * 100)}%`

  // Calculate trends (mock for now - in real app would compare with previous period)
  const getTrend = (value: number) => {
    // Simple mock logic - in real app would compare with previous period
    const mockTrend = Math.random() > 0.5 ? "up" : "down"
    const mockChange = Math.round((Math.random() - 0.5) * 20)
    return { direction: mockTrend, change: Math.abs(mockChange) }
  }

  const metrics = [
    {
      title: "Attendance Rate",
      value: formatPercent(data.metrics.attendanceRate),
      rawValue: data.metrics.attendanceRate,
      description: "Persentase kehadiran",
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      trend: getTrend(data.metrics.attendanceRate)
    },
    {
      title: "On-time Rate",
      value: formatPercent(data.metrics.onTimeRate),
      rawValue: data.metrics.onTimeRate,
      description: "Tepat waktu datang",
      icon: Clock,
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      trend: getTrend(data.metrics.onTimeRate)
    },
    {
      title: "Avg Work Hours",
      value: `${data.metrics.avgWorkHours}j`,
      rawValue: data.metrics.avgWorkHours,
      description: "Rata-rata jam kerja",
      icon: TrendingUp,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      trend: getTrend(data.metrics.avgWorkHours)
    },
    {
      title: "Total Overtime",
      value: `${data.metrics.totalOvertime}j`,
      rawValue: data.metrics.totalOvertime,
      description: "Total jam lembur",
      icon: TrendingUp,
      color: "text-orange-400",
      bgColor: "bg-orange-500/20",
      trend: getTrend(data.metrics.totalOvertime)
    },
    {
      title: "Late Arrivals",
      value: data.metrics.lateCount.toString(),
      rawValue: data.metrics.lateCount,
      description: "Jumlah keterlambatan",
      icon: AlertTriangle,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
      trend: getTrend(data.metrics.lateCount)
    },
    {
      title: "Absences",
      value: data.metrics.absentCount.toString(),
      rawValue: data.metrics.absentCount,
      description: "Jumlah tidak hadir",
      icon: CheckCircle,
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      trend: getTrend(data.metrics.absentCount)
    }
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          const TrendIcon = metric.trend.direction === "up" ? TrendingUp : TrendingDown

          return (
            <Card key={metric.title} variant="glass" animate={true} style={{ animationDelay: `${index * 100}ms` }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">
                  {metric.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-1">
                  {metric.value}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/60">
                    {metric.description}
                  </p>
                  <div className={`flex items-center text-xs ${metric.trend.direction === "up" ? "text-green-400" : "text-red-400"
                    }`}>
                    <TrendIcon className="w-3 h-3 mr-1" />
                    {metric.trend.change}%
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary Info */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg">Ringkasan Periode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-white/60">Periode</div>
              <div className="text-white font-medium">
                {data.period === "weekly" ? "Mingguan" : "Bulanan"}
              </div>
            </div>
            <div>
              <div className="text-white/60">Rentang</div>
              <div className="text-white font-medium">
                {data.range.start} - {data.range.end}
              </div>
            </div>
            <div>
              <div className="text-white/60">Scope</div>
              <div className="text-white font-medium capitalize">
                {data.scope === "org" ? "Organisasi" :
                  data.scope === "department" ? "Divisi" : "Personal"}
              </div>
            </div>
            <div>
              <div className="text-white/60">Data Points</div>
              <div className="text-white font-medium">
                {data.timeseries.length} hari
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simple Trend Visualization */}
      {data.timeseries.length > 0 && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-lg">Trend Harian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.timeseries.slice(-7).map((day, index) => (
                <div key={day.date} className="flex items-center justify-between">
                  <div className="text-sm text-white/80 w-20">
                    {new Date(day.date).toLocaleDateString('id-ID', {
                      weekday: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="flex space-x-1">
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(day.attendanceRate * 100, 100)}%`,
                            animationDelay: `${index * 50}ms`
                          }}
                        ></div>
                      </div>
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(day.onTimeRate * 100, 100)}%`,
                            animationDelay: `${index * 50 + 25}ms`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-white/60 w-16 text-right">
                    {formatPercent(day.attendanceRate)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-4 space-x-4 text-xs text-white/60">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                Attendance Rate
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                On-time Rate
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


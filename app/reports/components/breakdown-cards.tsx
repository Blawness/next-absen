"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building } from "lucide-react"
import { ReportSummary } from "../types"
import { STATUS_LABELS } from "@/lib/constants"
import { AttendanceStatus } from "@prisma/client"
import { motion } from "framer-motion"

interface BreakdownCardsProps {
  summary: ReportSummary
}

export const BreakdownCards = ({ summary }: BreakdownCardsProps) => {
  const statusBreakdown = Object.entries(summary.statusBreakdown).map(([status, count]) => ({
    status: status as AttendanceStatus,
    count,
    percentage: ((count / summary.totalRecords) * 100).toFixed(1)
  }))

  const departmentBreakdown = Object.entries(summary.departmentBreakdown).map(([dept, count]) => ({
    department: dept,
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
    <motion.div
      className="grid gap-4 md:grid-cols-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
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

      {/* Department Breakdown */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white">Department Breakdown</CardTitle>
          <CardDescription className="text-white/70">
            Distribusi berdasarkan departemen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {departmentBreakdown.map(({ department, count, percentage }) => (
              <div key={department} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                  <Building className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">{department}</span>
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
    </motion.div>
  )
}

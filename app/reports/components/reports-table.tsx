"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3 } from "lucide-react"
import { ReportRecord, ReportSummary } from "../types"
import { STATUS_LABELS, TABLE_HEADERS } from "@/lib/constants"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { motion } from "framer-motion"

interface ReportsTableProps {
  records: ReportRecord[]
  summary: ReportSummary | null
  formatAddress?: (address?: string | null) => string | null
}

// Helper function to format address display
const formatAddress = (address?: string | null) => {
  if (!address) return null

  // If address starts with "Koordinat:", extract the coordinates part
  if (address.startsWith('Koordinat:')) {
    const coordsMatch = address.match(/Koordinat:\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
    if (coordsMatch) {
      return `${coordsMatch[1]}, ${coordsMatch[2]}`
    }
  }

  return address
}

export const ReportsTable = ({ records, summary }: ReportsTableProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
    >
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white">Data Absensi Detail</CardTitle>
          <CardDescription className="text-white/70">
            {records.length} record ditemukan
            {summary?.dateRange.startDate && summary?.dateRange.endDate && (
              <> dari {format(summary.dateRange.startDate, 'dd MMM yyyy', { locale: id })} hingga {format(summary.dateRange.endDate, 'dd MMM yyyy', { locale: id })}</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3 text-white/80 font-medium">{TABLE_HEADERS.DATE}</th>
                    <th className="text-left p-3 text-white/80 font-medium">{TABLE_HEADERS.USER}</th>
                    <th className="text-left p-3 text-white/80 font-medium">{TABLE_HEADERS.CHECK_IN}</th>
                    <th className="text-left p-3 text-white/80 font-medium">{TABLE_HEADERS.CHECK_OUT}</th>
                    <th className="text-left p-3 text-white/80 font-medium">{TABLE_HEADERS.WORK_HOURS}</th>
                    <th className="text-left p-3 text-white/80 font-medium">{TABLE_HEADERS.STATUS}</th>
                    <th className="text-left p-3 text-white/80 font-medium">{TABLE_HEADERS.LOCATION}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200">
                      <td className="p-3 text-white">
                        {format(new Date(record.date), 'dd MMM yyyy', { locale: id })}
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-white">{record.user.name}</p>
                          <p className="text-sm text-white/60">
                            {record.user.department} • {record.user.position}
                          </p>
                        </div>
                      </td>
                      <td className="p-3 text-white">
                        {record.checkInTime ? format(new Date(record.checkInTime), 'HH:mm') : '-'}
                      </td>
                      <td className="p-3 text-white">
                        {record.checkOutTime ? format(new Date(record.checkOutTime), 'HH:mm') : '-'}
                      </td>
                      <td className="p-3 text-white">
                        {record.workHours ? `${record.workHours}j` : '-'}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={record.status === 'present' ? 'default' : 'secondary'}
                          className={record.status === 'present' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : ''}
                        >
                          {STATUS_LABELS[record.status]}
                        </Badge>
                      </td>
                      <td className="p-3 text-white/80">
                        <div className="text-sm space-y-1">
                          {record.checkInAddress && (
                            <div className="flex items-center gap-1">
                              <span className="text-emerald-400">📍</span>
                              <span>Masuk: {formatAddress(record.checkInAddress)}</span>
                            </div>
                          )}
                          {record.checkOutAddress && (
                            <div className="flex items-center gap-1">
                              <span className="text-blue-400">📍</span>
                              <span>Pulang: {formatAddress(record.checkOutAddress)}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-white/5 backdrop-blur-sm rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <BarChart3 className="h-12 w-12 text-white/40" />
              </div>
              <p className="text-white/60 text-lg">Tidak ada data absensi untuk filter yang dipilih</p>
              <p className="text-white/40 text-sm mt-2">Coba ubah filter atau periode waktu untuk melihat data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

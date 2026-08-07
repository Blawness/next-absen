"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTableEmptyState } from "@/components/ui/data-table/data-table-empty-state"
import { BarChart3, MapPin, LogIn, LogOut } from "lucide-react"
import { ReportRecord, ReportSummary } from "../types"
import { STATUS_LABELS, TABLE_HEADERS } from "@/lib/constants"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { AttendanceStatus } from "@prisma/client"

interface ReportsTableProps {
  records: ReportRecord[]
  summary: ReportSummary | null
  formatAddress?: (address?: string | null) => string | null
}

// Helper function to format address display
const formatAddress = (address?: string | null) => {
  if (!address) return null

  if (address.startsWith("Koordinat:")) {
    const coordsMatch = address.match(
      /Koordinat:\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/
    )
    if (coordsMatch) {
      return `${coordsMatch[1]}, ${coordsMatch[2]}`
    }
  }

  return address
}

const STATUS_BADGE: Record<
  AttendanceStatus,
  { label: string; className: string }
> = {
  present: {
    label: STATUS_LABELS.present,
    className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  },
  late: {
    label: STATUS_LABELS.late,
    className: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  },
  absent: {
    label: STATUS_LABELS.absent,
    className: "border-rose-500/30 bg-rose-500/15 text-rose-300",
  },
  half_day: {
    label: STATUS_LABELS.half_day,
    className: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  },
}

export const ReportsTable = ({ records, summary }: ReportsTableProps) => {
  return (
    <div className="animate-fade-up anim-delay-400">
      <Card variant="glass" className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-white">Data Absensi Detail</CardTitle>
          <CardDescription className="text-white/65">
            {records.length} record ditemukan
            {summary?.dateRange.startDate && summary?.dateRange.endDate && (
              <>
                {" "}
                dari{" "}
                {format(summary.dateRange.startDate, "dd MMM yyyy", {
                  locale: idLocale,
                })}{" "}
                hingga{" "}
                {format(summary.dateRange.endDate, "dd MMM yyyy", {
                  locale: idLocale,
                })}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{TABLE_HEADERS.DATE}</TableHead>
                  <TableHead>{TABLE_HEADERS.USER}</TableHead>
                  <TableHead>{TABLE_HEADERS.CHECK_IN}</TableHead>
                  <TableHead>{TABLE_HEADERS.CHECK_OUT}</TableHead>
                  <TableHead>{TABLE_HEADERS.WORK_HOURS}</TableHead>
                  <TableHead>{TABLE_HEADERS.STATUS}</TableHead>
                  <TableHead>{TABLE_HEADERS.LOCATION}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const status = STATUS_BADGE[record.status]
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="text-white/85">
                        {format(new Date(record.date), "dd MMM yyyy", {
                          locale: idLocale,
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">
                            {record.user.name}
                          </p>
                          <p className="text-xs text-white/50">
                            {record.user.department} • {record.user.position}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-white/85 tabular-nums">
                        {record.checkInTime
                          ? format(new Date(record.checkInTime), "HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-white/85 tabular-nums">
                        {record.checkOutTime
                          ? format(new Date(record.checkOutTime), "HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-white/85 tabular-nums">
                        {record.workHours ? `${record.workHours}j` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${status.className}`}
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {record.checkInAddress && (
                            <div className="flex items-center gap-1.5 text-white/65">
                              <LogIn className="h-3 w-3 flex-shrink-0 text-emerald-400" />
                              <span className="truncate">
                                {formatAddress(record.checkInAddress)}
                              </span>
                            </div>
                          )}
                          {record.checkOutAddress && (
                            <div className="flex items-center gap-1.5 text-white/65">
                              <LogOut className="h-3 w-3 flex-shrink-0 text-sky-400" />
                              <span className="truncate">
                                {formatAddress(record.checkOutAddress)}
                              </span>
                            </div>
                          )}
                          {!record.checkInAddress &&
                            !record.checkOutAddress && (
                              <span className="text-white/30">—</span>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6">
              <DataTableEmptyState
                icon={<BarChart3 className="h-7 w-7" />}
                title="Tidak ada data absensi"
                description="Coba ubah filter atau periode waktu untuk melihat data."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

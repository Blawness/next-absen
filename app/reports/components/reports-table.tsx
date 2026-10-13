"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTableEmptyState } from "@/components/ui/data-table/data-table-empty-state"
import { DataTablePagination } from "@/components/ui/data-table/data-table-pagination"
import { BarChart3, LogIn, LogOut } from "lucide-react"
import { paginate } from "@/lib/report-view"
import { ReportRecord } from "../types"
import { TABLE_HEADERS } from "@/lib/constants"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { STATUS_STYLE } from "./status-style"

interface ReportsTableProps {
  records: ReportRecord[]
  page: number
  onPageChange: (page: number) => void
}

export const PAGE_SIZE = 20

// Reverse-geocoding fallbacks are stored as "Koordinat: lat, lng" — show just the numbers.
const formatAddress = (address?: string | null) => {
  if (!address) return null

  const coordsMatch = address.match(/^Koordinat:\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
  return coordsMatch ? `${coordsMatch[1]}, ${coordsMatch[2]}` : address
}

const formatDate = (date: Date) => format(new Date(date), "dd MMM yyyy", { locale: idLocale })
const formatTime = (date: Date | null) => (date ? format(new Date(date), "HH:mm") : "–")
const formatHours = (hours: number | null) => (hours ? `${hours}j` : "–")

const StatusBadge = ({ record }: { record: ReportRecord }) => {
  const status = STATUS_STYLE[record.status]
  return (
    <Badge variant="outline" className={`whitespace-nowrap text-xs ${status.badge}`}>
      {status.label}
      {record.status === "late" && record.lateMinutes ? ` · ${record.lateMinutes}m` : ""}
    </Badge>
  )
}

const AddressLine = ({ kind, address }: { kind: "in" | "out"; address: string | null }) => {
  const text = formatAddress(address)
  if (!text) return null
  const Icon = kind === "in" ? LogIn : LogOut
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-white/65" title={text}>
      <Icon className={`h-3 w-3 flex-shrink-0 ${kind === "in" ? "text-emerald-400" : "text-sky-400"}`} />
      <span className="truncate">{text}</span>
    </div>
  )
}

/** Phone layout: one compact card per record instead of a 7-column table. */
const RecordCard = ({ record }: { record: ReportRecord }) => (
  <li className="space-y-2 px-4 py-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{record.user.name}</p>
        <p className="text-xs text-white/50">{formatDate(record.date)}</p>
      </div>
      <StatusBadge record={record} />
    </div>
    <div className="flex gap-4 text-sm tabular-nums text-white/80">
      <span className="flex items-center gap-1"><LogIn className="h-3.5 w-3.5 text-emerald-400" />{formatTime(record.checkInTime)}</span>
      <span className="flex items-center gap-1"><LogOut className="h-3.5 w-3.5 text-sky-400" />{formatTime(record.checkOutTime)}</span>
      <span className="text-white/60">{formatHours(record.workHours)}</span>
    </div>
  </li>
)

export const ReportsTable = ({ records, page, onPageChange }: ReportsTableProps) => {
  const { items: pageRecords, page: currentPage, totalPages } = paginate(records, page, PAGE_SIZE)

  return (
    <Card variant="glass" className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-white">Data Absensi Detail</CardTitle>
        <CardDescription className="text-white/65">{records.length} record ditemukan</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {records.length === 0 ? (
          <div className="p-6">
            <DataTableEmptyState
              icon={<BarChart3 className="h-7 w-7" />}
              title="Tidak ada data absensi"
              description="Coba ubah filter atau periode waktu untuk melihat data."
            />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-white/10 border-t border-white/10 md:hidden">
              {pageRecords.map((record) => <RecordCard key={record.id} record={record} />)}
            </ul>

            <div className="hidden md:block">
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
                  {pageRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-nowrap text-white/85">{formatDate(record.date)}</TableCell>
                      <TableCell>
                        <p className="font-medium text-white">{record.user.name}</p>
                        <p className="text-xs text-white/50">
                          {[record.user.department, record.user.position].filter(Boolean).join(" • ")}
                        </p>
                      </TableCell>
                      <TableCell className="tabular-nums text-white/85">{formatTime(record.checkInTime)}</TableCell>
                      <TableCell className="tabular-nums text-white/85">{formatTime(record.checkOutTime)}</TableCell>
                      <TableCell className="tabular-nums text-white/85">{formatHours(record.workHours)}</TableCell>
                      <TableCell><StatusBadge record={record} /></TableCell>
                      <TableCell className="max-w-[16rem]">
                        <div className="space-y-1 text-xs">
                          <AddressLine kind="in" address={record.checkInAddress} />
                          <AddressLine kind="out" address={record.checkOutAddress} />
                          {!record.checkInAddress && !record.checkOutAddress && (
                            <span className="text-white/30">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DataTablePagination
              page={currentPage}
              totalPages={totalPages}
              total={records.length}
              limit={PAGE_SIZE}
              onPageChange={onPageChange}
              entityLabel="record"
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

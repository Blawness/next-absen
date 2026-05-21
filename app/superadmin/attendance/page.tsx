"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { AttendanceStatus, UserRole } from "@prisma/client"
import { hasPermission, Permission } from "@/lib/permissions"
import { NAVIGATION, STATUS_LABELS, TABLE_HEADERS, MESSAGES } from "@/lib/constants"
import { AttendanceEditDialog } from "@/components/superadmin/attendance-edit-dialog"
import { AttendanceCreateDialog } from "@/components/superadmin/attendance-create-dialog"

interface UserOption {
  id: string
  name: string
  email: string
  department: string | null
}

interface AttendanceRecord {
  id: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  workHours: number | null
  status: AttendanceStatus
  notes: string | null
  user: {
    id: string
    name: string
    email: string
    department: string | null
  }
}

export default function SuperadminAttendancePage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserOption[]>([])
  const [filters, setFilters] = useState({
    userId: "",
    dateFrom: "",
    dateTo: "",
    status: "",
  })
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const limit = 15

  useEffect(() => {
    if (sessionStatus === "loading") return
    if (!session || !hasPermission(session.user.role as UserRole, Permission.ABSENSI_MANAGE)) {
      router.replace("/dashboard")
      return
    }
    loadUsers()
  }, [session, sessionStatus])

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/superadmin/attendance?users=true")
      if (res.ok) setUsers(await res.json())
    } catch {
      // silent
    }
  }

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.userId) params.set("userId", filters.userId)
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
      if (filters.dateTo) params.set("dateTo", filters.dateTo)
      if (filters.status) params.set("status", filters.status)
      params.set("page", String(page))
      params.set("limit", String(limit))

      const res = await fetch(`/api/superadmin/attendance?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRecords(data.data)
        setTotal(data.total)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    if (session) loadRecords()
  }, [session, loadRecords])

  const handleEdit = (record: AttendanceRecord) => {
    setEditRecord(record)
    setEditOpen(true)
  }

  const handleDelete = async (record: AttendanceRecord) => {
    if (!confirm(`Hapus record ${record.user.name} tanggal ${format(new Date(record.date), "dd MMM yyyy")}?`)) return

    try {
      const res = await fetch("/api/superadmin/attendance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id }),
      })
      if (res.ok) {
        setMessage({ type: "success", text: MESSAGES.ATTENDANCE_DELETED })
        loadRecords()
      } else {
        const data = await res.json()
        setMessage({ type: "error", text: data.error || MESSAGES.ERROR })
      }
    } catch {
      setMessage({ type: "error", text: MESSAGES.ERROR })
    }
  }

  const totalPages = Math.ceil(total / limit)

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold glass-title">{NAVIGATION.MANAGE_ATTENDANCE}</h1>
          <p className="text-white/70">Edit, tambah, dan hapus record absensi user</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} variant="glass">
          <Plus className="mr-2 h-4 w-4" />
          Tambah Record
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === "success" ? "default" : "destructive"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card variant="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Select
              value={filters.userId}
              onValueChange={(v) => { setFilters({ ...filters, userId: v === "all" ? "" : v }); setPage(1) }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua User</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => { setFilters({ ...filters, dateFrom: e.target.value }); setPage(1) }}
              placeholder="Dari tanggal"
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => { setFilters({ ...filters, dateTo: e.target.value }); setPage(1) }}
              placeholder="Sampai tanggal"
            />
            <Select
              value={filters.status}
              onValueChange={(v) => { setFilters({ ...filters, status: v === "all" ? "" : v }); setPage(1) }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="present">{STATUS_LABELS.present}</SelectItem>
                <SelectItem value="late">{STATUS_LABELS.late}</SelectItem>
                <SelectItem value="absent">{STATUS_LABELS.absent}</SelectItem>
                <SelectItem value="half_day">{STATUS_LABELS.half_day}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadRecords}>
              Terapkan Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-white/40" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 text-white/60">
              Tidak ada data absensi ditemukan
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{TABLE_HEADERS.USER}</TableHead>
                      <TableHead>{TABLE_HEADERS.DATE}</TableHead>
                      <TableHead>{TABLE_HEADERS.CHECK_IN}</TableHead>
                      <TableHead>{TABLE_HEADERS.CHECK_OUT}</TableHead>
                      <TableHead>{TABLE_HEADERS.WORK_HOURS}</TableHead>
                      <TableHead>{TABLE_HEADERS.STATUS}</TableHead>
                      <TableHead>{TABLE_HEADERS.ACTIONS}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">{r.user.name}</p>
                            <p className="text-xs text-white/50">{r.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-white/80">
                          {format(new Date(r.date), "dd MMM yyyy", { locale: id })}
                        </TableCell>
                        <TableCell className="text-white/80">
                          {r.checkInTime
                            ? format(new Date(r.checkInTime), "HH:mm", { locale: id })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-white/80">
                          {r.checkOutTime
                            ? format(new Date(r.checkOutTime), "HH:mm", { locale: id })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-white/80">
                          {r.workHours != null ? `${r.workHours}j` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === "present" ? "default" :
                              r.status === "late" ? "destructive" :
                              "secondary"
                            }
                          >
                            {STATUS_LABELS[r.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-white/70 hover:text-white"
                              onClick={() => handleEdit(r)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300"
                              onClick={() => handleDelete(r)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                  <p className="text-sm text-white/60">
                    {total} record — Halaman {page} dari {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AttendanceEditDialog
        open={editOpen}
        record={editRecord}
        onClose={() => { setEditOpen(false); setEditRecord(null) }}
        onSaved={() => { loadRecords(); setMessage({ type: "success", text: MESSAGES.ATTENDANCE_UPDATED }) }}
      />

      <AttendanceCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => { loadRecords(); setMessage({ type: "success", text: MESSAGES.ATTENDANCE_CREATED }) }}
      />
    </div>
  )
}

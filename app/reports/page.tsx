"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  Download,
  Filter,
  Users,
  Clock,
  TrendingUp,
  FileText,
  BarChart3,
  RefreshCw,
  Loader2,
  Search,
  User,
  Building
} from "lucide-react"
import { STATUS_LABELS, TIME_LABELS, MESSAGES, NAVIGATION, TABLE_HEADERS } from "@/lib/constants"
import { AttendanceStatus, UserRole } from "@prisma/client"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface ReportRecord {
  id: string
  date: Date
  user: {
    id: string
    name: string
    department: string | null
    position: string | null
    email: string
  }
  checkInTime: Date | null
  checkOutTime: Date | null
  checkInAddress: string | null
  checkOutAddress: string | null
  workHours: number | null
  overtimeHours: number | null
  lateMinutes: number | null
  status: AttendanceStatus
  notes: string | null
}

interface ReportSummary {
  totalRecords: number
  totalUsers: number
  totalWorkHours: number
  totalOvertimeHours: number
  averageWorkHours: number
  statusBreakdown: Record<string, number>
  departmentBreakdown: Record<string, number>
  dateRange: {
    startDate: Date | null
    endDate: Date | null
  }
}

interface ReportFilters {
  startDate: string
  endDate: string
  userId: string
  department: string
  status: string
}

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const [records, setRecords] = useState<ReportRecord[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Memoize initial filter values to prevent recreation on every render
  const initialFilters = useMemo(() => ({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 30 days ago
    endDate: format(new Date(), 'yyyy-MM-dd'),
    userId: '',
    department: '',
    status: ''
  }), [])

  // Filter states
  const [filters, setFilters] = useState<ReportFilters>(initialFilters)

  // Available departments and users for filtering
  const [departments, setDepartments] = useState<string[]>([])
  const [users, setUsers] = useState<{ id: string; name: string; department: string }[]>([])

  // Memoize loadReports function to prevent recreation on every render
  const loadReports = useCallback(async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.department) params.append('department', filters.department)
      if (filters.status) params.append('status', filters.status)
      params.append('includeSummary', 'true')

      const response = await fetch(`/api/reports?${params.toString()}`)

      if (response.ok) {
        const data = await response.json()
        setRecords(data.records)
        setSummary(data.summary)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || MESSAGES.ERROR })
      }
    } catch (error) {
      setMessage({ type: 'error', text: MESSAGES.ERROR })
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  // Memoize loadFilterOptions function
  const loadFilterOptions = useCallback(async () => {
    try {
      // Load departments
      const deptResponse = await fetch('/api/users/departments')
      if (deptResponse.ok) {
        const depts = await deptResponse.json()
        setDepartments(depts)
      }

      // Load users based on role
      const usersResponse = await fetch('/api/users')
      if (usersResponse.ok) {
        const userList = await usersResponse.json()
        setUsers(userList)
      }
    } catch (error) {
      console.error('Error loading filter options:', error)
    }
  }, [])

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated" || !session) {
      redirect("/auth/signin")
      return
    }

    // Load initial data and filter options only once when component mounts
    loadReports()
    loadFilterOptions()
  }, [status, session]) // Remove loadReports and loadFilterOptions from dependencies

  // Separate useEffect to handle filter changes
  useEffect(() => {
    if (status === "authenticated" && session) {
      loadReports()
    }
  }, [filters, status, session, loadReports])

  // Memoize handleFilterChange to prevent recreation on every render
  const handleFilterChange = useCallback((field: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }, [])

  // Memoize handleExport function
  const handleExport = useCallback(async (format: 'csv' | 'pdf') => {
    setIsExporting(true)
    setMessage(null)

    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.department) params.append('department', filters.department)
      if (filters.status) params.append('status', filters.status)
      params.append('format', format)

      const response = await fetch(`/api/reports/export?${params.toString()}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `attendance-report-${format}-${format(new Date(), 'yyyy-MM-dd')}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        setMessage({ type: 'success', text: MESSAGES.EXPORT_SUCCESS })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || `Failed to export ${format.toUpperCase()}` })
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to export ${format.toUpperCase()}` })
    } finally {
      setIsExporting(false)
    }
  }, [filters])

  // Memoize canExport to prevent recreation on every render
  const canExport = useMemo(() =>
    session?.user.role === UserRole.admin ||
    session?.user.role === UserRole.manager,
    [session?.user.role]
  )

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{MESSAGES.LOADING}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{NAVIGATION.REPORTS}</h1>
        <p className="text-muted-foreground">
          Laporan absensi dengan analisis dan statistik komprehensif
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Laporan
          </CardTitle>
          <CardDescription>
            Sesuaikan filter untuk mendapatkan data yang diinginkan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Tanggal Mulai</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Tanggal Akhir</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            {session?.user.role !== UserRole.user && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="userId">Pengguna</Label>
                  <select
                    id="userId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={filters.userId}
                    onChange={(e) => handleFilterChange('userId', e.target.value)}
                  >
                    <option value="">Semua Pengguna</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Departemen</Label>
                  <select
                    id="department"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={filters.department}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                  >
                    <option value="">Semua Departemen</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="present">Hadir</option>
                <option value="late">Terlambat</option>
                <option value="absent">Tidak Hadir</option>
                <option value="half_day">Setengah Hari</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={loadReports}>
              <Search className="h-4 w-4 mr-2" />
              Terapkan Filter
            </Button>
            <Button variant="outline" onClick={() => setFilters(initialFilters)}>
              Reset Filter
            </Button>

            {canExport && (
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExport('csv')}
                  disabled={isExporting || records.length === 0}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting || records.length === 0}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Export PDF
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Record
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalRecords}</div>
              <p className="text-xs text-muted-foreground">
                Data absensi dalam periode
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Pengguna
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Pengguna dengan data absensi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Jam Kerja
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalWorkHours}j</div>
              <p className="text-xs text-muted-foreground">
                Rata-rata {summary.averageWorkHours}j per hari
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Lembur
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalOvertimeHours}j</div>
              <p className="text-xs text-muted-foreground">
                Total jam lembur
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status and Department Breakdown */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Status Breakdown</CardTitle>
              <CardDescription>
                Distribusi status absensi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(summary.statusBreakdown).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant={status === 'present' ? 'default' : 'secondary'}>
                        {STATUS_LABELS[status as AttendanceStatus]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {count} record
                      </span>
                    </div>
                    <span className="font-medium">
                      {((count / summary.totalRecords) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Breakdown</CardTitle>
              <CardDescription>
                Distribusi berdasarkan departemen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(summary.departmentBreakdown).map(([dept, count]) => (
                  <div key={dept} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{dept}</span>
                      <span className="text-sm text-muted-foreground">
                        {count} record
                      </span>
                    </div>
                    <span className="font-medium">
                      {((count / summary.totalRecords) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Message Alert */}
      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Detailed Records */}
      <Card>
        <CardHeader>
          <CardTitle>Data Absensi Detail</CardTitle>
          <CardDescription>
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
                  <tr className="border-b">
                    <th className="text-left p-2">{TABLE_HEADERS.DATE}</th>
                    <th className="text-left p-2">{TABLE_HEADERS.USER}</th>
                    <th className="text-left p-2">{TABLE_HEADERS.CHECK_IN}</th>
                    <th className="text-left p-2">{TABLE_HEADERS.CHECK_OUT}</th>
                    <th className="text-left p-2">{TABLE_HEADERS.WORK_HOURS}</th>
                    <th className="text-left p-2">{TABLE_HEADERS.STATUS}</th>
                    <th className="text-left p-2">{TABLE_HEADERS.LOCATION}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        {format(record.date, 'dd MMM yyyy', { locale: id })}
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{record.user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {record.user.department} • {record.user.position}
                          </p>
                        </div>
                      </td>
                      <td className="p-2">
                        {record.checkInTime ? format(record.checkInTime, 'HH:mm') : '-'}
                      </td>
                      <td className="p-2">
                        {record.checkOutTime ? format(record.checkOutTime, 'HH:mm') : '-'}
                      </td>
                      <td className="p-2">
                        {record.workHours ? `${record.workHours}j` : '-'}
                      </td>
                      <td className="p-2">
                        <Badge variant={record.status === 'present' ? 'default' : 'secondary'}>
                          {STATUS_LABELS[record.status]}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="text-sm">
                          {record.checkInAddress && (
                            <div>📍 Masuk: {record.checkInAddress}</div>
                          )}
                          {record.checkOutAddress && (
                            <div>📍 Pulang: {record.checkOutAddress}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Tidak ada data absensi untuk filter yang dipilih</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"
import {
  Download,
  Filter,
  Users,
  Clock,
  TrendingUp,
  FileText,
  BarChart3,
  Loader2,
  Search,
  Building
} from "lucide-react"
import { STATUS_LABELS, MESSAGES, NAVIGATION, TABLE_HEADERS } from "@/lib/constants"
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
    } catch {
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
  }, [status, session, loadReports, loadFilterOptions])

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
  const handleExport = useCallback(async (exportFormat: 'csv' | 'pdf') => {
    setIsExporting(true)
    setMessage(null)

    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.department) params.append('department', filters.department)
      if (filters.status) params.append('status', filters.status)
      params.append('format', exportFormat)

      const response = await fetch(`/api/reports/export?${params.toString()}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `attendance-report-${exportFormat}-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        setMessage({ type: 'success', text: MESSAGES.EXPORT_SUCCESS })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || `Failed to export ${exportFormat.toUpperCase()}` })
      }
    } catch {
      setMessage({ type: 'error', text: `Failed to export ${exportFormat.toUpperCase()}` })
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
    <div className="space-y-8">
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold glass-title text-center lg:text-left">
          {NAVIGATION.REPORTS}
        </h1>
        <p className="text-white/80 text-lg">
          Laporan absensi dengan analisis dan statistik komprehensif
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Filter className="h-5 w-5" />
              Filter Laporan
            </CardTitle>
            <CardDescription className="text-white/70">
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
                  <Select value={filters.userId || "all"} onValueChange={(value) => handleFilterChange('userId', value === "all" ? "" : value)}>
                    <SelectTrigger className="w-full bg-white/10 border-white/20 text-white backdrop-blur-md focus:ring-emerald-400/50 focus:border-emerald-400/50">
                      <SelectValue placeholder="Semua Pengguna" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10">
                      <SelectItem value="all" className="text-white hover:bg-white/10 focus:bg-white/10">Semua Pengguna</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id} className="text-white hover:bg-white/10 focus:bg-white/10">
                          {user.name} ({user.department})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Departemen</Label>
                  <Select value={filters.department || "all"} onValueChange={(value) => handleFilterChange('department', value === "all" ? "" : value)}>
                    <SelectTrigger className="w-full bg-white/10 border-white/20 text-white backdrop-blur-md focus:ring-emerald-400/50 focus:border-emerald-400/50">
                      <SelectValue placeholder="Semua Departemen" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10">
                      <SelectItem value="all" className="text-white hover:bg-white/10 focus:bg-white/10">Semua Departemen</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept} className="text-white hover:bg-white/10 focus:bg-white/10">
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status || "all"} onValueChange={(value) => handleFilterChange('status', value === "all" ? "" : value)}>
                <SelectTrigger className="w-full bg-white/10 border-white/20 text-white backdrop-blur-md focus:ring-emerald-400/50 focus:border-emerald-400/50">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-white/10 focus:bg-white/10">Semua Status</SelectItem>
                  <SelectItem value="present" className="text-white hover:bg-white/10 focus:bg-white/10">Hadir</SelectItem>
                  <SelectItem value="late" className="text-white hover:bg-white/10 focus:bg-white/10">Terlambat</SelectItem>
                  <SelectItem value="absent" className="text-white hover:bg-white/10 focus:bg-white/10">Tidak Hadir</SelectItem>
                  <SelectItem value="half_day" className="text-white hover:bg-white/10 focus:bg-white/10">Setengah Hari</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button onClick={loadReports} variant="glass" className="bg-white/10 hover:bg-white/20 border-white/20">
              <Search className="h-4 w-4 mr-2" />
              Terapkan Filter
            </Button>
            <Button variant="outline" onClick={() => setFilters(initialFilters)} className="border-white/20 bg-white/5 hover:bg-white/10 text-white">
              Reset Filter
            </Button>

            {canExport && (
              <div className="ml-auto flex gap-3">
                <Button
                  variant="glass"
                  onClick={() => handleExport('csv')}
                  disabled={isExporting || records.length === 0}
                  className="bg-white/10 hover:bg-white/20 border-white/20"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export CSV
                </Button>
                <Button
                  variant="glass"
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting || records.length === 0}
                  className="bg-white/10 hover:bg-white/20 border-white/20"
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
      </motion.div>

      {/* Summary Statistics */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">
                Total Record
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.totalRecords}</div>
              <p className="text-xs text-white/60">
                Data absensi dalam periode
              </p>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">
                Total Pengguna
              </CardTitle>
              <Users className="h-4 w-4 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.totalUsers}</div>
              <p className="text-xs text-white/60">
                Pengguna dengan data absensi
              </p>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">
                Total Jam Kerja
              </CardTitle>
              <Clock className="h-4 w-4 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.totalWorkHours}j</div>
              <p className="text-xs text-white/60">
                Rata-rata {summary.averageWorkHours}j per hari
              </p>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">
                Lembur
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.totalOvertimeHours}j</div>
              <p className="text-xs text-white/60">
                Total jam lembur
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Status and Department Breakdown */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="grid gap-4 md:grid-cols-2"
        >
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-white">Status Breakdown</CardTitle>
              <CardDescription className="text-white/70">
                Distribusi status absensi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(summary.statusBreakdown).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${status === 'present' ? 'bg-emerald-400' : status === 'late' ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
                      <Badge
                        variant={status === 'present' ? 'default' : 'secondary'}
                        className={status === 'present' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : ''}
                      >
                        {STATUS_LABELS[status as AttendanceStatus]}
                      </Badge>
                      <span className="text-sm text-white/60">
                        {count} record
                      </span>
                    </div>
                    <span className="font-semibold text-white">
                      {((count / summary.totalRecords) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-white">Department Breakdown</CardTitle>
              <CardDescription className="text-white/70">
                Distribusi berdasarkan departemen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(summary.departmentBreakdown).map(([dept, count]) => (
                  <div key={dept} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                      <Building className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-white">{dept}</span>
                      <span className="text-sm text-white/60">
                        {count} record
                      </span>
                    </div>
                    <span className="font-semibold text-white">
                      {((count / summary.totalRecords) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Message Alert */}
      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Detailed Records */}
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
                        {format(record.date, 'dd MMM yyyy', { locale: id })}
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
                        {record.checkInTime ? format(record.checkInTime, 'HH:mm') : '-'}
                      </td>
                      <td className="p-3 text-white">
                        {record.checkOutTime ? format(record.checkOutTime, 'HH:mm') : '-'}
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
                              <span>Masuk: {record.checkInAddress}</span>
                            </div>
                          )}
                          {record.checkOutAddress && (
                            <div className="flex items-center gap-1">
                              <span className="text-blue-400">📍</span>
                              <span>Pulang: {record.checkOutAddress}</span>
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
    </div>
  )
}

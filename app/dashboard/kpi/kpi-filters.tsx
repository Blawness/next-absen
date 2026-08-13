"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarDays, Users, Filter, RefreshCw } from "lucide-react"
import { UserRole } from "@prisma/client"

/**
 * Compute the [start, end] dates for the given period using LOCAL time.
 * Monday-first week. Used so the displayed date range matches what the
 * user sees in their calendar, not UTC. (BUG-FIX H2)
 */
function computePeriodRange(period: "weekly" | "monthly"): { start: Date; end: Date } {
  const now = new Date()
  if (period === "weekly") {
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const start = new Date(now.getFullYear(), now.getMonth(), diff)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { start, end }
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  // Day 0 of next month = last day of current month.
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start, end }
}

/** Format a local Date as YYYY-MM-DD using local-time components (NOT UTC). */
function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

interface KpiFiltersProps {
  onFiltersChange: (filters: {
    period: "weekly" | "monthly"
    department?: string
    userId?: string
    startDate?: string
    endDate?: string
  }) => void
  userRole: UserRole
  userDepartment?: string
  isLoading?: boolean
}

interface Department {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  department: string | null
}

export function KpiFilters({ onFiltersChange, userRole, userDepartment, isLoading = false }: KpiFiltersProps) {
  // superadmin has at least the same reach as admin — it was previously
  // excluded from every check here, leaving it with no division/employee filter.
  const isOrgWide = userRole === UserRole.admin || userRole === UserRole.superadmin
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly")
  const [department, setDepartment] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingDepts, setLoadingDepts] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      if (!isOrgWide && userRole !== UserRole.manager) return

      setLoadingDepts(true)
      try {
        const res = await fetch("/api/users/departments")
        if (res.ok) {
          const data = await res.json()
          // API returns string[], map to Department objects
          const formattedDepartments = Array.isArray(data)
            ? data.map((name: string) => ({ id: name, name }))
            : []
          setDepartments(formattedDepartments)
        }
      } catch (error) {
        console.error("Failed to fetch departments:", error)
      } finally {
        setLoadingDepts(false)
      }
    }

    fetchDepartments()
  }, [userRole, isOrgWide])

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isOrgWide && userRole !== UserRole.manager) return

      setLoadingUsers(true)
      try {
        const res = await fetch("/api/users")
        if (res.ok) {
          const data = await res.json()
          setUsers(data)
        }
      } catch (error) {
        console.error("Failed to fetch users:", error)
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [userRole, isOrgWide])

  // Set default department for manager
  useEffect(() => {
    if (userRole === UserRole.manager && userDepartment && !department) {
      setDepartment(userDepartment)
    }
  }, [userRole, userDepartment, department])

  // Auto-set date range based on period
  useEffect(() => {
    const { start, end } = computePeriodRange(period)
    setStartDate(toLocalIsoDate(start))
    setEndDate(toLocalIsoDate(end))
  }, [period])

  const handleApplyFilters = () => {
    onFiltersChange({
      period,
      department: department || undefined,
      userId: userId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
  }

  const handleResetFilters = () => {
    const { start, end } = computePeriodRange(period)
    setStartDate(toLocalIsoDate(start))
    setEndDate(toLocalIsoDate(end))

    if (userRole === UserRole.manager && userDepartment) {
      setDepartment(userDepartment)
    } else {
      setDepartment("")
    }
    setUserId("")
  }

  const filteredUsers = users.filter(user => !department || user.department === department)

  const canSelectDepartment = isOrgWide || userRole === UserRole.manager

  return (
    <Card className="mb-6" variant="glass">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row lg:flex-wrap gap-4 items-stretch lg:items-end">
          {/* Period Selection */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-white/70">Periode</label>
            <div className="flex gap-2">
              <Button
                variant={period === "weekly" ? "glass" : "ghost"}
                className={period === "weekly" ? "" : "text-white/70 hover:text-white hover:bg-white/10"}
                size="sm"
                onClick={() => setPeriod("weekly")}
                disabled={isLoading}
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                Mingguan
              </Button>
              <Button
                variant={period === "monthly" ? "glass" : "ghost"}
                className={period === "monthly" ? "" : "text-white/70 hover:text-white hover:bg-white/10"}
                size="sm"
                onClick={() => setPeriod("monthly")}
                disabled={isLoading}
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                Bulanan
              </Button>
            </div>
          </div>

          {/* Date Range */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-white/70">Rentang Tanggal</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-w-0 px-3 py-2 glass-input text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 sm:w-auto"
                disabled={isLoading}
              />
              <span className="hidden text-white/50 sm:inline">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full min-w-0 px-3 py-2 glass-input text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 sm:w-auto"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Department Selection */}
          {canSelectDepartment && (
            <>
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-white/70">
                  <Users className="w-4 h-4 inline mr-1" />
                  Divisi
                </label>
                <Select
                  value={department || "all"}
                  onValueChange={(value) => {
                    setDepartment(value === "all" ? "" : value)
                    setUserId("") // Reset user when department changes
                  }}
                  disabled={loadingDepts || isLoading || (userRole === UserRole.manager && !!userDepartment)}
                >
                  <SelectTrigger className="w-full glass-input border-emerald-500/20 text-white lg:w-48">
                    <SelectValue placeholder="Pilih divisi..." />
                  </SelectTrigger>
                  <SelectContent className="border-emerald-500/20">
                    {isOrgWide && (
                      <SelectItem value="all">Semua Divisi</SelectItem>
                    )}
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Selection */}
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-white/70">
                  <Users className="w-4 h-4 inline mr-1" />
                  Karyawan
                </label>
                <Select
                  value={userId || "all"}
                  onValueChange={(value) => setUserId(value === "all" ? "" : value)}
                  disabled={loadingUsers || isLoading}
                >
                  <SelectTrigger className="w-full glass-input border-emerald-500/20 text-white lg:w-48">
                    <SelectValue placeholder="Pilih karyawan..." />
                  </SelectTrigger>
                  <SelectContent className="border-emerald-500/20">
                    <SelectItem value="all">Semua Karyawan</SelectItem>
                    {filteredUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleApplyFilters}
              disabled={isLoading}
              size="sm"
              variant="glass"
            >
              <Filter className="w-4 h-4 mr-2" />
              Terapkan
            </Button>
            <Button
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
              onClick={handleResetFilters}
              disabled={isLoading}
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Active Filters Summary */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex flex-wrap gap-2 text-xs text-white/60">
            <span>Filter aktif:</span>
            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded border border-emerald-500/20">
              Periode: {period === "weekly" ? "Mingguan" : "Bulanan"}
            </span>
            {department && (
              <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded border border-emerald-500/20">
                Divisi: {department}
              </span>
            )}
            {userId && (
              <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded border border-emerald-500/20">
                User: {users.find(u => u.id === userId)?.name}
              </span>
            )}
            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded border border-emerald-500/20">
              {startDate} - {endDate}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


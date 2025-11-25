"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarDays, Users, Filter, RefreshCw } from "lucide-react"
import { UserRole } from "@prisma/client"

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
      if (userRole !== UserRole.admin && userRole !== UserRole.manager) return

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
  }, [userRole])

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      if (userRole !== UserRole.admin && userRole !== UserRole.manager) return

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
  }, [userRole])

  // Set default department for manager
  useEffect(() => {
    if (userRole === UserRole.manager && userDepartment && !department) {
      setDepartment(userDepartment)
    }
  }, [userRole, userDepartment, department])

  // Auto-set date range based on period
  useEffect(() => {
    const now = new Date()
    let start: Date
    let end: Date

    if (period === "weekly") {
      // Get start of current week (Monday)
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // adjust when day is sunday
      start = new Date(now.setDate(diff))
      end = new Date(start)
      end.setDate(start.getDate() + 6)
    } else {
      // Get start and end of current month
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
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
    const now = new Date()
    let start: Date
    let end: Date

    if (period === "weekly") {
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      start = new Date(now.setDate(diff))
      end = new Date(start)
      end.setDate(start.getDate() + 6)
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])

    if (userRole === UserRole.manager && userDepartment) {
      setDepartment(userDepartment)
    } else {
      setDepartment("")
    }
    setUserId("")
  }

  const filteredUsers = users.filter(user => !department || user.department === department)

  const canSelectDepartment = userRole === UserRole.admin || userRole === UserRole.manager

  return (
    <Card className="mb-6" variant="glass">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
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
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 glass-input text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                disabled={isLoading}
              />
              <span className="text-white/50 self-center">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 glass-input text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                  <SelectTrigger className="w-48 glass-input border-emerald-500/20 text-white">
                    <SelectValue placeholder="Pilih divisi..." />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-emerald-500/20 text-white">
                    {userRole === UserRole.admin && (
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
                  <SelectTrigger className="w-48 glass-input border-emerald-500/20 text-white">
                    <SelectValue placeholder="Pilih karyawan..." />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-emerald-500/20 text-white">
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


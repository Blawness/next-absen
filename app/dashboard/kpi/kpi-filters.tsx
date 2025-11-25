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

export function KpiFilters({ onFiltersChange, userRole, userDepartment, isLoading = false }: KpiFiltersProps) {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly")
  const [department, setDepartment] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [departments, setDepartments] = useState<Department[]>([])
  const [loadingDepts, setLoadingDepts] = useState(false)

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      if (userRole !== UserRole.admin && userRole !== UserRole.manager) return

      setLoadingDepts(true)
      try {
        const res = await fetch("/api/users/departments")
        if (res.ok) {
          const data = await res.json()
          setDepartments(data)
        }
      } catch (error) {
        console.error("Failed to fetch departments:", error)
      } finally {
        setLoadingDepts(false)
      }
    }

    fetchDepartments()
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
  }

  const canSelectDepartment = userRole === UserRole.admin || userRole === UserRole.manager

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
          {/* Period Selection */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-white/70">Periode</label>
            <div className="flex gap-2">
              <Button
                variant={period === "weekly" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod("weekly")}
                disabled={isLoading}
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                Mingguan
              </Button>
              <Button
                variant={period === "monthly" ? "default" : "outline"}
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
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <span className="text-white/50 self-center">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Department Selection */}
          {canSelectDepartment && (
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-white/70">
                <Users className="w-4 h-4 inline mr-1" />
                Divisi
              </label>
              <Select
                value={department}
                onValueChange={setDepartment}
                disabled={loadingDepts || isLoading || (userRole === UserRole.manager && !!userDepartment)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Pilih divisi..." />
                </SelectTrigger>
                <SelectContent>
                  {userRole === UserRole.admin && (
                    <SelectItem value="">Semua Divisi</SelectItem>
                  )}
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleApplyFilters}
              disabled={isLoading}
              size="sm"
            >
              <Filter className="w-4 h-4 mr-2" />
              Terapkan
            </Button>
            <Button
              variant="outline"
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
            <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
              Periode: {period === "weekly" ? "Mingguan" : "Bulanan"}
            </span>
            {department && (
              <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded">
                Divisi: {department}
              </span>
            )}
            <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
              {startDate} - {endDate}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


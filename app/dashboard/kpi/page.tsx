"use client"

import { useState, useEffect } from "react"

import { KpiFilters } from "./kpi-filters"
import { KpiCharts } from "./kpi-charts"
import { KpiResponse } from "../../api/kpi/[period]/types"
import { UserRole } from "@prisma/client"

interface SessionUser {
  id: string
  role: UserRole
  department?: string
}

export default function KpiPage() {
  const [session, setSession] = useState<SessionUser | null>(null)
  const [kpiData, setKpiData] = useState<KpiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get session on client side
  useEffect(() => {
    const getSession = async () => {
      try {
        const res = await fetch("/api/auth/session")
        if (res.ok) {
          const sessionData = await res.json()
          setSession(sessionData.user)
        }
      } catch (err) {
        console.error("Failed to get session:", err)
        setError("Authentication failed")
      } finally {
        setIsLoading(false)
      }
    }

    getSession()
  }, [])

  const fetchKpiData = async (filters: {
    period: "weekly" | "monthly"
    department?: string
    userId?: string
    startDate?: string
    endDate?: string
  }) => {
    if (!session) return

    setIsLoading(true)
    setError(null)

    try {
      // Build query parameters
      const params = new URLSearchParams()
      params.set("scope", session.role === UserRole.admin ? "org" :
        session.role === UserRole.manager ? "department" : "user")

      if (filters.department) {
        params.set("department", filters.department)
      }

      if (filters.userId) {
        params.set("userId", filters.userId)
      }

      if (filters.startDate) {
        params.set("start", filters.startDate)
      }

      if (filters.endDate) {
        params.set("end", filters.endDate)
      }

      if (session.role === UserRole.user) {
        params.set("userId", session.id)
      }

      const url = `/api/kpi/${filters.period}?${params.toString()}`
      const res = await fetch(url)

      if (!res.ok) {
        throw new Error(`Failed to fetch KPI data: ${res.status}`)
      }

      const data = await res.json()
      setKpiData(data)
    } catch (err) {
      console.error("Error fetching KPI data:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
      setKpiData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFiltersChange = (filters: {
    period: "weekly" | "monthly"
    department?: string
    userId?: string
    startDate?: string
    endDate?: string
  }) => {
    fetchKpiData(filters)
  }

  if (isLoading && !session) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <div className="text-white/60">Authentication required</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 relative">
      {/* Floating Orbs Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="floating-orb"></div>
        <div className="floating-orb"></div>
        <div className="floating-orb"></div>
      </div>

      <div className="flex items-center justify-between relative z-10">
        <h1 className="text-2xl font-semibold tracking-tight">KPI Dashboard</h1>
        <div className="text-xs text-muted-foreground">
          Role: {session.role} {session.department && `(${session.department})`}
        </div>
      </div>

      {/* Filters */}
      <KpiFilters
        onFiltersChange={handleFiltersChange}
        userRole={session.role}
        userDepartment={session.department}
        isLoading={isLoading}
      />

      {/* Charts and Data */}
      {error && (
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">Error loading KPI data</div>
          <div className="text-sm text-white/60">{error}</div>
        </div>
      )}

      <KpiCharts data={kpiData} isLoading={isLoading} />
    </div>
  )
}



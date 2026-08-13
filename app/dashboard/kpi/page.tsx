"use client"

import { useState, useEffect, useRef } from "react"

import { KpiFilters } from "./kpi-filters"
import { KpiCharts } from "./kpi-charts"
import { KpiResponse } from "../../api/kpi/[period]/types"
import { UserRole } from "@prisma/client"

interface SessionUser {
  id: string
  role: UserRole
  department?: string
}

interface KpiFiltersState {
  period: "weekly" | "monthly"
  department?: string
  userId?: string
  startDate?: string
  endDate?: string
}

const DEFAULT_FILTERS: KpiFiltersState = {
  period: "weekly",
}

export default function KpiPage() {
  const [session, setSession] = useState<SessionUser | null>(null)
  const [kpiData, setKpiData] = useState<KpiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Tracks the most recent filters applied, used so the initial fetch
  // (BUG-FIX M6) can re-run with sensible defaults right after session loads.
  const lastFiltersRef = useRef<KpiFiltersState>(DEFAULT_FILTERS)

  // Get session on client side
  useEffect(() => {
    const getSession = async () => {
      try {
        const res = await fetch("/api/auth/session")
        if (res.ok) {
          const sessionData = await res.json()
          setSession(sessionData.user)
        } else {
          setError("Sesi tidak valid")
        }
      } catch (err) {
        console.error("Failed to get session:", err)
        setError("Gagal memuat sesi")
      } finally {
        setIsLoading(false)
      }
    }

    getSession()
  }, [])

  const fetchKpiData = async (filters: KpiFiltersState) => {
    if (!session) return

    setIsLoading(true)
    setError(null)

    try {
      // Build query parameters
      const params = new URLSearchParams()
      // superadmin is org-wide like admin — without this it fell through to
      // "user" and only ever saw its own KPI.
      params.set(
        "scope",
        session.role === UserRole.admin || session.role === UserRole.superadmin
          ? "org"
          : session.role === UserRole.manager
            ? "department"
            : "user"
      )

      if (filters.department) {
        params.set("department", filters.department)
      }

      // BUG-FIX C4: backend now ignores userId for non-admin/manager roles,
      // but we still pass the right value for admins/managers so they can
      // drill down. For role=user we deliberately pass session.id here.
      if (session.role === UserRole.user) {
        params.set("userId", session.id)
      } else if (filters.userId) {
        params.set("userId", filters.userId)
      }

      // BUG-FIX H2: send explicit start/end so the API uses the
      // caller's local-tz week/month, not its own UTC interpretation.
      if (filters.startDate) {
        params.set("start", filters.startDate)
      }
      if (filters.endDate) {
        params.set("end", filters.endDate)
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

  // BUG-FIX M6: auto-fetch once on initial mount (after session loads),
  // not only when the user clicks Apply.
  useEffect(() => {
    if (!session) return
    fetchKpiData(lastFiltersRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const handleFiltersChange = (filters: KpiFiltersState) => {
    lastFiltersRef.current = filters
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

"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { UserRole } from "@prisma/client"
import { MESSAGES } from "@/lib/constants"
import { getPresetRange, PeriodPreset } from "@/lib/report-view"
import {
  ReportRecord,
  ReportSummary,
  ReportFilters,
  Message
} from "../types"

/** How long an export success/failure note stays next to the buttons. */
const MESSAGE_TIMEOUT_MS = 4000

const buildFilterParams = (filters: ReportFilters) => {
  const params = new URLSearchParams()
  if (filters.startDate) params.append('startDate', filters.startDate)
  if (filters.endDate) params.append('endDate', filters.endDate)
  if (filters.userId) params.append('userId', filters.userId)
  if (filters.department) params.append('department', filters.department)
  if (filters.status) params.append('status', filters.status)
  return params
}

export const useReports = () => {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [records, setRecords] = useState<ReportRecord[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  // Full-page skeleton only until the first response lands; after that a
  // filter change keeps the old data on screen (dimmed) while it refetches.
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [exportMessage, setExportMessage] = useState<Message | null>(null)
  const [departments, setDepartments] = useState<string[]>([])
  const [users, setUsers] = useState<{ id: string; name: string; department: string }[]>([])
  const [page, setPage] = useState(1)

  const initialFilters = useMemo<ReportFilters>(() => ({
    ...getPresetRange("30d", new Date()),
    userId: '',
    department: '',
    status: ''
  }), [])

  const [filters, setFilters] = useState<ReportFilters>(initialFilters)

  // Each fetch gets a number; a response that comes back after a newer
  // request started is dropped, so a slow old query can't overwrite the
  // table for the filters now on screen.
  const latestRequestRef = useRef(0)

  const loadReports = useCallback(async () => {
    const requestId = ++latestRequestRef.current
    setIsRefreshing(true)
    setLoadError(null)

    try {
      const params = buildFilterParams(filters)
      params.append('includeSummary', 'true')

      const response = await fetch(`/api/reports?${params.toString()}`)
      if (requestId !== latestRequestRef.current) return

      if (response.ok) {
        const data = await response.json()
        if (requestId !== latestRequestRef.current) return
        setRecords(data.records)
        setSummary(data.summary)
      } else {
        const error = await response.json().catch(() => ({}))
        setLoadError(error.error || MESSAGES.ERROR)
      }
    } catch {
      if (requestId === latestRequestRef.current) setLoadError(MESSAGES.ERROR)
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsRefreshing(false)
        setHasLoaded(true)
      }
    }
  }, [filters])

  const loadFilterOptions = useCallback(async () => {
    try {
      const deptResponse = await fetch('/api/users/departments')
      if (deptResponse.ok) {
        setDepartments(await deptResponse.json())
      }

      const usersResponse = await fetch('/api/users')
      if (usersResponse.ok) {
        setUsers(await usersResponse.json())
      }
    } catch (error) {
      console.error('Error loading filter options:', error)
    }
  }, [])

  const filterOptionsLoadedRef = useRef(false)

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated" || !session) {
      router.replace("/auth/signin")
      return
    }

    // Regular users keep REPORT_READ (lib/permissions.ts) and the API
    // hard-scopes them to their own records, so they get the page too —
    // just without the org-wide filters and export. They cannot read the
    // user/department lists, so skip those rather than fire two 403s.
    const isRegularUser = session.user.role === UserRole.user
    if (!isRegularUser && !filterOptionsLoadedRef.current) {
      filterOptionsLoadedRef.current = true
      loadFilterOptions()
    }

    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.id, session?.user?.role, filters, loadReports, loadFilterOptions, router])

  useEffect(() => {
    if (!exportMessage) return
    const timer = setTimeout(() => setExportMessage(null), MESSAGE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [exportMessage])

  const handleFilterChange = useCallback((field: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
    setPage(1)
  }, [])

  /** Sets both dates in one update, so a preset click fetches once, not twice. */
  const handlePresetChange = useCallback((preset: Exclude<PeriodPreset, "custom">) => {
    setFilters(prev => ({ ...prev, ...getPresetRange(preset, new Date()) }))
    setPage(1)
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(initialFilters)
    setPage(1)
  }, [initialFilters])

  const isFiltered = useMemo(
    () => (Object.keys(initialFilters) as Array<keyof ReportFilters>)
      .some(key => filters[key] !== initialFilters[key]),
    [filters, initialFilters]
  )

  const handleExport = useCallback(async (exportFormat: 'csv' | 'pdf') => {
    // For PDF, open in new tab so the browser can render it.
    if (exportFormat === 'pdf') {
      const params = buildFilterParams(filters)
      params.append('format', 'pdf')
      window.open(`/api/reports/export?${params.toString()}`, '_blank', 'noopener,noreferrer')
      return
    }

    setIsExporting(true)
    setExportMessage(null)

    try {
      const params = buildFilterParams(filters)
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
        a.remove()
        window.URL.revokeObjectURL(url)
        setExportMessage({ type: 'success', text: MESSAGES.EXPORT_SUCCESS })
      } else {
        const error = await response.json().catch(() => ({}))
        setExportMessage({ type: 'error', text: error.error || `Gagal export ${exportFormat.toUpperCase()}` })
      }
    } catch {
      setExportMessage({ type: 'error', text: `Gagal export ${exportFormat.toUpperCase()}` })
    } finally {
      setIsExporting(false)
    }
  }, [filters])

  const handlePreview = useCallback(() => {
    const params = buildFilterParams(filters)
    params.append('format', 'pdf')
    params.append('preview', 'true')
    window.open(`/api/reports/export?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }, [filters])

  const canExport = useMemo(() =>
    session?.user.role === UserRole.admin ||
    session?.user.role === UserRole.superadmin ||
    session?.user.role === UserRole.manager,
    [session?.user.role]
  )

  // Regular users only ever see their own records — hide the org-wide
  // department/employee pickers and the per-employee card for them.
  const canFilterOthers = useMemo(() =>
    !!session && session.user.role !== UserRole.user,
    [session]
  )

  return {
    // State
    records,
    summary,
    isInitialLoading: !hasLoaded,
    isRefreshing,
    isExporting,
    loadError,
    exportMessage,
    filters,
    isFiltered,
    departments,
    users,
    canExport,
    canFilterOthers,
    page,

    // Actions
    retry: loadReports,
    setPage,
    handleFilterChange,
    handlePresetChange,
    handleExport,
    handlePreview,
    resetFilters,
  }
}

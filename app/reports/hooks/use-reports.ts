"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { UserRole } from "@prisma/client"
import { MESSAGES } from "@/lib/constants"
import {
  ReportRecord,
  ReportSummary,
  ReportFilters,
  Message
} from "../types"

export const useReports = () => {
  const { data: session, status } = useSession()

  const [records, setRecords] = useState<ReportRecord[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [departments, setDepartments] = useState<string[]>([])
  const [users, setUsers] = useState<{ id: string; name: string; department: string }[]>([])

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
    // For PDF, we now open a print view instead of downloading a file
    if (exportFormat === 'pdf') {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.department) params.append('department', filters.department)
      if (filters.status) params.append('status', filters.status)
      params.append('format', 'pdf')

      const url = `/api/reports/export?${params.toString()}`
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }

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

  // Handle PDF preview in new tab
  const handlePreview = useCallback(async () => {
    setMessage(null)

    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.department) params.append('department', filters.department)
      if (filters.status) params.append('status', filters.status)
      params.append('format', 'pdf')
      params.append('preview', 'true')

      // Open PDF preview in new tab
      const previewUrl = `/api/reports/export?${params.toString()}`
      window.open(previewUrl, '_blank', 'noopener,noreferrer')
    } catch {
      setMessage({ type: 'error', text: 'Failed to open PDF preview' })
    }
  }, [filters])

  // Memoize canExport to prevent recreation on every render
  const canExport = useMemo(() =>
    session?.user.role === UserRole.admin ||
    session?.user.role === UserRole.manager,
    [session?.user.role]
  )

  return {
    // State
    records,
    summary,
    isLoading,
    isExporting,
    message,
    filters,
    departments,
    users,
    canExport,

    // Actions
    loadReports,
    handleFilterChange,
    handleExport,
    handlePreview,
    setFilters,
    initialFilters
  }
}

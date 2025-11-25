"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import {
  DataTableToolbar,
  DataTableBulkActions,
  DataTableContent,
  columns,
  DataTableSkeleton,
} from "@/components/ui/data-table"
import { DataTableProps, SortDirection, Density } from "@/types/data-table-types"

export function AdvancedDataTable({ data, loading, onEdit, onDelete, onToggleStatus, onPasswordReset, onViewActivity }: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [density, setDensity] = useState<Density>("comfortable")
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.filter(col => col.id !== "select" && col.id !== "actions").map(col => col.id))
  )
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter(user => {
      const matchesSearch = searchQuery === "" ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesDepartment = departmentFilter === "all" || user.department === departmentFilter
      const matchesRole = roleFilter === "all" || user.role === roleFilter
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" ? user.isActive : !user.isActive)

      return matchesSearch && matchesDepartment && matchesRole && matchesStatus
    })

    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn as keyof typeof a]
        const bVal = b[sortColumn as keyof typeof b]

        if (aVal === null && bVal === null) return 0
        if (aVal === null) return 1
        if (bVal === null) return -1

        let comparison = 0
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal)
        } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
          comparison = aVal === bVal ? 0 : aVal ? 1 : -1
        } else if (aVal instanceof Date && bVal instanceof Date) {
          comparison = aVal.getTime() - bVal.getTime()
        } else if (aVal !== null && bVal !== null && typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        }

        return sortDirection === "asc" ? comparison : -comparison
      })
    }

    return filtered
  }, [data, searchQuery, departmentFilter, roleFilter, statusFilter, sortColumn, sortDirection])

  // Get unique values for filters
  const departments = useMemo(() =>
    Array.from(new Set(data.map(user => user.department).filter((dept): dept is string => Boolean(dept)))),
    [data]
  )

  const roles = useMemo(() =>
    Array.from(new Set(data.map(user => user.role))),
    [data]
  )

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc")
    } else {
      setSortColumn(columnId)
      setSortDirection("asc")
    }
  }

  const handleRowSelect = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(userId)
    } else {
      newSelected.delete(userId)
    }
    setSelectedRows(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(filteredAndSortedData.map(user => user.id)))
      setShowBulkActions(true)
    } else {
      setSelectedRows(new Set())
      setShowBulkActions(false)
    }
  }

  const handleBulkDelete = () => {
    selectedRows.forEach(userId => {
      const user = data.find(u => u.id === userId)
      if (user) onDelete?.(user)
    })
    setSelectedRows(new Set())
    setShowBulkActions(false)
  }

  const handleBulkToggleStatus = () => {
    selectedRows.forEach(userId => {
      const user = data.find(u => u.id === userId)
      if (user) onToggleStatus?.(user)
    })
    setSelectedRows(new Set())
    setShowBulkActions(false)
  }

  const toggleColumnVisibility = () => {
    const allColumns = columns.filter(col => col.id !== "select" && col.id !== "actions").map(col => col.id)
    if (visibleColumns.size === allColumns.length) {
      setVisibleColumns(new Set())
    } else {
      setVisibleColumns(new Set(allColumns))
    }
  }

  if (loading) {
    return <DataTableSkeleton />
  }

  return (
    <div className="space-y-4">
      <DataTableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        departmentFilter={departmentFilter}
        onDepartmentFilterChange={setDepartmentFilter}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        density={density}
        onDensityChange={setDensity}
        onToggleColumnVisibility={toggleColumnVisibility}
        departments={departments}
        roles={roles}
      />

      <DataTableBulkActions
        selectedCount={selectedRows.size}
        show={showBulkActions}
        onBulkDelete={handleBulkDelete}
        onBulkToggleStatus={handleBulkToggleStatus}
      />

      <DataTableContent
        columns={columns}
        visibleColumns={visibleColumns}
        filteredAndSortedData={filteredAndSortedData}
        selectedRows={selectedRows}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        density={density}
        onSort={handleSort}
        onRowSelect={handleRowSelect}
        onSelectAll={handleSelectAll}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleStatus={onToggleStatus}
        onPasswordReset={onPasswordReset}
        onViewActivity={onViewActivity}
      />
    </div>
  )
}


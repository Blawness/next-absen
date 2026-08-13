"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import {
  DataTableToolbar,
  DataTableBulkActions,
  DataTableContent,
  DataTableSkeleton,
  columns,
} from "@/components/ui/data-table"
import { DataTableProps, SortDirection, Density } from "@/types/data-table-types"
import { getRoleConfig } from "@/lib/role-config"

export function AdvancedDataTable({
  data,
  loading,
  statusFilter = "all",
  departments: propDepartments,
  onFilterChange,
  onEdit,
  onDelete,
  onToggleStatus,
  onPasswordReset,
  onViewActivity,
  onBulkDelete,
  onBulkActivate,
  onBulkDeactivate,
  onBulkToggleStatus,
}: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [density, setDensity] = useState<Density>("comfortable")

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((user) => {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        searchQuery === "" ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.department?.toLowerCase().includes(query) ?? false) ||
        (user.position?.toLowerCase().includes(query) ?? false)

      const matchesDepartment =
        departmentFilter === "all" || user.department === departmentFilter
      const matchesRole = roleFilter === "all" || user.role === roleFilter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? user.isActive : !user.isActive)

      return (
        matchesSearch && matchesDepartment && matchesRole && matchesStatus
      )
    })

    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn as keyof typeof a]
        const bVal = b[sortColumn as keyof typeof b]

        if (aVal === null && bVal === null) return 0
        if (aVal === null) return 1
        if (bVal === null) return -1

        let comparison = 0
        if (typeof aVal === "string" && typeof bVal === "string") {
          comparison = aVal.localeCompare(bVal)
        } else if (typeof aVal === "boolean" && typeof bVal === "boolean") {
          comparison = aVal === bVal ? 0 : aVal ? 1 : -1
        } else if (aVal instanceof Date && bVal instanceof Date) {
          comparison = aVal.getTime() - bVal.getTime()
        } else if (
          typeof aVal === "number" &&
          typeof bVal === "number"
        ) {
          comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        }

        return sortDirection === "asc" ? comparison : -comparison
      })
    }

    return filtered
  }, [data, searchQuery, departmentFilter, roleFilter, statusFilter, sortColumn, sortDirection])

  // Get unique values for filters
  const departments = useMemo(
    () =>
      propDepartments ||
      Array.from(
        new Set(
          data.map((user) => user.department).filter((d): d is string => Boolean(d))
        )
      ),
    [propDepartments, data]
  )

  const roles = useMemo(
    () => Array.from(new Set(data.map((user) => user.role))),
    [data]
  )

  // Drop selections that are no longer visible. Without this, narrowing a
  // filter leaves hidden rows selected and a bulk action silently applies to
  // rows the user cannot see.
  useEffect(() => {
    setSelectedRows((prev) => {
      if (prev.size === 0) return prev
      const visible = new Set(filteredAndSortedData.map((user) => user.id))
      const next = new Set([...prev].filter((id) => visible.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [filteredAndSortedData])

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection((prev) =>
        prev === "asc" ? "desc" : prev === "desc" ? null : "asc"
      )
    } else {
      setSortColumn(columnId)
      setSortDirection("asc")
    }
  }

  const handleRowSelect = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (checked) newSelected.add(userId)
    else newSelected.delete(userId)
    setSelectedRows(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(
      checked ? new Set(filteredAndSortedData.map((user) => user.id)) : new Set()
    )
  }

  const handleClearSelection = () => setSelectedRows(new Set())

  const handleBulkDelete = () => {
    if (onBulkDelete) {
      onBulkDelete(Array.from(selectedRows))
    } else if (onDelete) {
      // Resolve each id before calling — a stale selection would otherwise
      // hand `undefined` to the callback.
      selectedRows.forEach((id) => {
        const user = data.find((u) => u.id === id)
        if (user) onDelete(user)
      })
    }
    setSelectedRows(new Set())
  }

  const handleBulkActivate = () => {
    if (onBulkActivate) onBulkActivate(Array.from(selectedRows))
    else if (onBulkToggleStatus)
      onBulkToggleStatus(Array.from(selectedRows))
    setSelectedRows(new Set())
  }

  const handleBulkDeactivate = () => {
    if (onBulkDeactivate) onBulkDeactivate(Array.from(selectedRows))
    else if (onBulkToggleStatus)
      onBulkToggleStatus(Array.from(selectedRows))
    setSelectedRows(new Set())
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setDepartmentFilter("all")
    setRoleFilter("all")
    onFilterChange?.({ status: "all" })
  }

  if (loading) return <DataTableSkeleton />

  return (
    <div className="space-y-4">
      <DataTableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Cari nama, email, departemen, posisi..."
        density={density}
        onDensityChange={setDensity}
        showDensityToggle
        onResetFilters={handleResetFilters}
        filters={[
          {
            id: "department",
            label: "Departemen",
            value: departmentFilter,
            onChange: setDepartmentFilter,
            options: [
              { value: "all", label: "Semua Departemen" },
              ...departments.map((d) => ({ value: d, label: d })),
            ],
          },
          {
            id: "role",
            label: "Role",
            value: roleFilter,
            onChange: setRoleFilter,
            options: [
              { value: "all", label: "Semua Role" },
              ...roles.map((r) => ({
                value: r,
                label: getRoleConfig(r).label,
              })),
            ],
          },
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            onChange: (v) => onFilterChange?.({ status: v as 'all' | 'active' | 'inactive' }),
            options: [
              { value: "all", label: "Semua Status" },
              { value: "active", label: "Aktif" },
              { value: "inactive", label: "Nonaktif" },
            ],
          },
        ]}
      />

      <DataTableBulkActions
        selectedCount={selectedRows.size}
        onClearSelection={handleClearSelection}
        onActivate={onBulkActivate || onBulkToggleStatus ? handleBulkActivate : undefined}
        onDeactivate={onBulkDeactivate || onBulkToggleStatus ? handleBulkDeactivate : undefined}
        onDelete={onBulkDelete || onDelete ? handleBulkDelete : undefined}
        entityLabel="pengguna"
      />

      <DataTableContent
        columns={columns}
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
        emptyTitle="Tidak ada pengguna ditemukan"
        emptyDescription="Tidak ada data yang sesuai dengan filter yang dipilih."
      />
    </div>
  )
}

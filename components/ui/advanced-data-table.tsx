"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Search,
  Filter,
  MoreHorizontal,
  ArrowUpDown,
  Check,
  X,
  Users,
  Settings,
  Download,
  Trash2,
  Edit,
  UserCheck,
  Clock,
  Calendar
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface User {
  id: string
  name: string
  email: string
  department: string | null
  position: string | null
  role: "admin" | "manager" | "user"
  isActive: boolean
  lastLogin: Date | null
  createdAt: Date
  avatarUrl?: string | null
}

interface Column {
  id: string
  label: string
  accessorKey: keyof User
  sortable?: boolean
  pinned?: "left" | "right"
  width?: number
  cell?: (item: User) => React.ReactNode
}

interface DataTableProps {
  data: User[]
  loading?: boolean
  onEdit?: (user: User) => void
  onDelete?: (user: User) => void
  onToggleStatus?: (user: User) => void
}

type SortDirection = "asc" | "desc" | null
type Density = "comfortable" | "compact"

const columns: Column[] = [
  {
    id: "select",
    label: "",
    accessorKey: "id",
    pinned: "left",
    width: 50,
    cell: () => null,
  },
  {
    id: "name",
    label: "Nama",
    accessorKey: "name",
    sortable: true,
    pinned: "left",
    width: 200,
    cell: (user) => (
      <div className="flex items-center gap-3 py-1">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-white text-sm">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white truncate">{user.name}</p>
          <p className="text-sm text-white/60 truncate">{user.email}</p>
        </div>
      </div>
    ),
  },
  {
    id: "department",
    label: "Departemen",
    accessorKey: "department",
    sortable: true,
    width: 140,
  },
  {
    id: "position",
    label: "Posisi",
    accessorKey: "position",
    sortable: true,
    width: 160,
  },
  {
    id: "role",
    label: "Role",
    accessorKey: "role",
    sortable: true,
    width: 100,
    cell: (user) => (
      <Badge
        variant={user.role === "admin" ? "default" : user.role === "manager" ? "secondary" : "outline"}
        className="capitalize"
      >
        {user.role === "admin" ? "Admin" : user.role === "manager" ? "Manager" : "Pengguna"}
      </Badge>
    ),
  },
  {
    id: "status",
    label: "Status",
    accessorKey: "isActive",
    sortable: true,
    width: 80,
    cell: (user) => (
      <Badge variant={user.isActive ? "default" : "destructive"}>
        {user.isActive ? "Aktif" : "Nonaktif"}
      </Badge>
    ),
  },
  {
    id: "lastLogin",
    label: "Terakhir Login",
    accessorKey: "lastLogin",
    sortable: true,
    width: 120,
    cell: (user) => {
      if (!user.lastLogin) return <span className="text-white/40">Belum pernah login</span>

      const now = new Date()
      const diffMs = now.getTime() - user.lastLogin.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      let relativeTime = ""
      if (diffDays === 0) {
        relativeTime = "Hari ini"
      } else if (diffDays === 1) {
        relativeTime = "Kemarin"
      } else if (diffDays < 7) {
        relativeTime = `${diffDays} hari lalu`
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7)
        relativeTime = `${weeks} minggu lalu`
      } else {
        const months = Math.floor(diffDays / 30)
        relativeTime = `${months} bulan lalu`
      }

      return (
        <span className="text-white/80 cursor-help" title={user.lastLogin.toLocaleString("id-ID")}>
          {relativeTime}
        </span>
      )
    },
  },
  {
    id: "actions",
    label: "Aksi",
    accessorKey: "id",
    pinned: "right",
    width: 130,
    cell: () => null,
  },
]

export function AdvancedDataTable({ data, loading, onEdit, onDelete, onToggleStatus }: DataTableProps) {
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
    let filtered = data.filter(user => {
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
        const aVal = a[sortColumn as keyof User]
        const bVal = b[sortColumn as keyof User]

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
        } else if (aVal !== null && bVal !== null) {
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

  const toggleColumnVisibility = (columnId: string) => {
    const newVisible = new Set(visibleColumns)
    if (newVisible.has(columnId)) {
      newVisible.delete(columnId)
    } else {
      newVisible.add(columnId)
    }
    setVisibleColumns(newVisible)
  }

  const visibleColumnsArray = columns.filter(col => visibleColumns.has(col.id))

  if (loading) {
    return <DataTableSkeleton />
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card variant="glass" className="rounded-2xl">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  placeholder="Cari pengguna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-48 bg-white/5 border-white/10">
                  <SelectValue placeholder="Semua Departemen" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10 z-50">
                  <SelectItem value="all" className="text-white hover:bg-white/10 focus:bg-white/10">Semua Departemen</SelectItem>
                  {departments.length > 0 ? (
                    departments.map(dept => (
                      <SelectItem key={dept} value={dept} className="text-white hover:bg-white/10 focus:bg-white/10">{dept}</SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-white/60">Tidak ada departemen tersedia</div>
                  )}
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10">
                  <SelectValue placeholder="Semua Role" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10 z-50">
                  <SelectItem value="all" className="text-white hover:bg-white/10 focus:bg-white/10">Semua Role</SelectItem>
                  {roles.length > 0 ? (
                    roles.map(role => (
                      <SelectItem key={role} value={role} className="capitalize text-white hover:bg-white/10 focus:bg-white/10">
                        {role === "admin" ? "Admin" : role === "manager" ? "Manager" : "Pengguna"}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-white/60">Tidak ada role tersedia</div>
                  )}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 bg-white/5 border-white/10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10 z-50">
                  <SelectItem value="all" className="text-white hover:bg-white/10 focus:bg-white/10">Semua</SelectItem>
                  <SelectItem value="active" className="text-white hover:bg-white/10 focus:bg-white/10">Aktif</SelectItem>
                  <SelectItem value="inactive" className="text-white hover:bg-white/10 focus:bg-white/10">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select value={density} onValueChange={(value: Density) => setDensity(value)}>
                <SelectTrigger className="w-32 bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10 z-50">
                  <SelectItem value="comfortable" className="text-white hover:bg-white/10 focus:bg-white/10">Comfortable</SelectItem>
                  <SelectItem value="compact" className="text-white hover:bg-white/10 focus:bg-white/10">Compact</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Simple toggle for now - can be expanded later
                  const allColumns = columns.filter(col => col.id !== "select" && col.id !== "actions").map(col => col.id)
                  if (visibleColumns.size === allColumns.length) {
                    setVisibleColumns(new Set())
                  } else {
                    setVisibleColumns(new Set(allColumns))
                  }
                }}
                className="bg-white/5 border-white/10"
              >
                <Eye className="h-4 w-4 mr-2" />
                Kolom
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Bulk Actions */}
      {showBulkActions && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <Card variant="glass" className="rounded-2xl">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/80">
                  {selectedRows.size} pengguna dipilih
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkToggleStatus}
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Toggle Status
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Hapus
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Table */}
      <Card variant="glass" className="rounded-2xl overflow-hidden">
        <div className="relative">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="border-gray-600/40 hover:bg-transparent bg-gray-900/60 sticky top-0 z-20 backdrop-blur-md">
                {visibleColumnsArray.map((column) => (
                  <TableHead
                    key={column.id}
                    className={cn(
                      "text-white/95 font-semibold border-gray-600/30",
                      column.pinned === "left" && "sticky left-0 z-30 bg-gray-900/85 backdrop-blur-sm border-r border-gray-500/50",
                      column.pinned === "right" && "sticky right-0 z-30 bg-gray-900/85 backdrop-blur-sm border-l border-gray-500/50",
                      !column.sortable && "cursor-default"
                    )}
                    style={{ width: column.width }}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-white/15 text-white/70 hover:text-white"
                          onClick={() => handleSort(column.id)}
                        >
                          {sortColumn === column.id ? (
                            sortDirection === "asc" ? (
                              <ChevronUp className="h-3 w-3 text-white" />
                            ) : sortDirection === "desc" ? (
                              <ChevronDown className="h-3 w-3 text-white" />
                            ) : (
                              <ChevronsUpDown className="h-3 w-3 text-white/80" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-white/50" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
                {filteredAndSortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumnsArray.length} className="h-64">
                      <EmptyState />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedData.map((user, index) => (
                    <TableRow
                      key={user.id}
                      className={cn(
                        "border-white/15 hover:bg-gray-800/50 transition-colors backdrop-blur-sm",
                        index % 2 === 0 ? "bg-gray-800/40" : "bg-gray-800/20",
                        selectedRows.has(user.id) && "bg-blue-500/25 border-blue-500/40"
                      )}
                    >
                      {visibleColumnsArray.map((column) => (
                        <TableCell
                          key={column.id}
                          className={cn(
                            "text-white/98 border-gray-700/30 py-4",
                            column.pinned === "left" && "sticky left-0 z-20 bg-inherit backdrop-blur-sm border-r border-gray-600/40",
                            column.pinned === "right" && "sticky right-0 z-20 bg-inherit backdrop-blur-sm border-l border-gray-600/40",
                            density === "compact" && "py-2"
                          )}
                          style={{ width: column.width }}
                        >
                          {column.id === "select" ? (
                            <input
                              type="checkbox"
                              checked={selectedRows.has(user.id)}
                              onChange={(e) => handleRowSelect(user.id, e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                          ) : column.id === "actions" ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit?.(user)}
                                className="h-8 w-8 p-0 hover:bg-white/10"
                                title="Edit"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onToggleStatus?.(user)}
                                className="h-8 w-8 p-0 hover:bg-white/10"
                                title={user.isActive ? "Nonaktifkan" : "Aktifkan"}
                              >
                                {user.isActive ? (
                                  <UserCheck className="h-3 w-3 text-green-400" />
                                ) : (
                                  <X className="h-3 w-3 text-red-400" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete?.(user)}
                                className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400"
                                title="Hapus"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : column.cell ? (
                            column.cell(user)
                          ) : (
                            <span className={cn(
                              "text-white/80",
                              user[column.accessorKey] === null && "text-white/40"
                            )}>
                              {user[column.accessorKey] as string || "-"}
                            </span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      {/* Pagination would go here */}
    </div>
  )
}

// Loading skeleton
function DataTableSkeleton() {
  return (
    <div className="space-y-4">
      <Card variant="glass" className="rounded-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card variant="glass" className="rounded-2xl">
        <div className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-4 bg-white/10 rounded animate-pulse" />
                <div className="h-8 w-8 bg-white/10 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
                <div className="h-6 w-16 bg-white/10 rounded animate-pulse" />
                <div className="h-6 w-16 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                <div className="flex gap-1">
                  <div className="h-8 w-8 bg-white/10 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-white/10 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-white/10 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

// Empty state component
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full flex items-center justify-center mb-6 border border-gray-600/40">
        <Users className="h-10 w-10 text-white/60" />
      </div>
      <h3 className="text-lg font-semibold text-white/98 mb-2">Tidak ada pengguna ditemukan</h3>
      <p className="text-white/75 mb-6 max-w-md">
        Belum ada pengguna yang sesuai dengan filter yang dipilih. Coba ubah filter atau tambah pengguna baru.
      </p>
      <Button variant="outline" className="bg-gray-800/40 border-gray-600/40 text-white hover:bg-gray-700/50">
        <Users className="h-4 w-4 mr-2" />
        Tambah Pengguna
      </Button>
    </div>
  )
}

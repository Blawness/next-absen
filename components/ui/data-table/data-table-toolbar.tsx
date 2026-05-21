"use client"

import { Search, SlidersHorizontal, Columns3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Density } from "@/types/data-table-types"

interface DataTableToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  departmentFilter: string
  onDepartmentFilterChange: (dept: string) => void
  roleFilter: string
  onRoleFilterChange: (role: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  density: Density
  onDensityChange: (density: Density) => void
  onToggleColumnVisibility: () => void
  departments: string[]
  roles: string[]
}

export function DataTableToolbar({
  searchQuery,
  onSearchChange,
  departmentFilter,
  onDepartmentFilterChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  density,
  onDensityChange,
  onToggleColumnVisibility,
  departments,
  roles,
}: DataTableToolbarProps) {
  const hasActiveFilters =
    searchQuery !== "" ||
    departmentFilter !== "all" ||
    roleFilter !== "all" ||
    statusFilter !== "all"

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      {/* Search + actions row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35 pointer-events-none" />
          <Input
            placeholder="Cari nama, email, departemen..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/35 focus:border-emerald-500/50 focus:ring-emerald-500/20 h-9"
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Select value={density} onValueChange={onDensityChange}>
            <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white/70 h-9 text-sm">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-white/40" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10">
              <SelectItem value="comfortable" className="text-white hover:bg-white/10 focus:bg-white/10">Lebar</SelectItem>
              <SelectItem value="compact" className="text-white hover:bg-white/10 focus:bg-white/10">Rapat</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={onToggleColumnVisibility}
            className="bg-white/5 border-white/10 text-white/70 hover:text-white h-9 px-3"
          >
            <Columns3 className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-sm">Kolom</span>
          </Button>
        </div>
      </div>

      {/* Filter chips row */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-white/40 font-medium">Filter:</span>

        <Select value={departmentFilter} onValueChange={onDepartmentFilterChange}>
          <SelectTrigger className={`h-7 text-xs px-2.5 border rounded-full transition-colors ${
            departmentFilter !== "all"
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : "bg-white/5 border-white/10 text-white/60"
          }`}>
            <SelectValue placeholder="Departemen" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10 z-50">
            <SelectItem value="all" className="text-white hover:bg-white/10 focus:bg-white/10 text-sm">Semua Departemen</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept} className="text-white hover:bg-white/10 focus:bg-white/10 text-sm">{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={onRoleFilterChange}>
          <SelectTrigger className={`h-7 text-xs px-2.5 border rounded-full transition-colors ${
            roleFilter !== "all"
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : "bg-white/5 border-white/10 text-white/60"
          }`}>
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10 z-50">
            <SelectItem value="all" className="text-white hover:bg-white/10 focus:bg-white/10 text-sm">Semua Role</SelectItem>
            {roles.map(role => (
              <SelectItem key={role} value={role} className="text-white hover:bg-white/10 focus:bg-white/10 text-sm capitalize">
                {role === "admin" ? "Admin" : role === "manager" ? "Manager" : "Pengguna"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className={`h-7 text-xs px-2.5 border rounded-full transition-colors ${
            statusFilter !== "all"
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : "bg-white/5 border-white/10 text-white/60"
          }`}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10 z-50">
            <SelectItem value="all" className="text-white hover:bg-white/10 focus:bg-white/10 text-sm">Semua Status</SelectItem>
            <SelectItem value="active" className="text-white hover:bg-white/10 focus:bg-white/10 text-sm">Aktif</SelectItem>
            <SelectItem value="inactive" className="text-white hover:bg-white/10 focus:bg-white/10 text-sm">Nonaktif</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <button
            onClick={() => {
              onSearchChange("")
              onDepartmentFilterChange("all")
              onRoleFilterChange("all")
              onStatusFilterChange("all")
            }}
            className="h-7 px-2.5 text-xs text-rose-400/80 hover:text-rose-300 border border-rose-500/20 bg-rose-500/8 rounded-full transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

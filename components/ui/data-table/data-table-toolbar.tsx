"use client"

import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader } from "@/components/ui/card"
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
  return (
    <Card variant="glass" className="rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Cari pengguna..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <div className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <Select value={departmentFilter} onValueChange={onDepartmentFilterChange}>
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

            <Select value={roleFilter} onValueChange={onRoleFilterChange}>
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

            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
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
            <Select value={density} onValueChange={onDensityChange}>
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
              onClick={onToggleColumnVisibility}
              className="bg-white/5 border-white/10"
            >
              <Eye className="h-4 w-4 mr-2" />
              Kolom
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

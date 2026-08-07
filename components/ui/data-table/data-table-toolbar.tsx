"use client"

import { Search, X } from "lucide-react"
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

interface FilterOption {
  value: string
  label: string
}

interface DataTableToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  searchPlaceholder?: string
  filters?: Array<{
    id: string
    label: string
    value: string
    onChange: (value: string) => void
    options: FilterOption[]
  }>
  onResetFilters?: () => void
  density?: Density
  onDensityChange?: (density: Density) => void
  showDensityToggle?: boolean
  rightActions?: React.ReactNode
}

export function DataTableToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Cari...",
  filters = [],
  onResetFilters,
  density = "comfortable",
  onDensityChange,
  showDensityToggle = false,
  rightActions,
}: DataTableToolbarProps) {
  const hasActiveFilters = filters.some((f) => f.value !== "all") || searchQuery !== ""

  return (
    <div className="space-y-3">
      {/* Search + primary actions row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            hasLeftIcon
            variant="glass"
            className="h-10"
          />
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {showDensityToggle && onDensityChange && (
            <Select value={density} onValueChange={(v) => onDensityChange(v as Density)}>
              <SelectTrigger className="h-10 w-32 border-white/10 bg-white/5 text-white/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Lebar</SelectItem>
                <SelectItem value="compact">Rapat</SelectItem>
              </SelectContent>
            </Select>
          )}
          {rightActions}
        </div>
      </div>

      {/* Filter chips row */}
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-white/40">
            Filter
          </span>
          {filters.map((filter) => {
            const isActive = filter.value !== "all"
            return (
              <Select
                key={filter.id}
                value={filter.value}
                onValueChange={filter.onChange}
              >
                <SelectTrigger
                  className={`h-8 rounded-full border px-3 text-xs transition-colors ${
                    isActive
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                      : "border-white/10 bg-white/5 text-white/65"
                  }`}
                >
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          })}
          {hasActiveFilters && onResetFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-8 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 text-xs text-rose-300 hover:bg-rose-500/15 hover:text-rose-200"
            >
              <X className="mr-1 h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

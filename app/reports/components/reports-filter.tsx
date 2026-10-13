"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarRange, RotateCcw } from "lucide-react"
import { STATUS_LABELS } from "@/lib/constants"
import { detectPreset, PERIOD_PRESETS, PeriodPreset } from "@/lib/report-view"
import { Message, ReportFilters } from "../types"
import { DateInput } from "./date-input"
import { ExportActions } from "./export-actions"

interface ReportsFilterProps {
  filters: ReportFilters
  isFiltered: boolean
  departments: string[]
  users: { id: string; name: string; department: string }[]
  canExport: boolean
  /** Regular users only see their own records — hide the org-wide pickers. */
  canFilterOthers: boolean
  isExporting: boolean
  exportMessage: Message | null
  onFilterChange: (field: keyof ReportFilters, value: string) => void
  onPresetChange: (preset: Exclude<PeriodPreset, "custom">) => void
  onExport: (format: 'csv' | 'pdf') => void
  onPreview: () => void
  onResetFilters: () => void
}

const ALL = "all"

const selectTriggerClass =
  "h-10 w-full cursor-pointer border-white/20 bg-white/10 text-white backdrop-blur-md focus:border-emerald-400/50 focus:ring-emerald-400/50"
const selectItemClass = "text-white hover:bg-white/10 focus:bg-white/10"

const presetButtonClass = (isActive: boolean) =>
  `h-8 rounded-full border px-3 text-xs hover:scale-100 active:scale-100 ${
    isActive
      ? "border-emerald-400/60 bg-emerald-500/25 text-emerald-100 hover:bg-emerald-500/30"
      : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
  }`

export const ReportsFilter = ({
  filters,
  isFiltered,
  departments,
  users,
  canExport,
  canFilterOthers,
  isExporting,
  exportMessage,
  onFilterChange,
  onPresetChange,
  onExport,
  onPreview,
  onResetFilters
}: ReportsFilterProps) => {
  const activePreset = detectPreset(filters, new Date())
  // "Custom" can be open while the dates still happen to match a preset —
  // the user clicked it and hasn't picked anything yet.
  const [isCustomOpen, setIsCustomOpen] = useState(false)
  const showCustomRange = isCustomOpen || activePreset === "custom"

  const handlePreset = (preset: Exclude<PeriodPreset, "custom">) => {
    setIsCustomOpen(false)
    onPresetChange(preset)
  }

  const handleReset = () => {
    setIsCustomOpen(false)
    onResetFilters()
  }

  return (
    <Card variant="glass">
      <CardContent className="space-y-5 pt-6">
        {/* Period */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-semibold text-white/90">
            <CalendarRange className="h-4 w-4 text-emerald-300" />
            Periode
          </Label>
          <div role="group" aria-label="Pilih periode" className="flex flex-wrap gap-2">
            {PERIOD_PRESETS.map(({ value, label }) => {
              const isActive = !showCustomRange && activePreset === value
              return (
                <Button
                  key={value}
                  variant="outline"
                  size="sm"
                  aria-pressed={isActive}
                  onClick={() => handlePreset(value)}
                  className={presetButtonClass(isActive)}
                >
                  {label}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              aria-pressed={showCustomRange}
              onClick={() => setIsCustomOpen(true)}
              className={presetButtonClass(showCustomRange)}
            >
              Custom
            </Button>
          </div>

          {showCustomRange && (
            <div className="grid max-w-md grid-cols-2 gap-3">
              <DateInput
                id="startDate"
                label="Dari"
                value={filters.startDate}
                max={filters.endDate || undefined}
                onChange={(value) => onFilterChange('startDate', value)}
              />
              <DateInput
                id="endDate"
                label="Sampai"
                value={filters.endDate}
                min={filters.startDate || undefined}
                onChange={(value) => onFilterChange('endDate', value)}
              />
            </div>
          )}
        </div>

        {/* Status / employee / department */}
        <div className={`grid grid-cols-1 gap-3 ${canFilterOthers ? "md:grid-cols-3" : "md:max-w-xs"}`}>
          <div className="space-y-1.5">
            <Label htmlFor="status" className="text-xs font-medium text-white/70">Status</Label>
            <Select
              value={filters.status || ALL}
              onValueChange={(value) => onFilterChange('status', value === ALL ? "" : value)}
            >
              <SelectTrigger id="status" className={selectTriggerClass}>
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} className={selectItemClass}>Semua Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value} className={selectItemClass}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canFilterOthers && (
            <div className="space-y-1.5">
              <Label htmlFor="userId" className="text-xs font-medium text-white/70">Karyawan</Label>
              <Select
                value={filters.userId || ALL}
                onValueChange={(value) => onFilterChange('userId', value === ALL ? "" : value)}
              >
                <SelectTrigger id="userId" className={selectTriggerClass}>
                  <SelectValue placeholder="Semua Karyawan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL} className={selectItemClass}>Semua Karyawan</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id} className={selectItemClass}>
                      {user.name}{user.department ? ` (${user.department})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {canFilterOthers && (
            <div className="space-y-1.5">
              <Label htmlFor="department" className="text-xs font-medium text-white/70">Departemen</Label>
              <Select
                value={filters.department || ALL}
                onValueChange={(value) => onFilterChange('department', value === ALL ? "" : value)}
                // The API ignores department once an employee is picked.
                disabled={!!filters.userId}
              >
                <SelectTrigger id="department" className={selectTriggerClass}>
                  <SelectValue placeholder="Semua Departemen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL} className={selectItemClass}>Semua Departemen</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept} className={selectItemClass}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {(isFiltered || canExport) && (
          <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-9 px-2 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset filter
                </Button>
              )}
            </div>
            {canExport && (
              <ExportActions
                isExporting={isExporting}
                message={exportMessage}
                onExport={onExport}
                onPreview={onPreview}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

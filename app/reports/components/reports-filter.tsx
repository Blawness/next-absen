"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Search, Download, FileText, Eye, Loader2 } from "lucide-react"
import { ReportFilters } from "../types"
import { format } from "date-fns"

interface ReportsFilterProps {
  filters: ReportFilters
  departments: string[]
  users: { id: string; name: string; department: string }[]
  canExport: boolean
  isExporting: boolean
  onFilterChange: (field: keyof ReportFilters, value: string) => void
  onLoadReports: () => void
  onExport: (format: 'csv' | 'pdf') => void
  onPreview: () => void
  onResetFilters: () => void
}

export const ReportsFilter = ({
  filters,
  departments,
  users,
  canExport,
  isExporting,
  onFilterChange,
  onLoadReports,
  onExport,
  onPreview,
  onResetFilters
}: ReportsFilterProps) => {
  const handleQuickDateRange = (days: number) => {
    const today = new Date()
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() - days)

    onFilterChange('startDate', format(targetDate, 'yyyy-MM-dd'))
    onFilterChange('endDate', format(today, 'yyyy-MM-dd'))
  }

  const handleCurrentMonth = () => {
    const today = new Date()
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    onFilterChange('startDate', format(currentMonthStart, 'yyyy-MM-dd'))
    onFilterChange('endDate', format(today, 'yyyy-MM-dd'))
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Filter className="h-5 w-5" />
          Filter Laporan
        </CardTitle>
        <CardDescription className="text-white/70">
          Sesuaikan filter untuk mendapatkan data yang diinginkan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <Label className="text-sm font-semibold text-white/90">Periode Tanggal</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-sm font-medium text-white/80">
                Tanggal Mulai
              </Label>
              <div className="relative">
                <input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => onFilterChange('startDate', e.target.value)}
                  className="flex h-11 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white cursor-pointer"
                  onClick={(e) => {
                    // Ensure the date picker opens when clicking anywhere on the input
                    if (e.currentTarget.showPicker) {
                      e.currentTarget.showPicker();
                    } else {
                      // Fallback for browsers that don't support showPicker
                      e.currentTarget.focus();
                    }
                  }}
                  onFocus={(e) => {
                    // Additional fallback to ensure picker opens on focus
                    if (!e.currentTarget.showPicker) {
                      // For older browsers, we can try to simulate a click on the calendar icon
                      setTimeout(() => {
                        const calendarIcon = e.currentTarget.parentElement?.querySelector('::-webkit-calendar-picker-indicator');
                        if (calendarIcon) {
                          (calendarIcon as HTMLElement).click();
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-sm font-medium text-white/80">
                Tanggal Akhir
              </Label>
              <div className="relative">
                <input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => onFilterChange('endDate', e.target.value)}
                  className="flex h-11 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white cursor-pointer"
                  onClick={(e) => {
                    // Ensure the date picker opens when clicking anywhere on the input
                    if (e.currentTarget.showPicker) {
                      e.currentTarget.showPicker();
                    } else {
                      // Fallback for browsers that don't support showPicker
                      e.currentTarget.focus();
                    }
                  }}
                  onFocus={(e) => {
                    // Additional fallback to ensure picker opens on focus
                    if (!e.currentTarget.showPicker) {
                      // For older browsers, we can try to simulate a click on the calendar icon
                      setTimeout(() => {
                        const calendarIcon = e.currentTarget.parentElement?.querySelector('::-webkit-calendar-picker-indicator');
                        if (calendarIcon) {
                          (calendarIcon as HTMLElement).click();
                        }
                      }, 10);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Date Range Buttons */}
          <div className="space-y-2">
            <span className="text-xs text-white/60 block">Pilih periode:</span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateRange(7)}
                className="h-8 px-3 text-xs border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 hover:text-emerald-100 transition-all duration-200 cursor-pointer"
              >
                7 Hari Terakhir
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateRange(30)}
                className="h-8 px-3 text-xs border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 hover:text-emerald-100 transition-all duration-200 cursor-pointer"
              >
                30 Hari Terakhir
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCurrentMonth}
                className="h-8 px-3 text-xs border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 hover:text-emerald-100 transition-all duration-200 cursor-pointer"
              >
                Bulan Ini
              </Button>
            </div>
          </div>
        </div>

        {/* Additional Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium text-white/80">
              Status
            </Label>
            <Select value={filters.status || "all"} onValueChange={(value) => onFilterChange('status', value === "all" ? "" : value)}>
              <SelectTrigger
                data-select-id="status"
                className="w-full bg-white/10 border-white/20 text-white backdrop-blur-md focus:ring-emerald-400/50 focus:border-emerald-400/50 h-11 cursor-pointer"
              >
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10 focus:bg-white/10">Semua Status</SelectItem>
                <SelectItem value="present" className="text-white hover:bg-white/10 focus:bg-white/10">Hadir</SelectItem>
                <SelectItem value="late" className="text-white hover:bg-white/10 focus:bg-white/10">Terlambat</SelectItem>
                <SelectItem value="absent" className="text-white hover:bg-white/10 focus:bg-white/10">Tidak Hadir</SelectItem>
                <SelectItem value="half_day" className="text-white hover:bg-white/10 focus:bg-white/10">Setengah Hari</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="userId" className="text-sm font-medium text-white/80">
              Pengguna
            </Label>
            <Select value={filters.userId || "all"} onValueChange={(value) => onFilterChange('userId', value === "all" ? "" : value)}>
              <SelectTrigger
                data-select-id="userId"
                className="w-full bg-white/10 border-white/20 text-white backdrop-blur-md focus:ring-emerald-400/50 focus:border-emerald-400/50 h-11 cursor-pointer"
              >
                <SelectValue placeholder="Semua Pengguna" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10 focus:bg-white/10">Semua Pengguna</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id} className="text-white hover:bg-white/10 focus:bg-white/10">
                    {user.name} ({user.department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department" className="text-sm font-medium text-white/80">
              Departemen
            </Label>
            <Select value={filters.department || "all"} onValueChange={(value) => onFilterChange('department', value === "all" ? "" : value)}>
              <SelectTrigger
                data-select-id="department"
                className="w-full bg-white/10 border-white/20 text-white backdrop-blur-md focus:ring-emerald-400/50 focus:border-emerald-400/50 h-11 cursor-pointer"
              >
                <SelectValue placeholder="Semua Departemen" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10 focus:bg-white/10">Semua Departemen</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept} className="text-white hover:bg-white/10 focus:bg-white/10">
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
          <div className="flex gap-3">
            <Button
              onClick={onLoadReports}
              variant="glass"
              className="bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-100 hover:text-white"
            >
              <Search className="h-4 w-4 mr-2" />
              Terapkan Filter
            </Button>
            <Button
              variant="outline"
              onClick={onResetFilters}
              className="border-white/20 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white"
            >
              Reset Filter
            </Button>
          </div>

          {canExport && (
            <div className="flex gap-3 sm:ml-auto">
              <Button
                variant="outline"
                onClick={() => onExport('csv')}
                disabled={isExporting}
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={onPreview}
                disabled={isExporting}
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview PDF
              </Button>
              <Button
                variant="glass"
                onClick={() => onExport('pdf')}
                disabled={isExporting}
                className="bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-100 hover:text-white"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Export PDF
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

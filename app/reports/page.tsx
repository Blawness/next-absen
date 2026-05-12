"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { ReportsSkeleton } from "@/components/ui/data-table/data-table-skeleton"
import { ReportsFilter } from "./components/reports-filter"
import { StatCards } from "./components/stat-cards"
import { ReportsTable } from "./components/reports-table"
import { BreakdownCards } from "./components/breakdown-cards"
import { useReports } from "./hooks/use-reports"
import { NAVIGATION } from "@/lib/constants"


export default function ReportsPage() {

  // Use the custom hook for all reports logic
  const {
    records,
    summary,
    isLoading,
    isExporting,
    message,
    filters,
    departments,
    users,
    canExport,
    loadReports,
    handleFilterChange,
    handleExport,
    handlePreview,
    setFilters,
    initialFilters
  } = useReports()

  if (isLoading) {
    return <ReportsSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div
        className="space-y-2 animate-fade-down"
      >
        <h1 className="text-4xl font-bold glass-title text-center lg:text-left">
          {NAVIGATION.REPORTS}
        </h1>
        <p className="text-white/80 text-lg">
          Laporan absensi dengan analisis dan statistik komprehensif
        </p>
      </div>

      {/* Filter Component */}
      <div
        className="animate-slide-left anim-delay-100"
      >
        <ReportsFilter
          filters={filters}
          departments={departments}
          users={users}
          canExport={canExport}
          isExporting={isExporting}
          onFilterChange={handleFilterChange}
          onLoadReports={loadReports}
          onExport={handleExport}
          onPreview={handlePreview}
          onResetFilters={() => setFilters(initialFilters)}
        />
      </div>

      {/* Summary Statistics */}
      {summary && (
        <div
          className="animate-fade-up anim-delay-200"
        >
          <StatCards summary={summary} />
        </div>
      )}

      {/* Breakdown Cards */}
      {summary && (
        <div
          className="animate-fade-up anim-delay-300"
        >
          <BreakdownCards summary={summary} />
        </div>
      )}

      {/* Message Alert */}
      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Data Table */}
      <div
        className="animate-fade-up anim-delay-400"
      >
        <ReportsTable
          records={records}
          summary={summary}
        />
      </div>
    </div>
  )
}
"use client"

import { useRef } from "react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ReportsSkeleton } from "@/components/ui/data-table/data-table-skeleton"
import { ReportsFilter } from "./components/reports-filter"
import { StatCards } from "./components/stat-cards"
import { ReportsTable } from "./components/reports-table"
import { BreakdownCards } from "./components/breakdown-cards"
import { useReports } from "./hooks/use-reports"
import { NAVIGATION } from "@/lib/constants"

/** "1 – 13 Okt 2026", or "28 Sep – 13 Okt 2026" across months. */
const formatPeriod = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return "Semua periode"
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const startPattern = start.getFullYear() !== end.getFullYear()
    ? "d MMM yyyy"
    : start.getMonth() !== end.getMonth() ? "d MMM" : "d"
  return `${format(start, startPattern, { locale: idLocale })} – ${format(end, "d MMM yyyy", { locale: idLocale })}`
}

export default function ReportsPage() {
  const {
    records,
    summary,
    isInitialLoading,
    isRefreshing,
    isExporting,
    loadError,
    exportMessage,
    filters,
    isFiltered,
    departments,
    users,
    canExport,
    canFilterOthers,
    page,
    retry,
    setPage,
    handleFilterChange,
    handlePresetChange,
    handleExport,
    handlePreview,
    resetFilters,
  } = useReports()

  const tableRef = useRef<HTMLDivElement>(null)

  if (isInitialLoading) {
    return <ReportsSkeleton />
  }

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="space-y-6">
      {/* Centred below lg so the title clears the mobile menu button, like every other page. */}
      <div className="flex flex-col items-center gap-1 animate-fade-down lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1 text-center lg:text-left">
          <h1 className="text-3xl font-bold glass-title sm:text-4xl">{NAVIGATION.REPORTS}</h1>
          <p className="text-white/70">
            {canFilterOthers ? "Rekap kehadiran karyawan" : "Riwayat kehadiran kamu"}
            {" · "}
            <span className="font-medium text-white/90">{formatPeriod(filters.startDate, filters.endDate)}</span>
          </p>
        </div>
        <p aria-live="polite" className="flex h-5 items-center gap-1.5 text-xs text-white/60">
          {isRefreshing && <><Loader2 className="h-3.5 w-3.5 animate-spin" />Memuat data…</>}
        </p>
      </div>

      <ReportsFilter
        filters={filters}
        isFiltered={isFiltered}
        departments={departments}
        users={users}
        canExport={canExport}
        canFilterOthers={canFilterOthers}
        isExporting={isExporting}
        exportMessage={exportMessage}
        onFilterChange={handleFilterChange}
        onPresetChange={handlePresetChange}
        onExport={handleExport}
        onPreview={handlePreview}
        onResetFilters={resetFilters}
      />

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={retry} className="h-8 border-white/20 bg-white/5 text-white">
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Old results stay visible but dimmed while a filter change refetches. */}
      <div
        aria-busy={isRefreshing}
        className={`space-y-6 transition-opacity duration-200 ${isRefreshing ? "pointer-events-none opacity-60" : ""}`}
      >
        {summary && <StatCards summary={summary} />}
        {summary && <BreakdownCards summary={summary} showPerEmployee={canFilterOthers} />}
        <div ref={tableRef} className="scroll-mt-4">
          <ReportsTable records={records} page={page} onPageChange={handlePageChange} />
        </div>
      </div>
    </div>
  )
}

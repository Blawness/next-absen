"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { ReportsSkeleton } from "@/components/ui/data-table/data-table-skeleton"
import { motion } from "framer-motion"
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
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold glass-title text-center lg:text-left">
          {NAVIGATION.REPORTS}
        </h1>
        <p className="text-white/80 text-lg">
          Laporan absensi dengan analisis dan statistik komprehensif
        </p>
      </motion.div>

      {/* Filter Component */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
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
      </motion.div>

      {/* Summary Statistics */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <StatCards summary={summary} />
        </motion.div>
      )}

      {/* Breakdown Cards */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <BreakdownCards summary={summary} />
        </motion.div>
      )}

      {/* Message Alert */}
      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <ReportsTable
          records={records}
          summary={summary}
        />
      </motion.div>
    </div>
  )
}
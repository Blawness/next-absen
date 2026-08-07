"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DataTablePaginationProps {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  /** Optional: label for the entity being paginated (e.g. "user", "record") */
  entityLabel?: string
}

/**
 * Reusable footer pagination — same look across every table.
 * Hides itself when there's only 1 page or no data.
 */
export function DataTablePagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  entityLabel = "item",
}: DataTablePaginationProps) {
  if (totalPages <= 1) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="flex flex-col gap-2 border-t border-white/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-white/60">
        <span className="font-medium text-white/80">{from}–{to}</span>{" "}
        dari <span className="font-medium text-white/80">{total}</span>{" "}
        {entityLabel}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Halaman sebelumnya</span>
        </Button>
        <div className="px-2 text-xs tabular-nums text-white/55">
          {page} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Halaman berikutnya</span>
        </Button>
      </div>
    </div>
  )
}

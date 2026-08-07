"use client"

import { Trash2, UserCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface DataTableBulkActionsProps {
  selectedCount: number
  onClearSelection: () => void
  onActivate?: () => void
  onDeactivate?: () => void
  onDelete?: () => void
  entityLabel?: string
}

/**
 * Floating bulk-action bar — appears when 1+ rows are selected.
 * Provides uniform visuals across all tables.
 */
export function DataTableBulkActions({
  selectedCount,
  onClearSelection,
  onActivate,
  onDeactivate,
  onDelete,
  entityLabel = "item",
}: DataTableBulkActionsProps) {
  if (selectedCount === 0) return null

  return (
    <div className="animate-fade-up">
      <Card
        variant="glass"
        className="border-blue-500/30 bg-blue-500/5"
      >
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300">
              {selectedCount}
            </div>
            <p className="text-sm font-medium text-white/90">
              {selectedCount} {entityLabel} dipilih
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearSelection}
              className="h-6 w-6 text-white/45 hover:bg-white/10 hover:text-white"
              aria-label="Bersihkan pilihan"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onActivate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onActivate}
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
              >
                <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                Aktifkan
              </Button>
            )}
            {onDeactivate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDeactivate}
                className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200"
              >
                <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                Nonaktifkan
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Hapus
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

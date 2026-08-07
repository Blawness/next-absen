"use client"

import { Inbox } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"

interface DataTableEmptyStateProps {
  icon?: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
}

/**
 * Standard no-data state for any data table.
 * Designed to be rendered inside <TableEmpty colSpan={...} />.
 */
export function DataTableEmptyState({
  icon,
  title = "Tidak ada data",
  description = "Belum ada record untuk ditampilkan.",
  action,
}: DataTableEmptyStateProps) {
  return (
    <EmptyState
      icon={icon ?? <Inbox className="h-7 w-7" />}
      title={title}
      description={description}
      action={action}
    />
  )
}

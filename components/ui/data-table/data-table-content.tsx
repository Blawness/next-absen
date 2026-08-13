"use client"

import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Edit,
  Activity,
  KeyRound,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Column, SortDirection, User } from "@/types/data-table-types"
import { DataTableEmptyState } from "./data-table-empty-state"

interface DataTableContentProps {
  columns: Column[]
  filteredAndSortedData: User[]
  selectedRows: Set<string>
  sortColumn: string | null
  sortDirection: SortDirection
  density: "comfortable" | "compact"
  onSort: (columnId: string) => void
  onRowSelect: (userId: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  onEdit?: (user: User) => void
  onDelete?: (user: User) => void
  onToggleStatus?: (user: User) => void
  onPasswordReset?: (user: User) => void
  onViewActivity?: (user: User) => void
  /** Override default empty state title/description */
  emptyTitle?: string
  emptyDescription?: string
}

export function DataTableContent({
  columns,
  filteredAndSortedData,
  selectedRows,
  sortColumn,
  sortDirection,
  density,
  onSort,
  onRowSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onToggleStatus,
  onPasswordReset,
  onViewActivity,
  emptyTitle,
  emptyDescription,
}: DataTableContentProps) {
  const allSelected =
    filteredAndSortedData.length > 0 &&
    filteredAndSortedData.every((user) => selectedRows.has(user.id))
  const someSelected = filteredAndSortedData.some((user) => selectedRows.has(user.id))

  const alignClass: Record<NonNullable<Column["align"]>, string> = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }

  return (
    <Card variant="glass" className="overflow-hidden">
      <Table size={density === "compact" ? "sm" : "md"}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => {
              const isActionCol = column.id === "actions"
              return (
                <TableHead
                  key={column.id}
                  className={cn(
                    column.align && alignClass[column.align],
                    !isActionCol && "first:pl-4 last:pr-4"
                  )}
                  style={{ width: column.width }}
                >
                  {column.id === "select" ? (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected
                      }}
                      onChange={(e) => onSelectAll(e.target.checked)}
                      className="h-3.5 w-3.5 cursor-pointer accent-emerald-500"
                      aria-label="Pilih semua baris"
                    />
                  ) : (
                    <div
                      className={cn(
                        "flex items-center gap-1.5",
                        column.align === "right" && "justify-end"
                      )}
                    >
                      <span>{column.label}</span>
                      {column.sortable && (
                        <button
                          type="button"
                          className="text-white/30 transition-colors hover:text-white/70"
                          onClick={() => onSort(column.id)}
                          aria-label={`Sort by ${column.label}`}
                        >
                          {sortColumn === column.id ? (
                            sortDirection === "asc" ? (
                              <ChevronUp className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <ChevronDown className="h-3 w-3 text-emerald-400" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAndSortedData.length === 0 ? (
            <TableEmpty colSpan={columns.length}>
              <DataTableEmptyState
                title={emptyTitle}
                description={emptyDescription}
              />
            </TableEmpty>
          ) : (
            filteredAndSortedData.map((user) => (
              <TableRow
                key={user.id}
                data-state={selectedRows.has(user.id) ? "selected" : undefined}
                className={cn(
                  selectedRows.has(user.id) && "bg-emerald-500/10"
                )}
              >
                {columns.map((column) => {
                  const isActionCol = column.id === "actions"
                  return (
                    <TableCell
                      key={column.id}
                      className={cn(
                        column.align && alignClass[column.align],
                        !isActionCol && "first:pl-4 last:pr-4"
                      )}
                      style={{ width: column.width }}
                    >
                      {column.id === "select" ? (
                        <input
                          type="checkbox"
                          checked={selectedRows.has(user.id)}
                          onChange={(e) => onRowSelect(user.id, e.target.checked)}
                          className="h-3.5 w-3.5 cursor-pointer accent-emerald-500"
                          aria-label={`Pilih ${user.name}`}
                        />
                      ) : isActionCol ? (
                        <div className="flex items-center justify-end gap-1">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(user)}
                              className="h-7 w-7 text-white/55 hover:bg-emerald-500/15 hover:text-emerald-400"
                              aria-label="Edit"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onViewActivity && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onViewActivity(user)}
                              className="h-7 w-7 text-white/55 hover:bg-sky-500/15 hover:text-sky-400"
                              aria-label="Lihat aktivitas"
                            >
                              <Activity className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onPasswordReset && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onPasswordReset(user)}
                              className="h-7 w-7 text-white/55 hover:bg-amber-500/15 hover:text-amber-400"
                              aria-label="Reset password"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onToggleStatus && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onToggleStatus(user)}
                              className={cn(
                                "h-7 w-7 text-white/55",
                                user.isActive
                                  ? "hover:bg-orange-500/15 hover:text-orange-400"
                                  : "hover:bg-emerald-500/15 hover:text-emerald-400"
                              )}
                              aria-label={
                                user.isActive
                                  ? "Nonaktifkan pengguna"
                                  : "Aktifkan pengguna"
                              }
                            >
                              {user.isActive ? (
                                <UserX className="h-3.5 w-3.5" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(user)}
                              className="h-7 w-7 text-white/55 hover:bg-red-500/15 hover:text-red-400"
                              aria-label="Hapus pengguna"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ) : column.cell ? (
                        column.cell(user)
                      ) : (
                        <span
                          className={cn(
                            "text-sm",
                            user[column.accessorKey] === null || user[column.accessorKey] === undefined
                              ? "text-white/30"
                              : "text-white/80"
                          )}
                        >
                          {(user[column.accessorKey] as string) || "—"}
                        </span>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}

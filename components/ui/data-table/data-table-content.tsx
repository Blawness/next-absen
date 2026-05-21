"use client"

import { ChevronDown, ChevronUp, ChevronsUpDown, Edit, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Column, SortDirection, User } from "@/types/data-table-types"

interface DataTableContentProps {
  columns: Column[]
  visibleColumns: Set<string>
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
}

export function DataTableContent({
  columns,
  visibleColumns,
  filteredAndSortedData,
  selectedRows,
  sortColumn,
  sortDirection,
  density,
  onSort,
  onRowSelect,
  onSelectAll,
  onEdit,
  onDelete: _onDelete,
  onToggleStatus: _onToggleStatus,
  onPasswordReset: _onPasswordReset,
  onViewActivity,
}: DataTableContentProps) {
  const visibleColumnsArray = columns.filter(col => visibleColumns.has(col.id))

  const allSelected = filteredAndSortedData.length > 0 && filteredAndSortedData.every(user => selectedRows.has(user.id))
  const someSelected = filteredAndSortedData.some(user => selectedRows.has(user.id))

  return (
    <Card variant="glass" className="rounded-2xl overflow-hidden">
      <div className="relative overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="border-white/8 hover:bg-transparent bg-white/5 sticky top-0 z-20 backdrop-blur-md">
              {visibleColumnsArray.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    "text-white/70 font-medium text-xs uppercase tracking-wide border-white/8",
                    column.pinned === "left" && "md:sticky md:left-0 md:z-30 md:bg-gray-900/90 md:backdrop-blur-sm md:border-r md:border-white/8",
                    column.pinned === "right" && "md:sticky md:right-0 md:z-30 md:bg-gray-900/90 md:backdrop-blur-sm md:border-l md:border-white/8",
                    !column.sortable && "cursor-default"
                  )}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-1.5">
                    {column.id === "select" ? (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected && !allSelected
                        }}
                        onChange={(e) => onSelectAll(e.target.checked)}
                        className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                      />
                    ) : (
                      column.label
                    )}
                    {column.sortable && column.id !== "select" && (
                      <button
                        className="text-white/30 hover:text-white/70 transition-colors"
                        onClick={() => onSort(column.id)}
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
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnsArray.length} className="h-64">
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-5 border border-emerald-500/20">
                      <svg className="h-9 w-9 text-emerald-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-white/80 mb-1">Tidak ada pengguna ditemukan</h3>
                    <p className="text-sm text-white/45 max-w-xs">
                      Tidak ada data yang sesuai dengan filter yang dipilih.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedData.map((user, index) => (
                <TableRow
                  key={user.id}
                  className={cn(
                    "border-white/6 transition-colors",
                    selectedRows.has(user.id)
                      ? "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15"
                      : index % 2 === 0
                        ? "bg-white/3 hover:bg-white/7"
                        : "bg-transparent hover:bg-white/5"
                  )}
                >
                  {visibleColumnsArray.map((column) => (
                    <TableCell
                      key={column.id}
                      className={cn(
                        "text-white/80 border-white/6",
                        column.pinned === "left" && "md:sticky md:left-0 md:z-10 md:bg-inherit md:border-r md:border-white/6",
                        column.pinned === "right" && "md:sticky md:right-0 md:z-10 md:bg-inherit md:border-l md:border-white/6",
                        density === "compact" ? "py-2" : "py-3.5"
                      )}
                      style={{ width: column.width }}
                    >
                      {column.id === "select" ? (
                        <input
                          type="checkbox"
                          checked={selectedRows.has(user.id)}
                          onChange={(e) => onRowSelect(user.id, e.target.checked)}
                          className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                        />
                      ) : column.id === "actions" ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit?.(user)}
                            className="h-7 w-7 p-0 hover:bg-emerald-500/15 hover:text-emerald-400 text-white/50 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewActivity?.(user)}
                            className="h-7 w-7 p-0 hover:bg-sky-500/15 hover:text-sky-400 text-white/50 transition-colors"
                            title="Lihat Aktivitas"
                          >
                            <Activity className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : column.cell ? (
                        column.cell(user)
                      ) : (
                        <span className={cn(
                          "text-sm",
                          user[column.accessorKey] === null ? "text-white/30" : "text-white/75"
                        )}>
                          {user[column.accessorKey] as string || "—"}
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

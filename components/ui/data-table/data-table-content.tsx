"use client"

import { ChevronDown, ChevronUp, ChevronsUpDown, ArrowUpDown, Edit, X, Trash2, UserCheck, Key, Activity } from "lucide-react"
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
  onDelete,
  onToggleStatus,
  onPasswordReset,
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
            <TableRow className="border-gray-600/40 hover:bg-transparent bg-gray-900/60 sticky top-0 z-20 backdrop-blur-md">
              {visibleColumnsArray.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    "text-white/95 font-semibold border-gray-600/30",
                    column.pinned === "left" && "md:sticky md:left-0 md:z-30 md:bg-gray-900/85 md:backdrop-blur-sm md:border-r md:border-gray-500/50",
                    column.pinned === "right" && "md:sticky md:right-0 md:z-30 md:bg-gray-900/85 md:backdrop-blur-sm md:border-l md:border-gray-500/50",
                    !column.sortable && "cursor-default"
                  )}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    {column.id === "select" ? (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected && !allSelected
                        }}
                        onChange={(e) => onSelectAll(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    ) : (
                      column.label
                    )}
                    {column.sortable && column.id !== "select" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-white/15 text-white/70 hover:text-white"
                        onClick={() => onSort(column.id)}
                      >
                        {sortColumn === column.id ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="h-3 w-3 text-white" />
                          ) : sortDirection === "desc" ? (
                            <ChevronDown className="h-3 w-3 text-white" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 text-white/80" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-white/50" />
                        )}
                      </Button>
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
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full flex items-center justify-center mb-6 border border-gray-600/40">
                      <svg className="h-10 w-10 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white/98 mb-2">Tidak ada pengguna ditemukan</h3>
                    <p className="text-white/75 mb-6 max-w-md">
                      Belum ada pengguna yang sesuai dengan filter yang dipilih. Coba ubah filter atau tambah pengguna baru.
                    </p>
                    <Button variant="outline" className="bg-gray-800/40 border-gray-600/40 text-white hover:bg-gray-700/50">
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      Tambah Pengguna
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedData.map((user, index) => (
                <TableRow
                  key={user.id}
                  className={cn(
                    "border-white/15 hover:bg-gray-800/50 transition-colors backdrop-blur-sm",
                    index % 2 === 0 ? "bg-gray-800/40" : "bg-gray-800/20",
                    selectedRows.has(user.id) && "bg-blue-500/25 border-blue-500/40"
                  )}
                >
                  {visibleColumnsArray.map((column) => (
                    <TableCell
                      key={column.id}
                      className={cn(
                        "text-white/98 border-gray-700/30 py-4",
                        column.pinned === "left" && "md:sticky md:left-0 md:z-20 md:bg-inherit md:backdrop-blur-sm md:border-r md:border-gray-600/40",
                        column.pinned === "right" && "md:sticky md:right-0 md:z-20 md:bg-inherit md:backdrop-blur-sm md:border-l md:border-gray-600/40",
                        density === "compact" && "py-2"
                      )}
                      style={{ width: column.width }}
                    >
                      {column.id === "select" ? (
                        <input
                          type="checkbox"
                          checked={selectedRows.has(user.id)}
                          onChange={(e) => onRowSelect(user.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      ) : column.id === "actions" ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit?.(user)}
                            className="h-8 w-8 p-0 hover:bg-white/10 md:h-8 md:w-8"
                            title="Edit"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleStatus?.(user)}
                            className="h-8 w-8 p-0 hover:bg-white/10 md:h-8 md:w-8"
                            title={user.isActive ? "Nonaktifkan" : "Aktifkan"}
                          >
                            {user.isActive ? (
                              <UserCheck className="h-3 w-3 text-green-400" />
                            ) : (
                              <X className="h-3 w-3 text-red-400" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete?.(user)}
                            className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400 md:h-8 md:w-8"
                            title="Hapus"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onPasswordReset?.(user)}
                            className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-400 md:h-8 md:w-8"
                            title="Reset Password"
                          >
                            <Key className="h-3 w-3" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewActivity?.(user)}
                            className="h-8 w-8 p-0 hover:bg-purple-500/20 hover:text-purple-400 md:h-8 md:w-8"
                            title="Lihat Aktivitas"
                          >
                            <Activity className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : column.cell ? (
                        column.cell(user)
                      ) : (
                        <span className={cn(
                          "text-white/80",
                          user[column.accessorKey] === null && "text-white/40"
                        )}>
                          {user[column.accessorKey] as string || "-"}
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





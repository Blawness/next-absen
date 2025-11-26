export interface User {
  id: string
  name: string
  email: string
  department: string | null
  position: string | null
  role: "admin" | "manager" | "user"
  isActive: boolean
  lastLogin: Date | null
  createdAt: Date
  avatarUrl?: string | null
}

export interface Column<T = User> {
  id: string
  label: string
  accessorKey: keyof T
  sortable?: boolean
  pinned?: "left" | "right"
  width?: number
  cell?: (item: T) => React.ReactNode
}

export interface DataTableProps<T = User> {
  data: T[]
  loading?: boolean
  statusFilter?: 'all' | 'active' | 'inactive'
  onFilterChange?: (filters: { status: 'all' | 'active' | 'inactive' }) => void
  onEdit?: (user: T) => void
  onDelete?: (user: T) => void
  onToggleStatus?: (user: T) => void
  onPasswordReset?: (user: T) => void
  onViewActivity?: (user: T) => void
  onBulkDelete?: (userIds: string[]) => void
  onBulkToggleStatus?: (userIds: string[]) => void
}

export type SortDirection = "asc" | "desc" | null
export type Density = "comfortable" | "compact"






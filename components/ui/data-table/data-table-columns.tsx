"use client"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Column, User } from "@/types/data-table-types"

// Column definitions
export const columns: Column[] = [
  {
    id: "select",
    label: "",
    accessorKey: "id",
    pinned: "left",
    width: 50,
    cell: () => null,
  },
  {
    id: "name",
    label: "Nama",
    accessorKey: "name",
    sortable: true,
    pinned: "left",
    width: 200,
    cell: (user: User) => (
      <div className="flex items-center gap-3 py-1">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-white text-sm">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white truncate">{user.name}</p>
          <p className="text-sm text-white/60 truncate">{user.email}</p>
        </div>
      </div>
    ),
  },
  {
    id: "department",
    label: "Departemen",
    accessorKey: "department",
    sortable: true,
    width: 140,
  },
  {
    id: "position",
    label: "Posisi",
    accessorKey: "position",
    sortable: true,
    width: 160,
  },
  {
    id: "role",
    label: "Role",
    accessorKey: "role",
    sortable: true,
    width: 100,
    cell: (user: User) => (
      <Badge
        variant={user.role === "admin" ? "default" : user.role === "manager" ? "secondary" : "outline"}
        className="capitalize"
      >
        {user.role === "admin" ? "Admin" : user.role === "manager" ? "Manager" : "Pengguna"}
      </Badge>
    ),
  },
  {
    id: "status",
    label: "Status",
    accessorKey: "isActive",
    sortable: true,
    width: 80,
    cell: (user: User) => (
      <Badge variant={user.isActive ? "default" : "destructive"}>
        {user.isActive ? "Aktif" : "Nonaktif"}
      </Badge>
    ),
  },
  {
    id: "lastLogin",
    label: "Terakhir Login",
    accessorKey: "lastLogin",
    sortable: true,
    width: 120,
    cell: (user: User) => {
      if (!user.lastLogin) return <span className="text-white/40">Belum pernah login</span>

      const now = new Date()
      const diffMs = now.getTime() - user.lastLogin.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      let relativeTime = ""
      if (diffDays === 0) {
        relativeTime = "Hari ini"
      } else if (diffDays === 1) {
        relativeTime = "Kemarin"
      } else if (diffDays < 7) {
        relativeTime = `${diffDays} hari lalu`
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7)
        relativeTime = `${weeks} minggu lalu`
      } else {
        const months = Math.floor(diffDays / 30)
        relativeTime = `${months} bulan lalu`
      }

      return (
        <span className="text-white/80 cursor-help" title={user.lastLogin.toLocaleString("id-ID")}>
          {relativeTime}
        </span>
      )
    },
  },
  {
    id: "actions",
    label: "Aksi",
    accessorKey: "id",
    pinned: "right",
    width: 130,
    cell: () => null,
  },
]

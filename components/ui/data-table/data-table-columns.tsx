"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Column, User } from "@/types/data-table-types"
import { getRoleConfig } from "@/lib/role-config"

export { roleConfig } from "@/lib/role-config"

export const columns: Column[] = [
  {
    id: "select",
    label: "",
    accessorKey: "id",
    width: 44,
    cell: () => null,
  },
  {
    id: "name",
    label: "Nama",
    accessorKey: "name",
    sortable: true,
    width: 240,
    cell: (user: User) => {
      const cfg = getRoleConfig(user.role)
      return (
        <div className="flex items-center gap-3">
          <Avatar className={`h-9 w-9 flex-shrink-0 ${cfg.ring}`}>
            <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
            <AvatarFallback className={`${cfg.fallback} text-sm font-semibold`}>
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white/95">
              {user.name}
            </p>
            <p className="truncate text-xs text-white/50">{user.email}</p>
          </div>
        </div>
      )
    },
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
    width: 110,
    cell: (user: User) => {
      const cfg = getRoleConfig(user.role)
      return (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}
        >
          {cfg.label}
        </span>
      )
    },
  },
  {
    id: "status",
    label: "Status",
    accessorKey: "isActive",
    sortable: true,
    width: 96,
    cell: (user: User) => (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
          user.isActive
            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
            : "border-rose-500/30 bg-rose-500/15 text-rose-300"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
            user.isActive ? "bg-emerald-400" : "bg-rose-400"
          }`}
        />
        {user.isActive ? "Aktif" : "Nonaktif"}
      </span>
    ),
  },
  {
    id: "lastLogin",
    label: "Terakhir Login",
    accessorKey: "lastLogin",
    sortable: true,
    width: 140,
    cell: (user: User) => {
      if (!user.lastLogin)
        return <span className="text-xs text-white/30">Belum pernah</span>

      const now = new Date()
      const diffMs = now.getTime() - user.lastLogin.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      let relativeTime = ""
      let colorClass = "text-white/60"
      if (diffDays === 0) {
        relativeTime = "Hari ini"
        colorClass = "text-emerald-400"
      } else if (diffDays === 1) {
        relativeTime = "Kemarin"
        colorClass = "text-emerald-300/85"
      } else if (diffDays < 7) {
        relativeTime = `${diffDays} hari lalu`
        colorClass = "text-white/70"
      } else if (diffDays < 30) {
        relativeTime = `${Math.floor(diffDays / 7)} minggu lalu`
        colorClass = "text-white/50"
      } else {
        relativeTime = `${Math.floor(diffDays / 30)} bln lalu`
        colorClass = "text-white/40"
      }

      return (
        <span
          className={`cursor-help text-xs ${colorClass}`}
          title={user.lastLogin.toLocaleString("id-ID")}
        >
          {relativeTime}
        </span>
      )
    },
  },
  {
    id: "actions",
    label: "",
    accessorKey: "id",
    width: 88,
    cell: () => null,
  },
]

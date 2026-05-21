"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Column, User } from "@/types/data-table-types"

const roleConfig: Record<string, { label: string; className: string; ring: string; fallback: string }> = {
  superadmin: {
    label: "Superadmin",
    className: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
    ring: "ring-2 ring-violet-500/40",
    fallback: "bg-violet-500/20 text-violet-300",
  },
  admin: {
    label: "Admin",
    className: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    ring: "ring-2 ring-emerald-500/40",
    fallback: "bg-emerald-500/20 text-emerald-300",
  },
  manager: {
    label: "Manager",
    className: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    ring: "ring-2 ring-amber-500/40",
    fallback: "bg-amber-500/20 text-amber-300",
  },
  user: {
    label: "Pengguna",
    className: "bg-white/8 text-white/60 border border-white/15",
    ring: "ring-1 ring-white/20",
    fallback: "bg-white/10 text-white/70",
  },
}

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
    width: 220,
    cell: (user: User) => {
      const cfg = roleConfig[user.role] ?? roleConfig.user
      return (
        <div className="flex items-center gap-3 py-0.5">
          <Avatar className={`h-9 w-9 flex-shrink-0 ${cfg.ring}`}>
            <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
            <AvatarFallback className={`${cfg.fallback} text-sm font-semibold`}>
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white/95 truncate text-sm">{user.name}</p>
            <p className="text-xs text-white/50 truncate">{user.email}</p>
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
      const cfg = roleConfig[user.role] ?? roleConfig.user
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
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
    width: 90,
    cell: (user: User) => (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
        user.isActive
          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${user.isActive ? "bg-emerald-400" : "bg-rose-400"}`} />
        {user.isActive ? "Aktif" : "Nonaktif"}
      </span>
    ),
  },
  {
    id: "lastLogin",
    label: "Terakhir Login",
    accessorKey: "lastLogin",
    sortable: true,
    width: 130,
    cell: (user: User) => {
      if (!user.lastLogin) return <span className="text-white/30 text-xs">Belum pernah</span>

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
        colorClass = "text-emerald-300/80"
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
        <span className={`text-xs ${colorClass} cursor-help`} title={user.lastLogin.toLocaleString("id-ID")}>
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
    width: 100,
    cell: () => null,
  },
]

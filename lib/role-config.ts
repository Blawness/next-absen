/**
 * Centralised role configuration — used by table columns,
 * user forms, statistics, and any other UI that needs to
 * render a user role consistently.
 */

export const roleConfig: Record<
  string,
  {
    label: string
    /** Badge styling */
    className: string
    /** Avatar ring styling */
    ring: string
    /** Avatar fallback styling */
    fallback: string
  }
> = {
  superadmin: {
    label: "Superadmin",
    className:
      "bg-violet-500/15 text-violet-300 border border-violet-500/30",
    ring: "ring-2 ring-violet-500/40",
    fallback: "bg-violet-500/20 text-violet-300",
  },
  admin: {
    label: "Admin",
    className:
      "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
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
    className: "bg-white/8 text-white/65 border border-white/15",
    ring: "ring-1 ring-white/20",
    fallback: "bg-white/10 text-white/75",
  },
}

/** Get role config with safe fallback */
export function getRoleConfig(role: string) {
  return roleConfig[role] ?? roleConfig.user
}

/** All role options in display order */
export const ROLE_OPTIONS = [
  { value: "user", label: roleConfig.user.label },
  { value: "manager", label: roleConfig.manager.label },
  { value: "admin", label: roleConfig.admin.label },
  { value: "superadmin", label: roleConfig.superadmin.label },
] as const

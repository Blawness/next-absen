import { UserRole } from "@prisma/client"

// Permission definitions
export enum Permission {
  // User Management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  // Attendance Management
  ABSENSI_CREATE = 'absensi:create',
  ABSENSI_READ = 'absensi:read',
  ABSENSI_UPDATE = 'absensi:update',
  ABSENSI_DELETE = 'absensi:delete',

  // Reports
  REPORT_READ = 'report:read',
  REPORT_EXPORT = 'report:export',

  // Settings
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update'
}

// Role permissions mapping
const rolePermissions: Record<UserRole, Permission[]> = {
  admin: Object.values(Permission),
  manager: [
    Permission.USER_READ,
    Permission.ABSENSI_CREATE,
    Permission.ABSENSI_READ,
    Permission.ABSENSI_UPDATE,
    Permission.REPORT_READ,
    Permission.REPORT_EXPORT,
    Permission.SETTINGS_READ
  ],
  user: [
    Permission.ABSENSI_CREATE,
    Permission.ABSENSI_READ,
    Permission.REPORT_READ
  ]
}

// Check if user has specific permission
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return rolePermissions[userRole].includes(permission)
}

// Check if user can access resource
export function canAccess(userRole: UserRole, resource: string, action: string): boolean {
  const permission = `${resource}:${action}` as Permission
  return hasPermission(userRole, permission)
}

// Get all permissions for a role
export function getRolePermissions(role: UserRole): Permission[] {
  return rolePermissions[role]
}

// Check if user is admin
export function isAdmin(role: UserRole): boolean {
  return role === UserRole.admin
}

// Check if user is manager or admin
export function isManagerOrAdmin(role: UserRole): boolean {
  return role === UserRole.manager || role === UserRole.admin
}

// Check if user can manage users
export function canManageUsers(role: UserRole): boolean {
  return isAdmin(role)
}

// Check if user can export reports
export function canExportReports(role: UserRole): boolean {
  return hasPermission(role, Permission.REPORT_EXPORT)
}

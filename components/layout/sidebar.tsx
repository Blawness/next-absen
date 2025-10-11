"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Clock,
  FileText,
  Users,
  Settings,
  User,
  LogOut,
  Menu,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NAVIGATION, ROLE_LABELS } from "@/lib/constants"
import { UserRole } from "@prisma/client"

interface SidebarWithLayoutProps {
  children: React.ReactNode
}

export function SidebarWithLayout({ children }: SidebarWithLayoutProps) {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  if (!session) {
    return (
      <main className="relative z-10">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    )
  }

  const userRole = session.user.role
  const filteredNavItems = navigationItems.filter(item =>
    item.roles.includes(userRole)
  )

  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/signin" })
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 glass-nav transform transition-transform duration-300 ease-in-out lg:translate-x-0 slide-in",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center h-16 px-4">
            <motion.h1
              className="text-2xl font-bold glass-title"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Absensi
            </motion.h1>
          </div>

          {/* User info */}
          <div className="p-4">
            <motion.div
              className="glass-card p-4 scale-in"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-white/20">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-white/70 truncate">
                    {ROLE_LABELS[userRole.toUpperCase() as keyof typeof ROLE_LABELS]}
                  </p>
                  {session.user.department && (
                    <p className="text-xs text-white/60 truncate">
                      {session.user.department}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
            {filteredNavItems.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <Link href={item.href}>
                    <Button
                      variant="glassOutline"
                      className="w-full justify-start text-white hover:bg-white/20 backdrop-blur-md"
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                </motion.div>
              )
            })}
          </nav>

          {/* Sign out button */}
          <div className="p-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                variant="glassOutline"
                className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/20 border-red-400/30"
                onClick={handleSignOut}
              >
                <LogOut className="mr-3 h-5 w-5" />
                {NAVIGATION.LOGOUT}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main content with sidebar spacing */}
      <main className="lg:pl-64 relative z-10">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </>
  )
}

interface SidebarProps {
  className?: string
}

const navigationItems: Array<{
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}> = [
  {
    href: "/dashboard",
    label: NAVIGATION.DASHBOARD,
    icon: LayoutDashboard,
    roles: [UserRole.admin, UserRole.manager, UserRole.user]
  },
  {
    href: "/attendance",
    label: NAVIGATION.ATTENDANCE,
    icon: Clock,
    roles: [UserRole.admin, UserRole.manager, UserRole.user]
  },
  {
    href: "/reports",
    label: NAVIGATION.REPORTS,
    icon: FileText,
    roles: [UserRole.admin, UserRole.manager]
  },
  {
    href: "/users",
    label: NAVIGATION.USERS,
    icon: Users,
    roles: [UserRole.admin]
  },
  {
    href: "/profile",
    label: NAVIGATION.PROFILE,
    icon: User,
    roles: [UserRole.admin, UserRole.manager, UserRole.user]
  },
  {
    href: "/settings",
    label: NAVIGATION.SETTINGS,
    icon: Settings,
    roles: [UserRole.admin]
  }
]

export function Sidebar({ className }: SidebarProps) {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  if (!session) return null

  const userRole = session.user.role
   const filteredNavItems = navigationItems.filter(item =>
     item.roles.includes(userRole)
   )

  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/signin" })
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 glass-nav transform transition-transform duration-300 ease-in-out lg:translate-x-0 slide-in",
        isOpen ? "translate-x-0" : "-translate-x-full",
        className
      )}>
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center h-16 px-4">
            <motion.h1
              className="text-2xl font-bold glass-title"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Absensi
            </motion.h1>
          </div>

          {/* User info */}
          <div className="p-4">
            <motion.div
              className="glass-card p-4 scale-in"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-white/20">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-white/70 truncate">
                    {ROLE_LABELS[userRole.toUpperCase() as keyof typeof ROLE_LABELS]}
                  </p>
                  {session.user.department && (
                    <p className="text-xs text-white/60 truncate">
                      {session.user.department}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
            {filteredNavItems.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <Link href={item.href}>
                    <Button
                      variant="glassOutline"
                      className="w-full justify-start text-white hover:bg-white/20 backdrop-blur-md"
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                </motion.div>
              )
            })}
          </nav>

          {/* Sign out button */}
          <div className="p-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                variant="glassOutline"
                className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/20 border-red-400/30"
                onClick={handleSignOut}
              >
                <LogOut className="mr-3 h-5 w-5" />
                {NAVIGATION.LOGOUT}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

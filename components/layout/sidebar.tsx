"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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

interface SidebarProps {
  className?: string
}

const navigationItems = [
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
        "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
        className
      )}>
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center h-16 px-4 border-b">
            <h1 className="text-xl font-bold text-primary">Absensi</h1>
          </div>

          {/* User info */}
          <div className="p-4 border-b">
            <Card className="p-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {ROLE_LABELS[userRole]}
                  </p>
                  {session.user.department && (
                    <p className="text-xs text-muted-foreground truncate">
                      {session.user.department}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* Sign out button */}
          <div className="p-4 border-t">
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-4 w-4" />
              {NAVIGATION.LOGOUT}
            </Button>
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

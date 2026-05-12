"use client"

import { SidebarWithLayout } from "./sidebar"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-app">
      <SidebarWithLayout>
        {children}
      </SidebarWithLayout>
    </div>
  )
}

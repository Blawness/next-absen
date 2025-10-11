"use client"

import { SidebarWithLayout } from "./sidebar"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {

  return (
    <div className="min-h-screen glassmorphism-bg">
      {/* Floating Background Elements */}
      <div className="floating-orb"></div>
      <div className="floating-orb"></div>
      <div className="floating-orb"></div>

      <SidebarWithLayout>
        {children}
      </SidebarWithLayout>
    </div>
  )
}

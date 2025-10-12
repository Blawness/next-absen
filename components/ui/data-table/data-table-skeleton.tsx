"use client"

import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"

// Loading skeleton component
export function DataTableSkeleton() {
  return (
    <div className="space-y-4">
      <Card variant="glass" className="rounded-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card variant="glass" className="rounded-2xl">
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-4 bg-white/10 rounded animate-pulse" />
                <div className="h-8 w-8 bg-white/10 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
                <div className="h-6 w-16 bg-white/10 rounded animate-pulse" />
                <div className="h-6 w-16 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                <div className="flex gap-1">
                  <div className="h-8 w-8 bg-white/10 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-white/10 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-white/10 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// General card skeleton for various uses
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card variant="glass" className={className}>
      <CardHeader>
        <div className="h-6 w-32 bg-white/10 rounded animate-pulse mb-2" />
        <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

// Simple loading skeleton for general use
export function SimpleSkeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-4 w-full bg-white/10 rounded" />
    </div>
  )
}

// Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-10 w-64 bg-white/10 rounded animate-pulse" />
        <div className="h-5 w-96 bg-white/10 rounded animate-pulse" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card variant="glass" key={i} className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="h-5 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-5 w-5 bg-white/10 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-white/10 rounded animate-pulse mb-2" />
              <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card variant="glass">
          <CardHeader>
            <div className="h-6 w-24 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 bg-white/5 rounded animate-pulse" />
              <div className="h-24 bg-white/5 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <div className="h-6 w-32 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-48 bg-white/5 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card variant="glass">
        <CardHeader>
          <div className="h-6 w-32 bg-white/10 rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-3 rounded-lg bg-white/5">
                <div className="h-3 w-3 bg-white/10 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Reports Skeleton
export function ReportsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-10 w-48 bg-white/10 rounded animate-pulse" />
        <div className="h-5 w-80 bg-white/10 rounded animate-pulse" />
      </div>

      {/* Filters */}
      <Card variant="glass">
        <CardHeader>
          <div className="h-6 w-24 bg-white/10 rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-white/10 rounded animate-pulse" />
            <div className="h-10 w-28 bg-white/10 rounded animate-pulse" />
            <div className="h-10 w-24 bg-white/10 rounded animate-pulse ml-auto" />
            <div className="h-10 w-24 bg-white/10 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card variant="glass" key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="h-5 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-5 w-5 bg-white/10 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-white/10 rounded animate-pulse mb-2" />
              <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card variant="glass" key={i}>
            <CardHeader>
              <div className="h-6 w-32 bg-white/10 rounded animate-pulse mb-2" />
              <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 bg-white/10 rounded-full animate-pulse" />
                      <div className="h-5 w-20 bg-white/10 rounded animate-pulse" />
                      <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                    </div>
                    <div className="h-5 w-12 bg-white/10 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Table */}
      <Card variant="glass">
        <CardHeader>
          <div className="h-6 w-40 bg-white/10 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-white/10 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 border border-white/5 rounded">
                <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Users Skeleton
export function UsersSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-10 w-32 bg-white/10 rounded animate-pulse" />
        <div className="h-5 w-80 bg-white/10 rounded animate-pulse" />
      </div>

      {/* Filters */}
      <Card variant="glass">
        <CardHeader>
          <div className="h-6 w-24 bg-white/10 rounded animate-pulse mb-2" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="h-10 w-64 bg-white/10 rounded animate-pulse" />
            <div className="h-10 w-48 bg-white/10 rounded animate-pulse" />
            <div className="h-10 w-40 bg-white/10 rounded animate-pulse" />
            <div className="h-10 w-32 bg-white/10 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>

      {/* Users Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card variant="glass" key={i}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-white/10 rounded-full animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-white/10 rounded animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Settings Skeleton
export function SettingsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-10 w-40 bg-white/10 rounded animate-pulse" />
        <div className="h-5 w-80 bg-white/10 rounded animate-pulse" />
      </div>

      {/* Settings Tabs */}
      <Card variant="glass">
        <div className="p-6">
          <div className="flex gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 w-24 bg-white/10 rounded animate-pulse" />
            ))}
          </div>

          {/* Settings Content */}
          <div className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <div className="h-6 w-32 bg-white/10 rounded animate-pulse mb-2" />
                <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                    <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-white/10 rounded animate-pulse" />
                    <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Save Button */}
          <div className="flex justify-end mt-8">
            <div className="h-10 w-32 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </Card>
    </div>
  )
}

// Attendance Skeleton
export function AttendanceSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-10 w-48 bg-white/10 rounded animate-pulse" />
        <div className="h-5 w-80 bg-white/10 rounded animate-pulse" />
      </div>

      {/* Attendance Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card variant="glass" key={i}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-white/10 rounded-full animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-white/10 rounded animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Auth Skeleton
export function AuthSkeleton() {
  return (
    <div className="min-h-screen glassmorphism-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card variant="glass" className="backdrop-blur-xl">
          <CardHeader className="space-y-4 pb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 bg-white/10 rounded-full animate-pulse" />
            </div>
            <div className="space-y-2 text-center">
              <div className="h-8 w-48 bg-white/10 rounded animate-pulse mx-auto" />
              <div className="h-4 w-64 bg-white/10 rounded animate-pulse mx-auto" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
            <div className="text-center">
              <div className="h-4 w-32 bg-white/10 rounded animate-pulse mx-auto" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// Empty state component
export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 bg-white/5 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 border border-white/10">
        <svg className="h-10 w-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white/98 mb-2">Tidak ada data ditemukan</h3>
      <p className="text-white/75 mb-6 max-w-md">
        Belum ada data yang sesuai dengan filter yang dipilih. Coba ubah filter atau tambah data baru.
      </p>
    </div>
  )
}

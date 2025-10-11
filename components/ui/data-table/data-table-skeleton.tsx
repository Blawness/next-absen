"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

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
        <div className="p-6">
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
        </div>
      </Card>
    </div>
  )
}

// Empty state component
export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full flex items-center justify-center mb-6 border border-gray-600/40">
        <svg className="h-10 w-10 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white/98 mb-2">Tidak ada pengguna ditemukan</h3>
      <p className="text-white/75 mb-6 max-w-md">
        Belum ada pengguna yang sesuai dengan filter yang dipilih. Coba ubah filter atau tambah pengguna baru.
      </p>
      <button className="inline-flex items-center px-4 py-2 border border-gray-600/40 text-sm font-medium rounded-md bg-gray-800/40 text-white hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
        Tambah Pengguna
      </button>
    </div>
  )
}

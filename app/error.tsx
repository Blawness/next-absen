'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const isChunkLoadError = (error: Error) =>
  error.name === 'ChunkLoadError' ||
  error.message?.includes('Loading chunk') ||
  error.message?.includes('Failed to fetch dynamically imported module') ||
  error.message?.includes('Unexpected token <')

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      // Auto-refresh once after a new deployment invalidates old chunks.
      // Guard against infinite reload loops with a short cooldown.
      const COOLDOWN_MS = 15_000
      const lastRefresh = Number(sessionStorage.getItem('chunk_error_refresh') ?? 0)
      if (Date.now() - lastRefresh > COOLDOWN_MS) {
        sessionStorage.setItem('chunk_error_refresh', String(Date.now()))
        window.location.reload()
      }
    } else {
      console.error(error)
    }
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div className="text-center">
        <h2 className="text-lg font-semibold">Terjadi Kesalahan</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {error.message || 'Gagal memuat halaman. Silakan coba lagi.'}
        </p>
      </div>
      <Button onClick={reset} variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" />
        Coba Lagi
      </Button>
    </div>
  )
}

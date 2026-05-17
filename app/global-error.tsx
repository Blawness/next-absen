'use client'

import { useEffect } from 'react'

// Handles errors thrown inside the root layout itself.
// Must render its own <html> and <body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#0f172a', color: '#f1f5f9' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Terjadi Kesalahan</h2>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            {error.message || 'Aplikasi mengalami masalah. Silakan muat ulang halaman.'}
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.375rem',
              border: '1px solid #334155',
              background: 'transparent',
              color: '#f1f5f9',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  )
}

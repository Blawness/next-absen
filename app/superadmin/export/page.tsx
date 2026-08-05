"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Loader2, Database, AlertTriangle, FileJson } from "lucide-react"
import { UserRole } from "@prisma/client"
import { NAVIGATION, MESSAGES } from "@/lib/constants"

export default function SuperadminExportPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (status === "loading") return
    if (!session || session.user.role !== UserRole.superadmin) {
      router.replace("/dashboard")
    }
  }, [session, status, router])

  const handleExport = async () => {
    if (
      !confirm(
        "Export semua data sistem? File berisi data sensitif (password hash, email, koordinat GPS). Tindakan ini akan dicatat di activity log."
      )
    ) {
      return
    }

    setIsExporting(true)
    setMessage(null)

    try {
      const res = await fetch("/api/superadmin/export", { method: "GET" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url

      // Try to use the server-provided filename; fall back to a sensible default.
      const disposition = res.headers.get("Content-Disposition") || ""
      const match = disposition.match(/filename="?([^";]+)"?/)
      a.download = match?.[1] || `next-absen-export-${new Date().toISOString().slice(0, 10)}.json`

      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMessage({ type: "success", text: "Export berhasil. File sudah diunduh." })
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : MESSAGES.ERROR,
      })
    } finally {
      setIsExporting(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    )
  }

  if (!session || session.user.role !== UserRole.superadmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold glass-title">{NAVIGATION.EXPORT_DATA}</h1>
        <p className="text-white/70">
          Download seluruh data sistem untuk migrasi ke database baru
        </p>
      </div>

      {message && (
        <Alert variant={message.type === "success" ? "default" : "destructive"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Database className="h-5 w-5" />
            Full Data Export
          </CardTitle>
          <CardDescription className="text-white/70">
            File JSON berisi semua tabel utama. Tindakan ini akan tercatat di
            activity log dengan informasi penanggung jawab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3 text-sm text-white/80">
            <div>
              <p className="font-medium text-white">Tabel yang diekspor:</p>
              <ul className="list-disc list-inside space-y-1 text-white/70 mt-1">
                <li>users (termasuk password hash bcrypt)</li>
                <li>absensi_records</li>
                <li>activity_logs</li>
                <li>settings</li>
                <li>system_settings</li>
                <li>
                  api_keys (prefix dan metadata; plaintext key tidak bisa
                  di-recover — generate ulang setelah import)
                </li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-white">Yang TIDAK diekspor:</p>
              <ul className="list-disc list-inside space-y-1 text-white/70 mt-1">
                <li>
                  persisted_session_tokens — sesi akan di-issue ulang di app
                  baru
                </li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-white">Format output:</p>
              <div className="flex items-center gap-2 mt-1 text-white/70">
                <FileJson className="h-4 w-4" />
                <code className="text-xs bg-white/5 px-2 py-0.5 rounded">
                  {"{ meta: {...}, data: { users, absensiRecords, ... } }"}
                </code>
              </div>
              <p className="text-white/60 text-xs mt-1">
                Block <code>meta</code> berisi versi, timestamp, dan jumlah
                record per tabel — gunakan untuk validasi sebelum import.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-300" />
            <div className="text-yellow-100/90">
              <p className="font-medium">Perhatian</p>
              <p className="text-yellow-200/80">
                File export berisi data sensitif (password hash, email, koordinat
                check-in/out). Simpan dengan aman dan jangan upload ke tempat
                publik. Setelah migrasi selesai, hapus file export dari
                workstation.
              </p>
            </div>
          </div>

          <Button
            onClick={handleExport}
            disabled={isExporting}
            variant="glass"
            size="lg"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyiapkan export...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Export
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

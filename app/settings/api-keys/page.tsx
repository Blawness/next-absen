"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { NAVIGATION } from "@/lib/constants"
import { ApiKeysTable } from "@/components/settings/api-keys-table"
import { GenerateKeyDialog } from "@/components/settings/generate-key-dialog"

interface ApiKeyRow {
  id: string
  prefix: string
  name: string
  scope: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
}

export default function ApiKeysPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/api-keys")
      if (res.ok) {
        const data = await res.json()
        setKeys(data)
      }
    } catch (e) {
      console.error("Failed to fetch API keys:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== "loading") {
      fetchKeys()
    }
  }, [status, fetchKeys])

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/settings/api-keys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      if (res.ok) {
        await fetchKeys()
      }
    } catch (e) {
      console.error("Failed to toggle API key:", e)
    }
  }

  if (status === "loading") {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
        <div className="h-64 bg-white/5 rounded animate-pulse" />
      </div>
    )
  }

  if (!session || session.user.role !== "admin") {
    router.push("/dashboard")
    return null
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 animate-fade-down">
        <h1 className="text-4xl font-bold glass-title text-center lg:text-left">
          {NAVIGATION.API_KEYS}
        </h1>
        <p className="text-white/80 text-lg">
          Kelola API key untuk akses eksternal ke API absensi
        </p>
      </div>

      <div className="animate-fade-up anim-delay-200">
        <div className="solid-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-white/60">
              API key digunakan oleh aplikasi eksternal (QR scanner, website lain) untuk
              mengakses API absensi. Simpan key dengan aman.
            </p>
            <Button
              variant="glassOutline"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Buat Key
            </Button>
          </div>

          {loading ? (
            <div className="h-32 bg-white/5 rounded animate-pulse" />
          ) : (
            <ApiKeysTable keys={keys} onToggleActive={handleToggleActive} />
          )}
        </div>
      </div>

      <GenerateKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onGenerated={fetchKeys}
      />
    </div>
  )
}

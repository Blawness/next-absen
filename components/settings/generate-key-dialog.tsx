"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Check } from "lucide-react"

interface GenerateKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerated: () => void
}

export function GenerateKeyDialog({
  open,
  onOpenChange,
  onGenerated,
}: GenerateKeyDialogProps) {
  const [name, setName] = useState("")
  const [scope, setScope] = useState("attendance:readwrite")
  const [loading, setLoading] = useState(false)
  const [rawKey, setRawKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  const handleGenerate = async () => {
    if (!name.trim()) {
      setError("Nama wajib diisi")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scope }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Gagal membuat API key")
      }

      const data = await res.json()
      setRawKey(data.rawKey)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat API key")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (rawKey) {
      await navigator.clipboard.writeText(rawKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDone = () => {
    setName("")
    setScope("attendance:readwrite")
    setRawKey(null)
    setError("")
    setCopied(false)
    onOpenChange(false)
    onGenerated()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {rawKey ? "API Key Berhasil Dibuat" : "Buat API Key Baru"}
          </DialogTitle>
          <DialogDescription>
            {rawKey
              ? "Simpan key ini sekarang — tidak akan ditampilkan lagi."
              : "API key digunakan untuk mengakses API absensi dari aplikasi eksternal."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {rawKey ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <code className="text-sm break-all select-all">{rawKey}</code>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Tersalin
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Salin Key
                </>
              )}
            </Button>
            <p className="text-xs text-destructive text-center">
              Key ini hanya ditampilkan sekali. Pastikan Anda sudah menyimpannya.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Nama</Label>
              <Input
                id="key-name"
                placeholder="Contoh: QR Scanner App"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-scope">Scope</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger id="key-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance:readwrite">
                    Read + Auto Check-in
                  </SelectItem>
                  <SelectItem value="attendance:read">
                    Read Only
                  </SelectItem>
                  <SelectItem value="attendance:auto-checkin">
                    Auto Check-in Only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? "Membuat..." : "Buat API Key"}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleDone}>
            {rawKey ? "Selesai" : "Batal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

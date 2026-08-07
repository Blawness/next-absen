"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FormField } from "@/components/ui/form-field"
import { Copy, Check, KeyRound, Sparkles } from "lucide-react"

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
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {rawKey ? (
              <Sparkles className="h-5 w-5 text-emerald-400" />
            ) : (
              <KeyRound className="h-5 w-5 text-emerald-400" />
            )}
            {rawKey ? "API Key Berhasil Dibuat" : "Buat API Key Baru"}
          </DialogTitle>
          <DialogDescription>
            {rawKey
              ? "Simpan key ini sekarang — tidak akan ditampilkan lagi."
              : "API key digunakan untuk mengakses API absensi dari aplikasi eksternal."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {rawKey ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-white/5 p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-emerald-300/80">
                    API Key Anda
                  </p>
                  <code className="block break-all rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs text-white select-all">
                    {rawKey}
                  </code>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-white/10 bg-white/5 text-white/85 hover:bg-white/10"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-emerald-400" />
                      Tersalin
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Salin Key
                    </>
                  )}
                </Button>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/85">
                  ⚠️ Key ini hanya ditampilkan sekali. Pastikan Anda sudah
                  menyimpannya.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <FormField label="Nama" htmlFor="key-name" required>
                  <Input
                    id="key-name"
                    variant="glass"
                    placeholder="Contoh: QR Scanner App"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </FormField>
                <FormField
                  label="Scope"
                  htmlFor="key-scope"
                  hint="Tentukan hak akses key ini"
                >
                  <Select value={scope} onValueChange={setScope}>
                    <SelectTrigger id="key-scope" variant="glass">
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
                </FormField>
                <Button
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={loading}
                  variant="glass"
                >
                  {loading ? "Membuat..." : "Buat API Key"}
                </Button>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={handleDone}
              className="text-white/65 hover:bg-white/10 hover:text-white"
            >
              {rawKey ? "Selesai" : "Batal"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

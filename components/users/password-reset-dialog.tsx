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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FormField, FormToggleRow } from "@/components/ui/form-field"
import { Loader2, Copy, Check, Key } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface PasswordResetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
  onSuccess?: () => void
}

export function PasswordResetDialog({
  open,
  onOpenChange,
  userId,
  userName,
  onSuccess,
}: PasswordResetDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customPassword, setCustomPassword] = useState("")
  const [sendEmail, setSendEmail] = useState(false)
  const [useCustomPassword, setUseCustomPassword] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const reset = () => {
    setCustomPassword("")
    setSendEmail(false)
    setUseCustomPassword(false)
    setGeneratedPassword(null)
    setCopied(false)
    setMessage(null)
  }

  const handleClose = () => {
    onOpenChange(false)
    reset()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)
    setGeneratedPassword(null)

    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customPassword: useCustomPassword ? customPassword : undefined,
          sendEmail,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({ type: "success", text: data.message })

        if (data.temporaryPassword) {
          setGeneratedPassword(data.temporaryPassword)
        }

        onSuccess?.()

        if (sendEmail) {
          setTimeout(() => {
            handleClose()
          }, 3000)
        }
      } else {
        const error = await response.json()
        setMessage({
          type: "error",
          text: error.error || "Failed to reset password",
        })
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (generatedPassword) {
      await navigator.clipboard.writeText(generatedPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            <Key className="h-5 w-5 text-emerald-400" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Reset password untuk{" "}
            <span className="font-semibold text-white">{userName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            <FormToggleRow
              title="Gunakan password kustom"
              description="Tetapkan password sendiri, sistem akan menghasilkan jika nonaktif"
            >
              <Switch
                checked={useCustomPassword}
                onCheckedChange={setUseCustomPassword}
              />
            </FormToggleRow>

            {useCustomPassword && (
              <FormField
                label="Password Kustom"
                htmlFor="custom-password"
                hint="Minimal 8 karakter"
                required
              >
                <Input
                  id="custom-password"
                  type="password"
                  variant="glass"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Masukkan password baru"
                  required={useCustomPassword}
                  minLength={8}
                />
              </FormField>
            )}

            <FormToggleRow
              title="Kirim notifikasi email"
              description={
                sendEmail
                  ? "Password akan dikirim via email"
                  : "Password akan ditampilkan di sini"
              }
            >
              <Switch
                checked={sendEmail}
                onCheckedChange={setSendEmail}
              />
            </FormToggleRow>

            {generatedPassword && (
              <Alert className="border-emerald-500/30 bg-emerald-500/10">
                <AlertDescription className="space-y-2">
                  <p className="text-sm font-medium text-white/90">
                    Password Sementara:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white">
                      {generatedPassword}
                    </code>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={handleCopy}
                      className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                      aria-label="Salin password"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-white/55">
                    Simpan password ini. Tidak akan ditampilkan lagi.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {message && !generatedPassword && (
              <Alert
                variant={message.type === "success" ? "default" : "destructive"}
                className={
                  message.type === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : undefined
                }
              >
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
            >
              {generatedPassword ? "Tutup" : "Batal"}
            </Button>
            {!generatedPassword && (
              <Button type="submit" disabled={isSubmitting} variant="glass">
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Reset Password
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

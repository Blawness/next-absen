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
import { FormField } from "@/components/ui/form-field"
import { Loader2, Key, Eye, EyeOff } from "lucide-react"

// Mirrors MIN_LENGTH in lib/password-policy, which the API enforces; that
// module pulls in Prisma, so it can't be imported into a client component.
const PASSWORD_MIN_LENGTH = 8

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
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const isDone = message?.type === "success"

  const reset = () => {
    setNewPassword("")
    setConfirmPassword("")
    setIsPasswordVisible(false)
    setMessage(null)
  }

  const handleClose = () => {
    onOpenChange(false)
    reset()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setMessage({ type: "error", text: `Password minimal ${PASSWORD_MIN_LENGTH} karakter` })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Konfirmasi password tidak cocok" })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      })

      if (!response.ok) {
        const error = await response.json()
        setMessage({
          type: "error",
          text: error.error || "Gagal mengganti password",
        })
        return
      }

      setNewPassword("")
      setConfirmPassword("")
      setMessage({
        type: "success",
        text: "Password berhasil diganti. Semua sesi login user ini telah diakhiri.",
      })
      onSuccess?.()
    } catch {
      setMessage({ type: "error", text: "Terjadi kesalahan" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const passwordType = isPasswordVisible ? "text" : "password"

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            <Key className="h-5 w-5 text-emerald-400" />
            Ganti Password
          </DialogTitle>
          <DialogDescription>
            Atur password baru untuk{" "}
            <span className="font-semibold text-white">{userName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            {!isDone && (
              <>
                <FormField
                  label="Password Baru"
                  htmlFor="new-password"
                  hint={`Minimal ${PASSWORD_MIN_LENGTH} karakter`}
                  required
                >
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={passwordType}
                      variant="glass"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan password baru"
                      autoComplete="new-password"
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                      className="pr-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 text-white/70 hover:bg-white/10"
                      onClick={() => setIsPasswordVisible((prev) => !prev)}
                      aria-label={isPasswordVisible ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </FormField>

                <FormField
                  label="Konfirmasi Password"
                  htmlFor="confirm-password"
                  required
                >
                  <Input
                    id="confirm-password"
                    type={passwordType}
                    variant="glass"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    autoComplete="new-password"
                    required
                  />
                </FormField>
              </>
            )}

            {message && (
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
              {isDone ? "Tutup" : "Batal"}
            </Button>
            {!isDone && (
              <Button type="submit" disabled={isSubmitting} variant="glass">
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Simpan Password
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

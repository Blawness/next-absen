"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus } from "lucide-react"
import { MESSAGES, STATUS_LABELS } from "@/lib/constants"
import { AttendanceStatus } from "@prisma/client"

interface UserOption {
  id: string
  name: string
  email: string
  department: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function AttendanceCreateDialog({ open, onClose, onSaved }: Props) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [date, setDate] = useState("")
  const [checkInTime, setCheckInTime] = useState("")
  const [checkOutTime, setCheckOutTime] = useState("")
  const [status, setStatus] = useState<AttendanceStatus>("present")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/attendance?users=true")
      if (res.ok) setUsers(await res.json())
    } catch {
      // silent
    }
  }, [])

  // The dialog is controlled by the parent's `open` prop and has no
  // DialogTrigger, so Radix never fires onOpenChange(true). Seed the form
  // from an effect instead, otherwise the user list and date stay empty.
  useEffect(() => {
    if (!open) return
    loadUsers()
    // Today's calendar date in LOCAL time — toISOString() would roll over
    // to the previous day for timezones ahead of UTC.
    const now = new Date()
    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    setDate(localToday)
    setCheckInTime("")
    setCheckOutTime("")
    setStatus("present")
    setNotes("")
    setSelectedUserId("")
    setError("")
  }, [open, loadUsers])

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose()
  }

  const handleSave = async () => {
    if (!selectedUserId) {
      setError("Pilih user terlebih dahulu")
      return
    }
    if (!date) {
      setError("Tanggal wajib diisi")
      return
    }
    setSaving(true)
    setError("")

    try {
      // Build the check-in / check-out timestamps in the user's local
      // timezone (NOT as UTC). Without this, an 08:00 check-in in
      // Jakarta (+07:00) would be stored as 08:00 UTC = 15:00 local.
      // We use Date(year, month, day, hour, minute) which constructs
      // in the browser's local timezone, then serialise via
      // getTime()/ISO so the server stores a real UTC instant that
      // converts back to the same local wall-clock on display.
      const buildLocalIso = (d: string, t: string): string => {
        const [y, m, day] = d.split("-").map(Number)
        const [hh, mm] = t.split(":").map(Number)
        const local = new Date(y, m - 1, day, hh, mm, 0, 0)
        return local.toISOString()
      }
      const checkInISO = checkInTime ? buildLocalIso(date, checkInTime) : null
      const checkOutISO = checkOutTime ? buildLocalIso(date, checkOutTime) : null

      const res = await fetch("/api/superadmin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          // Send the calendar date only — server parses with the UTC
          // calendar-date branch (lib/date-bounds.ts) to keep MySQL
          // DATE storage consistent across server timezones.
          date,
          checkInTime: checkInISO,
          checkOutTime: checkOutISO,
          status,
          notes: notes || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || MESSAGES.ERROR)
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : MESSAGES.ERROR)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            <Plus className="h-5 w-5 text-emerald-400" />
            Tambah Record Absensi
          </DialogTitle>
          <DialogDescription>
            Buat record absensi manual untuk user
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            <FormField label="User" htmlFor="user-select" required>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select" variant="glass">
                  <SelectValue placeholder="Cari user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Tanggal" htmlFor="date" required>
              <Input
                id="date"
                type="date"
                variant="glass"
                value={date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDate(e.target.value)
                }
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Check-in" htmlFor="check-in">
                <Input
                  id="check-in"
                  type="time"
                  variant="glass"
                  value={checkInTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCheckInTime(e.target.value)
                  }
                />
              </FormField>
              <FormField label="Check-out" htmlFor="check-out">
                <Input
                  id="check-out"
                  type="time"
                  variant="glass"
                  value={checkOutTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCheckOutTime(e.target.value)
                  }
                />
              </FormField>
            </div>

            <FormField label="Status" htmlFor="status" required>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as AttendanceStatus)}
              >
                <SelectTrigger id="status" variant="glass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">
                    {STATUS_LABELS.present}
                  </SelectItem>
                  <SelectItem value="late">{STATUS_LABELS.late}</SelectItem>
                  <SelectItem value="absent">
                    {STATUS_LABELS.absent}
                  </SelectItem>
                  <SelectItem value="half_day">
                    {STATUS_LABELS.half_day}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Catatan" htmlFor="notes">
              <Textarea
                id="notes"
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setNotes(e.target.value)
                }
                placeholder="Catatan tambahan (opsional)..."
                rows={3}
              />
            </FormField>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
            >
              {MESSAGES.CANCEL}
            </Button>
            <Button onClick={handleSave} disabled={saving} variant="glass">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {MESSAGES.SAVE}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

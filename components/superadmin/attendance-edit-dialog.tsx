"use client"

import { useState, useEffect } from "react"
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
import { Loader2, Pencil } from "lucide-react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { MESSAGES, STATUS_LABELS } from "@/lib/constants"
import { AttendanceStatus } from "@prisma/client"

interface AttendanceRecord {
  id: string
  date: string | Date
  checkInTime: string | Date | null
  checkOutTime: string | Date | null
  status: AttendanceStatus
  notes: string | null
}

interface Props {
  open: boolean
  record: AttendanceRecord | null
  onClose: () => void
  onSaved: () => void
}

function toTimeString(value: string | Date | null): string {
  if (!value) return ""
  const d = typeof value === "string" ? new Date(value) : value
  if (isNaN(d.getTime())) return ""
  return format(d, "HH:mm")
}

function toDateString(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value
  return format(d, "yyyy-MM-dd")
}

export function AttendanceEditDialog({
  open,
  record,
  onClose,
  onSaved,
}: Props) {
  const [checkInTime, setCheckInTime] = useState("")
  const [checkOutTime, setCheckOutTime] = useState("")
  const [status, setStatus] = useState<AttendanceStatus>("present")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Radix UI controlled Dialog does NOT call onOpenChange(true) when the parent
  // sets open=true programmatically, so we must initialize state via useEffect.
  useEffect(() => {
    if (open && record) {
      setCheckInTime(toTimeString(record.checkInTime))
      setCheckOutTime(toTimeString(record.checkOutTime))
      setStatus(record.status)
      setNotes(record.notes ?? "")
      setError("")
    }
  }, [open, record])

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose()
  }

  const handleSave = async () => {
    if (!record) return
    setSaving(true)
    setError("")

    try {
      const checkInISO = checkInTime
        ? new Date(
            `${toDateString(record.date)}T${checkInTime}:00`
          ).toISOString()
        : null
      const checkOutISO = checkOutTime
        ? new Date(
            `${toDateString(record.date)}T${checkOutTime}:00`
          ).toISOString()
        : null

      const res = await fetch("/api/superadmin/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          checkInTime: checkInISO,
          checkOutTime: checkOutISO,
          status,
          notes: notes || null,
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
            <Pencil className="h-5 w-5 text-amber-400" />
            Edit Record Absensi
          </DialogTitle>
          <DialogDescription>
            {record && (
              <span className="inline-flex items-center gap-2">
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/85">
                  {toDateString(record.date)}
                </span>
                <span className="text-white/50">
                  —{" "}
                  {format(new Date(record.date), "dd MMMM yyyy", {
                    locale: idLocale,
                  })}
                </span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Check-in" htmlFor="edit-check-in">
                <Input
                  id="edit-check-in"
                  type="time"
                  variant="glass"
                  value={checkInTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCheckInTime(e.target.value)
                  }
                />
              </FormField>
              <FormField label="Check-out" htmlFor="edit-check-out">
                <Input
                  id="edit-check-out"
                  type="time"
                  variant="glass"
                  value={checkOutTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCheckOutTime(e.target.value)
                  }
                />
              </FormField>
            </div>

            <FormField label="Status" htmlFor="edit-status" required>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as AttendanceStatus)}
              >
                <SelectTrigger id="edit-status" variant="glass">
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

            <FormField label="Catatan" htmlFor="edit-notes">
              <Textarea
                id="edit-notes"
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

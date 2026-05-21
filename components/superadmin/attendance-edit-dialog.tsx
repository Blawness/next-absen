"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Loader2 } from "lucide-react"
import { format } from "date-fns"
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

export function AttendanceEditDialog({ open, record, onClose, onSaved }: Props) {
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
      // Construct as local time (no Z suffix) so toISOString() converts correctly.
      // Using `Z` would treat the user's input as UTC, shifting it by the timezone offset.
      const checkInISO = checkInTime
        ? new Date(`${toDateString(record.date)}T${checkInTime}:00`).toISOString()
        : null
      const checkOutISO = checkOutTime
        ? new Date(`${toDateString(record.date)}T${checkOutTime}:00`).toISOString()
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Record Absensi</DialogTitle>
          <DialogDescription>
            {record && (
              <span>
                {toDateString(record.date)} — {format(new Date(record.date), "dd MMM yyyy")}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in</Label>
              <Input
                type="time"
                value={checkInTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCheckInTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Check-out</Label>
              <Input
                type="time"
                value={checkOutTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCheckOutTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">{STATUS_LABELS.present}</SelectItem>
                <SelectItem value="late">{STATUS_LABELS.late}</SelectItem>
                <SelectItem value="absent">{STATUS_LABELS.absent}</SelectItem>
                <SelectItem value="half_day">{STATUS_LABELS.half_day}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Catatan</Label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px]"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Catatan..."
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              {MESSAGES.CANCEL}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {MESSAGES.SAVE}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

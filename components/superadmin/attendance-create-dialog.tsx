"use client"

import { useState, useCallback } from "react"
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
      if (res.ok) {
        setUsers(await res.json())
      }
    } catch {
      // silent
    }
  }, [])

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
      return
    }
    loadUsers()
    setDate(new Date().toISOString().split("T")[0])
    setCheckInTime("")
    setCheckOutTime("")
    setStatus("present")
    setNotes("")
    setSelectedUserId("")
    setError("")
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
      const checkInISO = checkInTime
        ? `${date}T${checkInTime}:00.000Z`
        : null
      const checkOutISO = checkOutTime
        ? `${date}T${checkOutTime}:00.000Z`
        : null

      const res = await fetch("/api/superadmin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          date: new Date(date).toISOString(),
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Record Absensi</DialogTitle>
          <DialogDescription>
            Buat record absensi manual untuk user
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
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
          </div>
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <Input
              type="date"
              value={date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
            />
          </div>
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

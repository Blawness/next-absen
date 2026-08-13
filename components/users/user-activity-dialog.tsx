"use client"

import { useEffect, useState, useCallback } from "react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState } from "@/components/ui/empty-state"
import { Loader2, Activity, Calendar, Clock } from "lucide-react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface ActivityLog {
  id: string
  action: string
  resourceType: string
  resourceId: string
  details: Record<string, unknown>
  createdAt: string
}

interface UserActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
}

export function UserActivityDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: UserActivityDialogProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const limit = 20

  const loadActivities = useCallback(
    async (currentOffset: number) => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/users/${userId}/activity?limit=${limit}&offset=${currentOffset}`
        )
        if (response.ok) {
          const data = await response.json()
          if (currentOffset === 0) {
            setActivities(data.activities)
          } else {
            setActivities((prev) => [...prev, ...data.activities])
          }
          setHasMore(data.pagination.hasMore)
          setOffset(currentOffset)
        }
      } catch (error) {
        console.error("Error loading activities:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [userId]
  )

  useEffect(() => {
    if (open) {
      loadActivities(0)
    } else {
      setActivities([])
      setOffset(0)
    }
  }, [open, loadActivities])

  const loadMore = () => loadActivities(offset + limit)

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      check_in: "Check-in",
      check_out: "Check-out",
      CREATE_USER: "Buat user",
      UPDATE_USER: "Update user",
      DELETE_USER: "Hapus user",
      ACTIVATE_USER: "Aktifkan user",
      DEACTIVATE_USER: "Nonaktifkan user",
      RESET_PASSWORD: "Reset password",
      update_profile: "Update profil",
      change_password: "Ubah password",
      EXPORT_USERS: "Export data user",
      UPDATE_SETTINGS: "Update pengaturan",
      MANAGE_ATTENDANCE: "Kelola absensi",
      CREATE_API_KEY: "Buat API key",
      UPDATE_API_KEY: "Update API key",
      REVOKE_API_KEY: "Cabut API key",
      DELETE_API_KEY: "Hapus API key",
      EXTERNAL_API_AUTO_CHECKIN: "Auto check-in (external)",
      EXTERNAL_API_READ_ATTENDANCE: "Baca absensi (external)",
    }
    return labels[action] || action
  }

  const getActionColor = (action: string): string => {
    const lower = action.toLowerCase()
    if (lower.includes("delete") || lower.includes("deactivate") || lower.includes("revoke"))
      return "text-rose-300"
    if (lower.includes("create") || lower.includes("activate"))
      return "text-emerald-300"
    if (lower.includes("update") || lower.includes("reset") || lower.includes("change"))
      return "text-amber-300"
    return "text-sky-300"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="flex flex-col">
        <DialogHeader>
          <DialogTitle>
            <Activity className="h-5 w-5 text-sky-400" />
            Log Aktivitas
          </DialogTitle>
          <DialogDescription>
            Riwayat aktivitas untuk{" "}
            <span className="font-semibold text-white">{userName}</span>
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="p-0">
          <ScrollArea className="h-[min(60vh,480px)] px-6">
            {isLoading && activities.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-white/40" />
              </div>
            ) : activities.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-7 w-7" />}
                title="Belum ada aktivitas"
                description="Aktivitas user akan muncul di sini secara real-time."
              />
            ) : (
              <div className="space-y-2.5 py-1">
                {activities.map((activity, idx) => (
                  <div
                    key={activity.id}
                    className="relative animate-fade-up pl-5"
                    style={{ animationDelay: `${Math.min(idx, 8) * 30}ms` }}
                  >
                    <div className="absolute bottom-0 left-0 top-0 w-px bg-gradient-to-b from-emerald-500/30 via-white/10 to-transparent" />
                    <div className="absolute left-[-3px] top-3 h-1.5 w-1.5 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 shadow shadow-emerald-500/30" />
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:border-white/10 hover:bg-white/5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium ${getActionColor(activity.action)}`}
                          >
                            {getActionLabel(activity.action)}
                          </p>
                          {activity.details &&
                            Object.keys(activity.details).length > 0 && (
                              <div className="mt-1.5 space-y-0.5 text-xs text-white/55">
                                {Object.entries(activity.details).map(
                                  ([key, value]) => (
                                    <div key={key} className="truncate">
                                      <span className="text-white/35">
                                        {key}:
                                      </span>{" "}
                                      {String(value)}
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                        </div>
                        <div className="flex flex-shrink-0 flex-col items-end gap-0.5 text-[11px] text-white/50">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(
                              new Date(activity.createdAt),
                              "dd MMM yyyy",
                              { locale: idLocale }
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(
                              new Date(activity.createdAt),
                              "HH:mm:ss"
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogBody>

        {activities.length > 0 && (
          <DialogFooter className="justify-between sm:justify-between">
            <p className="text-xs text-white/50">
              Menampilkan {activities.length}
              {hasMore ? "+ aktivitas" : " aktivitas"}
            </p>
            {hasMore ? (
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={isLoading}
                className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Memuat...
                  </>
                ) : (
                  "Muat Lebih"
                )}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-white/65 hover:bg-white/10 hover:text-white"
              >
                Tutup
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

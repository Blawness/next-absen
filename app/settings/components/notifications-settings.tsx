"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Bell, Save, Mail, Clock, FileText } from "lucide-react"
import { motion } from "framer-motion"
import { SystemSettings } from "../types"

interface NotificationsSettingsProps {
  settings: SystemSettings | null
  isSaving: boolean
  onUpdateSettings: (section: keyof SystemSettings, field: string, value: unknown) => void
  onSave: () => void
}

export const NotificationsSettings = ({ settings, isSaving, onUpdateSettings, onSave }: NotificationsSettingsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Bell className="h-5 w-5" />
            Pengaturan Notifikasi
          </CardTitle>
          <CardDescription className="text-white/70">
            Kelola preferensi notifikasi email dan sistem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-400" />
                  <Label htmlFor="emailNotifications" className="text-white font-medium">
                    Notifikasi Email
                  </Label>
                </div>
                <p className="text-sm text-white/60">
                  Kirim notifikasi email untuk aktivitas sistem penting
                </p>
              </div>
              <Switch
                id="emailNotifications"
                checked={settings?.notifications.emailNotifications || false}
                onCheckedChange={(checked) => onUpdateSettings('notifications', 'emailNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-400" />
                  <Label htmlFor="lateCheckinReminders" className="text-white font-medium">
                    Pengingat Check-in Terlambat
                  </Label>
                </div>
                <p className="text-sm text-white/60">
                  Kirim pengingat jika pengguna belum check-in setelah batas waktu
                </p>
              </div>
              <Switch
                id="lateCheckinReminders"
                checked={settings?.notifications.lateCheckinReminders || false}
                onCheckedChange={(checked) => onUpdateSettings('notifications', 'lateCheckinReminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-400" />
                  <Label htmlFor="dailySummaryEmail" className="text-white font-medium">
                    Ringkasan Harian
                  </Label>
                </div>
                <p className="text-sm text-white/60">
                  Kirim ringkasan absensi harian ke admin setiap hari
                </p>
              </div>
              <Switch
                id="dailySummaryEmail"
                checked={settings?.notifications.dailySummaryEmail || false}
                onCheckedChange={(checked) => onUpdateSettings('notifications', 'dailySummaryEmail', checked)}
              />
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-300">Tips Notifikasi</h4>
                <ul className="text-xs text-blue-200 space-y-1">
                  <li>• Notifikasi email dikirim ke alamat admin yang terdaftar</li>
                  <li>• Pengingat terlambat dikirim 30 menit setelah batas waktu check-in</li>
                  <li>• Ringkasan harian dikirim setiap pukul 18:00 WIB</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-100 hover:text-white"
            >
              {isSaving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                  />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Pengaturan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

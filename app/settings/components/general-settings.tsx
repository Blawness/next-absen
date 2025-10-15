"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Clock, Save } from "lucide-react"
import { motion } from "framer-motion"
import { SystemSettings } from "../types"

interface GeneralSettingsProps {
  settings: SystemSettings | null
  isSaving: boolean
  onUpdateSettings: (section: keyof SystemSettings, field: string, value: unknown) => void
  onSave: () => void
}

export const GeneralSettings = ({ settings, isSaving, onUpdateSettings, onSave }: GeneralSettingsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Clock className="h-5 w-5" />
            Jam Kerja
          </CardTitle>
          <CardDescription className="text-white/70">
            Konfigurasi jam kerja dan batas waktu absensi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Jam Mulai Kerja</Label>
              <Input
                id="startTime"
                type="time"
                variant="glass"
                value={settings?.businessHours.startTime || "08:00"}
                onChange={(e) => onUpdateSettings('businessHours', 'startTime', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" className="text-white">Jam Selesai Kerja</Label>
              <Input
                id="endTime"
                type="time"
                variant="glass"
                value={settings?.businessHours.endTime || "17:00"}
                onChange={(e) => onUpdateSettings('businessHours', 'endTime', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkInDeadline" className="text-white">Batas Waktu Check-in</Label>
              <Input
                id="checkInDeadline"
                type="time"
                variant="glass"
                value={settings?.businessHours.checkInDeadline || "09:00"}
                onChange={(e) => onUpdateSettings('businessHours', 'checkInDeadline', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gracePeriod" className="text-white">Grace Period (menit)</Label>
              <Input
                id="gracePeriod"
                type="number"
                min="0"
                max="60"
                variant="glass"
                value={settings?.businessHours.gracePeriodMinutes || 15}
                onChange={(e) => onUpdateSettings('businessHours', 'gracePeriodMinutes', parseInt(e.target.value))}
              />
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

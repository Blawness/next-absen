"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Clock, LogOut, Save } from "lucide-react"
import { SystemSettings } from "../types"

interface GeneralSettingsProps {
  settings: SystemSettings | null
  isSaving: boolean
  onUpdateSettings: (section: keyof SystemSettings, field: string, value: unknown) => void
  onSave: () => void
}

export const GeneralSettings = ({ settings, isSaving, onUpdateSettings, onSave }: GeneralSettingsProps) => {
  return (
    <div className="animate-slide-left anim-delay-300">
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

          <div className="space-y-4 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <LogOut className="h-4 w-4 text-emerald-400" />
                  <Label htmlFor="autoCheckoutEnabled" className="text-white font-medium">
                    Auto Check-out
                  </Label>
                </div>
                <p className="text-sm text-white/60">
                  Tutup otomatis absensi yang lupa di-checkout setelah melebihi batas jam kerja
                </p>
              </div>
              <Switch
                id="autoCheckoutEnabled"
                checked={settings?.businessHours.autoCheckoutEnabled ?? false}
                onCheckedChange={(checked) => onUpdateSettings('businessHours', 'autoCheckoutEnabled', checked)}
                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-white/20 [&>span]:bg-white [&>span]:shadow-lg [&>span]:border-2 [&>span]:border-white/30"
              />
            </div>

            {settings?.businessHours.autoCheckoutEnabled && (
              <div className="space-y-2">
                <Label htmlFor="maxWorkHours" className="text-white">Maksimal Jam Kerja</Label>
                <Input
                  id="maxWorkHours"
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  variant="glass"
                  value={settings?.businessHours.maxWorkHours ?? 12}
                  onChange={(e) => onUpdateSettings('businessHours', 'maxWorkHours', parseFloat(e.target.value))}
                />
                <p className="text-sm text-white/60">
                  Absensi ditutup pada jam check-in + {settings?.businessHours.maxWorkHours ?? 12} jam, berapa pun waktu sistem mendeteksinya
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-100 hover:text-white"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2 animate-spin" />
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
    </div>
  )
}

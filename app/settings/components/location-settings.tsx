"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { MapPin, Save, Map } from "lucide-react"
import { motion } from "framer-motion"
import { SystemSettings } from "../types"

interface LocationSettingsProps {
  settings: SystemSettings | null
  isSaving: boolean
  onUpdateSettings: (section: keyof SystemSettings, field: string, value: unknown) => void
  onSave: () => void
}

export const LocationSettings = ({ settings, isSaving, onUpdateSettings, onSave }: LocationSettingsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MapPin className="h-5 w-5" />
            Pengaturan Lokasi
          </CardTitle>
          <CardDescription className="text-white/70">
            Konfigurasi geofence dan persyaratan lokasi untuk absensi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude" className="text-white">Latitude Kantor</Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                variant="glass"
                value={settings?.location.officeLatitude || 0}
                onChange={(e) => onUpdateSettings('location', 'officeLatitude', parseFloat(e.target.value))}
                placeholder="-6.2088"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude" className="text-white">Longitude Kantor</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                variant="glass"
                value={settings?.location.officeLongitude || 0}
                onChange={(e) => onUpdateSettings('location', 'officeLongitude', parseFloat(e.target.value))}
                placeholder="106.8456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="radius" className="text-white">Radius Geofence (meter)</Label>
              <Input
                id="radius"
                type="number"
                min="10"
                max="1000"
                variant="glass"
                value={settings?.location.geofenceRadius || 100}
                onChange={(e) => onUpdateSettings('location', 'geofenceRadius', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="space-y-1">
              <Label htmlFor="requireLocation" className="text-white font-medium">
                Wajibkan Lokasi untuk Absensi
              </Label>
              <p className="text-sm text-white/60">
                Pengguna harus berada dalam radius geofence untuk check-in/out
              </p>
            </div>
            <Switch
              id="requireLocation"
              checked={settings?.location.requireLocation || false}
              onCheckedChange={(checked) => onUpdateSettings('location', 'requireLocation', checked)}
              className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-white/20 [&>span]:bg-white [&>span]:shadow-lg [&>span]:border-2 [&>span]:border-white/30"
            />
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Map className="h-5 w-5 text-blue-400" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-300">Koordinat Kantor Saat Ini</p>
              <p className="text-xs text-blue-200">
                Lat: {settings?.location.officeLatitude || 0}, Lng: {settings?.location.officeLongitude || 0}
              </p>
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

"use client"

import { Label } from "@/components/ui/label"

interface DateInputProps {
  id: string
  label: string
  value: string
  min?: string
  max?: string
  onChange: (value: string) => void
}

export const DateInput = ({ id, label, value, min, max, onChange }: DateInputProps) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-xs font-medium text-white/70">
      {label}
    </Label>
    <input
      id={id}
      type="date"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      // Open the picker on a click anywhere in the field, not just the icon.
      onClick={(e) => e.currentTarget.showPicker?.()}
      className="flex h-10 w-full cursor-pointer rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
    />
  </div>
)

"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"

export function KpiFilters({ onChange }: { onChange: (period: "weekly" | "monthly") => void }) {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly")
  const [isPending, startTransition] = useTransition()

  const switchPeriod = (p: "weekly" | "monthly") => {
    setPeriod(p)
    startTransition(() => onChange(p))
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant={period === "weekly" ? "default" : "outline"} onClick={() => switchPeriod("weekly")} disabled={isPending}>
        Mingguan
      </Button>
      <Button variant={period === "monthly" ? "default" : "outline"} onClick={() => switchPeriod("monthly")} disabled={isPending}>
        Bulanan
      </Button>
    </div>
  )
}




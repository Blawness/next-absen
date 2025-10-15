"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { BarChart3, Users, Clock, TrendingUp } from "lucide-react"
import { ReportSummary } from "../types"
import { motion } from "framer-motion"

interface StatCardsProps {
  summary: ReportSummary
}

export const StatCards = ({ summary }: StatCardsProps) => {
  const cards = [
    {
      title: "Total Record",
      value: summary.totalRecords,
      description: "Data absensi dalam periode",
      icon: BarChart3,
      color: "text-white/70"
    },
    {
      title: "Total Pengguna",
      value: summary.totalUsers,
      description: "Pengguna dengan data absensi",
      icon: Users,
      color: "text-white/70"
    },
    {
      title: "Total Jam Kerja",
      value: `${summary.totalWorkHours}j`,
      description: `Rata-rata ${summary.averageWorkHours}j per hari`,
      icon: Clock,
      color: "text-white/70"
    },
    {
      title: "Lembur",
      value: `${summary.totalOvertimeHours}j`,
      description: "Total jam lembur",
      icon: TrendingUp,
      color: "text-white/70"
    }
  ]

  return (
    <motion.div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title} variant="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium text-white">
                {card.title}
              </h3>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <p className="text-xs text-white/60">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </motion.div>
  )
}

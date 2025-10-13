"use client"

import { motion } from "framer-motion"
import { Trash2, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface DataTableBulkActionsProps {
  selectedCount: number
  show: boolean
  onBulkDelete: () => void
  onBulkToggleStatus: () => void
}

export function DataTableBulkActions({
  selectedCount,
  show,
  onBulkDelete,
  onBulkToggleStatus,
}: DataTableBulkActionsProps) {
  if (!show) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <Card variant="glass" className="rounded-2xl">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/80">
              {selectedCount} pengguna dipilih
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkToggleStatus}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Toggle Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkDelete}
                className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}




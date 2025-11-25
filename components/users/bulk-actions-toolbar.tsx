"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { X, UserCheck, UserX, Trash2 } from "lucide-react"

interface BulkActionsToolbarProps {
    selectedCount: number
    onClearSelection: () => void
    onActivate: () => void
    onDeactivate: () => void
    onDelete: () => void
}

export function BulkActionsToolbar({
    selectedCount,
    onClearSelection,
    onActivate,
    onDeactivate,
    onDelete
}: BulkActionsToolbarProps) {
    if (selectedCount === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-4 mb-4 border-2 border-blue-500/30"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-400">{selectedCount}</span>
                        </div>
                        <span className="text-white font-medium">
                            {selectedCount} user{selectedCount > 1 ? 's' : ''} selected
                        </span>
                    </div>

                    <div className="h-6 w-px bg-white/20" />

                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onActivate}
                            className="bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                        >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Activate
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onDeactivate}
                            className="bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20"
                        >
                            <UserX className="h-4 w-4 mr-2" />
                            Deactivate
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onDelete}
                            className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
                    </div>
                </div>

                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onClearSelection}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                </Button>
            </div>
        </motion.div>
    )
}

"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertCircle, Download, Eye, FileText, Loader2 } from "lucide-react"
import { Message } from "../types"

interface ExportActionsProps {
  isExporting: boolean
  message: Message | null
  onExport: (format: 'csv' | 'pdf') => void
  onPreview: () => void
}

const segmentClass =
  "h-9 rounded-none border-0 bg-transparent px-3 text-white/80 hover:scale-100 hover:bg-white/10 hover:text-white active:scale-100"

export const ExportActions = ({ isExporting, message, onExport, onPreview }: ExportActionsProps) => (
  <div className="flex flex-col items-start gap-1.5 sm:items-end">
    <div
      role="group"
      aria-label="Export laporan"
      className="inline-flex divide-x divide-white/15 overflow-hidden rounded-md border border-white/20 bg-white/5"
    >
      <Button variant="ghost" size="sm" onClick={() => onExport('csv')} disabled={isExporting} className={segmentClass}>
        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
        CSV
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onExport('pdf')} disabled={isExporting} className={segmentClass}>
        <FileText className="mr-2 h-4 w-4" />
        PDF
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onPreview}
        disabled={isExporting}
        className={segmentClass}
        title="Preview PDF di tab baru"
        aria-label="Preview PDF"
      >
        <Eye className="h-4 w-4" />
      </Button>
    </div>

    <p aria-live="polite" className="min-h-4 text-xs">
      {message && (
        <span className={`inline-flex items-center gap-1 ${message.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
          {message.type === 'success'
            ? <CheckCircle2 className="h-3.5 w-3.5" />
            : <AlertCircle className="h-3.5 w-3.5" />}
          {message.text}
        </span>
      )}
    </p>
  </div>
)

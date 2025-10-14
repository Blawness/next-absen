"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Eye, Loader2, FileText } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface ReportRecord {
  id: string
  date: Date
  user: {
    id: string
    name: string
    department: string | null
    position: string | null
    email: string
  }
  checkInTime: Date | null
  checkOutTime: Date | null
  checkInAddress: string | null
  checkOutAddress: string | null
  workHours: number | null
  overtimeHours: number | null
  lateMinutes: number | null
  status: string
  notes: string | null
}

interface PDFPreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  records: ReportRecord[]
  filters: {
    startDate: string
    endDate: string
    userId: string
    department: string
    status: string
  }
  onExport: (format: 'pdf') => Promise<void>
  isExporting: boolean
}

export function PDFPreviewDialog({
  isOpen,
  onClose,
  records,
  filters,
  onExport,
  isExporting
}: PDFPreviewDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const generatePreview = async () => {
    setIsGenerating(true)
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.department) params.append('department', filters.department)
      if (filters.status) params.append('status', filters.status)
      params.append('format', 'pdf')
      params.append('preview', 'true')

      const response = await fetch(`/api/reports/export?${params.toString()}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
      }
    } catch (error) {
      console.error('Error generating preview:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = async () => {
    await onExport('pdf')
    onClose()
  }

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Preview Laporan PDF
          </DialogTitle>
          <DialogDescription>
            Pratinjau laporan sebelum mengunduh. Pastikan layout terlihat benar sebelum export.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {!previewUrl && !isGenerating && (
            <div className="flex flex-col items-center justify-center h-96 text-center space-y-4">
              <div className="bg-white/5 backdrop-blur-sm rounded-full p-6 w-24 h-24 flex items-center justify-center">
                <Eye className="h-12 w-12 text-white/40" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Generate Preview</h3>
                <p className="text-white/60 max-w-md">
                  Klik tombol di bawah untuk menghasilkan pratinjau PDF sebelum mengunduh.
                </p>
              </div>
              <Button onClick={generatePreview} variant="glass" className="bg-white/10 hover:bg-white/20 border-white/20">
                <Eye className="h-4 w-4 mr-2" />
                Generate Preview
              </Button>
            </div>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center h-96 text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-white/60" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Menghasilkan Preview...</h3>
                <p className="text-white/60">Mohon tunggu sebentar</p>
              </div>
            </div>
          )}

          {previewUrl && (
            <div className="h-full">
              <iframe
                src={previewUrl}
                className="w-full h-full min-h-[600px] border border-white/10 rounded-lg bg-white"
                title="PDF Preview"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center">
          <div className="flex items-center gap-4 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {records.length} Records
              </Badge>
            </div>
            {filters.startDate && filters.endDate && (
              <div className="flex items-center gap-2">
                <span>Periode:</span>
                <Badge variant="outline" className="text-xs">
                  {format(new Date(filters.startDate), 'dd MMM', { locale: id })} - {format(new Date(filters.endDate), 'dd MMM yyyy', { locale: id })}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {!isGenerating && previewUrl && (
              <Button
                variant="outline"
                onClick={generatePreview}
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
              >
                <Eye className="h-4 w-4 mr-2" />
                Refresh Preview
              </Button>
            )}
            <Button
              variant="glass"
              onClick={handleExport}
              disabled={isExporting || isGenerating}
              className="bg-white/10 hover:bg-white/20 border-white/20"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

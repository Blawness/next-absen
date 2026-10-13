import { AttendanceStatus } from "@prisma/client"
import { STATUS_LABELS } from "@/lib/constants"

/** One colour per status, used by the bar, the legend, the dots and the table badges alike. */
export const STATUS_STYLE: Record<AttendanceStatus, { label: string; dot: string; badge: string }> = {
  present: {
    label: STATUS_LABELS.present,
    dot: "bg-emerald-400",
    badge: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  },
  late: {
    label: STATUS_LABELS.late,
    dot: "bg-amber-400",
    badge: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  },
  half_day: {
    label: STATUS_LABELS.half_day,
    dot: "bg-sky-400",
    badge: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  },
  absent: {
    label: STATUS_LABELS.absent,
    dot: "bg-rose-400",
    badge: "border-rose-500/30 bg-rose-500/15 text-rose-300",
  },
}

/** Display order: best outcome first. */
export const STATUS_ORDER: AttendanceStatus[] = ["present", "late", "half_day", "absent"]

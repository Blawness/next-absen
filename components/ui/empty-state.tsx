import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  /** Lucide icon component or any React node */
  icon?: React.ReactNode
  /** Title — main message */
  title: string
  /** Description — secondary message */
  description?: string
  /** Optional action element (e.g. button) */
  action?: React.ReactNode
  /** Override default icon background color class */
  iconClassName?: string
  className?: string
  /** Compact mode for table cells */
  compact?: boolean
}

/**
 * Reusable empty state component — consistent visual across all
 * modals, tables, and page sections.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  iconClassName,
  className,
  compact = false,
}: EmptyStateProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center text-center",
          className
        )}
      >
        {icon && (
          <div
            className={cn(
              "mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/40",
              iconClassName
            )}
          >
            {icon}
          </div>
        )}
        <p className="text-sm font-medium text-white/70">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-white/45">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-10 text-center",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400/70",
            iconClassName
          )}
        >
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-white/85">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-white/50">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

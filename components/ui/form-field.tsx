"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  /** Field label text */
  label: string
  /** Optional hint/help text shown below input */
  hint?: string
  /** Error message — replaces hint when set */
  error?: string
  /** Optional required indicator override */
  required?: boolean
  /** Field id — used for htmlFor wiring */
  htmlFor?: string
  /** Optional left-side adornment (e.g. icon) in the field row */
  leftAdornment?: React.ReactNode
  /** The form control (Input, Select, textarea...) */
  children: React.ReactNode
  className?: string
}

/**
 * Standardised form field wrapper — keeps label, control, and
 * hint/error typography consistent across all dialogs.
 */
export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, hint, error, required, htmlFor, leftAdornment, children, className }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-1.5", className)}>
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/65"
        >
          {label}
          {required && <span className="text-rose-400">*</span>}
        </label>
        <div className="relative">
          {leftAdornment && (
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-white/40">
              {leftAdornment}
            </div>
          )}
          {children}
        </div>
        {(error || hint) && (
          <p
            className={cn(
              "text-xs leading-relaxed",
              error ? "text-rose-400" : "text-white/45"
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    )
  }
)
FormField.displayName = "FormField"

/**
 * Inline checkbox/row used in dialogs for toggleable options.
 * e.g. "Use custom password" with a switch on the right.
 */
interface FormToggleRowProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FormToggleRow({
  title,
  description,
  children,
  className,
}: FormToggleRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/5",
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-white/90">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-white/55">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

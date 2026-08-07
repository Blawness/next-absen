import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "glass"
  /** Reserve space for a left icon (used with FormField leftAdornment) */
  hasLeftIcon?: boolean
  invalid?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", hasLeftIcon, invalid, ...props }, ref) => {
    return (
      <input
        type={type}
        aria-invalid={invalid || undefined}
        className={cn(
          // Base — shared by both variants
          "flex h-10 w-full rounded-xl text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50",
          // Glass variant — used inside dialogs
          variant === "glass"
            ? "border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:border-emerald-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            : "border border-input bg-background px-3 py-2 text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          hasLeftIcon && "pl-10",
          invalid && "border-rose-500/50 focus:border-rose-500/60 focus:ring-rose-500/20",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

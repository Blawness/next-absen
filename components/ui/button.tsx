/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        glass: "glass-button text-white font-semibold shadow-lg",
        glassOutline: "border-2 border-white/20 bg-white/10 backdrop-blur-md text-white hover:bg-white/20",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  animate?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, animate = true, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    const motionVariants = {
      tap: { scale: 0.95 },
      hover: {
        scale: 1.05,
        transition: { duration: 0.2 }
      }
    }

    const ButtonComponent = (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )

    return animate ? (
      <motion.button
        variants={motionVariants}
        whileHover="hover"
        whileTap="tap"
        className={cn(buttonVariants({ variant, size }), className)}
        {...(props as any)}
      />
    ) : ButtonComponent
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

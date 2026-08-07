import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Table size variants — controls cell padding.
 * - sm: tight (lists, settings)
 * - md: default
 * - lg: spacious (cards, reports)
 */
const tableSizeVariants = cva("", {
  variants: {
    size: {
      sm: "[&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2",
      md: "[&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3",
      lg: "[&_td]:px-4 [&_td]:py-3.5 [&_th]:px-4 [&_th]:py-3.5",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

interface TableProps
  extends React.HTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableSizeVariants> {
  /** Use table-fixed layout for predictable column widths */
  fixed?: boolean
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, size, fixed, ...props }, ref) => (
    <div className="relative w-full overflow-x-auto">
      <table
        ref={ref}
        className={cn(
          "w-full caption-bottom text-sm",
          fixed && "table-fixed",
          tableSizeVariants({ size }),
          className
        )}
        {...props}
      />
    </div>
  )
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "border-b border-white/10 bg-white/5 [&_tr]:border-b-0",
      className
    )}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-b-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-white/10 bg-white/5 font-medium text-white/80",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-white/5 transition-colors hover:bg-white/5 data-[state=selected]:bg-emerald-500/10",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "text-left align-middle text-xs font-semibold uppercase tracking-wider text-white/55 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "align-middle text-white/85 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-white/55", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

/** Empty state slot — used by tables to render a no-data message. */
function TableEmpty({
  children,
  colSpan,
  className,
}: {
  children: React.ReactNode
  colSpan: number
  className?: string
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className={cn("h-48 text-center", className)}
      >
        {children}
      </TableCell>
    </TableRow>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableEmpty,
}

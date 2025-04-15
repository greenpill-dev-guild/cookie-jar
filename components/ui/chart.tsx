"use client"

import * as React from "react"
import type { TooltipProps } from "recharts"
import { cn } from "@/lib/utils"

// Chart container with CSS variables for colors
export function ChartContainer({
  children,
  config,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  config?: Record<string, { label: string; color: string }>
}) {
  // Create CSS variables for each data key
  const style = React.useMemo(() => {
    if (!config) return {}

    return Object.entries(config).reduce(
      (acc, [key, value]) => {
        acc[`--color-${key}`] = value.color
        return acc
      },
      {} as Record<string, string>,
    )
  }, [config])

  return (
    <div className={cn("w-full", className)} style={style} {...props}>
      {children}
    </div>
  )
}

// Tooltip component for charts
export function ChartTooltip<T>({
  className,
  ...props
}: React.ComponentProps<"div"> & {
  payload?: TooltipProps<number, string>["payload"]
  label?: string
  active?: boolean
}) {
  if (!props.active || !props.payload?.length) {
    return null
  }

  return <div className={cn("rounded-lg border border-[#4a3520] bg-[#3c2a14] p-2 shadow-sm", className)} {...props} />
}

// Tooltip content component
export function ChartTooltipContent<T>({
  active,
  payload,
  label,
  className,
  ...props
}: TooltipProps<number, string> & React.ComponentProps<"div">) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className={cn("rounded-lg border border-[#4a3520] bg-[#3c2a14] p-2 shadow-sm", className)} {...props}>
      <div className="text-sm font-medium text-[#ff5e14]">{label}</div>
      <div className="mt-1 flex flex-col gap-0.5">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color || `var(--color-${item.dataKey})` }}
            />
            <span className="text-[#a89a8c]">{item.name || item.dataKey}:</span>
            <span className="font-medium text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

import type React from "react"
import {
  BarChart as RechartsBarChart,
  PieChart as RechartsPieChart,
  Bar as RechartsBar,
  Pie as RechartsPie,
  Cell as RechartsCell,
  Tooltip as RechartsTooltip,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  ResponsiveContainer as RechartsResponsiveContainer,
} from "recharts"

type ChartProps = {
  children?: React.ReactNode
  [key: string]: any
}

export const BarChart = ({ children, ...props }: ChartProps) => {
  return <RechartsBarChart {...props}>{children}</RechartsBarChart>
}

export const PieChart = ({ children, ...props }: ChartProps) => {
  return <RechartsPieChart {...props}>{children}</RechartsPieChart>
}

export const ResponsiveContainer = ({ children, ...props }: ChartProps) => {
  return <RechartsResponsiveContainer {...props}>{children as React.ReactElement}</RechartsResponsiveContainer>
}

export const Bar = (props: any) => {
  return <RechartsBar {...props} />
}

export const Pie = (props: any) => {
  return <RechartsPie {...props} />
}

export const Cell = (props: any) => {
  return <RechartsCell {...props} />
}

export const Tooltip = (props: any) => {
  return <RechartsTooltip {...props} />
}

export const XAxis = (props: any) => {
  return <RechartsXAxis {...props} />
}

export const YAxis = (props: any) => {
  return <RechartsYAxis {...props} />
}


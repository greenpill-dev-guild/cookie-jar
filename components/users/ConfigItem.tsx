"use client"

import type React from "react"
import { CheckCircle2, XCircle } from "lucide-react"

interface ConfigItemProps {
  label: string
  value: string | number | boolean
  highlight?: boolean
  boolean?: boolean
}

export const ConfigItem: React.FC<ConfigItemProps> = ({ label, value, highlight, boolean }) => {
  return (
    <div className={`flex flex-col space-y-1 ${highlight ? "bg-muted/30 p-3 rounded-md" : ""}`}>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="font-medium flex items-center">
        {boolean &&
          (value === "Yes" ? (
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 mr-2 text-red-500" />
          ))}
        <span>{value}</span>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LoadingOverlayProps {
  message?: string
  isOpen: boolean
  onClose?: () => void
}

export function LoadingOverlay({ message = "Processing...", isOpen, onClose }: LoadingOverlayProps) {
  // If component is mounted
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-transparent rounded-lg p-6 max-w-md w-full flex flex-col items-center">
        {/* Always show the close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
          onClick={() => onClose && onClose()}
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="content">
          <div className="pill">
            <div className="medicine">
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
            </div>
            <div className="side"></div>
            <div className="side"></div>
          </div>
        </div>

        <p className="text-white text-xl font-medium mt-4">{message}</p>
      </div>
    </div>
  )
}

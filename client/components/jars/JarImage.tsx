"use client"

import { useState, useEffect } from "react"
import { Image as ImageIcon } from "lucide-react"
import Image from "next/image"

interface JarImageProps {
  metadata?: string
  jarName: string
}

export function JarImage({ metadata, jarName }: JarImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  
  useEffect(() => {
    if (metadata) {
      try {
        const parsed = JSON.parse(metadata)
        if (parsed.image) {
          setImageUrl(parsed.image)
          setImageError(false)
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  }, [metadata])
  
  if (!imageUrl || imageError) {
    return (
      <div className="w-full h-40 bg-[hsl(var(--cj-warm-white))] flex items-center justify-center relative overflow-hidden m-0">
        <div className="absolute inset-0">
          <Image
            src="/images/cookie-jar.png"
            alt="Cookie Jar Placeholder"
            fill
            className="object-cover opacity-30"
          />
        </div>
        <div className="relative z-10 text-center text-[hsl(var(--cj-brand-orange))]">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-80" />
          <span className="text-sm font-medium">Cookie Jar</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-40 bg-[hsl(var(--cj-warm-white))] overflow-hidden m-0">
      <Image
        src={imageUrl}
        alt={jarName}
        fill
        className="object-cover transition-transform duration-200 group-hover:scale-105"
        onError={() => setImageError(true)}
      />
    </div>
  )
}

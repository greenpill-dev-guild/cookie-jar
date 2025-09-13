"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'

interface VirtualGridProps<T> {
  /** Array of items to display */
  items: T[]
  /** Height of each item in pixels */
  itemHeight: number
  /** Width of each item in pixels */
  itemWidth: number
  /** Number of columns */
  columns: number
  /** Height of the container */
  containerHeight: number
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode
  /** Optional key extractor function */
  keyExtractor?: (item: T, index: number) => string
  /** Gap between items in pixels */
  gap?: number
  /** Padding around the container */
  padding?: number
  /** Number of extra items to render outside viewport (buffer) */
  overscan?: number
  /** Loading placeholder */
  loadingPlaceholder?: React.ReactNode
  /** Empty state component */
  emptyState?: React.ReactNode
  /** CSS class for the container */
  className?: string
}

/**
 * Virtual Grid Component for efficient rendering of large lists
 * 
 * Features:
 * - Only renders visible items for performance
 * - Supports grid layout with configurable columns
 * - Smooth scrolling with proper scroll position maintenance
 * - Configurable overscan for smoother scrolling
 * - Loading and empty states
 */
export function VirtualGrid<T>({
  items,
  itemHeight,
  itemWidth,
  columns,
  containerHeight,
  renderItem,
  keyExtractor = (_, index) => index.toString(),
  gap = 0,
  padding = 0,
  overscan = 3,
  loadingPlaceholder,
  emptyState,
  className = ""
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Calculate derived values
  const totalRows = Math.ceil(items.length / columns)
  const rowHeight = itemHeight + gap
  const totalHeight = totalRows * rowHeight - gap + (padding * 2)
  const visibleRows = Math.ceil(containerHeight / rowHeight)

  // Calculate which items should be visible
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
    const endRow = Math.min(totalRows - 1, startRow + visibleRows + (overscan * 2))
    
    const start = startRow * columns
    const end = Math.min(items.length - 1, (endRow + 1) * columns - 1)
    const visible = items.slice(start, end + 1)

    return {
      startIndex: start,
      endIndex: end,
      visibleItems: visible
    }
  }, [scrollTop, rowHeight, totalRows, visibleRows, columns, items, overscan])

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop
    setScrollTop(scrollTop)
  }, [])

  // Scroll to specific item
  const scrollToItem = useCallback((itemIndex: number) => {
    const row = Math.floor(itemIndex / columns)
    const targetScrollTop = row * rowHeight
    
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      })
    }
  }, [columns, rowHeight])

  // Empty state
  if (items.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>
  }

  // Loading state
  if (items.length === 0 && loadingPlaceholder) {
    return <div className={className}>{loadingPlaceholder}</div>
  }

  const startRow = Math.floor(startIndex / columns)
  const offsetY = startRow * rowHeight + padding

  return (
    <div
      ref={scrollContainerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Total height spacer */}
      <div style={{ height: totalHeight }}>
        {/* Visible items container */}
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, ${itemWidth}px)`,
            gap: `${gap}px`,
            padding: `0 ${padding}px`,
            justifyContent: 'start'
          }}
        >
          {visibleItems.map((item, relativeIndex) => {
            const absoluteIndex = startIndex + relativeIndex
            const key = keyExtractor(item, absoluteIndex)
            
            return (
              <div
                key={key}
                style={{
                  height: itemHeight,
                  width: itemWidth
                }}
              >
                {renderItem(item, absoluteIndex)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Hook for managing virtual grid state and actions
 */
export function useVirtualGrid<T>(
  items: T[],
  itemHeight: number,
  columns: number,
  containerHeight: number
) {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  
  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items
    
    return items.filter((item, index) => {
      // This is a generic search - you might want to customize this
      const searchString = JSON.stringify(item).toLowerCase()
      return searchString.includes(searchTerm.toLowerCase())
    })
  }, [items, searchTerm])

  // Selection handlers
  const toggleSelection = useCallback((index: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedItems(new Set(filteredItems.map((_, index) => index)))
  }, [filteredItems])

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  return {
    filteredItems,
    selectedItems,
    searchTerm,
    setSearchTerm,
    toggleSelection,
    selectAll,
    clearSelection
  }
}

/**
 * Loading placeholder for virtual grid
 */
export const VirtualGridLoadingPlaceholder: React.FC<{
  rows: number
  columns: number
  itemHeight: number
  itemWidth: number
  gap?: number
}> = ({ rows, columns, itemHeight, itemWidth, gap = 0 }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, ${itemWidth}px)`,
      gap: `${gap}px`
    }}
  >
    {Array.from({ length: rows * columns }, (_, index) => (
      <div
        key={index}
        className="animate-pulse bg-gray-200 rounded-md"
        style={{
          height: itemHeight,
          width: itemWidth
        }}
      />
    ))}
  </div>
)

/**
 * Empty state for virtual grid
 */
export const VirtualGridEmptyState: React.FC<{
  title?: string
  description?: string
  icon?: React.ReactNode
}> = ({
  title = "No items found",
  description = "There are no items to display.",
  icon
}) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {icon && <div className="mb-4 text-gray-400">{icon}</div>}
    <h3 className="text-lg font-medium text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>
  </div>
)

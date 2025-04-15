// Helper function to format seconds to human-readable format
export const formatTimeComponents = (
  totalSeconds: number,
): { days: number; hours: number; minutes: number; seconds: number } => {
  const days = Math.floor(totalSeconds / (24 * 60 * 60))
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds }
}

// Helper function to format time components to human-readable string
export const formatTimeString = (days: number, hours: number, minutes: number, seconds: number): string => {
  const parts = []

  if (days > 0) {
    parts.push(`${days} day${days !== 1 ? "s" : ""}`)
  }

  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`)
  }

  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`)
  }

  if (seconds > 0) {
    parts.push(`${seconds} second${seconds !== 1 ? "s" : ""}`)
  }

  if (parts.length === 0) {
    return "0 seconds"
  }

  return parts.join(", ")
}

// Calculate total seconds from days, hours, minutes, seconds
export const calculateTotalSeconds = (days: number, hours: number, minutes: number, seconds: number): number => {
  return days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds
}

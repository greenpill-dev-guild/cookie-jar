// Format address for display
export const formatAddress = (address: string) => {
  if (!address) return "N/A"
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}

// Format time
export const formatTime = (seconds?: number) => {
  if (!seconds) return "N/A" // Handle undefined values
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return `${hrs}h ${mins}m ${secs}s`
}

// Format values
export const formatValue = (value: any) => {
  if (value === undefined || value === null) return "N/A"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "object" && value.toString) return value.toString()
  return value
}

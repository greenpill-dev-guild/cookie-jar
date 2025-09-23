import { twMerge } from "tailwind-merge";
import { type ClassValue, clsx } from "clsx";

/**
 * Utility function for combining CSS classes with Tailwind merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format address for display - shorter version
 * @param address - The address to format
 * @param chars - Number of characters to show on each side (default: 4)
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

/**
 * Format address for display - standard version
 * @param address - The address to format
 */
export const formatAddress = (address: string) => {
  if (!address) return "N/A";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Format generic values for display
 * @param value - The value to format
 */
export const formatValue = (value: any) => {
  if (value === undefined || value === null) return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object" && value.toString) return value.toString();
  return value;
};

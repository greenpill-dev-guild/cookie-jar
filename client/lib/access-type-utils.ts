/**
 * Utility functions for handling access type mappings
 */

// Access type enum mapping (matches contract enum)
export const ACCESS_TYPES = {
  ALLOWLIST: 0,
  NFT_GATED: 1,
  POAP: 2,
  UNLOCK: 3,
  HYPERCERT: 4,
  HATS: 5,
} as const

export type AccessTypeValue = typeof ACCESS_TYPES[keyof typeof ACCESS_TYPES]

// Array mapping for contract results (index = enum value)
export const ACCESS_TYPE_NAMES = [
  "Allowlist",      // 0
  "NFT-Gated",      // 1
  "POAP",           // 2
  "Unlock",         // 3
  "Hypercert",      // 4
  "Hats"            // 5
] as const

/**
 * Get the display name for an access type
 * @param accessType - The access type number from the contract
 * @returns Human-readable access type name
 */
export function getAccessTypeName(accessType: number): string {
  return ACCESS_TYPE_NAMES[accessType] || "Unknown"
}

/**
 * Check if an access type is allowlist-based
 * @param accessType - The access type number or string
 * @returns True if the access type is allowlist
 */
export function isAllowlistAccess(accessType: number | string): boolean {
  if (typeof accessType === 'string') {
    return accessType === 'Allowlist'
  }
  return accessType === ACCESS_TYPES.ALLOWLIST
}

/**
 * Check if an access type requires NFT ownership
 * @param accessType - The access type number or string
 * @returns True if the access type requires NFTs
 */
export function isNFTAccess(accessType: number | string): boolean {
  if (typeof accessType === 'string') {
    return accessType === 'NFT-Gated'
  }
  return accessType === ACCESS_TYPES.NFT_GATED
}

/**
 * Check if an access type uses protocol integration
 * @param accessType - The access type number or string
 * @returns True if the access type uses external protocols
 */
export function isProtocolAccess(accessType: number | string): boolean {
  if (typeof accessType === 'string') {
    return ['POAP', 'Unlock', 'Hypercert', 'Hats'].includes(accessType)
  }
  return accessType >= ACCESS_TYPES.POAP && accessType <= ACCESS_TYPES.HATS
}

// Create a utility file for admin functions to ensure consistency

/**
 * Check if an address is an admin
 * @param address The address to check
 * @returns boolean indicating if the address is an admin
//  */
// hii
export function isAdminAddress(address: string | undefined): boolean {
  if (!address) return false

  // Get admin addresses from environment variables
  const adminAddressesStr = process.env.NEXT_PUBLIC_ADMIN_ADDRESSES

  if (!adminAddressesStr) {
    console.warn("No admin addresses configured in environment variables")
    return false
  }

  // Split the comma-separated list of admin addresses
  const adminAddresses = adminAddressesStr.split(",").map((addr) => addr.trim())

  // Normalize the address by converting to lowercase
  const normalizedAddress = address.toLowerCase()

  // Check if the address is in the admin list
  return adminAddresses.some((adminAddr) => adminAddr.toLowerCase() === normalizedAddress)
}


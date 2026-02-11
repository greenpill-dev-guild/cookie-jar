import type { Address } from "viem";

/**
 * Sentinel address used across Cookie Jar contracts to represent the native token.
 * Matches `CookieJarLib.ETH_ADDRESS` on-chain (`0xEeeee…EEeE`).
 */
export const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address;

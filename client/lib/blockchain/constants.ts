import type { Address } from "viem";

/**
 * Sentinel address used across Cookie Jar contracts to represent the native token.
 * Matches `CookieJarLib.ETH_ADDRESS` on-chain (`0xEeeee…EEeE`).
 */
export const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address;

/** Canonical zero address. */
export const ZERO_ADDRESS =
	"0x0000000000000000000000000000000000000000" as Address;

/**
 * Canonical POAP ERC-721 token contract.
 * Source: https://documentation.poap.tech/docs/smart-contract-reference
 */
export const POAP_TOKEN_ADDRESS =
	"0x22C1f6050E56d2876009903609a2cC3fEf83B415" as Address;

/** Default Hats Protocol contract used across supported chains. */
export const HATS_PROTOCOL_ADDRESS =
	"0x3bc1A0Ad72417f2d411118085256fC53CBdDd137" as Address;

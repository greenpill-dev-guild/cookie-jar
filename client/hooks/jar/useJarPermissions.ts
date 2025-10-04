"use client";

import { useMemo } from "react";
import { keccak256, toHex } from "viem";
import { useAccount, useChainId } from "wagmi";
import { useReadCookieJarHasRole } from "@/generated";

// Hash the JAR_OWNER role (same across all versions)
const JAR_OWNER_ROLE = keccak256(toHex("JAR_OWNER")) as `0x${string}`;

/**
 * Permission status for a user interacting with a Cookie Jar
 */
export interface JarPermissions {
	/** Whether the user has admin (JAR_OWNER) privileges */
	isAdmin: boolean;
	/** Whether the user is designated as the fee collector */
	isFeeCollector: boolean;
	/** Whether to show allowlist-specific withdrawal functions */
	showUserFunctions: boolean;
	/** Whether to show NFT-gated withdrawal functions */
	showNFTGatedFunctions: boolean;
	/** Raw role check result for JAR_OWNER */
	hasJarOwnerRole: boolean | undefined;
}

/**
 * Configuration data for a Cookie Jar
 */
export interface JarConfig {
	/** Whether the current user is allowlisted */
	allowlist?: boolean;
	/** The access type of the jar ("Allowlist", "NFT-Gated", etc.) */
	accessType?: string;
	/** Address of the designated fee collector */
	feeCollector?: string;
}

/**
 * Custom hook to handle Cookie Jar permission checking and role validation
 *
 * Provides comprehensive permission checking for Cookie Jar interactions,
 * including admin privileges, fee collector status, and access type validation.
 * Automatically handles version differences between v1 and v2 contracts.
 *
 * @param jarAddress - The Cookie Jar contract address to check permissions for
 * @param config - The jar configuration containing access control data
 * @returns Object containing all permission states and flags
 *
 * @example
 * ```tsx
 * const permissions = useJarPermissions(jarAddress, config);
 *
 * if (permissions.isAdmin) {
 *   // Show admin controls
 * }
 *
 * if (permissions.showUserFunctions) {
 *   // Show allowlist withdrawal options
 * }
 * ```
 */
export const useJarPermissions = (
	jarAddress: `0x${string}` | undefined,
	config: JarConfig | undefined,
): JarPermissions => {
	const { address: userAddress } = useAccount();
	const _chainId = useChainId();

	// Check if current user has the JAR_OWNER role
	const { data: hasJarOwnerRole } = useReadCookieJarHasRole({
		address: jarAddress,
		args: userAddress
			? [JAR_OWNER_ROLE, userAddress as `0x${string}`]
			: undefined,
	});

	// Calculate permission states with v2 compatibility
	const permissions = useMemo(() => {
		const isAdmin = hasJarOwnerRole === true;

		const showUserFunctions =
			config?.allowlist === true && config?.accessType === "Allowlist";

		const showNFTGatedFunctions = config?.accessType === "NFT-Gated";

		const isFeeCollector =
			userAddress &&
			config?.feeCollector &&
			userAddress.toLowerCase() === config.feeCollector.toLowerCase();

		return {
			isAdmin,
			isFeeCollector: !!isFeeCollector,
			showUserFunctions,
			showNFTGatedFunctions,
			hasJarOwnerRole,
		};
	}, [hasJarOwnerRole, config, userAddress]);

	return permissions;
};

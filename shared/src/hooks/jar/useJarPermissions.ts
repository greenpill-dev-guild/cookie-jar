"use client";

import { cookieJarAbi } from "@jar-core/generated";
import {
	isAllowlistAccess,
	isErc1155Access,
	isNFTAccess,
} from "@jar-core/lib/jar/access-types";
import { useMemo } from "react";
import { erc721Abi, erc1155Abi, keccak256, toHex } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import type { NftRequirement } from "./useJar";

const JAR_OWNER_ROLE = keccak256(toHex("JAR_OWNER")) as `0x${string}`;

export type JarEligibility =
	| "disconnected"
	| "allowlisted"
	| "wears-hat"
	| "holds-nft"
	| "not-eligible";

export interface JarPermissions {
	/** Whether the user has admin (JAR_OWNER) privileges */
	isAdmin: boolean;
	/** Whether the user is designated as the fee collector */
	isFeeCollector: boolean;
	/** Allowlist jar and the user is on the list */
	showUserFunctions: boolean;
	/** NFT-gated jar and the user holds the gate token */
	showNFTGatedFunctions: boolean;
	/** Raw role check result for JAR_OWNER */
	hasJarOwnerRole: boolean | undefined;
	/** Whether the current wallet can claim from this jar */
	isEligible: boolean;
	eligibility: JarEligibility;
	/** Gate token balance for NFT-gated jars */
	gateBalance?: bigint;
	/** Balance the gate requires (max(minBalance, 1)) */
	requiredBalance: bigint;
	isNftGated: boolean;
	isHatGated: boolean;
}

export interface JarConfig {
	allowlist?: boolean;
	accessType?: string;
	accessTypeIndex?: number;
	feeCollector?: string;
	nftRequirement?: NftRequirement;
}

/**
 * Permission and eligibility checks for a jar. NFT-gated jars are checked against the
 * gate contract directly (balanceOf), which is exactly what the jar does on withdraw.
 */
export const useJarPermissions = (
	jarAddress: `0x${string}` | undefined,
	config: JarConfig | undefined,
	chainIdOverride?: number
): JarPermissions => {
	const { address: userAddress } = useAccount();
	const walletChainId = useChainId();
	const chainId = chainIdOverride ?? walletChainId;

	const { data: hasJarOwnerRole } = useReadContract({
		address: jarAddress,
		abi: cookieJarAbi,
		functionName: "hasRole",
		args: userAddress ? [JAR_OWNER_ROLE, userAddress] : undefined,
		chainId,
		query: { enabled: !!jarAddress && !!userAddress },
	});

	const accessType = config?.accessTypeIndex ?? config?.accessType;
	const isNftGated = accessType !== undefined && isNFTAccess(accessType);
	const isErc1155 = accessType !== undefined && isErc1155Access(accessType);
	const gate = config?.nftRequirement;
	const gateEnabled = isNftGated && !!gate && !!userAddress;

	const { data: erc1155Balance } = useReadContract({
		address: gate?.nftContract,
		abi: erc1155Abi,
		functionName: "balanceOf",
		args: userAddress && gate ? [userAddress, gate.tokenId] : undefined,
		chainId,
		query: { enabled: gateEnabled && isErc1155 },
	});

	const { data: erc721Balance } = useReadContract({
		address: gate?.nftContract,
		abi: erc721Abi,
		functionName: "balanceOf",
		args: userAddress ? [userAddress] : undefined,
		chainId,
		query: { enabled: gateEnabled && !isErc1155 },
	});

	return useMemo(() => {
		const isAdmin = hasJarOwnerRole === true;
		const isAllowlistJar =
			accessType !== undefined && isAllowlistAccess(accessType);
		const isHatGated = config?.accessType === "Hats";
		const requiredBalance = gate && gate.minBalance > 0n ? gate.minBalance : 1n;
		const gateBalance = (isErc1155 ? erc1155Balance : erc721Balance) as
			| bigint
			| undefined;

		let eligibility: JarEligibility = "not-eligible";
		if (!userAddress) {
			eligibility = "disconnected";
		} else if (isAllowlistJar && config?.allowlist === true) {
			eligibility = "allowlisted";
		} else if (
			isNftGated &&
			gateBalance !== undefined &&
			gateBalance >= requiredBalance
		) {
			eligibility = isHatGated ? "wears-hat" : "holds-nft";
		}

		const isEligible =
			eligibility === "allowlisted" ||
			eligibility === "wears-hat" ||
			eligibility === "holds-nft";
		const isFeeCollector =
			!!userAddress &&
			!!config?.feeCollector &&
			userAddress.toLowerCase() === config.feeCollector.toLowerCase();

		return {
			isAdmin,
			isFeeCollector,
			showUserFunctions: isAllowlistJar && config?.allowlist === true,
			showNFTGatedFunctions: isNftGated && isEligible,
			hasJarOwnerRole: hasJarOwnerRole as boolean | undefined,
			isEligible,
			eligibility,
			gateBalance,
			requiredBalance,
			isNftGated,
			isHatGated,
		};
	}, [
		hasJarOwnerRole,
		accessType,
		config?.accessType,
		config?.allowlist,
		config?.feeCollector,
		gate,
		isErc1155,
		isNftGated,
		erc1155Balance,
		erc721Balance,
		userAddress,
	]);
};

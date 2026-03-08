"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useChainId } from "wagmi";

import { contractAddresses as staticAddresses } from "@/config/supported-networks";
import { dev, error as logError } from "@/lib/app/logger";

/**
 * Return type for useContractAddresses hook
 */
interface ContractAddresses {
	/** The Cookie Jar Factory contract address for the current chain */
	cookieJarFactory: Address;
	/** Whether the addresses are still loading (only for local development) */
	isLoading: boolean;
}

/**
 * Custom hook to get contract addresses for the current chain
 *
 * Provides Cookie Jar Factory contract addresses with dynamic loading for local
 * development (Anvil) and static addresses for production networks. Handles
 * deployment updates in development by polling the local deployment file.
 *
 * @returns Object containing contract addresses and loading state
 *
 * @example
 * ```tsx
 * const { cookieJarFactory, isLoading } = useContractAddresses();
 *
 * if (!isLoading && cookieJarFactory) {
 *   // Use the factory address for contract calls
 * }
 * ```
 */
export function useContractAddresses(): ContractAddresses {
	const chainId = useChainId();
	const [localFactory, setLocalFactory] = useState<Address>();
	const [isLoading, setIsLoading] = useState(true);
	const [lastDeploymentTime, setLastDeploymentTime] = useState<number>(0);

	dev("Hook initialized", { chainId }, "useContractAddresses");

	useEffect(() => {
		dev("Effect triggered", { chainId }, "useContractAddresses");

		if (chainId === 31337) {
			const loadLocalDeployment = async () => {
				dev(
					"Loading local deployment for anvil chain",
					undefined,
					"useContractAddresses",
				);

				try {
					// Always try HTTP first for live updates
					const url = `/contracts/local-deployment.json?t=${Date.now()}`;
					dev("Fetching deployment", { url }, "useContractAddresses");

					const response = await fetch(url);
					if (!response.ok) {
						dev(
							"HTTP fetch failed",
							{ status: response.status, statusText: response.statusText },
							"useContractAddresses",
						);
						throw new Error("HTTP fetch failed");
					}

					const deployment = await response.json();
					dev("Received deployment data", deployment, "useContractAddresses");

					const deploymentTime = deployment.timestamp || 0;

					// Only update if we have a newer deployment
					if (deploymentTime > lastDeploymentTime || !localFactory) {
						dev(
							"Updating local factory address",
							{
								oldAddress: localFactory,
								newAddress: deployment.CookieJarFactory,
								deploymentTime,
								lastDeploymentTime,
							},
							"useContractAddresses",
						);

						setLocalFactory(deployment.CookieJarFactory);
						setLastDeploymentTime(deploymentTime);

						dev(
							"Updated factory",
							{
								address: deployment.CookieJarFactory,
								deploymentTime: new Date(deploymentTime).toLocaleString(),
							},
							"useContractAddresses",
						);
					} else {
						dev(
							"Skipping update (no newer deployment)",
							{
								deploymentTime,
								lastDeploymentTime,
								hasLocalFactory: !!localFactory,
							},
							"useContractAddresses",
						);
					}
				} catch (error) {
					logError(
						"Error loading local deployment",
						error,
						"useContractAddresses",
					);

					// Fallback to static addresses for local development
					const fallbackAddress = staticAddresses.cookieJarFactory[31337];
					dev(
						"Falling back to static address",
						{ fallbackAddress },
						"useContractAddresses",
					);

					if (fallbackAddress) {
						setLocalFactory(fallbackAddress as Address);
					}
				} finally {
					dev("Setting isLoading to false", undefined, "useContractAddresses");
					setIsLoading(false);
				}
			};

			loadLocalDeployment();

			// Polling disabled - only load once per chain change
			// This prevents race conditions with jar creation on Anvil
		} else {
			dev("Using static addresses", { chainId }, "useContractAddresses");
			setIsLoading(false);
		}
	}, [chainId, lastDeploymentTime, localFactory]);

	// Get the appropriate factory address
	const cookieJarFactory =
		chainId === 31337
			? localFactory || staticAddresses.cookieJarFactory[31337]
			: staticAddresses.cookieJarFactory[chainId];

	// Development-only final state logging
	dev(
		"Final state",
		{
			chainId,
			cookieJarFactory,
			localFactory,
			isLoading,
			staticFactoryForChain: staticAddresses.cookieJarFactory[chainId],
		},
		"useContractAddresses",
	);

	return {
		cookieJarFactory: cookieJarFactory as Address,
		isLoading,
	};
}

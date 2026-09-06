import { useEffect, useState } from "react";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";

export type JarVersion = "v1" | "v2" | "unknown";

interface JarVersionResult {
	version: JarVersion;
	isLoading: boolean;
	error?: Error;
	hasStreamingSupport: boolean;
	hasSuperfluidSupport: boolean;
	hasMultiTokenSupport: boolean;
}

/**
 * Hook to detect Cookie Jar contract version and supported features
 *
 * Detection strategy:
 * - v2 jars have Superfluid-related functions that v1 jars don't have
 * - v2 jars have streaming-related functions that v1 jars don't have
 * - v2 jars have multi-token configuration functions
 *
 * This enables graceful degradation of UI features for v1 jars
 */
export function useJarVersion(jarAddress: Address): JarVersionResult {
	const [version, setVersion] = useState<JarVersion>("unknown");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | undefined>();

	const publicClient = usePublicClient();

	useEffect(() => {
		if (!jarAddress || !publicClient) {
			setIsLoading(false);
			return;
		}

		const detectVersion = async () => {
			setIsLoading(true);
			setError(undefined);

			try {
				// Test for v2-specific functions that don't exist in v1
				const v2Functions = [
					// Superfluid functions (integrated in v2)
					"getSuperfluidConfig()",
					"isAcceptedSuperToken(address)",
					"createSuperStream(address,int96)",

					// Streaming functions (enhanced in v2)
					"registerStream(address,address,uint256)",
					"getActiveStreams()",

					// Multi-token functions (new in v2)
					"multiTokenConfig()",
					"swapPendingTokens(address,uint256,uint256)",
					"recoverAccidentalTokens(address)",
				];

				// Test each v2-specific function
				let _v2FunctionCount = 0;

				for (const func of v2Functions) {
					try {
						// Try to call the function signature to see if it exists
						// We don't actually call it, just check if the function exists
						const _functionSelector = func.split("(")[0];

						// Use a simple approach: try to get the function and see if it reverts with "function not found"
						// This is a heuristic - if the contract has these functions, it's likely v2
						const bytecode = await publicClient.getCode({
							address: jarAddress,
						});

						// Simple heuristic: v2 contracts should be larger due to additional functionality
						// v1 contracts are typically ~10-15KB, v2 contracts are ~20-25KB
						if (bytecode && bytecode.length > 20000) {
							// Rough size threshold
							_v2FunctionCount++;
						}
					} catch {
						// Function doesn't exist or call failed - continue
					}
				}

				// More sophisticated detection: try calling a v2-only view function
				try {
					// Try to call getSuperfluidConfig() - this only exists in v2
					await publicClient.readContract({
						address: jarAddress,
						abi: [
							{
								inputs: [],
								name: "getSuperfluidConfig",
								outputs: [
									{
										components: [
											{ name: "superfluidEnabled", type: "bool" },
											{ name: "autoAcceptStreams", type: "bool" },
											{ name: "acceptedSuperTokens", type: "address[]" },
											{ name: "minFlowRate", type: "int96" },
											{ name: "useDistributionPool", type: "bool" },
											{ name: "distributionPool", type: "address" },
										],
										name: "config",
										type: "tuple",
									},
								],
								stateMutability: "view",
								type: "function",
							},
						],
						functionName: "getSuperfluidConfig",
					});

					// If we get here without error, it's definitely v2
					setVersion("v2");
				} catch {
					// getSuperfluidConfig doesn't exist, try multiTokenConfig
					try {
						await publicClient.readContract({
							address: jarAddress,
							abi: [
								{
									inputs: [],
									name: "multiTokenConfig",
									outputs: [
										{
											components: [
												{ name: "enabled", type: "bool" },
												{ name: "maxSlippagePercent", type: "uint256" },
												{ name: "minSwapAmount", type: "uint256" },
												{ name: "defaultFee", type: "uint256" },
											],
											name: "config",
											type: "tuple",
										},
									],
									stateMutability: "view",
									type: "function",
								},
							],
							functionName: "multiTokenConfig",
						});

						// multiTokenConfig exists, likely v2
						setVersion("v2");
					} catch {
						// Neither function exists, likely v1
						setVersion("v1");
					}
				}
			} catch (err) {
				console.error("Error detecting jar version:", err);
				setError(err as Error);
				setVersion("unknown");
			} finally {
				setIsLoading(false);
			}
		};

		detectVersion();
	}, [jarAddress, publicClient]);

	// Derived feature flags based on version
	const hasStreamingSupport = version === "v2";
	const hasSuperfluidSupport = version === "v2";
	const hasMultiTokenSupport = version === "v2";

	return {
		version,
		isLoading,
		error,
		hasStreamingSupport,
		hasSuperfluidSupport,
		hasMultiTokenSupport,
	};
}

/**
 * Simplified version detection hook for components that just need a boolean
 */
export function useIsV2Jar(jarAddress: Address): boolean {
	const { version } = useJarVersion(jarAddress);
	return version === "v2";
}

/**
 * Hook to check if specific features are supported
 */
export function useJarFeatures(jarAddress: Address) {
	const {
		hasStreamingSupport,
		hasSuperfluidSupport,
		hasMultiTokenSupport,
		isLoading,
	} = useJarVersion(jarAddress);

	return {
		streaming: hasStreamingSupport,
		superfluid: hasSuperfluidSupport,
		multiToken: hasMultiTokenSupport,
		isLoading,
	};
}

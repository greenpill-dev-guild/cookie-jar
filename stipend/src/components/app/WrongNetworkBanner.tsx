"use client";

import { getNetworkName } from "@jar-core/lib/blockchain/networks";
import { useAccount, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";

/**
 * Shown when the wallet is connected to a different chain than the jar lives on.
 * Reads still work through the configured transport; writes wait for the switch.
 */
export function WrongNetworkBanner({ chainId }: { chainId: number }) {
	const { isConnected, chain } = useAccount();
	const { switchChain, isPending } = useSwitchChain();

	if (!isConnected || !chain || chain.id === chainId) return null;

	return (
		<div
			role="status"
			className="mb-6 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
		>
			<p className="text-sm text-foreground">
				Your wallet is on {chain.name}. This jar lives on{" "}
				{getNetworkName(chainId)}; switch to claim or deposit.
			</p>
			<Button
				size="sm"
				onClick={() => switchChain({ chainId })}
				disabled={isPending}
			>
				{isPending ? "Switching..." : `Switch to ${getNetworkName(chainId)}`}
			</Button>
		</div>
	);
}

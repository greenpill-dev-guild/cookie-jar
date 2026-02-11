"use client";

import { useParams } from "next/navigation";
import { useChainId } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getNativeCurrency } from "@/config/supported-networks";
import { useCookieJarConfig } from "@/hooks/jar/useJar";
import { useJarTransactions } from "@/hooks/jar/useJarTransactions";
import { ETH_ADDRESS } from "@/lib/blockchain/token-utils";

export function JarDepositSection() {
	const params = useParams();
	const chainId = useChainId();
	const address = params.address as string;
	const addressString = address as `0x${string}`;
	const nativeCurrency = getNativeCurrency(chainId);

	const { config } = useCookieJarConfig(addressString);
	const {
		amount,
		setAmount,
		onSubmit,
		isApprovalPending,
		tokenSymbol,
		tokenDecimals,
	} = useJarTransactions(config, addressString);

	if (!config) return null;

	const isNativeCurrency =
		config.currency?.toLowerCase() === ETH_ADDRESS.toLowerCase();

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="md:col-span-2">
					<label
						htmlFor="fundAmount"
						className="block text-[#ff5e14] font-medium mb-2"
					>
						Amount to Deposit
					</label>
					<div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3 rounded">
						<div className="flex items-center">
							<svg
								className="h-5 w-5 text-yellow-600 mr-2"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
							<p className="text-sm text-yellow-700">
								Only deposits made through this interface are recognized.
								<br />
								Do not send funds directly to the smart contract.
							</p>
						</div>
					</div>
					<Input
						id="fundAmount"
						type="text"
						placeholder={
							isNativeCurrency
								? `0.1 ${nativeCurrency.symbol}`
								: `1.${"0".repeat(Math.max(0, tokenDecimals))} ${tokenSymbol || "Tokens"}`
						}
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						className="border-[#f0e6d8] bg-white text-[#3c2a14]"
					/>
				</div>
				<div className="flex items-end">
					<Button
						onClick={() => onSubmit(amount)}
						className="w-full bg-[#ff5e14] hover:bg-[#e54d00] text-white h-10"
						disabled={!amount || Number(amount) <= 0}
					>
						Deposit Now
					</Button>
				</div>
			</div>

			{!isNativeCurrency && (
				<div className="pt-2">
					<p className="text-sm text-[#8b7355]">
						Note: For ERC20 tokens, you&apos;ll need to approve the token
						transfer before depositing.
					</p>
				</div>
			)}

			{isApprovalPending && (
				<div className="mt-4 p-3 bg-[#fff8f0] rounded-lg text-[#4a3520]">
					Waiting for token approval... Please confirm the transaction in your
					wallet.
				</div>
			)}
		</div>
	);
}

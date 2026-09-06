"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	contractAddresses,
	supportedChains,
} from "@/config/supported-networks";
import type { JarCreationFormData } from "@jar-core/hooks/jar/schemas/jarCreationSchema";
import type { useJarCreation } from "@/hooks/jar/useJarCreation";
import { ETH_ADDRESS } from "@jar-core/lib/blockchain/constants";

type Creation = ReturnType<typeof useJarCreation>;
export function CreationSetup({ creation }: { creation: Creation }) {
	const { setValue } = useFormContext<JarCreationFormData>();
	return (
		<div className="space-y-4 mb-6 rounded-lg border border-border bg-card p-4">
			<p className="text-sm text-muted-foreground">
				Create a jar directly through the factory. Review the owner, claim rules
				and deposit fee before signing.
			</p>
			<Label htmlFor="creation-network">Network</Label>
			<Select
				value={String(creation.chainId)}
				onValueChange={(value) => {
					setValue("chainId", Number(value), { shouldDirty: true });
					setValue("supportedCurrency", ETH_ADDRESS);
					setValue("showCustomCurrency", false);
					setValue("customCurrencyAddress", "");
					setValue("fixedAmount", "0");
					setValue("maxWithdrawal", "0");
					setValue("minDeposit", "0");
					setValue("accessType", 0);
					setValue("protocolConfig", { accessType: "Allowlist" });
				}}
			>
				<SelectTrigger id="creation-network">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{supportedChains
						.filter((chain) => contractAddresses.cookieJarFactory[chain.id])
						.map((chain) => (
							<SelectItem key={chain.id} value={String(chain.id)}>
								{chain.name}
							</SelectItem>
						))}
				</SelectContent>
			</Select>
			<p className="text-sm text-muted-foreground break-all">
				Factory: {creation.factoryAddress || "Not configured"}
			</p>
		</div>
	);
}

export function CreationReview({ creation }: { creation: Creation }) {
	const chain = supportedChains.find((item) => item.id === creation.chainId);
	return (
		<div
			className="mb-6 space-y-2 rounded-lg border border-border bg-muted p-4 text-sm break-words"
			aria-label="Deployment review"
		>
			<h2 className="font-semibold text-foreground">Deployment review</h2>
			<p>Network: {chain?.name ?? creation.chainId}</p>
			<p className="break-all">Factory: {creation.factoryAddress}</p>
			<p>
				Currency: {creation.tokenSymbol ?? "Loading"}
				{creation.tokenDecimals !== undefined &&
					` (${creation.tokenDecimals} decimals)`}
			</p>
			<p>
				Deposit fee:{" "}
				{creation.effectiveFee === undefined
					? "Loading"
					: `${Number(creation.effectiveFee) / 100}%`}
			</p>
			<p className="text-muted-foreground">
				The settings below are sent to this factory. The owner can manage the
				jar after creation.
			</p>
		</div>
	);
}

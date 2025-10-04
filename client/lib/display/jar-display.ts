import { getNativeCurrency } from "@/config/supported-networks";
import { formatTokenAmount } from "@/lib/blockchain/token-utils";

/**
 * Utility functions for jar display formatting
 */

/**
 * Format balance for display using token decimals
 */
export const formatJarBalance = (
	balance: bigint | undefined,
	tokenDecimals: number,
	tokenSymbol: string | undefined,
	chainId: number,
) => {
	if (!balance) return "0";

	const nativeCurrency = getNativeCurrency(chainId);

	return formatTokenAmount(
		balance,
		tokenDecimals,
		tokenSymbol || nativeCurrency.symbol,
	);
};

/**
 * Copy text to clipboard with toast notification
 */
export const copyToClipboard = (text: string, toast: any) => {
	navigator.clipboard.writeText(text);
	toast({
		title: "Address copied",
		description: "The address has been copied to your clipboard",
	});
};

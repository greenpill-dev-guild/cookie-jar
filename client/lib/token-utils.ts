import { useReadContracts } from "wagmi";
import { parseUnits, formatUnits, erc20Abi, isAddress } from "viem";
import type { Address } from "viem";
import { log } from "console";
import { useChainId } from "wagmi";
import { getNativeCurrency } from "@/config/supported-networks";

// Known address constants
export const ETH_ADDRESS = "0x0000000000000000000000000000000000000003";

/**
 * Hook to fetch token information (symbol and decimals)
 * @param tokenAddress The address of the ERC20 token
 * @returns Token information including symbol, decimals, and error states
 */
export function useTokenInfo(tokenAddress: Address) {
  const chainId = useChainId();
  const nativeCurrency = getNativeCurrency(chainId);
  const isERC20 = isAddress(tokenAddress) && tokenAddress !== ETH_ADDRESS;

  const { data: tokenInfo } = useReadContracts({
    contracts: [
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "symbol",
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "decimals",
      },
    ],
    query: {
      enabled: !!isERC20,
    },
  });

  // For native currency, use chain-specific values
  if (tokenAddress === ETH_ADDRESS) {
    return {
      symbol: nativeCurrency.symbol,
      decimals: nativeCurrency.decimals,
      isERC20: false,
      isEth: true,
      error: false,
      errorMessage: "",
    };
  }

  // Check if we have valid token data
  const hasSymbol = tokenInfo?.[0]?.result !== undefined;
  const hasDecimals = tokenInfo?.[1]?.result !== undefined;
  const error = isERC20 && (!hasSymbol || !hasDecimals);
  const symbol = hasSymbol ? (tokenInfo[0].result as string) : "ERROR";
  const decimals = hasDecimals ? Number(tokenInfo[1].result) : 0;

  // Generate appropriate error message
  let errorMessage = "";
  if (error) {
    if (!hasSymbol && !hasDecimals) {
      errorMessage =
        "Invalid ERC20 token address or contract doesn't implement ERC20 standard";
    } else if (!hasSymbol) {
      errorMessage = "Token contract doesn't implement symbol() method";
    } else if (!hasDecimals) {
      errorMessage = "Token contract doesn't implement decimals() method";
    }
  }

  return {
    symbol,
    decimals,
    isERC20,
    isEth: false,
    error,
    errorMessage,
  };
}

/**
 * Format amount for display using the token decimals
 * @param amount The amount in smallest unit (wei, satoshi, etc)
 * @param decimals The number of decimals for the token
 * @param symbol The token symbol
 * @param maxDecimals Maximum number of decimals to display
 * @returns Formatted amount string with symbol
 */
export function formatTokenAmount(
  amount: bigint | undefined,
  decimals: number,
  symbol: string,
  maxDecimals: number = 4,
) {
  if (!amount) return `0 ${symbol}`;

  try {
    const formatted = formatUnits(amount, decimals);
    return `${Number(formatted).toFixed(maxDecimals)} ${symbol}`;
  } catch (error) {
    console.error("Error formatting amount:", error);
    return `${amount || 0} ${symbol}`;
  }
}

/**
 * Parse user input amount considering token decimals
 * @param amountStr User input amount as string
 * @param decimals Number of decimals for the token
 * @returns Amount in smallest unit as BigInt
 */
export function parseTokenAmount(amountStr: string, decimals: number) {
  if (!amountStr || amountStr === "0") return BigInt(0);
  return parseUnits(amountStr, decimals) || BigInt(0);
}

/**
 * Validates if a string value represents a valid number with decimal places that don't exceed the token's decimal precision
 * @param value The string value to validate
 * @param tokenDecimals The number of decimal places allowed for the token
 * @returns Object with validated value and error message if applicable
 */
export function checkDecimals(
  value: string,
  tokenDecimals: number,
): { value: string | null; error: string | null } {
  if (value === "") {
    return { value, error: null };
  }

  // Input length validation to prevent ReDoS attacks
  if (value.length > 50) {
    return { value: null, error: "Number input too long." };
  }

  // Use JavaScript's built-in parsing instead of regex to avoid ReDoS
  // Allow only digits, single decimal point, and leading decimal point
  const trimmed = value.trim();
  
  // Quick character-based validation (much faster than regex)
  let hasDecimal = false;
  let decimalIndex = -1;
  
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '.') {
      if (hasDecimal) {
        // Multiple decimal points
        return { value: null, error: "Please enter a valid number." };
      }
      hasDecimal = true;
      decimalIndex = i;
    } else if (char < '0' || char > '9') {
      // Invalid character
      return { value: null, error: "Please enter a valid number." };
    }
  }

  // Check for edge cases
  if (trimmed === '.' || trimmed === '') {
    if (trimmed === '') return { value, error: null };
    return { value: null, error: "Please enter a valid number." };
  }

  // Validate decimal places if there's a decimal point
  if (hasDecimal) {
    const decimalPlaces = trimmed.length - decimalIndex - 1;
    if (decimalPlaces > tokenDecimals) {
      return {
        value: null,
        error: `You entered too many decimal places. This token only allows ${tokenDecimals} decimals.`,
      };
    }
  }

  return { value, error: null };
}

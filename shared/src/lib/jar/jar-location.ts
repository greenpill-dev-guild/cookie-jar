export function resolveJarChainId(
	value: string | null,
	defaultChainId: number,
	supportedIds: readonly number[]
): number | undefined {
	if (value === null) return defaultChainId;
	if (!/^\d+$/.test(value)) return undefined;
	const chainId = Number(value);
	return Number.isSafeInteger(chainId) && supportedIds.includes(chainId)
		? chainId
		: undefined;
}

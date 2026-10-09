import { expect, it, vi } from "vitest";
import { HatsProvider } from "@/lib/nft/protocols/HatsProvider";

const hat =
	"0x0000005c00010000000000000000000000000000000000000000000000000000";
const contract = "0x1111111111111111111111111111111111111111";
it("reads a full uint256 ID from the chosen chain client and entered contract", async () => {
	const readContract = vi
		.fn()
		.mockResolvedValue([
			"Green Goods Team",
			100,
			5,
			contract,
			contract,
			"ipfs://image",
			0,
			true,
			true,
		]);
	const result = await HatsProvider.getHatById(hat, contract, {
		readContract,
	} as never);
	expect(readContract).toHaveBeenCalledWith(
		expect.objectContaining({
			address: contract,
			functionName: "viewHat",
			args: [BigInt(hat)],
		})
	);
	expect(result).toMatchObject({
		id: BigInt(hat).toString(),
		currentSupply: "5",
		status: true,
	});
});
it("distinguishes an RPC failure from a nonexistent hat", async () => {
	const readContract = vi.fn().mockRejectedValue(new Error("RPC unavailable"));
	await expect(
		HatsProvider.getHatById(hat, contract, { readContract } as never)
	).rejects.toThrow("RPC unavailable");
	readContract.mockResolvedValue([
		"",
		0,
		0,
		"0x0000000000000000000000000000000000000000",
		"0x0000000000000000000000000000000000000000",
		"",
		0,
		false,
		false,
	]);
	expect(
		await HatsProvider.getHatById(hat, contract, { readContract } as never)
	).toBeNull();
});
it.each(["abc", "-1", "0", (2n ** 256n).toString()])(
	"rejects invalid ID %s before reading",
	async (id) => {
		const readContract = vi.fn();
		await expect(
			HatsProvider.getHatById(id, contract, { readContract } as never)
		).rejects.toThrow();
		expect(readContract).not.toHaveBeenCalled();
	}
);

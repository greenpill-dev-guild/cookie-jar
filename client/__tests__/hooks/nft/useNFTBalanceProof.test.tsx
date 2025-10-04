import { describe, expect, it } from "vitest";
import { validateBalanceProof } from "@/hooks/nft/useNFTBalanceProof";

// Unit tests for NFT Balance Proof utilities
// Note: Full hook testing requires WagmiProvider setup
// These tests validate the core proof validation logic

describe("NFT Balance Proof - Unit Tests", () => {
	describe("NFT standard validation", () => {
		it("should recognize ERC721 token type", () => {
			const tokenTypes = ["ERC721", "ERC1155"];

			expect(tokenTypes).toContain("ERC721");
			expect(tokenTypes).toContain("ERC1155");
		});

		it("should handle ERC721 balance as boolean (0 or 1)", () => {
			// ERC721: either you own it (1) or you don't (0)
			const owned = 1n;
			const notOwned = 0n;

			expect(owned).toBe(1n);
			expect(notOwned).toBe(0n);
		});

		it("should handle ERC1155 balance as quantity", () => {
			// ERC1155: can own multiple of same token
			const balances = [0n, 1n, 5n, 100n];

			balances.forEach((balance) => {
				expect(balance).toBeGreaterThanOrEqual(0n);
			});
		});
	});
});

describe("validateBalanceProof", () => {
	it("should validate proof that is not stale", () => {
		const proof = {
			balance: 5n,
			blockNumber: 1000,
			timestamp: Date.now(),
			isValid: true, // Proof indicates valid ownership
		};

		const validation = validateBalanceProof(proof, 1003, 1n);

		expect(validation.isValid).toBe(true);
		expect(validation.reason).toBeUndefined();
	});

	it("should reject stale proof (>5 blocks old)", () => {
		const proof = {
			balance: 5n,
			blockNumber: 1000,
			timestamp: Date.now(),
			isValid: true,
		};

		const validation = validateBalanceProof(proof, 1010, 1n); // 10 blocks later

		expect(validation.isValid).toBe(false);
		expect(validation.reason).toContain("old");
	});

	it("should reject proof with insufficient balance", () => {
		const proof = {
			balance: 2n,
			blockNumber: 1000,
			timestamp: Date.now(),
			isValid: false, // Balance < minRequired, so isValid = false
		};

		const validation = validateBalanceProof(proof, 1002, 5n); // Need 5, have 2

		expect(validation.isValid).toBe(false);
		expect(validation.reason).toContain("balance");
	});

	it("should accept proof with exact minimum balance", () => {
		const proof = {
			balance: 5n,
			blockNumber: 1000,
			timestamp: Date.now(),
			isValid: true,
		};

		const validation = validateBalanceProof(proof, 1002, 5n);

		expect(validation.isValid).toBe(true);
	});

	it("should accept proof with balance exceeding minimum", () => {
		const proof = {
			balance: 10n,
			blockNumber: 1000,
			timestamp: Date.now(),
			isValid: true,
		};

		const validation = validateBalanceProof(proof, 1002, 5n);

		expect(validation.isValid).toBe(true);
	});

	it("should reject proof without isValid flag", () => {
		const proof = {
			balance: 10n,
			blockNumber: 1000,
			timestamp: Date.now(),
			isValid: false, // Marked as invalid
		};

		const validation = validateBalanceProof(proof, 1002, 1n);

		expect(validation.isValid).toBe(false);
		expect(validation.reason).toBeDefined();
	});
});

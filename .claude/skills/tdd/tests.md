# Test examples for this repo

## Pure helper (vitest)

```ts
import { describe, expect, it } from "vitest";
import { buildDepositCall } from "@/lib/jar/deposit-args";

describe("buildDepositCall", () => {
	it("uses deposit(amount) for tokens on V2", () => {
		expect(buildDepositCall({ isV2: true, currency: USDC, amount: 4_800_000_000n })).toEqual({
			functionName: "deposit",
			args: [4_800_000_000n],
		});
	});
});
```

## Hook through renderHook (vitest + Testing Library)

```ts
const state = { address: USER, erc1155Balance: 1n };
vi.mock("wagmi", () => ({
	useAccount: () => ({ address: state.address }),
	useChainId: () => 42161,
	useReadContract: (p: { functionName: string }) =>
		p.functionName === "hasRole" ? { data: false } : { data: state.erc1155Balance },
}));
vi.mock("@/generated", () => ({ cookieJarAbi: [] }));

const { result } = renderHook(() => useJarPermissions(JAR, hatsJarConfig));
expect(result.current.eligibility).toBe("wears-hat");
```

## Contract behaviour (Foundry)

```solidity
function test_RevertWhen_NonHolderClaims() public {
    vm.prank(outsider);
    vm.expectRevert(CookieJarLib.InsufficientNFTBalance.selector);
    jar.withdrawWithErc1155(1e6, PURPOSE);
}

function testFuzz_DepositBelowMinimumReverts(uint256 amount) public {
    amount = bound(amount, 1, MIN_ERC20_DEPOSIT - 1);
    vm.expectRevert(CookieJarLib.LessThanMinimumDeposit.selector);
    jar.deposit(amount);
}
```

## Playwright (unauthenticated)

```ts
test("renders the featured jar", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByText("In the jar")).toBeVisible({ timeout: 30_000 });
	await expect(page.getByRole("tab", { name: "Claim" })).toBeVisible();
});
```

Naming: `describe` by module, `it` by behaviour in plain words. Test files live next to the
existing ones under `client/__tests__/{config,hooks,lib}` and `contracts/test`.

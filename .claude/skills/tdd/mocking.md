# Mocking guidelines

Mock at the process boundary, never inside the module under test.

| Boundary | Mock with | Notes |
| --- | --- | --- |
| Chain reads and writes in hooks | `vi.mock("wagmi", ...)` returning `{ data }` per `functionName` | Distinguish ERC721 from ERC1155 reads by the ABI passed in |
| Generated ABI | `vi.mock("@/generated", () => ({ cookieJarAbi: [] }))` | Only when the ABI content is irrelevant |
| Deployment registry | `vi.mock("@/config/deployments.auto", ...)` | It is generated; never rely on the real addresses in unit tests |
| Public client (history hook) | a fake `getLogs` / `getTransaction` passed to the pure chunker, or a mocked `usePublicClient` | Prefer testing `getLogsChunked` with a function |
| HTTP APIs (NFT metadata, floor prices) | `msw` handlers | Already set up in `client/__tests__` |
| Time | `vi.useFakeTimers()` | Countdown and cooldown logic |
| Wallet in Playwright | none | Specs stay unauthenticated; signing flows are manual |
| Foundry environment | `vm.setEnv` in exactly one test | Everything else passes structs to `planFrom` |

Do not mock: pure helpers, `viem` parsing functions, `CookieJarLib` constants, Tailwind classes.
If a test needs three or more mocks to reach the behaviour, the seam is wrong; move the logic into
a pure helper and test that instead.

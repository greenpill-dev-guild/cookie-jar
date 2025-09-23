# Cookie Jar Contracts - Smart Contract Rules

## Foundry Development Workflow
```bash
forge build                # Compile contracts
forge test                 # Run all tests  
forge test --watch         # Watch mode
forge coverage             # Coverage report (100% target)
forge fmt                  # Format Solidity code
```

## Contract Architecture Standards
- **Single responsibility**: One contract per core function
- **OpenZeppelin imports**: Use audited libraries (Ownable, AccessControl, etc.)
- **NatSpec documentation**: Every public function must have complete docs
- **SPDX license**: MIT license identifier required

## Cookie Jar Protocol Structure
```
contracts/src/
├── CookieJarFactory.sol   # Factory + protocol controls
├── CookieJar.sol          # Individual jar logic  
├── CookieJarRegistry.sol  # Jar metadata storage
├── libraries/
│   └── CookieJarLib.sol   # Shared data structures
└── tokens/                # Test token implementations
```

## Security & Safety Patterns
- **Reentrancy guards**: Use OpenZeppelin's ReentrancyGuard
- **Access control**: Role-based permissions via AccessControl
- **Input validation**: Always validate parameters with custom errors
- **Checks-Effects-Interactions**: Follow CEI pattern religiously
- **Emergency controls**: Include pausable functionality for critical contracts

## Gas Optimization Guidelines  
- **Storage packing**: Combine variables into single slots where possible
- **Memory vs storage**: Use memory for temporary calculations
- **Events over storage**: Emit events for off-chain indexing vs on-chain storage
- **Batch operations**: Group multiple actions when possible
- **View/pure functions**: Mark functions appropriately to save gas

## Testing Standards (Foundry)
```solidity
// Test file naming: ContractName.t.sol
// Test function naming: test_FunctionName_Condition()
// Use vm.expectRevert for error testing
// Use vm.prank for access control testing
// Use invariant testing for complex state
```

## Data Types & Patterns
```solidity
// Use CookieJarLib structs for consistency
using CookieJarLib for CookieJarLib.JarData;

// Custom errors over require statements
error InsufficientBalance(uint256 available, uint256 requested);

// Events for all state changes
event Deposit(address indexed user, uint256 amount, address token);
```

## Deployment & Verification
- **Deterministic addresses**: Use CREATE2 for predictable deployments
- **Verification**: Auto-verify contracts on deployment
- **Immutable configuration**: Use constructor args, not post-deploy setters
- **Upgrade patterns**: Prefer immutable contracts, document if upgradeable needed

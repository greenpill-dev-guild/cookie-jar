## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

### .env

PRIVATE_KEY=
SEPOLIA_URL=
SEPOLIA_ETHERSCAN_KEY=

### To Deploy and verify

source .env
forge script script/Deploy.s.sol:DeployCookie \
 --via-ir \
 --rpc-url $SEPOLIA_URL \
 --broadcast \
 --verify \
 --etherscan-api-key $SEPOLIA_ETHERSCAN_KEY \
 --verifier-url https://api-sepolia.etherscan.io/api \
 -vvvv

consistent natspec
added openzeppelin roles
updated error names to include contract name, for easier debugging(better practics)
removed unnecessary black and whitelist in cookieJarRegistery.
Added getters and mappings to cookieJarRegistery.
Used ownable by openzeppein in all contracts.
Added some if-revert statements
Cookie jar data is stored both in factory and registery, make it to store only in registry. (why the tf it was in factory, even no getters for that)

Current Setup
AccessControl(Protocol) + Creating jars = CookieJarFactory

Added Fee percentage to be passed in constructor of jar so we can change it with new jars(exclusivity)

Changed terms to be clear

Added a new constructor, fee on withdrawal

Added a new constructor element for jar, the supported ERC20

Added getters
Separated createETHJar and createERC20Jar functions

Added deposit functions before creating a jar

Removed deposit amount restrictions to depositing in existing jars

Setup Helperconfig

Removed some tests, created useful tests

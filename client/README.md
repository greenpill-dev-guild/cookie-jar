# Cookie Jar Client 🍪

Next.js frontend for Cookie Jar protocol - decentralized funding pools with multi-protocol access control.

## Overview

React frontend for creating and managing Cookie Jar funding pools with customizable access control, withdrawal rules, and transparent on-chain tracking.

## Features

**Access Control**: Allowlist, NFT-gated, POAP, Unlock Protocol, Hypercerts, Hats Protocol  
**Withdrawals**: Fixed/variable amounts, time restrictions, purpose tracking  
**Assets**: ETH + any ERC20 token  
**Admin**: Allowlist management, NFT gates, emergency controls  
**Security**: On-chain transparency, custom error handling

## Architecture

```
client/
├── app/                      # Next.js App Router
│   ├── admin/                # Admin pages
│   ├── create/               # Jar creation page
│   ├── docs/                 # Documentation pages
│   ├── jar/[address]/        # Individual jar page
│   ├── jars/                 # Jar listing page
│   ├── profile/              # User profile page
│   ├── globals.css           # Global styles
│   └── layout.tsx            # Root layout
├── components/               # React components
│   ├── admin/                # Admin-related components
│   │   └── AdminFunctions.tsx
│   ├── design/               # UI design components
│   │   ├── animated-button.tsx
│   │   ├── back-button.tsx
│   │   ├── collapsible-sidebar.tsx
|   |
│   ├── FeeCollector/         # Fee collector components
│   │   └── DefaultFeeCollector.tsx
│   │
│   ├── page/                 # Page-specific components
│   │   ├── docs/             # Documentation components
│   │   │   ├── docs-content.tsx
│   │   │   └── docs-sidebar.tsx
│   │   ├── home/             # Home page components
│   │   │   ├── features.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── landing-hero.tsx
│   │   │   └── social-media-buttons.tsx
│   │       └── network-support.tsx
│   ├── ui/                   # UI components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── checkbox.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── forms/                # Form-related components
│   │   ├── NFTGateInput.tsx  # NFT address input with validation
│   │   └── NFTSelector.tsx   # Visual NFT selection grid
│   ├── protocol/             # Protocol-specific components
│   │   ├── POAPGateConfig.tsx        # POAP event configuration
│   │   ├── UnlockGateConfig.tsx      # Unlock Protocol configuration
│   │   ├── HypercertGateConfig.tsx   # Hypercert configuration
│   │   ├── HatsGateConfig.tsx        # Hats Protocol configuration
│   │   ├── ProtocolGateSelector.tsx  # Unified access method selector
│   ├── users/                # Jar User-related components
│   │   ├── ConfigDetailsSection.tsx
│   │   ├── ConfigItem.tsx
│   │   ├── ConfigView.tsx
│   │   ├── CountdownTimer.tsx
│   │   ├── FundingSection.tsx
│   │   ├── NFTGatedWithdrawalSection.tsx
│   │   ├── WhitelistWithdrawalSection.tsx
│   │   └── WithdrawlHistorySection.tsx
│   └── wallet/               # Wallet-related components
│       ├── custom-connect-button.tsx
│       ├── rainbow-kit-provider.tsx
│       ├── terms-and-conditions-auth.tsx
│       └── wallet-auth-layer.tsx
|
├── hooks/
│   ├── design/               # Design-related hooks
│   │   ├── use-mobile.tsx    # Mobile detection
│   │   └── use-toast.ts      # Toast notifications
│   ├── protocol/             # Protocol-specific hooks
│   │   ├── usePOAPs.ts  # POAP event search and validation
│   │   ├── useUnlock.ts # Unlock Protocol membership validation
│   │   ├── useHypercerts.ts  # Hypercert verification
│   │   └── useHats.ts        # Hats Protocol role validation
│   ├── useNftValidation.ts   # NFT contract validation via EIP-165
│   ├── useUserNFTs.ts        # User NFT collection fetching (Alchemy)
│   ├── use-cookie-jar.ts     # Jar interaction hook
│   ├── use-cookie-jar-factory.ts
│   ├── use-cookie-jar-registry.ts
│   └── use-whitelist-status.ts
├── lib/                      # Utility libraries
│   └── utils/                # Utility functions
│       ├── format.ts         # Formatting utilities
│       ├── time-utils.ts     # Time-related utilities
│       └── utils.ts          # General utilities
└── public/                   # Static assets
```

## Tech Stack

**Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui  
**Web3**: viem, wagmi, RainbowKit  
**Protocol APIs**: POAP, Unlock Protocol, Hypercerts, Hats Protocol, Alchemy  
**Testing**: Vitest, React Testing Library  
**Networks**: Base, Optimism, Gnosis Chain, Base Sepolia

## Testing Infrastructure

### Frontend Tests

- **Jest**: Unit testing framework
- **React Testing Library**: Component testing utilities
- **User Event**: User interaction simulation
- **Comprehensive Test Coverage**: Hooks, components, and protocol integrations

#### Test Organization

```
client/__tests__/
├── hooks/                    # Hook unit tests
│   ├── useNftValidation.test.ts     # NFT validation logic
│   ├── useUserNFTs.test.ts          # Alchemy NFT fetching
│   └── usePOAPs.test.ts        # POAP event handling
├── components/               # Component tests
│   ├── NFTGateInput.test.tsx        # NFT input validation
│   ├── ProtocolGateSelector.test.tsx # Access method selection
└── utils/                    # Utility tests
    └── ProtocolValidation.test.ts   # Validation helpers
```

### Contract Tests

- **Foundry**: Solidity testing framework
- **Mock Contracts**: For protocol integration testing
- **Comprehensive Coverage**: All access types and withdrawal methods

#### Contract Test Organization

```
contracts/test/
├── CookieJar.t.sol          # Core functionality tests
└── CookieJarProtocols.t.sol # Multi-protocol access tests
```

## Smart Contracts

### CookieJar.sol

The main contract implementing comprehensive jar functionality with multi-protocol access control:

- **Core Features**: Deposits, withdrawals, access control, purpose tracking
- **Access Types**: Allowlist, NFT-gated, POAP, Unlock Protocol, Hypercerts, Hats Protocol
- **Withdrawal Methods**: `withdrawAllowlistMode`, `withdrawNFTMode`, `withdrawPOAPMode`, `withdrawUnlockMode`, `withdrawHypercertMode`, `withdrawHatsMode`
- **Protocol Integration**: Built-in support for external protocol verification

### CookieJarFactory.sol

Factory contract for creating new CookieJar instances with multi-protocol support:

- **Jar Creation**: Handles complex access configuration for all supported protocols
- **Registry Integration**: Maintains comprehensive jar registry
- **Access Configuration**: Supports all 6 access control methods

### CookieJarLib.sol

Library containing core data structures and constants:

- **Access Types**: `Whitelist`, `NFTGated`, `POAP`, `Unlock`, `Hypercert`, `Hats`
- **Protocol Requirements**: Dedicated structs for each protocol's specific needs
- **Error Handling**: Custom errors for secure transaction processing

## Getting Started

### Prerequisites

- Node.js 18.18.0 or higher
- npm or yarn
- A Web3 wallet (MetaMask, Rainbow, etc.)
- ETH or tokens on a supported network

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/cookie-jar-v3.git
cd cookie-jar-v3

```

2. Install dependencies:

```shellscript
npm install
# or
yarn install
```

3. Set up environment variables:
   Create a `.env.local` file with the following variables:

```plaintext
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key
```

4. Run the development server:

```shellscript
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Creating a Cookie Jar

1. Connect your wallet
2. Navigate to the "Create Jar" page
3. Fill in the jar details:

4. Basic information (name, description, currency)
5. Access control settings (whitelist or NFT-gated)
6. Withdrawal options (fixed or variable, amount, cooldown period)
7. Additional features (strict purpose, emergency withdrawal)

8. Review and confirm
9. Sign the transaction

### Managing a Cookie Jar

As a jar admin, you can:

- Transfer jar ownership
- Add/remove addresses from whitelist
- Add/remove addresses from denylist
- Add/remove NFT gates
- Perform emergency withdrawals (if enabled)

### Using a Cookie Jar

As a whitelisted user or NFT holder, you can:

- Deposit funds into the jar
- Withdraw funds according to the jar's rules
- View withdrawal history

## Deployment

The smart contracts are deployed on the following networks:

- Base Sepolia: `00xa004A762FC3dcDaBdB0392707bD25ff8d428403f` (Factory)
- Base: Coming soon
- Optimism: Coming soon
- Gnosis Chain: Coming soon

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [OpenZeppelin](https://openzeppelin.com/) for secure smart contract libraries
- [RainbowKit](https://www.rainbowkit.com/) for wallet connection UI
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Vercel](https://vercel.com/) for hosting and deployment

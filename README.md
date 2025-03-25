### Cookie Jar V3

Cookie Jar V3 is a platform for creating controlled token pools with customizable access rules, withdrawal limits, and transparent tracking. It allows teams, communities, and organizations to manage shared funds in a transparent and accountable way.


##Interface : 

![image](https://github.com/user-attachments/assets/1e1baad8-7d8a-4b61-87f9-19ea0c5f619b)


## Features

- **Dual Access Control**: Choose between whitelist or NFT-gated access to control who can withdraw from your jar
- **Configurable Withdrawals**: Set fixed or variable withdrawal amounts with customizable cooldown periods
- **Purpose Tracking**: Require users to explain withdrawals with on-chain transparency for accountability
- **Multi-Asset Support**: Support for ETH and any ERC20 token with a simple fee structure
- **Multi-Admin**: Assign multiple administrators to manage your jar with flexible permissions
- **Customizable Settings**: Easily configure jar settings to match your specific use case and requirements


## Supported Networks

Cookie Jar V3 is available on the following networks:

- Base
- Optimism
- Gnosis Chain
- Sepolia (Testnet)
- Arbitrum


## Getting Started

### Prerequisites

- Node.js 18.x or later
- An Ethereum wallet (like MetaMask)
- API keys for RPC providers


### Installation

1. Clone the repository:


```shellscript
git clone https://github.com/your-username/cookie-jar-v3.git
cd cookie-jar-v3
```

2. Install dependencies:


```shellscript
npm install
```

3. Configure environment variables:


Create a `.env.local` file in the root directory with the following variables:

```plaintext
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=YOUR_WALLET_CONNECT_PROJECT_ID
NEXT_PUBLIC_ALCHEMY_ID=YOUR_ALCHEMY_API_KEY
```

4. Start the development server:


```shellscript
npm run dev
```

The application should now be running at [http://localhost:3000](http://localhost:3000).

## Usage

### Creating a Cookie Jar

1. Connect your wallet using the "Connect Wallet" button
2. Navigate to the "Create" page
3. Fill out the form with your jar's details:

1. Name and description
2. Network to deploy on
3. Access control type (whitelist or NFT-gated)
4. Withdrawal rules (amounts, cooldown, purpose requirements)



4. Click "Create Cookie Jar" to deploy your jar


### Depositing to a Cookie Jar

1. Navigate to the "Jars" page to see available jars
2. Select a jar to view its details
3. Use the deposit form to add ETH or ERC20 tokens


### Withdrawing from a Cookie Jar

1. Navigate to a jar where you have withdrawal permissions
2. Enter the amount you want to withdraw
3. Provide a purpose for the withdrawal (if required)
4. Confirm the transaction in your wallet


## Smart Contract Architecture

Cookie Jar V3 consists of two main smart contracts:

- **CookieJar.sol**: The main contract that implements all the jar functionality, including deposits, withdrawals, and access control
- **CookieJarFactory.sol**: A factory contract for creating new CookieJar instances and maintaining a registry of all created jars


## Technical Architecture

The application is built with:

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- **Web3 Integration**: ethers.js, wagmi, RainbowKit
- **Smart Contracts**: Solidity, OpenZeppelin contracts

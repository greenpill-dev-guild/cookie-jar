# 🍪 Cookie Jar DAO v2

Cookie Jar DAO v2 is a decentralized application (dApp) that allows a set of whitelisted members to withdraw ETH or ERC20 tokens periodically from a communal jar. This system operates under a DAO structure, where the rules and the distribution process are controlled and executed by smart contracts.

The primary purpose of Cookie Jar is to create a transparent and permissioned mechanism for distributing ETH or ERC20 tokens from a shared pool among a group of participants in a decentralized manner.

## How Does Cookie Jar Work?

1. **Whitelisted Members**: Only members who have been added to the whitelist can access the Cookie Jar. This ensures that only approved participants are able to withdraw funds from the communal jar.

2. **Periodic Withdrawals**: A predefined amount of ETH is made available for withdrawal at regular intervals. This could be weekly, monthly, or any other time period defined by the Admin.

3. **Communal Pool**: The funds are stored in a shared smart contract (the "jar"), and any withdrawal request is handled directly through interactions with the contract.

4. **Admin**: The rules for withdrawals, such as the amount and frequency, can be adjusted by the admin. 

## Features

- **Whitelisted Access**: Only approved participants can interact with the Cookie Jar, ensuring a controlled environment.
- **Periodic Withdrawals**: Withdrawals are allowed periodically, helping to ensure fair distribution over time.
- **Decentralized & Transparent**: All withdrawals and interactions are governed by smart contracts ensuring transparency.

## Folder Structure

- **`frontend/`**: The frontend interface for users to interact with the Cookie Jar, check their eligibility, and withdraw ETH or ERC20 tokens.
- **`contracts/`**: The smart contract logic for managing the communal jar, whitelisted members, withdrawal rules and the tests .

## Getting Started

### Prerequisites

- Node.js
- Yarn or npm
- foundry

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/HoomanDigital/cookie-jar-v2.git
cd cookie-jar-v2

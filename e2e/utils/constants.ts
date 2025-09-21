// Test accounts from your existing Anvil setup (from memory)
export const ANVIL_ACCOUNTS = [
  {
    name: 'Deployer',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    role: 'admin'
  },
  {
    name: 'Cookie Monster', 
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    role: 'nft-holder'
  },
  {
    name: 'Cookie Fan',
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', 
    privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
    role: 'nft-holder'
  },
  {
    name: 'Test User',
    address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    privateKey: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
    role: 'regular-user'
  }
] as const

// Contract addresses (loaded dynamically from deployment)
export const getContractAddresses = () => ({
  FACTORY: process.env.TEST_FACTORY_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  COOKIE_MONSTER_NFT: process.env.TEST_NFT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  DEMO_TOKEN: process.env.TEST_TOKEN_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
})

// Selector strategies that work with your existing components
export const SELECTORS = {
  // Wallet selectors using existing patterns (enhanced with data-testid)
  wallet: {
    connect: '[data-testid="connect-wallet-button"], text=Connect Wallet',
    connected: '[data-testid="account-modal-button"], [title*="0x"], text=/0x[a-fA-F0-9]{4}/',
    changeNetwork: '[data-testid="change-network-button"]',
    wrongNetwork: '[data-testid="wrong-network-button"]',
    balance: 'text=/\\d+(\\.\\d+)? ETH/, text=/\\d+(\\.\\d+)? DEMO/',
    networkBadge: 'text=Base Sepolia, text=v2 Contract, text=Anvil Local'
  },
  
  // Navigation using your existing structure
  navigation: {
    home: '[href="/"], text=Cookie Jar',
    createJar: '[href="/create"], text=Create',
    exploreJars: '[href="/jars"], text=Explore',
    profile: '[href="/profile"], text=Profile'
  },
  
  // Forms using data-testid for reliability (with fallbacks)
  forms: {
    jarName: '[data-testid="jar-name-input"], input[placeholder*="name"], input:below(:text("Name"))',
    jarOwner: '[data-testid="jar-owner-input"], input:below(:text("Owner"))',
    jarDescription: 'textarea[placeholder*="description"], input:below(:text("Description"))',
    currency: '[data-testid="currency-selector"], select:has(option[value*="ETH"]), [role="combobox"]:near(:text("Currency"))',
    amount: 'input[placeholder*="amount"], input:below(:text("Amount"))',
    purpose: 'textarea[placeholder*="purpose"], input[placeholder*="purpose"]'
  },
  
  // Buttons using your existing CSS classes and text content
  buttons: {
    primary: '.cj-btn-primary, button:has-text("Create"), button:has-text("Deposit")',
    next: 'button:has-text("Next")',
    previous: 'button:has-text("Previous")',
    deposit: 'button:has-text("Deposit")',
    withdraw: 'button:has-text("Withdraw")',
    add: 'button:has-text("Add")',
    remove: 'button:has-text("Remove")',
    confirm: 'button:has-text("Confirm")'
  },
  
  // Cards and lists using your existing structure  
  cards: {
    jarCard: '.cj-card-primary, [class*="card"]:has([title*="0x"])',
    jarTitle: 'h1, h2, [class*="title"]',
    jarBalance: '[class*="balance"], text=/\\d+(\\.\\d+)? (ETH|DEMO)/',
    jarAddress: '[title*="0x"], text=/0x[a-fA-F0-9]{6}/'
  },
  
  // Tabs using Radix UI patterns
  tabs: {
    deposit: '[role="tab"]:has-text("Deposit"), text=Jar Deposit',
    withdraw: '[role="tab"]:has-text("Cookie"), text=Get Cookie', 
    admin: '[role="tab"]:has-text("Admin"), text=Admin Controls'
  },
  
  // Status indicators
  status: {
    loading: '[class*="animate-spin"], text=Loading, text=Creating',
    success: 'text=successful, text=created, text=updated, text=Cookie Jar Created',
    error: 'text=failed, text=error, [class*="destructive"]'
  },
  
  // NFT-specific selectors  
  nft: {
    addressInput: 'input[placeholder*="0x"], input:below(:text("NFT"))',
    typeSelect: 'select:has(option:text("ERC721")), [role="combobox"]:near(:text("Type"))',
    validation: 'text=Valid, text=✓, text=✅',
    tokenIdInput: 'input[placeholder*="token"], input:below(:text("Token ID"))'
  },
  
  // Access control
  access: {
    allowlist: 'text=Allowlist',
    nftGated: 'text=NFT Collection, text=NFT-Gated',
    poap: 'text=POAP',
    unlock: 'text=Unlock Protocol',
    hypercert: 'text=Hypercert',
    hats: 'text=Hats Protocol'
  }
} as const

// Helper function to create robust selectors with fallbacks
export const select = (primary: string, ...fallbacks: string[]) => 
  [primary, ...fallbacks].join(', ')

// Chain configuration
export const CHAIN_CONFIG = {
  chainId: 31337,
  rpcUrl: 'http://127.0.0.1:8545',
  name: 'Anvil Local'
} as const

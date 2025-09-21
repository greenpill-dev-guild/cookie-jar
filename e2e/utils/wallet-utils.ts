import { test as base, Page, BrowserContext, expect } from '@playwright/test'
import { ANVIL_ACCOUNTS, SELECTORS } from './constants'

// Extend Window interface for test wallet state
declare global {
  interface Window {
    __TEST_WALLET_STATE__?: {
      isConnected: boolean
      address: string
      chainId: number
      balance: string
    }
  }
}

// Extended test with wallet utilities
export const test = base.extend<{
  wallet: WalletTester
}>({
  wallet: async ({ page, context }, use) => {
    const wallet = new WalletTester(page, context)
    await use(wallet)
  }
})

export class WalletTester {
  constructor(private page: Page, private context: BrowserContext) {}

  async connectWallet(accountIndex: number = 0) {
    const account = ANVIL_ACCOUNTS[accountIndex]
    
    console.log(`🔗 Connecting wallet as ${account.name} (${account.address})`)
    
    // Navigate to app if not already there
    if (!this.page.url().includes('localhost:3000')) {
      await this.page.goto('/')
    }
    
    // Look for connect wallet button using your existing patterns
    const connectButton = this.page.locator(SELECTORS.wallet.connect).first()
    const isVisible = await connectButton.isVisible()
    
    if (isVisible) {
      await connectButton.click()
      
      // For E2E testing, we'll inject wallet state to simulate connection
      // This avoids needing actual MetaMask extension setup
      await this.page.evaluate((accountData) => {
        // Mock wallet connection state
        window.__TEST_WALLET_STATE__ = {
          isConnected: true,
          address: accountData.address,
          chainId: 31337,
          balance: '1000.0' // Each account has 1000 ETH
        }
        
        // Trigger wagmi state update
        window.dispatchEvent(new CustomEvent('wallet-connected', {
          detail: accountData
        }))
        
        // Mock localStorage for RainbowKit
        localStorage.setItem('rainbowkit.connected', 'true')
        localStorage.setItem('rainbowkit.wallet', 'injected')
      }, account)
      
      // Wait for UI to update
      await this.page.waitForSelector(SELECTORS.wallet.connected, { timeout: 10000 })
      
      console.log(`✅ Connected as ${account.name}`)
    } else {
      console.log('ℹ️ Already connected or connect button not found')
    }
  }

  async switchAccount(accountIndex: number) {
    const account = ANVIL_ACCOUNTS[accountIndex]
    
    console.log(`🔄 Switching to ${account.name}`)
    
    await this.page.evaluate((accountData) => {
      // Update wallet state
      if (window.__TEST_WALLET_STATE__) {
        window.__TEST_WALLET_STATE__.address = accountData.address
      }
      
      // Trigger account change event
      window.dispatchEvent(new CustomEvent('wallet-account-changed', {
        detail: accountData
      }))
    }, account)
    
    // Wait for UI to reflect change (look for new address)
    await this.page.waitForFunction(
      (expectedAddress) => {
        const elements = document.querySelectorAll('[title*="0x"], [class*="address"]')
        return Array.from(elements).some(el => 
          el.textContent?.includes(expectedAddress.slice(0, 6)) ||
          el.getAttribute('title')?.includes(expectedAddress)
        )
      },
      account.address,
      { timeout: 5000 }
    )
    
    console.log(`✅ Switched to ${account.name}`)
  }

  async signTransaction() {
    console.log('✍️ Signing transaction...')
    
    // For E2E testing, simulate transaction confirmation
    // This avoids needing actual MetaMask extension
    await this.page.evaluate(() => {
      // Generate realistic transaction hash
      const txHash = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      // Simulate wagmi transaction confirmation
      window.dispatchEvent(new CustomEvent('transaction-confirmed', {
        detail: {
          hash: txHash,
          status: 'success',
          blockNumber: Math.floor(Math.random() * 1000000)
        }
      }))
    })
    
    // Wait for success message using your existing patterns
    await this.page.waitForSelector(SELECTORS.status.success, { timeout: 30000 })
    console.log('✅ Transaction confirmed')
  }

  async rejectTransaction() {
    console.log('❌ Rejecting transaction...')
    
    await this.page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('transaction-rejected', {
        detail: { reason: 'User rejected transaction' }
      }))
    })
    
    await this.page.waitForSelector(SELECTORS.status.error, { timeout: 5000 })
    console.log('✅ Transaction rejection handled')
  }

  async getConnectedAccount() {
    return await this.page.evaluate(() => {
      return window.__TEST_WALLET_STATE__?.address
    })
  }

  async waitForTransaction() {
    // Wait for any pending transaction to complete
    await this.page.waitForFunction(() => {
      // Look for loading states to disappear
      const loadingElements = document.querySelectorAll('[class*="animate-spin"]')
      return loadingElements.length === 0
    }, { timeout: 30000 })
  }
}

// Re-export expect for convenience
export { expect } from '@playwright/test'

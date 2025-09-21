import { test, expect } from './utils/wallet-utils'
import { SELECTORS, ANVIL_ACCOUNTS } from './utils/constants'

test.describe('💰 Jar Operations E2E', () => {
  test.beforeEach(async ({ wallet }) => {
    // Connect as Cookie Monster (has NFTs and is allowlisted)
    await wallet.connectWallet(1)
  })

  test('Complete deposit and withdrawal flow', async ({ page, wallet }) => {
    console.log('💰 Testing deposit and withdrawal flow...')
    
    // Navigate to jars page and select first jar
    await page.goto('/jars')
    await page.waitForSelector(SELECTORS.cards.jarCard, { timeout: 10000 })
    
    // Click on first jar card
    await page.click(SELECTORS.cards.jarCard)
    await page.waitForSelector(SELECTORS.cards.jarTitle)
    
    // Get initial balance for comparison
    const balanceElement = page.locator(SELECTORS.cards.jarBalance).first()
    const initialBalance = await balanceElement.textContent()
    console.log('📊 Initial jar balance:', initialBalance)
    
    // Test Deposit Flow
    console.log('💳 Testing deposit...')
    await page.click(SELECTORS.tabs.deposit)
    
    // Fill deposit amount
    await page.fill(SELECTORS.forms.amount, '1.0')
    
    // Click deposit button
    await page.click(SELECTORS.buttons.deposit)
    
    // Handle transaction
    await wallet.signTransaction()
    
    // Verify deposit success
    await expect(page.locator(SELECTORS.status.success)).toBeVisible()
    
    // Wait for React Query cache to update and verify balance changed
    await page.waitForTimeout(3000)
    const newBalance = await balanceElement.textContent()
    console.log('📊 New jar balance:', newBalance)
    expect(newBalance).not.toBe(initialBalance)

    // Test Withdrawal Flow
    console.log('💸 Testing withdrawal...')
    await page.click(SELECTORS.tabs.withdraw)
    
    // Check if user can withdraw (allowlisted or has NFT)
    const withdrawSection = page.locator('text=Get Cookie').locator('..').locator('..')
    const canWithdraw = await withdrawSection.locator(SELECTORS.buttons.withdraw).isVisible()
    
    if (canWithdraw) {
      console.log('✅ User can withdraw')
      
      // Check if purpose is required
      const purposeField = page.locator(SELECTORS.forms.purpose)
      if (await purposeField.isVisible()) {
        await purposeField.fill('E2E test withdrawal for verification')
      }
      
      // Check if amount input is needed (variable withdrawal)
      const amountField = withdrawSection.locator(SELECTORS.forms.amount)
      if (await amountField.isVisible()) {
        await amountField.fill('0.1')
      }
      
      // Get balance before withdrawal
      const balanceBeforeWithdraw = await balanceElement.textContent()
      
      // Perform withdrawal
      await page.click(SELECTORS.buttons.withdraw)
      await wallet.signTransaction()
      
      // Verify withdrawal success
      await expect(page.locator(SELECTORS.status.success)).toBeVisible()
      
      // Verify balance decreased
      await page.waitForTimeout(3000)
      const balanceAfterWithdraw = await balanceElement.textContent()
      expect(balanceAfterWithdraw).not.toBe(balanceBeforeWithdraw)
      
      console.log('✅ Withdrawal completed successfully')
    } else {
      console.log('ℹ️ User cannot withdraw (not allowlisted)')
      
      // Should see access denied message
      await expect(page.locator('text=Not Allowlisted, text=access denied')).toBeVisible()
    }
  })

  test('NFT-gated withdrawal flow', async ({ page, wallet }) => {
    console.log('🎨 Testing NFT-gated withdrawal...')
    
    // Navigate to jars and look for NFT-gated jars
    await page.goto('/jars')
    
    // Find NFT-gated jar (look for NFT-Gated access type)
    const nftJar = page.locator(SELECTORS.cards.jarCard)
      .filter({ hasText: 'NFT-Gated' })
      .first()
    
    const nftJarExists = await nftJar.isVisible()
    test.skip(!nftJarExists, 'No NFT-gated jars found - needs v2 contracts')
    
    await nftJar.click()
    
    // Verify NFT ownership is detected (Cookie Monster should own NFT #0)
    await expect(page.locator('text=You own, text=NFT')).toBeVisible()
    
    // Perform NFT withdrawal
    await page.click(SELECTORS.tabs.withdraw)
    
    // Fill NFT-specific fields
    await page.fill(SELECTORS.nft.addressInput, '0x5FbDB2315678afecb367f032d93F642f64180aa3')
    await page.fill(SELECTORS.nft.tokenIdInput, '0')
    
    // Fill withdrawal amount if variable
    const amountField = page.locator(SELECTORS.forms.amount)
    if (await amountField.isVisible()) {
      await amountField.fill('0.05')
    }
    
    // Fill purpose if required
    const purposeField = page.locator(SELECTORS.forms.purpose)
    if (await purposeField.isVisible()) {
      await purposeField.fill('NFT holder withdrawal test')
    }
    
    // Perform withdrawal
    await page.click(SELECTORS.buttons.withdraw)
    await wallet.signTransaction()
    
    await expect(page.locator(SELECTORS.status.success)).toBeVisible()
    
    console.log('✅ NFT withdrawal test passed!')
  })

  test('Access control enforcement', async ({ page, wallet }) => {
    console.log('🔒 Testing access control enforcement...')
    
    // Switch to non-allowlisted user
    await wallet.switchAccount(3) // Test User - not allowlisted
    
    await page.goto('/jars')
    await page.click(SELECTORS.cards.jarCard)
    
    // Try to withdraw
    await page.click(SELECTORS.tabs.withdraw)
    
    // Should see access denied
    await expect(page.locator('text=Not Allowlisted, text=access denied, text=cannot')).toBeVisible()
    
    // Withdrawal button should either be disabled or not visible
    const withdrawButton = page.locator(SELECTORS.buttons.withdraw)
    const canWithdraw = await withdrawButton.isVisible() && await withdrawButton.isEnabled()
    
    expect(canWithdraw).toBe(false)
    
    console.log('✅ Access control enforcement test passed!')
  })

  test('Cooldown period enforcement', async ({ page, wallet }) => {
    console.log('⏰ Testing cooldown period enforcement...')
    
    // Connect as allowlisted user
    await wallet.connectWallet(1)
    
    await page.goto('/jars')
    await page.click(SELECTORS.cards.jarCard)
    await page.click(SELECTORS.tabs.withdraw)
    
    // Check if user can withdraw
    const canWithdraw = await page.locator(SELECTORS.buttons.withdraw).isVisible()
    
    if (canWithdraw) {
      // Perform first withdrawal
      const purposeField = page.locator(SELECTORS.forms.purpose)
      if (await purposeField.isVisible()) {
        await purposeField.fill('First withdrawal for cooldown test')
      }
      
      const amountField = page.locator(SELECTORS.forms.amount)
      if (await amountField.isVisible()) {
        await amountField.fill('0.05')
      }
      
      await page.click(SELECTORS.buttons.withdraw)
      await wallet.signTransaction()
      
      await expect(page.locator(SELECTORS.status.success)).toBeVisible()
      
      // Immediately try to withdraw again - should be in cooldown
      await page.reload()
      await page.click(SELECTORS.tabs.withdraw)
      
      // Should see cooldown message or disabled state
      const hasCountdown = await page.isVisible('text=cooldown, text=wait, text=next withdrawal')
      
      if (hasCountdown) {
        console.log('✅ Cooldown period properly enforced')
      } else {
        // Alternative: withdrawal button should be disabled
        const withdrawButton = page.locator(SELECTORS.buttons.withdraw)
        const isDisabled = await withdrawButton.isDisabled()
        expect(isDisabled).toBe(true)
        console.log('✅ Withdrawal disabled during cooldown')
      }
    } else {
      test.skip(true, 'User cannot withdraw from this jar')
    }
  })
})

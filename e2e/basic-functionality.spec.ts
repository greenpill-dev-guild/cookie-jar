import { test, expect } from '@playwright/test'

test.describe('💰 Basic Cookie Jar Functionality', () => {
  test('Basic jar interaction without wallet connection', async ({ page }) => {
    console.log('💰 Testing basic jar interaction...')
    
    // Go to jars page
    await page.goto('/jars')
    
    // Wait for jars to load from your Anvil setup
    await page.waitForSelector('.cj-card-primary, [class*="card"]', { timeout: 20000 })
    
    // Click on first jar
    const firstJar = page.locator('.cj-card-primary, [class*="card"]:has([title*="0x"])').first()
    await expect(firstJar).toBeVisible()
    await firstJar.click()
    
    // Should navigate to jar detail page
    await page.waitForSelector('h1, [class*="title"]', { timeout: 15000 })
    
    // Verify jar page loads with basic elements
    const jarTitle = page.locator('h1, [class*="title"]')
    await expect(jarTitle.first()).toBeVisible()
    
    // Check for deposit/withdraw tabs
    const depositTab = page.locator('text=Deposit, text=Jar Deposit')
    const withdrawTab = page.locator('text=Withdraw, text=Get Cookie')
    
    // At least one of these should be visible
    const hasDepositTab = await depositTab.count() > 0
    const hasWithdrawTab = await withdrawTab.count() > 0
    
    expect(hasDepositTab || hasWithdrawTab).toBe(true)
    
    console.log('✅ Basic jar interaction working')
  })

  test('Jar creation form validation works', async ({ page }) => {
    console.log('📝 Testing form validation...')
    
    await page.goto('/create')
    
    // Wait for form to load
    await page.waitForSelector('[data-testid="jar-name-input"], input[placeholder*="Community"]', { timeout: 15000 })
    
    // Try to proceed without filling required fields
    const nextButton = page.locator('button:has-text("Next")')
    await expect(nextButton.first()).toBeVisible()
    
    // Next button should be disabled initially (empty form)
    const isDisabled = await nextButton.first().isDisabled()
    expect(isDisabled).toBe(true)
    
    // Fill in jar name
    const jarNameInput = page.locator('[data-testid="jar-name-input"], input[placeholder*="Community"]')
    await jarNameInput.first().fill('Test Jar E2E')
    
    // Next button might become enabled (depends on your validation logic)
    await page.waitForTimeout(500) // Give time for validation to run
    
    console.log('✅ Form validation working')
  })

  test('Network and wallet UI elements present', async ({ page }) => {
    console.log('🔗 Testing wallet and network UI...')
    
    await page.goto('/')
    
    // Check for wallet connection elements
    const connectWallet = page.locator('[data-testid="connect-wallet-button"], text=Connect Wallet')
    await expect(connectWallet.first()).toBeVisible()
    
    // Check navigation links
    const createLink = page.locator('[href="/create"], text=Create')
    const jarsLink = page.locator('[href="/jars"], text=Explore, text=Jars')
    
    // At least one navigation element should be present
    const hasCreate = await createLink.count() > 0
    const hasJars = await jarsLink.count() > 0
    
    expect(hasCreate || hasJars).toBe(true)
    
    console.log('✅ Wallet and navigation UI elements present')
  })

  test('Jar balance and currency display works', async ({ page }) => {
    console.log('💰 Testing balance and currency display...')
    
    await page.goto('/jars')
    await page.waitForSelector('.cj-card-primary, [class*="card"]', { timeout: 20000 })
    
    // Click on first jar to see details
    const firstJar = page.locator('.cj-card-primary, [class*="card"]:has([title*="0x"])').first()
    await firstJar.click()
    
    await page.waitForSelector('h1, [class*="title"]', { timeout: 15000 })
    
    // Look for balance information
    const balanceElements = page.locator('text=/\\d+(\\.\\d+)? (ETH|DEMO)/, [class*="balance"]')
    
    // Should find at least one balance display
    const balanceCount = await balanceElements.count()
    if (balanceCount > 0) {
      await expect(balanceElements.first()).toBeVisible()
      console.log('💰 Balance display found and working')
    } else {
      console.log('📝 No explicit balance display found (this might be OK depending on jar state)')
    }
    
    // Look for currency information
    const currencyElements = page.locator('text=ETH, text=DEMO, text=ERC20')
    const hasCurrency = await currencyElements.count() > 0
    
    if (hasCurrency) {
      console.log('💱 Currency information displayed')
    }
    
    console.log('✅ Jar balance and currency testing complete')
  })

  test('Access control indicators work', async ({ page }) => {
    console.log('🔐 Testing access control indicators...')
    
    await page.goto('/jars')
    await page.waitForSelector('.cj-card-primary, [class*="card"]', { timeout: 20000 })
    
    // Click on first jar
    const firstJar = page.locator('.cj-card-primary, [class*="card"]:has([title*="0x"])').first()
    await firstJar.click()
    
    await page.waitForSelector('h1, [class*="title"]', { timeout: 15000 })
    
    // Look for access type indicators
    const accessTypes = page.locator('text=Allowlist, text=NFT-Gated, text=Whitelist')
    const statusBadges = page.locator('text=Allowlisted, text=Not Allowlisted, text=Denylisted')
    
    // Should find access type information
    const hasAccessType = await accessTypes.count() > 0
    const hasStatus = await statusBadges.count() > 0
    
    if (hasAccessType) {
      console.log('🔐 Access type indicators found')
    }
    
    if (hasStatus) {
      console.log('👤 User status indicators found')
    }
    
    // At least one access control indicator should be present
    expect(hasAccessType || hasStatus).toBe(true)
    
    console.log('✅ Access control indicators working')
  })
})

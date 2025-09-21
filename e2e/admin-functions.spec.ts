import { test, expect } from './utils/wallet-utils'
import { SELECTORS, ANVIL_ACCOUNTS } from './utils/constants'

test.describe('🔧 Admin Functions E2E', () => {
  test.beforeEach(async ({ wallet, page }) => {
    // Connect as admin (Deployer account)
    await wallet.connectWallet(0)
    
    // Navigate to a jar admin panel
    await page.goto('/jars')
    await page.waitForSelector(SELECTORS.cards.jarCard, { timeout: 10000 })
    await page.click(SELECTORS.cards.jarCard)
    
    // Check if admin tab is available
    const hasAdminTab = await page.isVisible(SELECTORS.tabs.admin)
    test.skip(!hasAdminTab, 'Admin controls not available - not jar owner')
    
    await page.click(SELECTORS.tabs.admin)
  })

  test('Allowlist management - add and remove users', async ({ page, wallet }) => {
    console.log('👥 Testing allowlist management...')
    
    const testUserAddress = ANVIL_ACCOUNTS[3].address // Test User
    
    // Look for allowlist management section
    const allowlistSection = page.locator('text=Allowlist').locator('..')
    await expect(allowlistSection).toBeVisible()
    
    // Add user to allowlist
    console.log('➕ Adding user to allowlist...')
    const addInput = allowlistSection.locator('input[placeholder*="0x"], input:below(:text("Add"))')
    await addInput.fill(testUserAddress)
    
    const addButton = allowlistSection.locator(SELECTORS.buttons.add)
    await addButton.click()
    
    await wallet.signTransaction()
    await expect(page.locator(SELECTORS.status.success)).toBeVisible()
    
    // Verify user appears in allowlist
    await expect(page.locator(`text=${testUserAddress.slice(0, 8)}`)).toBeVisible()
    console.log('✅ User added to allowlist')
    
    // Remove user from allowlist
    console.log('➖ Removing user from allowlist...')
    const removeButton = page.locator(SELECTORS.buttons.remove)
      .filter({ hasText: 'Remove' })
      .locator(`xpath=.//ancestor::*[contains(text(), '${testUserAddress.slice(0, 8)}')]//button`)
    
    await removeButton.click()
    
    // Handle confirmation dialog if present
    const confirmButton = page.locator(SELECTORS.buttons.confirm)
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }
    
    await wallet.signTransaction()
    await expect(page.locator(SELECTORS.status.success)).toBeVisible()
    
    // Verify user is removed
    await expect(page.locator(`text=${testUserAddress.slice(0, 8)}`)).not.toBeVisible()
    console.log('✅ User removed from allowlist')
  })

  test('NFT gate management (v2 contracts only)', async ({ page, wallet }) => {
    console.log('🎨 Testing NFT gate management...')
    
    // Check if NFT gate management is available
    const hasNFTSection = await page.isVisible('text=NFT Gate, text=NFT Collection')
    test.skip(!hasNFTSection, 'NFT gate management not available - requires v2 contracts and NFT-gated jar')
    
    // Add new NFT gate
    console.log('➕ Adding NFT gate...')
    const nftSection = page.locator('text=NFT').locator('..')
    
    // Use a different NFT contract for testing (BAYC as example)
    const newNFTAddress = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D'
    
    await nftSection.locator('input[placeholder*="0x"]').fill(newNFTAddress)
    
    const typeSelect = nftSection.locator('select, [role="combobox"]')
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption('ERC721')
    }
    
    await nftSection.locator(SELECTORS.buttons.add).click()
    await wallet.signTransaction()
    
    await expect(page.locator(SELECTORS.status.success)).toBeVisible()
    
    // Verify NFT gate was added
    await expect(page.locator(`text=${newNFTAddress.slice(0, 8)}`)).toBeVisible()
    console.log('✅ NFT gate added successfully')
    
    // Remove NFT gate
    console.log('➖ Removing NFT gate...')
    const removeButton = page.locator(SELECTORS.buttons.remove)
      .filter({ hasText: 'Remove' })
      .locator(`xpath=.//ancestor::*[contains(text(), '${newNFTAddress.slice(0, 8)}')]//button`)
    
    await removeButton.click()
    
    // Handle confirmation if present
    const confirmButton = page.locator(SELECTORS.buttons.confirm)
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }
    
    await wallet.signTransaction()
    await expect(page.locator(SELECTORS.status.success)).toBeVisible()
    
    // Verify NFT gate was removed
    await expect(page.locator(`text=${newNFTAddress.slice(0, 8)}`)).not.toBeVisible()
    console.log('✅ NFT gate removed successfully')
  })

  test('Jar metadata updates', async ({ page, wallet }) => {
    console.log('📝 Testing metadata updates...')
    
    // Look for edit button or metadata section
    const editButton = page.locator('button:has-text("Edit")')
    const hasEditFunction = await editButton.isVisible()
    
    test.skip(!hasEditFunction, 'Metadata editing not available')
    
    await editButton.click()
    
    // Update jar information
    const nameInput = page.locator('input:below(:text("Name"))')
    const descInput = page.locator('textarea:below(:text("Description")), input:below(:text("Description"))')
    const imageInput = page.locator('input:below(:text("Image"))')
    
    if (await nameInput.isVisible()) {
      await nameInput.fill('Updated Jar Name E2E')
    }
    
    if (await descInput.isVisible()) {
      await descInput.fill('Updated by E2E test')
    }
    
    if (await imageInput.isVisible()) {
      await imageInput.fill('https://example.com/updated-image.png')
    }
    
    // Save changes
    await page.click('button:has-text("Save")')
    await wallet.signTransaction()
    
    await expect(page.locator(SELECTORS.status.success)).toBeVisible()
    
    // Verify updates are reflected
    await expect(page.locator('h1, [class*="title"]')).toContainText('Updated Jar Name E2E')
    
    console.log('✅ Metadata update test passed!')
  })

  test('Emergency withdrawal (if enabled)', async ({ page, wallet }) => {
    console.log('🚨 Testing emergency withdrawal...')
    
    // Look for emergency section
    const emergencySection = page.locator('text=Emergency').locator('..')
    const hasEmergency = await emergencySection.isVisible()
    
    test.skip(!hasEmergency, 'Emergency withdrawal not enabled for this jar')
    
    // Get current jar balance
    const balanceElement = page.locator(SELECTORS.cards.jarBalance).first()
    const initialBalance = await balanceElement.textContent()
    
    // Fill emergency withdrawal form
    await emergencySection.locator('input:below(:text("Amount"))').fill('0.1')
    
    // Click emergency withdraw
    await emergencySection.locator('button:has-text("Emergency"):has-text("Withdraw")').click()
    
    // Should show warning confirmation
    await expect(page.locator('text=Warning, text=Emergency')).toBeVisible()
    
    // Confirm emergency action
    await page.click('button:has-text("Confirm")')
    await wallet.signTransaction()
    
    await expect(page.locator(SELECTORS.status.success)).toBeVisible()
    
    // Verify balance decreased
    await page.waitForTimeout(3000)
    const newBalance = await balanceElement.textContent()
    expect(newBalance).not.toBe(initialBalance)
    
    console.log('✅ Emergency withdrawal test passed!')
  })

  test('Admin access control validation', async ({ page, wallet }) => {
    console.log('🛡️ Testing admin access control...')
    
    // Switch to non-admin user
    await wallet.switchAccount(2) // Cookie Fan - not admin
    
    await page.reload()
    
    // Admin tab should not be available
    const adminTab = page.locator(SELECTORS.tabs.admin)
    const hasAdminAccess = await adminTab.isVisible()
    
    expect(hasAdminAccess).toBe(false)
    
    // Try to access admin functions directly
    await page.goto(page.url() + '?tab=admin')
    
    // Should either redirect or show access denied
    const hasAdminContent = await page.locator('text=Admin Controls').isVisible()
    expect(hasAdminContent).toBe(false)
    
    console.log('✅ Admin access control properly enforced!')
  })
})

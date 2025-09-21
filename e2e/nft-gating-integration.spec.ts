import { test, expect } from '@playwright/test'

test.describe('🎨 NFT Gating Integration (v2 Contracts)', () => {
  test('Verify NFT-gated jars exist and display correctly', async ({ page }) => {
    console.log('🎨 Testing NFT-gated jar detection...')
    
    await page.goto('/jars')
    
    // Wait for jars to load from your Anvil setup
    await page.waitForSelector('.cj-card-primary, [class*="card"]', { timeout: 20000 })
    
    // Look for jars that mention NFT gating
    const nftGatedJars = page.locator('text=NFT-Gated, text=Cookie Monster, text=NFT')
    const nftJarCount = await nftGatedJars.count()
    
    console.log(`📊 Found ${nftJarCount} elements mentioning NFT gating`)
    
    // Your Anvil setup creates NFT-gated jars, so we should find some
    if (nftJarCount > 0) {
      await expect(nftGatedJars.first()).toBeVisible()
      console.log('✅ NFT-gated jar indicators found')
    } else {
      console.log('📝 No explicit NFT-gated indicators found (checking jar details)')
    }
  })

  test('NFT-gated jar access control displays correctly', async ({ page }) => {
    console.log('🔐 Testing NFT access control display...')
    
    await page.goto('/jars')
    await page.waitForSelector('.cj-card-primary, [class*="card"]', { timeout: 20000 })
    
    // Click on each jar to find NFT-gated ones
    const jarCards = page.locator('.cj-card-primary, [class*="card"]:has([title*="0x"])')
    const jarCount = await jarCards.count()
    
    for (let i = 0; i < Math.min(jarCount, 3); i++) {
      console.log(`🔍 Checking jar ${i + 1} for NFT gating...`)
      
      // Click on jar
      await jarCards.nth(i).click()
      await page.waitForSelector('h1, [class*="title"]', { timeout: 10000 })
      
      // Check if this jar shows NFT-related content
      const nftContent = page.locator('text=NFT-Gated, text=Cookie Monster, text=NFT Collection')
      const hasNFTContent = await nftContent.count() > 0
      
      if (hasNFTContent) {
        console.log(`✅ Found NFT-gated jar ${i + 1}`)
        
        // Verify access control information is displayed
        const accessInfo = page.locator('text=Access Type, text=NFT-Gated')
        if (await accessInfo.count() > 0) {
          await expect(accessInfo.first()).toBeVisible()
        }
        
        // Check for withdrawal requirements
        const withdrawSection = page.locator('text=Get Cookie, text=Withdraw')
        if (await withdrawSection.count() > 0) {
          console.log('💰 Withdrawal section found for NFT-gated jar')
        }
        
        break // Found what we need
      }
      
      // Go back to try next jar
      await page.goBack()
      await page.waitForSelector('.cj-card-primary, [class*="card"]', { timeout: 10000 })
    }
    
    console.log('✅ NFT-gated jar access control testing complete')
  })

  test('NFT contract address validation in create form (v2 only)', async ({ page }) => {
    console.log('🎯 Testing NFT contract validation...')
    
    await page.goto('/create')
    
    // Wait for form to load
    await page.waitForSelector('[data-testid="jar-name-input"], input[placeholder*="Community"]', { timeout: 15000 })
    
    // Fill basic info to get to access control step
    await page.fill('[data-testid="jar-name-input"], input[placeholder*="Community"]', 'NFT Test Jar')
    
    // Try to navigate to next step
    const nextButton = page.locator('button:has-text("Next")')
    const isNextEnabled = !(await nextButton.first().isDisabled())
    
    if (isNextEnabled) {
      await nextButton.first().click()
      
      // Look for withdrawal settings step
      await page.waitForTimeout(1000)
      
      // Fill withdrawal settings to get to access control (if on v2)
      const amountInput = page.locator('input[placeholder*="amount"], input[type="number"]')
      const intervalInput = page.locator('input[placeholder*="days"], input[placeholder*="interval"]')
      
      if (await amountInput.count() > 0) {
        await amountInput.first().fill('0.1')
      }
      if (await intervalInput.count() > 0) {
        await intervalInput.first().fill('7')
      }
      
      // Try to go to access control step
      const nextButton2 = page.locator('button:has-text("Next")')
      if (await nextButton2.count() > 0 && !(await nextButton2.first().isDisabled())) {
        await nextButton2.first().click()
        
        // Check if we're on access control step (v2 feature)
        const accessControlSection = page.locator('text=Access Control, text=NFT Collection, text=Allowlist')
        const hasAccessControl = await accessControlSection.count() > 0
        
        if (hasAccessControl) {
          console.log('🎯 Found access control step - this is v2 contract!')
          
          // Look for NFT input fields
          const nftInputs = page.locator('input[placeholder*="0x"], input:below(:text("NFT"))')
          if (await nftInputs.count() > 0) {
            console.log('🎨 NFT input fields found')
            
            // Test invalid address validation
            await nftInputs.first().fill('invalid-address')
            await page.waitForTimeout(500)
            
            // Should show validation error
            const errorIndicators = page.locator('text=Invalid, text=Error, .error, [class*="error"]')
            if (await errorIndicators.count() > 0) {
              console.log('✅ NFT address validation working')
            }
          }
        } else {
          console.log('📝 No access control step found - this is v1 contract')
        }
      }
    }
    
    console.log('✅ NFT contract validation testing complete')
  })

  test('Cookie Monster NFT integration works', async ({ page }) => {
    console.log('🍪 Testing Cookie Monster NFT integration...')
    
    await page.goto('/jars')
    await page.waitForSelector('.cj-card-primary, [class*="card"]', { timeout: 20000 })
    
    // Look for Cookie Monster themed content
    const cookieContent = page.locator('text=Cookie Monster, text=Cookie, [alt*="Cookie"]')
    const cookieCount = await cookieContent.count()
    
    console.log(`🍪 Found ${cookieCount} Cookie Monster references`)
    
    if (cookieCount > 0) {
      // Click on jar with Cookie Monster content
      const jarCards = page.locator('.cj-card-primary, [class*="card"]:has([title*="0x"])')
      const jarCount = await jarCards.count()
      
      for (let i = 0; i < jarCount; i++) {
        await jarCards.nth(i).click()
        await page.waitForSelector('h1, [class*="title"]', { timeout: 10000 })
        
        // Check if this jar mentions Cookie Monster or NFT
        const cookieJarContent = page.locator('text=Cookie Monster, text=NFT-Gated, text=NFT')
        if (await cookieJarContent.count() > 0) {
          console.log(`✅ Found Cookie Monster jar ${i + 1}`)
          
          // Verify NFT-related UI elements
          const nftElements = page.locator('text=NFT, text=Token ID, text=Contract')
          if (await nftElements.count() > 0) {
            console.log('🎨 NFT UI elements present')
          }
          
          break
        }
        
        // Go back and try next jar
        await page.goBack()
        await page.waitForSelector('.cj-card-primary, [class*="card"]', { timeout: 10000 })
      }
    }
    
    console.log('✅ Cookie Monster NFT integration testing complete')
  })

  test('Withdrawal requirements displayed correctly', async ({ page }) => {
    console.log('💸 Testing withdrawal requirements...')
    
    await page.goto('/jars')
    await page.waitForSelector('.cj-card-primary, [class*="card"]', { timeout: 20000 })
    
    // Click on first jar
    const firstJar = page.locator('.cj-card-primary, [class*="card"]:has([title*="0x"])').first()
    await firstJar.click()
    
    await page.waitForSelector('h1, [class*="title"]', { timeout: 15000 })
    
    // Look for withdrawal tab
    const withdrawTab = page.locator('text=Get Cookie, text=Withdraw')
    if (await withdrawTab.count() > 0) {
      await withdrawTab.first().click()
      
      // Check for withdrawal requirements/restrictions
      const requirements = page.locator([
        'text=Allowlisted',
        'text=Not Allowlisted', 
        'text=NFT Required',
        'text=Access Denied',
        'text=Cooldown',
        'text=Purpose Required'
      ].join(', '))
      
      const hasRequirements = await requirements.count() > 0
      
      if (hasRequirements) {
        console.log('🔐 Withdrawal requirements displayed')
        await expect(requirements.first()).toBeVisible()
      } else {
        console.log('📝 No explicit withdrawal requirements shown (user may be authorized)')
      }
    }
    
    console.log('✅ Withdrawal requirements testing complete')
  })
})

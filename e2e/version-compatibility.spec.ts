import { test, expect } from './utils/wallet-utils'
import { SELECTORS, ANVIL_ACCOUNTS } from './utils/constants'

test.describe('🔄 Version Compatibility E2E', () => {
  test.describe('V1 Jar Compatibility', () => {
    const v1JarAddress = '0x1111111111111111111111111111111111111111' // Mock v1 jar address

    test('v1 jar shows appropriate fallback UI', async ({ page }) => {
      console.log('🕐 Testing v1 jar fallback experience...')
      
      await page.goto(`/jar/${v1JarAddress}`)
      
      // Should show version detection loading
      await expect(page.locator('text=Loading jar features...')).toBeVisible({ timeout: 10000 })
      
      // Should show v1 fallback message after detection
      await expect(page.locator('text=This is a v1 Cookie Jar')).toBeVisible({ timeout: 15000 })
      await expect(page.locator('text=Streaming and token recovery features are available in v2 jars only')).toBeVisible()
      
      // Should show upgrade information
      const upgradeLink = page.locator('a:has-text("Learn about upgrading")')
      await expect(upgradeLink).toBeVisible()
      await expect(upgradeLink).toHaveAttribute('href', 'https://docs.cookiejar.wtf/migration/v1-to-v2')
      await expect(upgradeLink).toHaveAttribute('target', '_blank')
      
      // Should show preview of v2 features (grayed out)
      await expect(page.locator('text=Available in v2 Jars')).toBeVisible()
      
      const featureCards = page.locator('.opacity-50')
      await expect(featureCards).toHaveCount(3)
      
      // Verify each v2 feature is shown but disabled
      await expect(page.locator('text=Real-time Streaming')).toBeVisible()
      await expect(page.locator('text=Superfluid integration for continuous token streams')).toBeVisible()
      
      await expect(page.locator('text=Multi-token Support')).toBeVisible()
      await expect(page.locator('text=Automatic token swapping and recovery')).toBeVisible()
      
      await expect(page.locator('text=Advanced Controls')).toBeVisible()
      await expect(page.locator('text=Enhanced admin tools and stream management')).toBeVisible()
    })

    test('v1 jar navigation works correctly', async ({ page }) => {
      console.log('🧭 Testing v1 jar navigation...')
      
      await page.goto(`/jar/${v1JarAddress}`)
      
      // Wait for v1 detection
      await expect(page.locator('text=This is a v1 Cookie Jar')).toBeVisible({ timeout: 15000 })
      
      // Basic navigation should still work
      const tabs = page.locator('[role="tab"], .tabs-trigger, text=Get Cookie, text=Jar Deposit')
      await expect(tabs.first()).toBeVisible({ timeout: 5000 })
      
      // Deposit tab should work
      const depositTab = page.locator('text=Jar Deposit, text=Deposit').first()
      if (await depositTab.isVisible()) {
        await depositTab.click()
        await expect(page.locator('text=All jar deposits are subject to')).toBeVisible()
      }
      
      // Get Cookie (withdrawal) tab should work
      const withdrawTab = page.locator('text=Get Cookie, text=Withdraw').first()
      if (await withdrawTab.isVisible()) {
        await withdrawTab.click()
        // Should show withdrawal interface (even for v1)
        await expect(page.locator('input[placeholder*="amount"], input[type="number"]')).toBeVisible()
      }
      
      // Streaming tab should NOT exist
      await expect(page.locator('text=Streaming, [data-testid="streaming-tab"]')).not.toBeVisible()
    })

    test('v1 jar core functionality remains intact', async ({ page, wallet }) => {
      console.log('⚙️ Testing v1 jar core functionality...')
      
      await wallet.connectWallet(1) // Connect as regular user
      await page.goto(`/jar/${v1JarAddress}`)
      
      // Wait for v1 detection
      await expect(page.locator('text=This is a v1 Cookie Jar')).toBeVisible({ timeout: 15000 })
      
      // Should still show jar details
      const jarDetails = page.locator('text=Available Balance, text=Access, text=Status, text=Rules, text=Contract')
      await expect(jarDetails.first()).toBeVisible({ timeout: 10000 })
      
      // Withdrawal functionality should work (UI-wise)
      const withdrawTab = page.locator('text=Get Cookie, text=Withdraw').first()
      if (await withdrawTab.isVisible()) {
        await withdrawTab.click()
        
        // Should be able to enter withdrawal amount
        const amountInput = page.locator('input[placeholder*="amount"], input[type="number"]').first()
        if (await amountInput.isVisible()) {
          await amountInput.fill('0.1')
          
          // Purpose field should be available
          const purposeInput = page.locator('input[placeholder*="purpose"], textarea[placeholder*="purpose"]').first()
          if (await purposeInput.isVisible()) {
            await purposeInput.fill('Test withdrawal from v1 jar')
          }
        }
      }
    })
  })

  test.describe('V2 Jar Advanced Features', () => {
    test('v2 jar shows full feature set', async ({ page, wallet }) => {
      console.log('🚀 Testing v2 jar full feature experience...')
      
      // Create a new v2 jar to test with
      await wallet.connectWallet(0) // Admin account
      await page.goto('/create')
      
      await page.fill(SELECTORS.forms.jarName, 'V2 Feature Test Jar')
      await page.fill(SELECTORS.forms.jarDescription, 'Testing complete v2 feature set')
      
      await page.click(SELECTORS.buttons.next)
      await page.click('text=Variable Amount')
      await page.fill('input:below(:text("Max Amount"))', '50')
      await page.click(SELECTORS.buttons.next)
      await page.click(SELECTORS.access.allowlist)
      await page.click(SELECTORS.buttons.next)
      
      // Create the jar
      await page.click(SELECTORS.buttons.primary)
      await wallet.signTransaction()
      
      await expect(page.locator(SELECTORS.status.success)).toBeVisible({ timeout: 30000 })
      await page.waitForURL(/\/jar\/0x[a-fA-F0-9]{40}/, { timeout: 30000 })
      
      const jarAddress = page.url().split('/jar/')[1]
      console.log(`✅ Created v2 jar: ${jarAddress}`)
      
      // Should detect v2 features
      await expect(page.locator('text=Loading jar features...')).toBeVisible({ timeout: 5000 })
      
      // Should NOT show v1 fallback
      await expect(page.locator('text=This is a v1 Cookie Jar')).not.toBeVisible({ timeout: 10000 })
      
      // Should show streaming tab
      const streamingTab = page.locator('text=Streaming, [data-testid="streaming-tab"]').first()
      await expect(streamingTab).toBeVisible({ timeout: 15000 })
      
      // Test streaming functionality
      await streamingTab.click()
      await expect(page.locator('text=How Streaming Works')).toBeVisible()
      
      // Should have multiple streaming-related tabs/sections
      await expect(page.locator('text=Token Streams')).toBeVisible()
      await expect(page.locator('text=Token Recovery')).toBeVisible()
      
      // Should show advanced streaming features
      const recoveryTab = page.locator('text=Recovery, [role="tab"]').first()
      if (await recoveryTab.isVisible()) {
        await recoveryTab.click()
        await expect(page.locator('text=Pending Tokens')).toBeVisible()
      }
      
      const streamsTab = page.locator('text=Streams, [role="tab"]').first()
      if (await streamsTab.isVisible()) {
        await streamsTab.click()
        await expect(page.locator('text=Active Streams')).toBeVisible()
      }
    })

    test('v2 jar admin features work correctly', async ({ page, wallet }) => {
      console.log('👑 Testing v2 jar admin features...')
      
      await wallet.connectWallet(0) // Admin account
      
      // Use the jar from previous test or create new one
      await page.goto('/create')
      
      await page.fill(SELECTORS.forms.jarName, 'V2 Admin Test Jar')
      await page.click(SELECTORS.buttons.next)
      await page.click(SELECTORS.buttons.next)
      await page.click(SELECTORS.access.allowlist)
      await page.click(SELECTORS.buttons.next)
      await page.click(SELECTORS.buttons.primary)
      await wallet.signTransaction()
      
      await expect(page.locator(SELECTORS.status.success)).toBeVisible({ timeout: 30000 })
      await page.waitForURL(/\/jar\/0x[a-fA-F0-9]{40}/, { timeout: 30000 })
      
      // Should show admin controls
      const adminTab = page.locator('text=Admin Controls, [data-testid="admin-tab"]').first()
      await expect(adminTab).toBeVisible({ timeout: 15000 })
      
      await adminTab.click()
      
      // Should have traditional admin controls
      await expect(page.locator('text=Pause Jar, text=Update Settings')).toBeVisible()
      
      // Should have v2-specific admin controls
      const streamingAdminControls = page.locator('text=Process Pending, text=Manage Streams, text=Token Recovery')
      if (await streamingAdminControls.first().isVisible({ timeout: 10000 })) {
        console.log('✅ V2 admin streaming controls are available')
      }
      
      // Test streaming-specific admin actions
      const streamingTab = page.locator('text=Streaming').first()
      if (await streamingTab.isVisible()) {
        await streamingTab.click()
        
        // Admin should see management interfaces
        const managementSections = page.locator('text=Stream Management, text=Token Recovery, text=Pending Tokens')
        await expect(managementSections.first()).toBeVisible({ timeout: 10000 })
      }
    })
  })

  test.describe('Feature Flag Behavior', () => {
    test('Feature flags correctly control UI elements', async ({ page }) => {
      console.log('🎌 Testing feature flag behavior...')
      
      const testCases = [
        {
          jarAddress: '0x1111111111111111111111111111111111111111', // Mock v1
          expectStreaming: false,
          expectSuperfluid: false,
          expectMultiToken: false,
        },
        {
          jarAddress: '0x2222222222222222222222222222222222222222', // Mock v2
          expectStreaming: true,
          expectSuperfluid: true,
          expectMultiToken: true,
        }
      ]
      
      for (const testCase of testCases) {
        console.log(`Testing jar ${testCase.jarAddress}...`)
        
        await page.goto(`/jar/${testCase.jarAddress}`)
        await page.waitForTimeout(2000) // Wait for version detection
        
        if (testCase.expectStreaming) {
          // Should show streaming features
          await expect(page.locator('text=Streaming, [data-testid="streaming-tab"]')).toBeVisible({ timeout: 15000 })
        } else {
          // Should NOT show streaming features
          await expect(page.locator('text=This is a v1 Cookie Jar')).toBeVisible({ timeout: 15000 })
          await expect(page.locator('[data-testid="streaming-tab"]')).not.toBeVisible()
        }
        
        // Check for superfluid-specific UI elements
        if (testCase.expectSuperfluid) {
          const streamingTab = page.locator('text=Streaming').first()
          if (await streamingTab.isVisible()) {
            await streamingTab.click()
            // Should show superfluid-related content
            await expect(page.locator('text=Real-time, text=Continuous')).toBeVisible({ timeout: 10000 })
          }
        }
        
        // Check for multi-token UI elements
        if (testCase.expectMultiToken) {
          const streamingTab = page.locator('text=Streaming').first()
          if (await streamingTab.isVisible()) {
            await streamingTab.click()
            await expect(page.locator('text=Token Recovery, text=Multi-token')).toBeVisible({ timeout: 10000 })
          }
        }
      }
    })

    test('Graceful degradation when features are unavailable', async ({ page }) => {
      console.log('🛡️ Testing graceful degradation...')
      
      // Test with a jar that has partial v2 features (edge case)
      await page.goto('/jar/0x3333333333333333333333333333333333333333')
      
      // Should handle partial feature detection gracefully
      await expect(page.locator('text=Loading jar features...')).toBeVisible({ timeout: 5000 })
      
      // Even if version detection fails, basic jar functionality should work
      await expect(page.locator('text=Available Balance, text=Cookie Jar')).toBeVisible({ timeout: 15000 })
      
      // Should show some kind of jar interface (either v1 fallback or v2 features)
      const tabElements = page.locator('[role="tab"], .tabs-trigger')
      await expect(tabElements.first()).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Performance Impact of Version Detection', () => {
    test('Version detection does not significantly impact page load', async ({ page }) => {
      console.log('⚡ Testing version detection performance...')
      
      const startTime = Date.now()
      
      await page.goto('/jar/0x1234567890123456789012345678901234567890')
      
      // Version detection should start quickly
      await expect(page.locator('text=Loading jar features...')).toBeVisible({ timeout: 3000 })
      
      const detectionStartTime = Date.now() - startTime
      console.log(`Version detection start time: ${detectionStartTime}ms`)
      
      // Should complete version detection reasonably quickly
      const versionDetectionComplete = page.locator('text=This is a v1 Cookie Jar').or(page.locator('text=Streaming'))
      await expect(versionDetectionComplete.first()).toBeVisible({ timeout: 10000 })
      
      const totalDetectionTime = Date.now() - startTime
      console.log(`Total version detection time: ${totalDetectionTime}ms`)
      
      // Version detection should not take more than 10 seconds
      expect(totalDetectionTime).toBeLessThan(10000)
      
      // Initial UI should be available quickly even during detection
      expect(detectionStartTime).toBeLessThan(3000)
    })

    test('Page remains usable during version detection', async ({ page }) => {
      console.log('🔄 Testing page usability during version detection...')
      
      await page.goto('/jar/0x1234567890123456789012345678901234567890')
      
      // Even while version detection is running, basic navigation should work
      await expect(page.locator('text=Loading jar features...')).toBeVisible({ timeout: 5000 })
      
      // Should be able to navigate to other tabs during detection
      const depositTab = page.locator('text=Jar Deposit, text=Deposit').first()
      if (await depositTab.isVisible({ timeout: 5000 })) {
        await depositTab.click()
        await expect(page.locator('text=deposit, text=fee')).toBeVisible()
      }
      
      // Should be able to navigate to withdrawal tab
      const withdrawTab = page.locator('text=Get Cookie, text=Withdraw').first()
      if (await withdrawTab.isVisible()) {
        await withdrawTab.click()
        await expect(page.locator('input[type="number"], input[placeholder*="amount"]')).toBeVisible()
      }
      
      // Navigation away from page should work during detection
      const homeLink = page.locator('a[href="/"], text=Home').first()
      if (await homeLink.isVisible()) {
        await homeLink.click()
        await expect(page.locator('text=Cookie Jar')).toBeVisible()
      }
    })
  })

  test.describe('User Experience Continuity', () => {
    test('Consistent UI patterns across v1 and v2 jars', async ({ page }) => {
      console.log('🎨 Testing UI consistency across versions...')
      
      const testJars = [
        { address: '0x1111111111111111111111111111111111111111', version: 'v1' },
        { address: '0x2222222222222222222222222222222222222222', version: 'v2' }
      ]
      
      for (const jar of testJars) {
        console.log(`Testing ${jar.version} jar UI consistency...`)
        
        await page.goto(`/jar/${jar.address}`)
        
        // Wait for version-specific content to load
        if (jar.version === 'v1') {
          await expect(page.locator('text=This is a v1 Cookie Jar')).toBeVisible({ timeout: 15000 })
        } else {
          await expect(page.locator('text=Streaming, [data-testid="streaming-tab"]')).toBeVisible({ timeout: 15000 })
        }
        
        // Core UI elements should be consistent
        await expect(page.locator('text=Available Balance')).toBeVisible()
        await expect(page.locator('text=Access')).toBeVisible()
        await expect(page.locator('text=Status')).toBeVisible()
        
        // Tab structure should be consistent (even if tab contents differ)
        const tabs = page.locator('[role="tab"], .tabs-trigger')
        const tabCount = await tabs.count()
        expect(tabCount).toBeGreaterThan(1) // Should have multiple tabs
        
        // Color scheme and branding should be consistent
        const brandingElements = page.locator('text=Cookie Jar, [class*="orange"], [class*="ff5e14"]')
        await expect(brandingElements.first()).toBeVisible()
      }
    })

    test('Help and documentation links work for both versions', async ({ page }) => {
      console.log('📚 Testing help and documentation links...')
      
      // Test v1 jar documentation
      await page.goto('/jar/0x1111111111111111111111111111111111111111')
      await expect(page.locator('text=This is a v1 Cookie Jar')).toBeVisible({ timeout: 15000 })
      
      // Should have upgrade guidance link
      const upgradeLink = page.locator('a:has-text("Learn about upgrading")')
      await expect(upgradeLink).toBeVisible()
      await expect(upgradeLink).toHaveAttribute('target', '_blank')
      
      // Test v2 jar documentation (if available)
      await page.goto('/jar/0x2222222222222222222222222222222222222222')
      
      // Should eventually show v2 features or graceful fallback
      const v2Content = page.locator('text=Streaming').or(page.locator('text=This is a v1 Cookie Jar'))
      await expect(v2Content.first()).toBeVisible({ timeout: 15000 })
      
      // Help links should be available and functional
      const helpLinks = page.locator('a[href*="docs"], a[href*="help"], a:has-text("Learn More")')
      if (await helpLinks.first().isVisible({ timeout: 5000 })) {
        await expect(helpLinks.first()).toHaveAttribute('target', '_blank')
      }
    })
  })
})

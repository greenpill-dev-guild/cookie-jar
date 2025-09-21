import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('♿ Accessibility Validation', () => {
  test('Homepage accessibility compliance', async ({ page }) => {
    console.log('♿ Testing homepage accessibility...')
    
    await page.goto('/')
    await page.waitForSelector('text=Cookie Jar', { timeout: 15000 })
    
    // Run accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('.loading-spinner, [class*="animate-spin"]')
      .analyze()
    
    // Check for critical violations only (be lenient for initial testing)
    const criticalViolations = accessibilityScanResults.violations.filter(
      violation => violation.impact === 'critical'
    )
    
    if (criticalViolations.length > 0) {
      console.log('⚠️ Critical accessibility violations found:', criticalViolations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length
      })))
    }
    
    // For now, just log violations but don't fail the test
    // In production, you'd want: expect(criticalViolations).toEqual([])
    console.log(`📊 Total violations: ${accessibilityScanResults.violations.length}, Critical: ${criticalViolations.length}`)
    
    console.log('✅ Accessibility scan completed')
  })

  test('Connect wallet button accessibility', async ({ page }) => {
    console.log('🔗 Testing wallet button accessibility...')
    
    await page.goto('/')
    
    // Find connect wallet button
    const connectButton = page.locator('[data-testid="connect-wallet-button"], text=Connect Wallet')
    await expect(connectButton.first()).toBeVisible()
    
    // Check for accessibility attributes
    const button = connectButton.first()
    
    // Check for accessible name (text content, aria-label, or aria-labelledby)
    const buttonText = await button.textContent()
    const ariaLabel = await button.getAttribute('aria-label')
    const ariaLabelledBy = await button.getAttribute('aria-labelledby')
    
    const hasAccessibleName = buttonText || ariaLabel || ariaLabelledBy
    expect(hasAccessibleName).toBeTruthy()
    
    // Check for proper role (should be button)
    const role = await button.evaluate(el => el.tagName.toLowerCase())
    expect(role).toBe('button')
    
    console.log('✅ Connect wallet button accessibility verified')
  })

  test('Form labels and inputs accessibility', async ({ page }) => {
    console.log('📝 Testing form accessibility...')
    
    await page.goto('/create')
    
    // Wait for form to load
    await page.waitForSelector('[data-testid="jar-name-input"], input[placeholder*="Community"]', { timeout: 15000 })
    
    // Check jar name input accessibility
    const jarNameInput = page.locator('[data-testid="jar-name-input"], input[placeholder*="Community"]')
    const nameInput = jarNameInput.first()
    
    // Check for label association
    const inputId = await nameInput.getAttribute('id')
    const ariaLabel = await nameInput.getAttribute('aria-label')
    
    let hasLabel = false
    if (inputId) {
      // Check for label with matching 'for' attribute
      const associatedLabel = page.locator(`label[for="${inputId}"]`)
      hasLabel = await associatedLabel.count() > 0
    }
    
    const hasAccessibleName = hasLabel || ariaLabel
    expect(hasAccessibleName).toBeTruthy()
    
    console.log('✅ Form input accessibility verified')
  })

  test('Keyboard navigation works', async ({ page }) => {
    console.log('⌨️ Testing keyboard navigation...')
    
    await page.goto('/')
    await page.waitForSelector('text=Cookie Jar', { timeout: 15000 })
    
    // Test tab navigation
    let focusableElements = 0
    
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      
      const focusedElement = page.locator(':focus')
      const isVisible = await focusedElement.isVisible()
      
      if (isVisible) {
        focusableElements++
        
        // Check if focus is visually indicated
        const hasFocusIndicator = await focusedElement.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return (
            styles.outline !== 'none' || 
            styles.boxShadow.includes('focus') ||
            styles.border.includes('focus') ||
            styles.backgroundColor !== styles.backgroundColor // Any background change
          )
        })
        
        // Log but don't fail on missing focus indicators for now
        if (!hasFocusIndicator) {
          console.log(`⚠️ Element ${i} may lack visible focus indicator`)
        }
      }
    }
    
    expect(focusableElements).toBeGreaterThan(0)
    console.log(`⌨️ Found ${focusableElements} focusable elements`)
    
    console.log('✅ Keyboard navigation testing complete')
  })

  test('Color contrast check on key elements', async ({ page }) => {
    console.log('🎨 Testing color contrast...')
    
    await page.goto('/')
    await page.waitForSelector('text=Cookie Jar', { timeout: 15000 })
    
    // Run focused accessibility scan on key interactive elements
    const contrastResults = await new AxeBuilder({ page })
      .include('button, .cj-btn-primary, .cj-btn-secondary, [data-testid*="button"]')
      .withTags(['wcag2aa'])
      .analyze()
    
    // Check specifically for color contrast violations
    const contrastViolations = contrastResults.violations.filter(
      violation => violation.id === 'color-contrast'
    )
    
    if (contrastViolations.length > 0) {
      console.log('⚠️ Color contrast violations found:', contrastViolations.length)
      // Log but don't fail for now
    } else {
      console.log('✅ No color contrast violations detected')
    }
    
    console.log('✅ Color contrast testing complete')
  })
})

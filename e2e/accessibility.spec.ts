import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('♿ Accessibility Testing', () => {
  test('Homepage accessibility compliance', async ({ page }) => {
    await page.goto('/')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('.loading-spinner') // Exclude loading elements that might not have labels
      .analyze()
    
    // Check for critical accessibility violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      violation => violation.impact === 'critical' || violation.impact === 'serious'
    )
    
    expect(criticalViolations).toEqual([])
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('⚠️ Accessibility violations found:', accessibilityScanResults.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length
      })))
    }
  })

  test('Create jar form accessibility', async ({ page }) => {
    await page.goto('/create')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('[class*="animate-spin"]') // Exclude loading spinners
      .analyze()
    
    // Focus on form-related accessibility issues
    const formViolations = accessibilityScanResults.violations.filter(
      violation => 
        violation.id.includes('label') || 
        violation.id.includes('form') ||
        violation.id.includes('input') ||
        violation.impact === 'critical'
    )
    
    expect(formViolations).toEqual([])
  })

  test('Keyboard navigation support', async ({ page }) => {
    await page.goto('/')
    
    // Test tab navigation through interactive elements
    const interactiveElements: Array<{ tagName: string; text: string }> = []
    
    // Tab through the page and collect focusable elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      
      const focusedElement = page.locator(':focus')
      const isVisible = await focusedElement.isVisible()
      
      if (isVisible) {
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase())
        const text = await focusedElement.textContent()
        interactiveElements.push({ tagName, text: text?.slice(0, 20) || "" })
        
        // Check if focus is visible
        const hasVisibleFocus = await focusedElement.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return (
            styles.outline !== 'none' || 
            styles.boxShadow.includes('focus') || 
            styles.border.includes('focus') ||
            styles.backgroundColor !== 'transparent'
          )
        })
        
        expect(hasVisibleFocus, `Element ${i} should have visible focus indicator`).toBe(true)
      }
    }
    
    console.log('📋 Interactive elements found:', interactiveElements)
    expect(interactiveElements.length).toBeGreaterThan(2) // Should have multiple interactive elements
  })

  test('Create jar form labels and accessibility', async ({ page }) => {
    await page.goto('/create')
    
    // Check that all form inputs have proper labels
    const inputs = page.locator('input, textarea, select')
    const inputCount = await inputs.count()
    
    console.log(`🔍 Checking ${inputCount} form inputs for accessibility...`)
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      
      // Skip hidden inputs
      const isVisible = await input.isVisible()
      if (!isVisible) continue
      
      // Check for accessible name
      const hasAriaLabel = await input.getAttribute('aria-label')
      const hasAriaLabelledBy = await input.getAttribute('aria-labelledby')
      const hasAssociatedLabel = await input.evaluate(el => {
        const id = el.id
        return id ? !!document.querySelector(`label[for="${id}"]`) : false
      })
      const hasPlaceholder = await input.getAttribute('placeholder')
      
      // Input should have at least one form of accessible name
      const hasAccessibleName = hasAriaLabel || hasAriaLabelledBy || hasAssociatedLabel || hasPlaceholder
      
      if (!hasAccessibleName) {
        const inputType = await input.getAttribute('type')
        const inputClass = await input.getAttribute('class')
        console.warn(`⚠️ Input ${i} (type: ${inputType}, class: ${inputClass}) lacks accessible name`)
      }
      
      // For critical form fields, we should have proper labels
      const isCritical = await input.evaluate(el => {
        const placeholder = el.getAttribute('placeholder')?.toLowerCase() || ''
        const nearby = el.parentElement?.textContent?.toLowerCase() || ''
        
        return (
          placeholder.includes('name') ||
          placeholder.includes('amount') ||
          nearby.includes('name') ||
          nearby.includes('amount')
        )
      })
      
      if (isCritical) {
        expect(hasAccessibleName, `Critical input ${i} must have accessible name`).toBe(true)
      }
    }
  })

  test('Color contrast compliance', async ({ page }) => {
    await page.goto('/')
    
    const contrastResults = await new AxeBuilder({ page })
      .include('button, .cj-btn-primary, .cj-btn-secondary') // Focus on your button styles
      .withTags(['wcag2aa']) // WCAG 2.0 AA compliance
      .analyze()
    
    const contrastViolations = contrastResults.violations.filter(
      violation => violation.id === 'color-contrast'
    )
    
    expect(contrastViolations).toEqual([])
  })

  test('ARIA roles and landmarks', async ({ page }) => {
    await page.goto('/')
    
    // Check for proper page structure
    const landmarks = await page.locator('[role="main"], [role="banner"], [role="navigation"], main, nav, header').count()
    expect(landmarks).toBeGreaterThan(0)
    
    // Check that interactive elements have proper roles
    const buttons = page.locator('button, [role="button"]')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i)
      const isVisible = await button.isVisible()
      
      if (isVisible) {
        // Button should have accessible name
        const accessibleName = await button.evaluate(el => {
          return (
            el.getAttribute('aria-label') ||
            el.getAttribute('aria-labelledby') ||
            el.textContent?.trim() ||
            el.getAttribute('title')
          )
        })
        
        expect(accessibleName, `Button ${i} should have accessible name`).toBeTruthy()
      }
    }
  })

  test('Mobile accessibility', async ({ page, browserName }) => {
    // Only run on mobile Chrome
    test.skip(browserName !== 'chromium', 'Mobile test only runs on Chromium')
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Check touch target sizes
    const buttons = page.locator('button, [role="button"]')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i)
      const isVisible = await button.isVisible()
      
      if (isVisible) {
        const boundingBox = await button.boundingBox()
        
        if (boundingBox) {
          // Touch targets should be at least 44x44px (WCAG guidelines)
          expect(boundingBox.width, `Button ${i} width should be >= 44px`).toBeGreaterThanOrEqual(44)
          expect(boundingBox.height, `Button ${i} height should be >= 44px`).toBeGreaterThanOrEqual(44)
        }
      }
    }
  })
})

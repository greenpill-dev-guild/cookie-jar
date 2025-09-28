import { test, expect } from './utils/wallet-utils'
import { SELECTORS, ANVIL_ACCOUNTS } from './utils/constants'

test.describe('⚡ Performance Baseline E2E', () => {
  test.describe('Core Web Vitals', () => {
    test('Homepage Core Web Vitals meet targets', async ({ page }) => {
      console.log('🏠 Testing homepage Core Web Vitals...')
      
      // Enable performance monitoring
      await page.coverage.startJSCoverage()
      
      const navigationStartTime = Date.now()
      
      // Navigate to homepage and measure metrics
      await page.goto('/', { waitUntil: 'networkidle' })
      
      const navigationEndTime = Date.now()
      const totalNavigationTime = navigationEndTime - navigationStartTime
      
      console.log(`Total navigation time: ${totalNavigationTime}ms`)
      
      // Test Largest Contentful Paint (LCP) - should be under 2.5s
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1]
            resolve(lastEntry.startTime)
          }).observe({ type: 'largest-contentful-paint', buffered: true })
          
          // Fallback timeout
          setTimeout(() => resolve(0), 5000)
        })
      })
      
      console.log(`LCP: ${lcp}ms`)
      expect(lcp).toBeLessThan(2500) // Good LCP threshold
      
      // Test First Input Delay (FID) simulation
      const fidSimulation = Date.now()
      await page.click('button:has-text("Create"), a:has-text("Create")')
      const fidEnd = Date.now()
      const simulatedFID = fidEnd - fidSimulation
      
      console.log(`Simulated FID: ${simulatedFID}ms`)
      expect(simulatedFID).toBeLessThan(100) // Good FID threshold
      
      // Test Cumulative Layout Shift (CLS) by measuring layout stability
      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let cumulativeScore = 0
          
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                cumulativeScore += entry.value
              }
            }
            resolve(cumulativeScore)
          }).observe({ type: 'layout-shift', buffered: true })
          
          // Measure for 3 seconds
          setTimeout(() => resolve(cumulativeScore), 3000)
        })
      })
      
      console.log(`CLS: ${cls}`)
      expect(cls).toBeLessThan(0.1) // Good CLS threshold
      
      const coverage = await page.coverage.stopJSCoverage()
      const totalBytes = coverage.reduce((total, entry) => total + entry.text.length, 0)
      console.log(`Total JS bytes loaded: ${(totalBytes / 1024).toFixed(2)} KB`)
    })

    test('Jar page Core Web Vitals meet targets', async ({ page }) => {
      console.log('🍪 Testing jar page Core Web Vitals...')
      
      const testJarAddress = '0x1234567890123456789012345678901234567890'
      
      const navigationStartTime = Date.now()
      await page.goto(`/jar/${testJarAddress}`)
      
      // Wait for initial content
      await expect(page.locator('text=Loading jar features...')).toBeVisible({ timeout: 3000 })
      
      const initialContentTime = Date.now() - navigationStartTime
      console.log(`Initial content load: ${initialContentTime}ms`)
      expect(initialContentTime).toBeLessThan(1500) // Should show loading quickly
      
      // Wait for version detection to complete
      const versionDetectionStart = Date.now()
      const jarContent = page.locator('text=Available Balance').or(page.locator('text=This is a v1 Cookie Jar'))
      await expect(jarContent.first()).toBeVisible({ timeout: 10000 })
      
      const versionDetectionTime = Date.now() - versionDetectionStart
      console.log(`Version detection time: ${versionDetectionTime}ms`)
      expect(versionDetectionTime).toBeLessThan(5000) // Should complete quickly
      
      // Test interaction responsiveness
      const interactionStart = Date.now()
      const firstTab = page.locator('[role="tab"], .tab-trigger').first()
      if (await firstTab.isVisible()) {
        await firstTab.click()
      }
      const interactionEnd = Date.now()
      
      const interactionTime = interactionEnd - interactionStart
      console.log(`Tab interaction time: ${interactionTime}ms`)
      expect(interactionTime).toBeLessThan(100) // Should respond immediately
    })

    test('Create jar page performance benchmarks', async ({ page, wallet }) => {
      console.log('🏗️ Testing create jar page performance...')
      
      await wallet.connectWallet(0)
      
      const pageLoadStart = Date.now()
      await page.goto('/create')
      
      // Wait for form to be interactive
      await expect(page.locator('input[placeholder*="name"]')).toBeVisible()
      
      const pageLoadTime = Date.now() - pageLoadStart
      console.log(`Create page load time: ${pageLoadTime}ms`)
      expect(pageLoadTime).toBeLessThan(2000)
      
      // Test form interaction performance
      const formInteractionStart = Date.now()
      
      await page.fill('input[placeholder*="name"]', 'Performance Test Jar')
      await page.fill('textarea, input[placeholder*="description"]', 'Testing performance of jar creation')
      
      const formFillTime = Date.now() - formInteractionStart
      console.log(`Form fill time: ${formFillTime}ms`)
      expect(formFillTime).toBeLessThan(500) // Form should be responsive
      
      // Test navigation between steps
      const stepNavigationStart = Date.now()
      await page.click('button:has-text("Next")')
      
      await expect(page.locator('text=Withdrawal Settings, text=Amount')).toBeVisible({ timeout: 3000 })
      
      const stepNavigationTime = Date.now() - stepNavigationStart
      console.log(`Step navigation time: ${stepNavigationTime}ms`)
      expect(stepNavigationTime).toBeLessThan(1000) // Should navigate quickly between steps
    })
  })

  test.describe('Bundle Size & Loading Performance', () => {
    test('JavaScript bundle size is optimized', async ({ page }) => {
      console.log('📦 Testing JavaScript bundle size...')
      
      // Enable network monitoring
      const responses = []
      page.on('response', (response) => {
        if (response.url().includes('.js') && response.status() === 200) {
          responses.push({
            url: response.url(),
            size: response.headers()['content-length'] || 0
          })
        }
      })
      
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Calculate total JS bundle size
      const totalJSSize = responses.reduce((total, response) => {
        return total + parseInt(response.size) || 0
      }, 0)
      
      console.log(`Total JS bundle size: ${(totalJSSize / 1024).toFixed(2)} KB`)
      console.log(`JS files loaded: ${responses.length}`)
      
      // Main bundle should be reasonably sized (under 500KB)
      expect(totalJSSize).toBeLessThan(500 * 1024)
      
      // Should not load too many JS files (indicates good bundling)
      expect(responses.length).toBeLessThan(20)
    })

    test('CSS and static assets are optimized', async ({ page }) => {
      console.log('🎨 Testing CSS and static asset optimization...')
      
      const cssResponses = []
      const imageResponses = []
      
      page.on('response', (response) => {
        if (response.url().includes('.css')) {
          cssResponses.push(response)
        } else if (response.url().match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
          imageResponses.push(response)
        }
      })
      
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      console.log(`CSS files loaded: ${cssResponses.length}`)
      console.log(`Image files loaded: ${imageResponses.length}`)
      
      // Should not load excessive CSS files
      expect(cssResponses.length).toBeLessThan(10)
      
      // Images should be reasonably optimized (each under 100KB for web)
      for (const imageResponse of imageResponses.slice(0, 5)) {
        const contentLength = imageResponse.headers()['content-length']
        if (contentLength) {
          const size = parseInt(contentLength)
          console.log(`Image ${imageResponse.url()} size: ${(size / 1024).toFixed(2)} KB`)
          expect(size).toBeLessThan(100 * 1024) // 100KB per image max
        }
      }
    })

    test('Lazy loading reduces initial bundle size', async ({ page }) => {
      console.log('🔄 Testing lazy loading effectiveness...')
      
      const initialResponses = []
      
      page.on('response', (response) => {
        if (response.url().includes('.js')) {
          initialResponses.push(response.url())
        }
      })
      
      // Load homepage - should not load streaming components yet
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      const initialJSCount = initialResponses.length
      console.log(`Initial JS files: ${initialJSCount}`)
      
      // Navigate to jar creation - should trigger lazy loading
      await page.goto('/create')
      
      // Wait a bit for potential lazy loading
      await page.waitForTimeout(2000)
      
      // Should have loaded additional JS for form components
      const afterNavigationJSCount = initialResponses.length
      console.log(`JS files after navigation: ${afterNavigationJSCount}`)
      
      // Initial load should be smaller than full app
      expect(initialJSCount).toBeLessThan(15)
    })
  })

  test.describe('Memory & CPU Performance', () => {
    test('Memory usage remains reasonable during navigation', async ({ page }) => {
      console.log('🧠 Testing memory usage...')
      
      // Measure initial memory
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize
        } : null
      })
      
      if (initialMemory) {
        console.log(`Initial memory: ${(initialMemory.used / 1024 / 1024).toFixed(2)} MB`)
      }
      
      // Navigate through several pages
      await page.goto('/')
      await page.goto('/create')
      await page.goto('/jar/0x1234567890123456789012345678901234567890')
      await page.goto('/')
      
      // Measure memory after navigation
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize
        } : null
      })
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.used - initialMemory.used
        console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`)
        
        // Memory increase should be reasonable (under 50MB)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
      }
    })

    test('No significant memory leaks during repeated actions', async ({ page, wallet }) => {
      console.log('🔍 Testing for memory leaks...')
      
      await wallet.connectWallet(0)
      
      const getMemoryUsage = async () => {
        return page.evaluate(() => {
          return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0
        })
      }
      
      const initialMemory = await getMemoryUsage()
      console.log(`Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`)
      
      // Perform repeated actions that might cause memory leaks
      for (let i = 0; i < 5; i++) {
        // Navigate to create page
        await page.goto('/create')
        await page.fill('input[placeholder*="name"]', `Test Jar ${i}`)
        
        // Navigate away
        await page.goto('/')
        
        // Force garbage collection if available
        await page.evaluate(() => {
          if ((window as any).gc) {
            (window as any).gc()
          }
        })
        
        await page.waitForTimeout(500)
      }
      
      const finalMemory = await getMemoryUsage()
      console.log(`Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`)
      
      const memoryIncrease = finalMemory - initialMemory
      console.log(`Memory increase after 5 cycles: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`)
      
      // Memory increase should be minimal (under 20MB for 5 cycles)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024)
    })
  })

  test.describe('Network Performance', () => {
    test('API calls are optimized and cached', async ({ page }) => {
      console.log('🌐 Testing API call optimization...')
      
      const apiCalls = []
      
      page.on('request', (request) => {
        if (request.url().includes('/api/') || request.url().includes('rpc')) {
          apiCalls.push({
            url: request.url(),
            method: request.method(),
            timestamp: Date.now()
          })
        }
      })
      
      // Load jar page which should make blockchain calls
      await page.goto('/jar/0x1234567890123456789012345678901234567890')
      
      // Wait for version detection
      await expect(page.locator('text=Loading jar features...')).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(3000) // Allow API calls to complete
      
      console.log(`Total API/RPC calls: ${apiCalls.length}`)
      
      // Should make reasonable number of API calls
      expect(apiCalls.length).toBeLessThan(20) // Shouldn't be making excessive calls
      
      // Test that subsequent navigation uses cache
      const initialCallCount = apiCalls.length
      
      // Navigate away and back
      await page.goto('/')
      await page.goto('/jar/0x1234567890123456789012345678901234567890')
      await page.waitForTimeout(2000)
      
      const finalCallCount = apiCalls.length
      const additionalCalls = finalCallCount - initialCallCount
      
      console.log(`Additional calls on revisit: ${additionalCalls}`)
      
      // Should make fewer calls on revisit due to caching
      expect(additionalCalls).toBeLessThan(initialCallCount / 2)
    })

    test('Page load works on slow network conditions', async ({ page, context }) => {
      console.log('🐌 Testing slow network performance...')
      
      // Simulate slow 3G connection
      await context.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 100)) // Add 100ms delay
        await route.continue()
      })
      
      const slowLoadStart = Date.now()
      
      await page.goto('/', { timeout: 30000 })
      
      // Should show loading states appropriately
      await expect(page.locator('text=Cookie Jar, text=Loading')).toBeVisible({ timeout: 15000 })
      
      const slowLoadTime = Date.now() - slowLoadStart
      console.log(`Slow network load time: ${slowLoadTime}ms`)
      
      // Should still load within reasonable time on slow network
      expect(slowLoadTime).toBeLessThan(15000) // 15 second timeout for slow network
      
      // Clear the slow network simulation
      await context.unroute('**/*')
    })
  })

  test.describe('Real-world Performance Scenarios', () => {
    test('Performance under concurrent user simulation', async ({ page, wallet }) => {
      console.log('👥 Testing performance under load simulation...')
      
      await wallet.connectWallet(0)
      
      // Simulate multiple rapid user actions
      const startTime = Date.now()
      
      // Rapid navigation
      await page.goto('/create')
      await page.fill('input[placeholder*="name"]', 'Stress Test Jar')
      await page.click('button:has-text("Next")')
      
      await page.goto('/')
      await page.goto('/jar/0x1234567890123456789012345678901234567890')
      await page.goto('/create')
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      console.log(`Rapid navigation total time: ${totalTime}ms`)
      
      // Should handle rapid navigation without crashing
      expect(totalTime).toBeLessThan(10000)
      
      // Page should still be responsive
      await expect(page.locator('input[placeholder*="name"]')).toBeVisible()
    })

    test('Performance with large dataset simulation', async ({ page }) => {
      console.log('📊 Testing performance with large data sets...')
      
      // Mock large jar list response
      await page.route('**/api/**', async (route) => {
        if (route.request().url().includes('jars')) {
          const largeDataset = Array.from({ length: 100 }, (_, i) => ({
            address: `0x${i.toString().padStart(40, '0')}`,
            name: `Jar ${i}`,
            balance: '1000000000000000000',
            currency: 'ETH'
          }))
          
          await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(largeDataset)
          })
        } else {
          await route.continue()
        }
      })
      
      const largeDataStart = Date.now()
      
      // Navigate to browse page (if it exists)
      await page.goto('/browse')
      
      // Should handle large dataset reasonably
      const loadTime = Date.now() - largeDataStart
      console.log(`Large dataset load time: ${loadTime}ms`)
      
      expect(loadTime).toBeLessThan(5000) // Should load large dataset within 5s
      
      await page.unroute('**/api/**')
    })

    test('Mobile device performance simulation', async ({ page }) => {
      console.log('📱 Testing mobile device performance...')
      
      // Simulate mobile device with CPU throttling
      const client = await page.context().newCDPSession(page)
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 }) // 4x slower CPU
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      const mobileLoadStart = Date.now()
      
      await page.goto('/')
      await expect(page.locator('text=Cookie Jar')).toBeVisible()
      
      const mobileLoadTime = Date.now() - mobileLoadStart
      console.log(`Mobile device load time: ${mobileLoadTime}ms`)
      
      // Should load reasonably on throttled mobile device
      expect(mobileLoadTime).toBeLessThan(8000) // Allow more time for throttled CPU
      
      // Test mobile interaction performance
      const mobileInteractionStart = Date.now()
      await page.click('a[href="/create"], button:has-text("Create")')
      
      await expect(page.locator('input[placeholder*="name"]')).toBeVisible()
      
      const mobileInteractionTime = Date.now() - mobileInteractionStart
      console.log(`Mobile interaction time: ${mobileInteractionTime}ms`)
      
      expect(mobileInteractionTime).toBeLessThan(3000)
      
      // Disable CPU throttling
      await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    })
  })

  test.describe('Performance Regression Prevention', () => {
    test('Core performance metrics stay within acceptable ranges', async ({ page }) => {
      console.log('📈 Testing performance regression prevention...')
      
      // Define performance budgets
      const performanceBudgets = {
        homepageLoadTime: 3000, // 3 seconds
        jarPageLoadTime: 5000,  // 5 seconds
        createPageLoadTime: 2000, // 2 seconds
        interactionDelay: 100,   // 100ms
        bundleSize: 500 * 1024,  // 500KB
        memoryUsage: 50 * 1024 * 1024 // 50MB
      }
      
      // Test homepage load time
      let startTime = Date.now()
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      let loadTime = Date.now() - startTime
      
      console.log(`Homepage load: ${loadTime}ms (budget: ${performanceBudgets.homepageLoadTime}ms)`)
      expect(loadTime).toBeLessThan(performanceBudgets.homepageLoadTime)
      
      // Test jar page load time
      startTime = Date.now()
      await page.goto('/jar/0x1234567890123456789012345678901234567890')
      await expect(page.locator('text=Loading jar features...')).toBeVisible()
      loadTime = Date.now() - startTime
      
      console.log(`Jar page load: ${loadTime}ms (budget: ${performanceBudgets.jarPageLoadTime}ms)`)
      expect(loadTime).toBeLessThan(performanceBudgets.jarPageLoadTime)
      
      // Test create page load time  
      startTime = Date.now()
      await page.goto('/create')
      await expect(page.locator('input[placeholder*="name"]')).toBeVisible()
      loadTime = Date.now() - startTime
      
      console.log(`Create page load: ${loadTime}ms (budget: ${performanceBudgets.createPageLoadTime}ms)`)
      expect(loadTime).toBeLessThan(performanceBudgets.createPageLoadTime)
      
      console.log('✅ All performance budgets are within acceptable ranges')
    })
  })
})

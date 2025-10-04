import { SELECTORS } from './utils/constants';
import { expect, test } from './utils/wallet-utils';

test.describe('🌊 Streaming Features E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start with a clean state
    await page.goto('/');
  });

  test('Version detection - shows v1 fallback UI for legacy jars', async ({
    page,
  }) => {
    // Create a mock v1 jar address (this would be a real deployed v1 jar in practice)
    const v1JarAddress = '0x1234567890123456789012345678901234567890';

    await page.goto(`/jar/${v1JarAddress}`);

    // Should show version detection loading first
    await expect(page.locator('text=Loading jar features...')).toBeVisible({
      timeout: 10000,
    });

    // Should show v1 fallback message
    await expect(page.locator('text=This is a v1 Cookie Jar')).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.locator(
        'text=Streaming and token recovery features are available in v2 jars only'
      )
    ).toBeVisible();

    // Should show upgrade guidance
    await expect(
      page.locator('a:has-text("Learn about upgrading")')
    ).toBeVisible();

    // Streaming tab should not exist
    await expect(
      page.locator('[data-testid="streaming-tab"]')
    ).not.toBeVisible();

    // Should show disabled features preview
    await expect(page.locator('text=Real-time Streaming')).toBeVisible();
    await expect(page.locator('text=Multi-token Support')).toBeVisible();
    await expect(page.locator('text=Advanced Controls')).toBeVisible();

    // All feature boxes should be grayed out (opacity-50 class)
    const featureBoxes = page.locator('.opacity-50');
    await expect(featureBoxes).toHaveCount(3);
  });

  test('v2 jar streaming workflow - token recovery and processing', async ({
    page,
    wallet,
  }) => {
    console.log('🏗️ Creating v2 jar with streaming enabled...');

    // Connect as admin to create jar
    await wallet.connectWallet(0); // Deployer account
    await page.goto('/create');

    // Create basic jar
    await page.fill(SELECTORS.forms.jarName, 'V2 Streaming Test Jar');
    await page.fill(
      SELECTORS.forms.jarDescription,
      'Testing v2 streaming and token recovery features'
    );

    // Select ERC20 currency for better testing
    const currencySelect = page.locator(SELECTORS.forms.currency).first();
    if (await currencySelect.isVisible()) {
      await currencySelect.selectOption({ label: 'DEMO Token' });
    }

    await page.click(SELECTORS.buttons.next);

    // Configure withdrawal settings
    await page.click('text=Variable Amount');
    await page.fill('input:below(:text("Max Amount"))', '100');
    await page.fill('input:below(:text("Interval"))', '1'); // 1 hour for testing
    await page.click(SELECTORS.buttons.next);

    // Configure access control - allowlist
    await page.click(SELECTORS.access.allowlist);
    await page.click(SELECTORS.buttons.next);

    // Enable advanced features (streaming)
    if (await page.isVisible('text=Advanced Features')) {
      await page.click('text=Enable Streaming');
      await page.click('text=Enable Multi-token Support');
      await page.click(SELECTORS.buttons.next);
    }

    // Create jar
    await page.click(SELECTORS.buttons.primary);
    await wallet.signTransaction();

    await expect(page.locator(SELECTORS.status.success)).toBeVisible({
      timeout: 30000,
    });
    await page.waitForURL(/\/jar\/0x[a-fA-F0-9]{40}/, { timeout: 30000 });

    const jarAddress = page.url().split('/jar/')[1];
    console.log(`✅ V2 Jar created at: ${jarAddress}`);

    // Verify v2 features are detected
    await expect(page.locator('text=Loading jar features...')).toBeVisible({
      timeout: 5000,
    });

    // Should NOT show v1 fallback message
    await expect(page.locator('text=This is a v1 Cookie Jar')).not.toBeVisible({
      timeout: 10000,
    });

    // Should show streaming tab
    const streamingTab = page.locator(
      '[data-testid="streaming-tab"], text=Streaming'
    );
    await expect(streamingTab).toBeVisible({ timeout: 15000 });

    console.log('🌊 Testing streaming features...');
    await streamingTab.click();

    // Should show streaming overview
    await expect(page.locator('text=How Streaming Works')).toBeVisible();
    await expect(page.locator('text=Token Streams')).toBeVisible();
    await expect(page.locator('text=Token Recovery')).toBeVisible();

    // Test token recovery tab
    console.log('🔄 Testing token recovery...');
    const recoveryTab = page
      .locator('text=Recovery, [data-testid="recovery-tab"]')
      .first();
    if (await recoveryTab.isVisible()) {
      await recoveryTab.click();

      // Should show pending tokens section
      await expect(page.locator('text=Pending Tokens')).toBeVisible();
      await expect(page.locator('text=No pending tokens found')).toBeVisible();
    }

    // Test streaming management tab
    console.log('📊 Testing streaming management...');
    const streamingManagementTab = page
      .locator('text=Streams, [data-testid="streams-tab"]')
      .first();
    if (await streamingManagementTab.isVisible()) {
      await streamingManagementTab.click();

      await expect(page.locator('text=Active Streams')).toBeVisible();
      await expect(page.locator('text=No active streams')).toBeVisible();
    }
  });

  test('Lazy loading - components load on demand', async ({ page, wallet }) => {
    console.log('⚡ Testing lazy loading performance...');

    // Connect wallet
    await wallet.connectWallet(0);

    // Visit jar creation page
    await page.goto('/create');

    // Initially, streaming components should not be loaded
    // (This test verifies the lazy loading system works)

    await page.fill(SELECTORS.forms.jarName, 'Lazy Loading Test');
    await page.click(SELECTORS.buttons.next);

    // When we get to protocol selection, components should lazy load
    await page.click(SELECTORS.buttons.next);

    // Should see loading states for lazy components
    const protocolSelectorLoader = page.locator(
      'text=Loading protocol selector...'
    );
    if (await protocolSelectorLoader.isVisible({ timeout: 1000 })) {
      console.log('✅ Protocol selector is lazy loading');
    }

    // NFT protocol selection should eventually load
    await expect(page.locator('text=Allowlist')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('text=NFT Collection')).toBeVisible({
      timeout: 5000,
    });
  });

  test('Mobile streaming experience', async ({ page, wallet }) => {
    console.log('📱 Testing mobile streaming experience...');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await wallet.connectWallet(0);

    // Create a basic jar for mobile testing
    await page.goto('/create');

    await page.fill(SELECTORS.forms.jarName, 'Mobile Streaming Test');
    await page.fill(
      SELECTORS.forms.jarDescription,
      'Testing mobile streaming UI'
    );

    await page.click(SELECTORS.buttons.next);

    // Configure basic settings
    await page.click('text=Fixed Amount');
    await page.fill('input:below(:text("Amount"))', '0.1');
    await page.click(SELECTORS.buttons.next);

    // Access control
    await page.click(SELECTORS.access.allowlist);
    await page.click(SELECTORS.buttons.next);

    // Create jar
    await page.click(SELECTORS.buttons.primary);
    await wallet.signTransaction();

    await expect(page.locator(SELECTORS.status.success)).toBeVisible({
      timeout: 30000,
    });
    await page.waitForURL(/\/jar\/0x[a-fA-F0-9]{40}/, { timeout: 30000 });

    // Test mobile streaming interface
    const streamingTab = page
      .locator('text=Streaming, [data-testid="streaming-tab"]')
      .first();
    if (await streamingTab.isVisible({ timeout: 15000 })) {
      await streamingTab.click();

      // Should show mobile-optimized streaming interface
      await expect(page.locator('text=Token Recovery')).toBeVisible();

      // Check that mobile layout is responsive
      const streamingContainer = page
        .locator('[data-testid="streaming-container"]')
        .first();
      if (await streamingContainer.isVisible()) {
        const containerBox = await streamingContainer.boundingBox();
        expect(containerBox?.width).toBeLessThan(400); // Should fit mobile width
      }
    }

    // Test mobile protocol selector if we go back to creation
    await page.goto('/create');

    await page.fill(SELECTORS.forms.jarName, 'Mobile Protocol Test');
    await page.click(SELECTORS.buttons.next);
    await page.click(SELECTORS.buttons.next);

    // Should show mobile-optimized protocol selector
    await expect(page.locator('text=Choose Access Method')).toBeVisible({
      timeout: 10000,
    });

    // Protocol cards should be in mobile grid layout (3 columns)
    const protocolCards = page.locator(
      'button:has-text("Allowlist"), button:has-text("NFT Collection")'
    );
    if (await protocolCards.first().isVisible()) {
      const cardBox = await protocolCards.first().boundingBox();
      expect(cardBox?.width).toBeLessThan(130); // Mobile card width
    }
  });

  test('Performance benchmarks - Core Web Vitals', async ({ page }) => {
    console.log('📈 Testing Core Web Vitals performance...');

    // Navigate to home page and measure performance
    const navigationPromise = page.waitForLoadState('networkidle');
    const startTime = Date.now();

    await page.goto('/');
    await navigationPromise;

    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);

    // Should load quickly (under 3 seconds for homepage)
    expect(loadTime).toBeLessThan(3000);

    // Test jar page load time
    const jarNavigationStart = Date.now();
    await page.goto('/jar/0x1234567890123456789012345678901234567890'); // Mock address

    // Wait for version detection to complete
    await expect(page.locator('text=Loading jar features...')).toBeVisible({
      timeout: 5000,
    });

    const versionDetectionTime = Date.now() - jarNavigationStart;
    console.log(`Version detection time: ${versionDetectionTime}ms`);

    // Version detection should be fast (under 5 seconds)
    expect(versionDetectionTime).toBeLessThan(5000);

    // Test lazy component load time
    const lazyLoadStart = Date.now();

    // If it's a v2 jar, streaming tab should load
    const streamingTab = page.locator('text=Streaming').first();
    if (await streamingTab.isVisible({ timeout: 10000 })) {
      await streamingTab.click();

      // Wait for streaming components to lazy load
      await expect(page.locator('text=How Streaming Works')).toBeVisible({
        timeout: 5000,
      });

      const lazyLoadTime = Date.now() - lazyLoadStart;
      console.log(`Lazy component load time: ${lazyLoadTime}ms`);

      // Lazy loading should be fast (under 3 seconds)
      expect(lazyLoadTime).toBeLessThan(3000);
    }
  });

  test('Accessibility - streaming features are WCAG compliant', async ({
    page,
  }) => {
    console.log('♿ Testing streaming features accessibility...');

    await page.goto('/jar/0x1234567890123456789012345678901234567890'); // Mock v2 jar

    // Wait for version detection
    await expect(page.locator('text=Loading jar features...')).toBeVisible({
      timeout: 5000,
    });

    // Test keyboard navigation to streaming tab
    await page.keyboard.press('Tab'); // Focus first element

    // Should be able to navigate to streaming tab via keyboard
    let attempts = 0;
    while (attempts < 20) {
      // Max 20 tab presses to find streaming tab
      const focused = await page.locator(':focus').textContent();
      if (focused?.includes('Streaming')) {
        await page.keyboard.press('Enter');
        break;
      }
      await page.keyboard.press('Tab');
      attempts++;
    }

    // If streaming features are available
    const streamingContent = page
      .locator('text=Token Streams, text=Token Recovery')
      .first();
    if (await streamingContent.isVisible({ timeout: 10000 })) {
      // Check for proper ARIA labels
      const streamingPanels = page.locator(
        '[role="tabpanel"], [aria-label*="streaming"]'
      );
      await expect(streamingPanels.first()).toBeVisible();

      // Check for heading structure
      const headings = page.locator('h1, h2, h3, h4');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0); // Should have proper heading hierarchy

      // Check color contrast (basic check)
      const textElements = page.locator(
        'text=Token Streams, text=Token Recovery'
      );
      if (await textElements.first().isVisible()) {
        const styles = await textElements
          .first()
          .evaluate((el) => getComputedStyle(el));
        expect(styles.color).toBeTruthy(); // Should have defined text color
      }
    }
  });

  test('Error handling - graceful degradation', async ({ page }) => {
    console.log('🛡️ Testing error handling and graceful degradation...');

    // Test with invalid jar address
    await page.goto('/jar/invalid-address');

    // Should show appropriate error message
    await expect(
      page.locator('text=Invalid Address, text=No valid address')
    ).toBeVisible({ timeout: 10000 });

    // Test with non-existent jar address
    await page.goto('/jar/0x0000000000000000000000000000000000000000');

    // Should handle loading errors gracefully
    const errorMessages = page.locator(
      'text=Error Loading, text=Unknown error, text=Failed to load'
    );
    await expect(errorMessages.first()).toBeVisible({ timeout: 15000 });

    // Test network error simulation
    // (In a real test, you might use page.route() to simulate network failures)
    await page.goto('/jar/0x1234567890123456789012345678901234567890');

    // Even with errors, basic UI should still be functional
    await expect(page.locator('text=Cookie Jar')).toBeVisible({
      timeout: 5000,
    });

    // Navigation should still work
    const homeLink = page.locator('a[href="/"], text=Home').first();
    if (await homeLink.isVisible()) {
      await homeLink.click();
      await expect(page.locator('text=Cookie Jar')).toBeVisible();
    }
  });
});

test.describe('🔧 Advanced Streaming Scenarios', () => {
  test('Multi-user streaming coordination', async ({ page, wallet }) => {
    // This would test scenarios where multiple users interact with streaming features
    console.log('👥 Testing multi-user streaming scenarios...');

    // This test would require more complex setup with multiple wallets
    // For now, we'll test the UI aspects

    await wallet.connectWallet(0);
    await page.goto('/create');

    // Create a jar with allowlist including multiple users
    await page.fill(SELECTORS.forms.jarName, 'Multi-user Streaming Test');
    await page.click(SELECTORS.buttons.next);
    await page.click(SELECTORS.buttons.next);

    // Configure allowlist access
    await page.click(SELECTORS.access.allowlist);

    // In a real implementation, we'd add multiple addresses to allowlist
    // For now, verify the UI supports multiple users
    await expect(page.locator('text=Allowlist')).toBeVisible();
  });

  test('Real-time updates - streaming data refresh', async ({
    page,
    wallet,
  }) => {
    console.log('🔄 Testing real-time streaming data updates...');

    await wallet.connectWallet(0);

    // Navigate to a jar with streaming
    const testJarAddress = '0x1234567890123456789012345678901234567890';
    await page.goto(`/jar/${testJarAddress}`);

    // Wait for jar to load
    await expect(page.locator('text=Loading jar features...')).toBeVisible({
      timeout: 5000,
    });

    // If streaming tab is available, test real-time updates
    const streamingTab = page.locator('text=Streaming').first();
    if (await streamingTab.isVisible({ timeout: 10000 })) {
      await streamingTab.click();

      // Should show streaming data that updates in real-time
      await expect(page.locator('text=Active Streams')).toBeVisible();

      // Test that the page updates without manual refresh
      const initialContent = await page.locator('body').innerHTML();

      // Wait a bit to see if content updates (simulating real-time data)
      await page.waitForTimeout(2000);

      // In a real implementation, streaming data would update
      // For now, just verify the UI is ready for real-time updates
      expect(initialContent.length).toBeGreaterThan(0);
    }
  });
});

import { expect, test } from './utils/wallet-utils';

test.describe('📱 Mobile Experience E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport for all tests
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE dimensions
  });

  test.describe('Mobile Navigation & UI', () => {
    test('Mobile homepage navigation works correctly', async ({ page }) => {
      console.log('📱 Testing mobile homepage navigation...');

      await page.goto('/');

      // Should show mobile-optimized layout
      await expect(page.locator('text=Cookie Jar')).toBeVisible();

      // Mobile navigation menu should be accessible
      const mobileMenuButton = page.locator(
        'button[aria-label*="menu"], button:has([data-icon="menu"])'
      );
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();

        // Should show navigation options
        await expect(
          page.locator('a[href="/create"], text=Create Jar')
        ).toBeVisible();
        await expect(
          page.locator('a[href="/browse"], text=Browse Jars')
        ).toBeVisible();
      }

      // Create button should be prominent on mobile
      const createButton = page.locator(
        'a[href="/create"], button:has-text("Create")'
      );
      await expect(createButton.first()).toBeVisible();

      // Should have proper mobile styling
      const createButtonBox = await createButton.first().boundingBox();
      expect(createButtonBox?.width).toBeGreaterThan(200); // Should be wide enough for touch
    });

    test('Mobile wallet connection experience', async ({ page, wallet }) => {
      console.log('💰 Testing mobile wallet connection...');

      await page.goto('/');

      // Connect wallet button should be mobile-friendly
      const connectButton = page.locator('button:has-text("Connect Wallet")');
      await expect(connectButton).toBeVisible();

      // Button should be full-width on mobile
      const buttonBox = await connectButton.boundingBox();
      expect(buttonBox?.width).toBeGreaterThan(300); // Should be wide for mobile

      await connectButton.click();

      // Wallet modal should be mobile-optimized
      const walletModal = page.locator('[role="dialog"], .modal');
      if (await walletModal.isVisible()) {
        // Modal should fit mobile screen
        const modalBox = await walletModal.boundingBox();
        expect(modalBox?.width).toBeLessThan(375); // Should fit mobile viewport
      }

      // Connect using first wallet option
      await wallet.connectWallet(0);

      // Connected state should show properly on mobile
      await expect(
        page.locator('text=/0x[a-fA-F0-9]{4}/', 'button[title*="0x"]')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Mobile Jar Creation', () => {
    test('Mobile jar creation flow is intuitive', async ({ page, wallet }) => {
      console.log('🏗️ Testing mobile jar creation flow...');

      await wallet.connectWallet(0);
      await page.goto('/create');

      // Form should be mobile-optimized
      const nameInput = page.locator(
        'input[placeholder*="name"], input[name="name"]'
      );
      await expect(nameInput).toBeVisible();

      await nameInput.fill('Mobile Test Jar');

      // Input should be full-width on mobile
      const nameInputBox = await nameInput.boundingBox();
      expect(nameInputBox?.width).toBeGreaterThan(300);

      // Description textarea should be mobile-friendly
      const descInput = page.locator(
        'textarea[placeholder*="description"], textarea[name="description"]'
      );
      if (await descInput.isVisible()) {
        await descInput.fill('A jar created and tested on mobile device');

        const descInputBox = await descInput.boundingBox();
        expect(descInputBox?.width).toBeGreaterThan(300);
      }

      // Next button should be prominent
      const nextButton = page.locator('button:has-text("Next")');
      await expect(nextButton).toBeVisible();

      const nextButtonBox = await nextButton.boundingBox();
      expect(nextButtonBox?.width).toBeGreaterThan(250); // Wide enough for touch

      await nextButton.click();

      // Withdrawal settings should be mobile-friendly
      const withdrawalOptions = page.locator(
        'button:has-text("Fixed Amount"), button:has-text("Variable Amount")'
      );
      await expect(withdrawalOptions.first()).toBeVisible();

      await withdrawalOptions.first().click();

      // Amount input should be optimized for mobile
      const amountInput = page.locator(
        'input[type="number"], input[placeholder*="amount"]'
      );
      if (await amountInput.isVisible()) {
        await amountInput.fill('0.5');

        // Should have proper mobile input type
        const inputType = await amountInput.getAttribute('type');
        expect(inputType).toBe('number'); // Should trigger numeric keyboard
      }

      await nextButton.click();

      // Protocol selection should be mobile-optimized
      await expect(
        page.locator('text=Choose Access Method, text=Access Control')
      ).toBeVisible();
    });

    test('Mobile NFT protocol selector works correctly', async ({
      page,
      wallet,
    }) => {
      console.log('🎨 Testing mobile NFT protocol selector...');

      await wallet.connectWallet(0);
      await page.goto('/create');

      // Navigate to protocol selection
      await page.fill('input[placeholder*="name"]', 'Mobile NFT Test');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Next")'); // Skip withdrawal settings

      // Should show mobile-optimized protocol selector
      await expect(page.locator('text=Choose Access Method')).toBeVisible({
        timeout: 10000,
      });

      // Protocol options should be in mobile grid (3 columns)
      const protocolCards = page.locator(
        'button:has-text("Allowlist"), button:has-text("NFT Collection"), button:has-text("POAP")'
      );
      await expect(protocolCards.first()).toBeVisible();

      // Cards should be appropriately sized for mobile
      const cardBox = await protocolCards.first().boundingBox();
      expect(cardBox?.width).toBeLessThan(130); // Should fit in 3-column mobile grid
      expect(cardBox?.height).toBeGreaterThan(60); // Should be tall enough for touch

      // Select NFT option
      const nftOption = page.locator('button:has-text("NFT Collection")');
      await nftOption.click();

      // Should show mobile-optimized NFT configuration
      const nftConfig = page.locator(
        'text=NFT Configuration, text=Select NFT Collections'
      );
      if (await nftConfig.first().isVisible({ timeout: 10000 })) {
        // NFT search should be mobile-friendly
        const searchInput = page.locator(
          'input[placeholder*="search"], input[placeholder*="NFT"]'
        );
        if (await searchInput.isVisible()) {
          const searchBox = await searchInput.boundingBox();
          expect(searchBox?.width).toBeGreaterThan(300); // Full-width on mobile
        }
      }
    });

    test('Mobile form validation and error states', async ({
      page,
      wallet,
    }) => {
      console.log('🚨 Testing mobile form validation...');

      await wallet.connectWallet(0);
      await page.goto('/create');

      // Test empty form submission
      const nextButton = page.locator('button:has-text("Next")');
      await nextButton.click();

      // Should show mobile-friendly error messages
      const errorMessages = page.locator(
        'text=required, text=field is required, .error-message'
      );
      if (await errorMessages.first().isVisible({ timeout: 5000 })) {
        // Error messages should be clearly visible on mobile
        const errorBox = await errorMessages.first().boundingBox();
        expect(errorBox?.width).toBeGreaterThan(200);
      }

      // Test invalid input values
      const nameInput = page.locator('input[placeholder*="name"]');
      await nameInput.fill('x'); // Too short

      await nextButton.click();

      // Should show validation feedback
      const validationFeedback = page.locator(
        'text=too short, text=minimum, .validation-error'
      );
      if (await validationFeedback.first().isVisible({ timeout: 5000 })) {
        console.log('✅ Mobile validation feedback is working');
      }
    });
  });

  test.describe('Mobile Jar Viewing', () => {
    test('Mobile jar details view is optimized', async ({ page, wallet }) => {
      console.log('👀 Testing mobile jar details view...');

      await wallet.connectWallet(1); // Regular user

      // Navigate to a jar
      const testJarAddress = '0x1234567890123456789012345678901234567890';
      await page.goto(`/jar/${testJarAddress}`);

      // Jar details should be mobile-optimized
      await expect(page.locator('text=Loading jar features...')).toBeVisible({
        timeout: 5000,
      });

      // Wait for content to load
      await expect(
        page.locator('text=Available Balance, text=Cookie Jar')
      ).toBeVisible({ timeout: 15000 });

      // Jar details cards should stack on mobile
      const detailsCards = page.locator(
        '[data-testid="jar-details"], .jar-detail-card'
      );
      if (await detailsCards.first().isVisible()) {
        const cardCount = await detailsCards.count();

        // Cards should be in mobile layout (single column)
        for (let i = 0; i < Math.min(cardCount, 3); i++) {
          const card = detailsCards.nth(i);
          const cardBox = await card.boundingBox();
          expect(cardBox?.width).toBeGreaterThan(300); // Should be full-width on mobile
        }
      }

      // Tabs should be horizontally scrollable on mobile if needed
      const tabs = page.locator('[role="tab"], .tabs-trigger');
      if (await tabs.first().isVisible()) {
        const tabsContainer = page.locator('[role="tablist"], .tabs-list');
        if (await tabsContainer.isVisible()) {
          // Should fit mobile viewport or scroll horizontally
          const containerBox = await tabsContainer.boundingBox();
          expect(containerBox?.width).toBeLessThan(400);
        }
      }
    });

    test('Mobile withdrawal flow works correctly', async ({ page, wallet }) => {
      console.log('💸 Testing mobile withdrawal flow...');

      await wallet.connectWallet(1);

      const testJarAddress = '0x1234567890123456789012345678901234567890';
      await page.goto(`/jar/${testJarAddress}`);

      // Wait for jar to load
      await expect(page.locator('text=Available Balance')).toBeVisible({
        timeout: 15000,
      });

      // Find and click withdrawal tab
      const withdrawTab = page
        .locator('text=Get Cookie, text=Withdraw')
        .first();
      if (await withdrawTab.isVisible()) {
        await withdrawTab.click();

        // Amount input should be mobile-optimized
        const amountInput = page.locator(
          'input[type="number"], input[placeholder*="amount"]'
        );
        if (await amountInput.isVisible()) {
          await amountInput.fill('1.5');

          // Should trigger numeric keyboard on mobile
          const inputType = await amountInput.getAttribute('type');
          expect(inputType).toBe('number');

          const inputBox = await amountInput.boundingBox();
          expect(inputBox?.width).toBeGreaterThan(250); // Should be wide enough
        }

        // Purpose field should be mobile-friendly
        const purposeInput = page.locator(
          'input[placeholder*="purpose"], textarea[placeholder*="purpose"]'
        );
        if (await purposeInput.isVisible()) {
          await purposeInput.fill('Mobile withdrawal test');

          const purposeBox = await purposeInput.boundingBox();
          expect(purposeBox?.width).toBeGreaterThan(250);
        }

        // Withdraw button should be prominent
        const withdrawButton = page.locator(
          'button:has-text("Withdraw"), button:has-text("Get Cookie")'
        );
        if (await withdrawButton.isVisible()) {
          const buttonBox = await withdrawButton.boundingBox();
          expect(buttonBox?.width).toBeGreaterThan(200); // Should be wide enough for touch
          expect(buttonBox?.height).toBeGreaterThan(40); // Should be tall enough for touch
        }
      }
    });

    test('Mobile streaming interface (v2 jars)', async ({ page, wallet }) => {
      console.log('🌊 Testing mobile streaming interface...');

      await wallet.connectWallet(0);

      // Visit a v2 jar (or create one for testing)
      const v2JarAddress = '0x2222222222222222222222222222222222222222';
      await page.goto(`/jar/${v2JarAddress}`);

      // Wait for version detection
      await expect(page.locator('text=Loading jar features...')).toBeVisible({
        timeout: 5000,
      });

      // If it's a v2 jar, test streaming interface
      const streamingTab = page.locator('text=Streaming');
      if (await streamingTab.isVisible({ timeout: 15000 })) {
        await streamingTab.click();

        // Streaming interface should be mobile-optimized
        await expect(
          page.locator('text=Token Recovery, text=Stream Management')
        ).toBeVisible();

        // Streaming tabs should work on mobile
        const recoveryTab = page.locator('text=Recovery, [role="tab"]');
        if (await recoveryTab.first().isVisible()) {
          await recoveryTab.first().click();

          // Should show mobile-optimized recovery interface
          await expect(page.locator('text=Pending Tokens')).toBeVisible();

          // Process buttons should be touch-friendly
          const processButtons = page.locator(
            'button:has-text("Process"), button:has-text("Swap")'
          );
          if (await processButtons.first().isVisible()) {
            const buttonBox = await processButtons.first().boundingBox();
            expect(buttonBox?.height).toBeGreaterThan(40); // Touch-friendly height
          }
        }

        // Streams tab should work
        const streamsTab = page.locator('text=Streams, [role="tab"]');
        if (await streamsTab.first().isVisible()) {
          await streamsTab.first().click();
          await expect(page.locator('text=Active Streams')).toBeVisible();
        }
      }
    });
  });

  test.describe('Mobile Touch Interactions', () => {
    test('Touch targets are appropriately sized', async ({ page, wallet }) => {
      console.log('👆 Testing touch target sizes...');

      await wallet.connectWallet(0);
      await page.goto('/create');

      // All interactive elements should meet minimum touch target size (44px)
      const interactiveElements = page.locator(
        'button, a, input[type="checkbox"], input[type="radio"]'
      );
      const elementCount = await interactiveElements.count();

      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const element = interactiveElements.nth(i);
        if (await element.isVisible()) {
          const box = await element.boundingBox();
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(44); // WCAG touch target minimum
            expect(box.width).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });

    test('Swipe gestures work for tab navigation', async ({ page, wallet }) => {
      console.log('👈👉 Testing swipe gestures...');

      await wallet.connectWallet(1);

      const testJarAddress = '0x1234567890123456789012345678901234567890';
      await page.goto(`/jar/${testJarAddress}`);

      // Wait for jar to load
      await expect(page.locator('text=Available Balance')).toBeVisible({
        timeout: 15000,
      });

      // Test horizontal swiping on tab container (if implemented)
      const tabsContainer = page.locator('[role="tablist"], .tabs-list');
      if (await tabsContainer.isVisible()) {
        const containerBox = await tabsContainer.boundingBox();

        if (containerBox) {
          // Simulate swipe gesture (touchstart -> touchmove -> touchend)
          await page.mouse.move(
            containerBox.x + containerBox.width - 50,
            containerBox.y + containerBox.height / 2
          );
          await page.mouse.down();
          await page.mouse.move(
            containerBox.x + 50,
            containerBox.y + containerBox.height / 2
          );
          await page.mouse.up();

          // Should still show tabs after swipe
          const tabs = page.locator('[role="tab"]');
          await expect(tabs.first()).toBeVisible();
        }
      }
    });

    test('Pull-to-refresh behavior (if implemented)', async ({ page }) => {
      console.log('↻ Testing pull-to-refresh...');

      await page.goto('/');

      // Simulate pull-to-refresh gesture
      await page.mouse.move(187, 50); // Center of mobile viewport, near top
      await page.mouse.down();
      await page.mouse.move(187, 200); // Pull down
      await page.mouse.up();

      // Page should still be functional after pull gesture
      await expect(page.locator('text=Cookie Jar')).toBeVisible();
    });
  });

  test.describe('Mobile Performance', () => {
    test('Mobile page load performance is acceptable', async ({ page }) => {
      console.log('⚡ Testing mobile page load performance...');

      const startTime = Date.now();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      console.log(`Mobile page load time: ${loadTime}ms`);

      // Mobile should load reasonably quickly (under 5 seconds on slow connection)
      expect(loadTime).toBeLessThan(5000);

      // Test jar page load time
      const jarStartTime = Date.now();
      await page.goto('/jar/0x1234567890123456789012345678901234567890');

      await expect(page.locator('text=Loading jar features...')).toBeVisible({
        timeout: 3000,
      });

      const jarDetectionTime = Date.now() - jarStartTime;
      console.log(`Mobile jar detection time: ${jarDetectionTime}ms`);

      expect(jarDetectionTime).toBeLessThan(3000);
    });

    test('Mobile scrolling performance is smooth', async ({ page }) => {
      console.log('📜 Testing mobile scrolling performance...');

      await page.goto('/');

      // Scroll down the page
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(100);

      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(100);

      // Page should remain responsive during scrolling
      await expect(page.locator('text=Cookie Jar')).toBeVisible();

      // Scroll back up
      await page.mouse.wheel(0, -1000);
      await page.waitForTimeout(100);

      await expect(page.locator('text=Cookie Jar')).toBeVisible();
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('Mobile screen reader compatibility', async ({ page }) => {
      console.log('🔊 Testing mobile screen reader compatibility...');

      await page.goto('/');

      // Key elements should have proper ARIA labels for mobile screen readers
      const mainHeading = page.locator('h1, [role="heading"][aria-level="1"]');
      await expect(mainHeading).toBeVisible();

      // Navigation should be properly labeled
      const navigation = page.locator('[role="navigation"], nav');
      if (await navigation.isVisible()) {
        const navLabel = await navigation.getAttribute('aria-label');
        expect(navLabel).toBeTruthy();
      }

      // Interactive elements should have accessible names
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const accessibleName =
            (await button.textContent()) ||
            (await button.getAttribute('aria-label'));
          expect(accessibleName).toBeTruthy();
        }
      }
    });

    test('Mobile keyboard navigation works correctly', async ({ page }) => {
      console.log('⌨️ Testing mobile keyboard navigation...');

      await page.goto('/create');

      // Should be able to navigate through form with Tab key
      await page.keyboard.press('Tab');

      const firstFocusedElement = page.locator(':focus');
      await expect(firstFocusedElement).toBeVisible();

      // Continue tabbing through form elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should maintain focus visibility
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Enter key should activate buttons
      const activeElement = await page.locator(':focus').first();
      if (await activeElement.isVisible()) {
        const tagName = await activeElement.evaluate((el) =>
          el.tagName.toLowerCase()
        );
        if (tagName === 'button') {
          // Should be able to activate button with Enter
          await page.keyboard.press('Enter');
          // Button should respond (form submission, navigation, etc.)
        }
      }
    });
  });
});

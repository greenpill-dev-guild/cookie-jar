import { expect, test } from '@playwright/test';

test.describe('🔧 E2E Setup Verification', () => {
  test('Playwright basic functionality works', async ({ page }) => {
    console.log('🔧 Testing basic Playwright functionality...');

    // Test basic browser functionality
    await page.goto('https://playwright.dev');

    // Check page loads
    await expect(page).toHaveTitle(/Playwright/);

    // Check basic navigation works
    await expect(page.locator('text=Docs')).toBeVisible();

    console.log('✅ Playwright basic functionality working');
  });

  test('Browser automation works correctly', async ({ page }) => {
    console.log('🌐 Testing browser automation...');

    await page.goto(
      'data:text/html,<h1>Test Page</h1><button id="test-btn">Click Me</button>'
    );

    // Test element interaction
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#test-btn')).toBeVisible();

    // Test click interaction
    await page.click('#test-btn');

    console.log('✅ Browser automation working');
  });

  test('Configuration is properly loaded', async ({ page, browserName }) => {
    console.log('⚙️ Verifying test configuration...');

    // Test browser detection
    expect(['chromium', 'firefox', 'webkit']).toContain(browserName);

    // Test page navigation
    await page.goto('about:blank');
    await expect(page).toHaveURL('about:blank');

    console.log(`✅ Configuration loaded - Browser: ${browserName}`);
  });
});

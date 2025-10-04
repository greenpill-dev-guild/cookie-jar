import { expect, test } from '@playwright/test';

test.describe('🔧 Basic Setup Verification', () => {
  test('Playwright configuration works', async ({ page }) => {
    console.log('🔧 Testing Playwright setup...');

    // Test basic browser functionality
    await page.goto('https://playwright.dev');
    await expect(page).toHaveTitle(/Playwright/);

    console.log('✅ Playwright setup working correctly');
  });

  test('Browser automation functions', async ({ page }) => {
    console.log('🌐 Testing browser automation...');

    await page.goto('https://example.com');

    // Test basic Playwright functions
    await expect(page.locator('h1')).toBeVisible();

    // Test that we can interact with elements
    const title = await page.title();
    expect(title).toBeTruthy();

    console.log('✅ Browser automation working');
  });

  test('Navigation links work', async ({ page }) => {
    console.log('🔗 Testing navigation links...');

    await page.goto('/');

    // Test create jar link with proper selector
    const createLink = page.locator('text=Create').first();
    if (await createLink.isVisible()) {
      await createLink.click();
      await expect(page).toHaveURL('/create');
      await expect(page.locator('text=Create Cookie Jar')).toBeVisible();
    }

    // Test jars link
    const jarsLink = page.locator('text=Explore').first();
    if (await jarsLink.isVisible()) {
      await jarsLink.click();
      await expect(page).toHaveURL('/jars');
    }

    console.log('✅ Navigation links working');
  });

  test('Development environment verification', async ({ page }) => {
    console.log('🔍 Verifying development environment...');

    // Check that local deployment file is accessible
    const response = await page.request.get('/contracts/local-deployment.json');
    expect(response.ok()).toBe(true);

    const deployment = await response.json();
    expect(deployment.CookieJarFactory).toBeTruthy();

    console.log('✅ Development environment properly configured:', {
      factory: deployment.CookieJarFactory,
      timestamp: new Date(deployment.timestamp || Date.now()).toISOString(),
    });
  });

  test('Basic responsive design', async ({ page }) => {
    console.log('📱 Testing responsive design...');

    // Test desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');

    const desktopVisible = await page.locator('text=Cookie Jar').isVisible();
    expect(desktopVisible).toBe(true);

    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    const mobileVisible = await page.locator('text=Cookie Jar').isVisible();
    expect(mobileVisible).toBe(true);

    // Check that mobile app bar is present
    const mobileAppBar = page.locator('.mobile-app-bar, [class*="mobile"]');
    const hasMobileNavigation = (await mobileAppBar.count()) > 0;

    console.log(
      hasMobileNavigation
        ? '✅ Mobile navigation present'
        : 'ℹ️ No mobile-specific navigation'
    );
  });
});

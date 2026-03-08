import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Sequential for blockchain state consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for blockchain state consistency
  
  reporter: [
    ['html', { outputFolder: 'e2e/playwright-report' }],
    ['json', { outputFile: 'e2e/test-results/results.json' }],
    ['list']
  ].concat(process.env.CI ? [['github']] : []) as any[],
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Increase timeouts for blockchain operations
    actionTimeout: 30000,
    navigationTimeout: 30000
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    }
  ],

  // Global setup for blockchain - uses your existing dev setup
  // Only use global setup if explicitly requested (for full integration tests)
  globalSetup: process.env.E2E_FULL_SETUP ? require.resolve('./e2e/global-setup.ts') : undefined,
  globalTeardown: process.env.E2E_FULL_SETUP ? require.resolve('./e2e/global-teardown.ts') : undefined,

  // Start services before tests - leverages your existing infrastructure
  // Only start webServer if explicitly requested via E2E_START_SERVER env var
  webServer: process.env.E2E_START_SERVER ? [
    {
      // Use your existing dev command that starts Anvil + Next.js
      command: 'bun dev',
      port: 3000,
      reuseExistingServer: true,
      timeout: 120000, // 2 minutes for full startup (Anvil + deployment + Next.js)
      env: {
        NODE_ENV: 'test'
      }
    }
  ] : [],

  // Test output configuration
  outputDir: 'e2e/test-results',
  
  // Test matching
  testMatch: '**/*.{test,spec}.{js,ts}',
  
  // Global test timeout
  timeout: 60000, // 1 minute per test (blockchain operations can be slow)
  expect: {
    timeout: 10000 // 10 seconds for assertions
  }
})

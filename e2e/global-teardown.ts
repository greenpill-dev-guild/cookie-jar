import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...')
  
  // Your existing `pnpm dev` process will handle cleanup when stopped
  // We don't need to explicitly stop services since they're managed by the dev script
  
  console.log('✅ E2E cleanup complete')
}

export default globalTeardown

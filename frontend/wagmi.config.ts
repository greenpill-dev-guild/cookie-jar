import { defineConfig } from '@wagmi/cli'
import { react } from '@wagmi/cli/plugins'
import { foundry } from '@wagmi/cli/plugins'

export default defineConfig({
  out: 'src/generated.ts',
  plugins: [
    foundry({
      project: '../contracts',
      artifacts: 'out',
      include: [
        'CookieJar.sol/CookieJar.json',
        'CookieJarFactory.sol/CookieJarFactory.json',
        'CookieJarRegistry.sol/CookieJarRegistry.json'
      ],
      // Don't exclude test files since we saw they're in a different directory
      exclude: [
        '**.t.sol/*.json'  // Exclude test contract artifacts
      ],
  
    }),
    react(),
  ],
})
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
        'dist/',
        '.next/',
        '*.config.*',
        'generated.ts'
      ],
      thresholds: {
        global: {
          branches: 50,
          functions: 50,
          lines: 50,
          statements: 50
        }
      }
    },
    include: [
      '__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
      '**/*.{test,spec}.{js,jsx,ts,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.next/',
    ]
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})

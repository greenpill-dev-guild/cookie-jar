import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Polyfills for viem and crypto libraries
Object.assign(global, {
  TextEncoder: typeof TextEncoder !== 'undefined' ? TextEncoder : require('util').TextEncoder,
  TextDecoder: typeof TextDecoder !== 'undefined' ? TextDecoder : require('util').TextDecoder,
})

// Mock crypto for Node.js environment  
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
    subtle: {
      digest: async () => new ArrayBuffer(32)
    }
  } as any
}

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock URL constructor for validation tests
global.URL = global.URL || class URL {
  href: string
  constructor(url: string) {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL')
    }
    if (!url.match(/^https?:\/\/.+/)) {
      throw new Error('Invalid URL')
    }
    this.href = url
  }
}

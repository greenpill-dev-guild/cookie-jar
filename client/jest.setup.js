import '@testing-library/jest-dom'

// Polyfills for viem and crypto libraries
import { TextEncoder, TextDecoder } from 'util'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock crypto for Node.js environment
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
    subtle: {
      digest: async () => new ArrayBuffer(32)
    }
  }
}

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock URL constructor for validation tests
global.URL = global.URL || class URL {
  constructor(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL')
    }
    if (!url.match(/^https?:\/\/.+/)) {
      throw new Error('Invalid URL')
    }
    this.href = url
  }
}
import '@testing-library/jest-dom'

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
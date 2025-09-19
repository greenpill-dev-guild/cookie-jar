/**
 * Jest setup file to provide global type definitions and setup
 */

import '@testing-library/jest-dom'

// Make sure Jest globals are available
declare global {
  var describe: jest.Describe;
  var it: jest.It;
  var test: jest.It;
  var expect: jest.Expect;
  var beforeAll: jest.Lifecycle;
  var afterAll: jest.Lifecycle;
  var beforeEach: jest.Lifecycle;
  var afterEach: jest.Lifecycle;
  var jest: typeof import('@jest/globals').jest;
}

// Extend Jest matchers
declare module '@jest/types' {
  namespace Global {
    interface Global {
      describe: jest.Describe;
      it: jest.It;
      test: jest.It;
      expect: jest.Expect;
      beforeAll: jest.Lifecycle;
      afterAll: jest.Lifecycle;
      beforeEach: jest.Lifecycle;
      afterEach: jest.Lifecycle;
      jest: typeof import('@jest/globals').jest;
    }
  }
}

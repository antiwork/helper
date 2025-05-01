/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

declare module "vitest" {
  interface Assertion<T = any> extends jest.Matchers<void, T> {}
  interface AsymmetricMatchersContaining extends jest.Matchers<void, any> {}
}

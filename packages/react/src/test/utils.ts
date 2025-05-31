import { vi } from "vitest";
import type { HelperWidgetConfig } from "../types";

export const mockHelperWidget = () => {
  const mockShow = vi.fn();
  const mockToggle = vi.fn();
  const mockSendPrompt = vi.fn();
  const mockInit = vi.fn();

  vi.stubGlobal("HelperWidget", {
    init: mockInit,
    show: mockShow,
    toggle: mockToggle,
    sendPrompt: mockSendPrompt,
  });

  return {
    mockShow,
    mockToggle,
    mockSendPrompt,
    mockInit,
  };
};

export const setupTestEnv = () => {
  process.env.HELPER_HMAC_SECRET = "test-secret";
  process.env.HELPER_MAILBOX_SLUG = "test-mailbox";
};

export const createTestConfig = (overrides: Partial<HelperWidgetConfig> = {}): HelperWidgetConfig => ({
  email: "test@example.com",
  emailHash: "hash",
  mailboxSlug: "test-mailbox",
  timestamp: 123456789,
  title: "Test Helper",
  customerMetadata: {},
  ...overrides,
});

export const cleanupTestEnv = () => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
};

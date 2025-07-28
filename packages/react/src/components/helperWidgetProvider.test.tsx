import { act, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupTestEnv, createTestConfig, mockHelperWidget, setupTestEnv } from "../test/utils";
import { HelperWidgetProvider } from "./helperWidgetProvider";

describe("HelperProvider", () => {
  beforeEach(() => {
    setupTestEnv();
    mockHelperWidget();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it("renders children", () => {
    render(
      <HelperWidgetProvider host="https://helper.ai" {...createTestConfig()}>
        <div data-testid="child">Child content</div>
      </HelperWidgetProvider>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("injects Helper script", () => {
    render(
      <HelperWidgetProvider host="https://helper.ai" {...createTestConfig()}>
        <div>Child content</div>
      </HelperWidgetProvider>,
    );

    const script = document.querySelector('script[src="https://helper.ai/widget/sdk.js"]');
    expect(script).toBeInTheDocument();
  });

  it("initializes Helper widget with correct config", () => {
    const config = createTestConfig();
    render(
      <HelperWidgetProvider host="https://helper.ai" {...config}>
        <div>Child content</div>
      </HelperWidgetProvider>,
    );

    const script = document.querySelector("script");
    act(() => {
      script?.dispatchEvent(new Event("load"));
    });

    const helperWidget = window.HelperWidget as typeof window.HelperWidget & { init: ReturnType<typeof vi.fn> };
    expect(helperWidget.init).toHaveBeenCalledWith(config);
  });

  it("cleans up script on unmount", () => {
    const { unmount } = render(
      <HelperWidgetProvider host="https://helper.ai" {...createTestConfig()}>
        <div>Child content</div>
      </HelperWidgetProvider>,
    );

    const script = document.querySelector('script[src="https://helper.ai/widget/sdk.js"]');
    expect(script).toBeInTheDocument();

    unmount();

    expect(document.querySelector('script[src="https://helper.ai/widget/sdk.js"]')).not.toBeInTheDocument();
  });
});

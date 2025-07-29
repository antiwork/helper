import { act, render } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupTestEnv, createTestConfig, mockHelperWidget, setupTestEnv } from "../test/utils";
import { HelperWidgetScript } from "./helperWidgetScript";

describe("HelperWidgetScript", () => {
  beforeEach(() => {
    setupTestEnv();
    mockHelperWidget();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it("injects Helper script", () => {
    render(<HelperWidgetScript host="https://helper.ai" {...createTestConfig()} />);

    const script = document.querySelector('script[src="https://helper.ai/widget/sdk.js"]');
    expect(script).toBeInTheDocument();
  });

  it("initializes Helper widget with correct config", () => {
    const config = createTestConfig();
    render(<HelperWidgetScript host="https://helper.ai" {...config} />);

    const script = document.querySelector("script");
    act(() => {
      script?.dispatchEvent(new Event("load"));
    });

    const helperWidget = window.HelperWidget as typeof window.HelperWidget & { init: ReturnType<typeof vi.fn> };
    expect(helperWidget.init).toHaveBeenCalledWith(config);
  });

  it("cleans up script on unmount", () => {
    const { unmount } = render(<HelperWidgetScript host="https://helper.ai" {...createTestConfig()} />);

    const script = document.querySelector('script[src="https://helper.ai/widget/sdk.js"]');
    expect(script).toBeInTheDocument();

    unmount();

    expect(document.querySelector('script[src="https://helper.ai/widget/sdk.js"]')).not.toBeInTheDocument();
  });
});

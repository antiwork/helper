import { act, render } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateHelperAuth } from "@helperai/client/auth";
import { HelperWidgetScript } from "../../components/helperWidgetScript";
import { cleanupTestEnv, mockHelperWidget, setupTestEnv } from "../utils";

// Mock client component
const ClientComponent = () => {
  return <div data-testid="client-component">Client Component</div>;
};

describe("Server Component Integration", () => {
  const mockEmail = "test@example.com";
  let mocks: ReturnType<typeof mockHelperWidget>;

  beforeEach(() => {
    setupTestEnv();
    mocks = mockHelperWidget();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it("initializes Helper with correct HMAC configuration", () => {
    const mockConfig = {
      ...generateHelperAuth({ email: mockEmail }),
      title: "Test Helper",
      customerMetadata: {},
    };

    render(<HelperWidgetScript host="https://helper.ai" {...mockConfig} />);

    const script = document.querySelector("script");
    act(() => {
      script?.dispatchEvent(new Event("load"));
    });

    expect(mocks.mockInit).toHaveBeenCalledWith(mockConfig);
  });
});

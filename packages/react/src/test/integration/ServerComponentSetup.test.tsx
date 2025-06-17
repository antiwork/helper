import { act, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HelperProvider } from "../../components/HelperProvider";
import { generateHelperAuth } from "../../server/helper-auth";
import { cleanupTestEnv, mockHelperWidget, setupTestEnv } from "./utils";

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

  it("renders server component with generated HMAC", () => {
    const mockConfig = {
      ...generateHelperAuth({ email: mockEmail }),
      title: "Test Helper",
      customerMetadata: {},
    };

    render(
      <HelperProvider host="https://helper.ai" {...mockConfig}>
        <div data-testid="server-content">Server Content</div>
      </HelperProvider>,
    );

    expect(screen.getByTestId("server-content")).toBeInTheDocument();
  });

  it("initializes Helper with correct HMAC configuration", () => {
    const mockConfig = {
      ...generateHelperAuth({ email: mockEmail }),
      title: "Test Helper",
      customerMetadata: {},
    };

    render(
      <HelperProvider host="https://helper.ai" {...mockConfig}>
        <div>Test Content</div>
      </HelperProvider>,
    );

    const script = document.querySelector("script");
    act(() => {
      script?.dispatchEvent(new Event("load"));
    });

    expect(mocks.mockInit).toHaveBeenCalledWith(mockConfig);
  });

  it("works with nested client components", () => {
    const mockConfig = {
      ...generateHelperAuth({ email: mockEmail }),
      title: "Test Helper",
      customerMetadata: {},
    };

    render(
      <HelperProvider host="https://helper.ai" {...mockConfig}>
        <div data-testid="server-content">
          <ClientComponent />
        </div>
      </HelperProvider>,
    );

    expect(screen.getByTestId("server-content")).toBeInTheDocument();
    expect(screen.getByTestId("client-component")).toBeInTheDocument();
  });
});

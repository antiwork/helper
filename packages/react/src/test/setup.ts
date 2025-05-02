import "@testing-library/jest-dom";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";
import type { HelperConfig } from "../types";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

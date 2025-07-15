import React from "react";
import { HelperContextProvider } from "../context/HelperContext";
import type { HelperWidgetConfig } from "../types";
import { ClientHelperProvider } from "./ClientHelperProvider";

export type HelperTool = {
  description?: string;
  parameters: Record<string, { type: "string" | "number"; description?: string; optional?: boolean }>;
} & (
  | {
      execute: (params: Record<string, unknown>) => Promise<unknown> | unknown;
    }
  | {
      url: string;
    }
);

/**
 * Props for the HelperProvider component
 * @typedef {Object} HelperProviderProps
 * @extends HelperWidgetConfig
 * @property {React.ReactNode} children - Child components to be wrapped by the provider
 * @property {string} [host] - Optional host URL for the Helper service
 */
export type HelperProviderProps = HelperWidgetConfig & {
  children: React.ReactNode;
  host: string;
};

/**
 * Provider component that enables Helper functionality for its children
 * Wraps the application with necessary context and configuration for Helper features
 *
 * @param {HelperProviderProps} props - Component props
 * @param {React.ReactNode} props.children - Child components to be wrapped
 * @param {string} [props.host] - Optional host URL for the Helper service
 * @returns {JSX.Element} Provider component with configured Helper functionality
 */
export function HelperProvider({ children, host, ...props }: HelperProviderProps) {
  return (
    <HelperContextProvider host={host} {...props}>
      <ClientHelperProvider host={host} {...props} />
      {children}
    </HelperContextProvider>
  );
}

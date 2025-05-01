"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { httpLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { lazy, Suspense, useState } from "react";
import SuperJSON from "superjson";
import { getBaseUrl } from "@/components/constants";
import { useRunOnce } from "@/components/useRunOnce";
import { env } from "@/lib/env";
import type { AppRouter } from "@/trpc";
import { createQueryClient } from "./query-client";

// https://tanstack.com/query/latest/docs/framework/react/devtools
const ReactQueryDevtoolsProduction = lazy(() =>
  import("@tanstack/react-query-devtools/build/modern/production.js").then((d) => ({
    default: d.ReactQueryDevtools,
  })),
);

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient());
};

export const api = createTRPCReact<AppRouter>();

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [showDevtools, setShowDevtools] = useState(false);
  useRunOnce(() => {
    // @ts-expect-error - Lazy-load the Tanstack Query devtools in production
    window.toggleDevtools = () => setShowDevtools((old) => !old);
  });

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) => env.NODE_ENV === "development" || (op.direction === "down" && op.result instanceof Error),
        }),
        httpLink({
          transformer: SuperJSON,
          url: `${getBaseUrl()}/api/trpc/lambda`,
          headers() {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            return headers;
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
      {/* Set to `true` to enable the Tanstack Query devtools */}
      {false && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
      {showDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtoolsProduction />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}

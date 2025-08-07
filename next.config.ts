import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { env } from "@/lib/env";

// Ensures that `env` is not an unused variable. Importing `env` during build-time
// ensures that the project never gets deployed unless all environment variables
// have been properly configured.
if (!env.NEXT_RUNTIME) {
  throw new Error("NEXT_RUNTIME is not set");
}

let nextConfig: NextConfig = {
  reactStrictMode: !env.DISABLE_STRICT_MODE,
  /** We already do linting as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
  allowedDevOrigins: ["https://helperai.dev"],
  // https://github.com/nextauthjs/next-auth/discussions/9385#discussioncomment-8875108
  transpilePackages: ["next-auth"],
  serverExternalPackages: ["natural", "picocolors"],
  outputFileTracingIncludes: {
    "/widget/sdk.js": ["./public/**/*"],
  },
  outputFileTracingExcludes: {
    // canvas is a huge module which can overflow the edge function size limit on Vercel.
    // PDF.js includes it for Node.js support but we don't need it as we only use it in the browser.
    "/conversations": ["node_modules/canvas"],
    "/api/job": ["node_modules/canvas"],
  },
  devIndicators: process.env.IS_TEST_ENV === "1" ? false : undefined,
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "secure.gravatar.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.slack-edge.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  webpack(config) {
    // @ts-expect-error - no types
    const fileLoaderRule = config.module.rules.find((rule) => rule.test?.test?.(".svg"));
    config.module.rules.push(
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] }, // exclude if *.svg?url
        use: ["@svgr/webpack"],
      },
    );
    fileLoaderRule.exclude = /\.svg$/i;

    // Needed to support pdfjs
    config.resolve.alias.canvas = false;

    // See https://github.com/getsentry/sentry-javascript/issues/12077#issuecomment-2180307072
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      (warning: any, { requestShortener }: any) => {
        const isOtelModule =
          !!warning.module &&
          (/@opentelemetry\/instrumentation/.test(warning.module.readableIdentifier(requestShortener)) ||
            /@prisma\/instrumentation/.test(warning.module.readableIdentifier(requestShortener)));
        const isCriticalDependencyMessage = /Critical dependency/.test(warning.message);
        return isOtelModule && isCriticalDependencyMessage;
      },
    ];

    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self';",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        source: "/widget/embed",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOW-FROM *",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *;",
          },
        ],
      },
    ];
  },
};

export default process.env.VERCEL_ENV === "production"
  ? withSentryConfig(nextConfig, {
      // For all available options, see:
      // https://github.com/getsentry/sentry-webpack-plugin#options

      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,

      // Automatically annotate React components to show their full name in breadcrumbs and session replay
      reactComponentAnnotation: {
        enabled: true,
      },

      // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
      // This can increase your server load as well as your hosting bill.
      // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
      // side errors will fail.
      tunnelRoute: "/monitoring",

      // Automatically tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,

      // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
      // See the following for more information:
      // https://docs.sentry.io/product/crons/
      // https://vercel.com/docs/cron-jobs
      automaticVercelMonitors: true,

      // Avoid cluttering traces with a ton of middleware spans.
      autoInstrumentMiddleware: false,
    })
  : nextConfig;

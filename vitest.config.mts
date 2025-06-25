import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const isEvals = process.env.EVALITE === "true";
const include = isEvals ? [] : ["tests/**/*.{test,spec}.?(c|m)[jt]s?(x)"];
const setupFiles = isEvals ? ["./tests/evals/support/setup.ts"] : ["./tests/support/setup.ts"];
const globalSetup = isEvals ? [] : ["./tests/support/globalSetup.ts"];

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/e2e/**"],
    coverage: {
      provider: "v8",
    },
    server: {
      deps: {
        cacheDir: ".cache/.vitest",
        // tRPC imports next/navigation without an extension, causing a similar error to this https://github.com/nextauthjs/next-auth/discussions/9385
        inline: ["@trpc/server"],
      },
    },
    passWithNoTests: true,
    watch: false,
    fileParallelism: false,
    testTimeout: isEvals ? 1000000 : 10000,
    sequence: {
      concurrent: false,
    },
    include,
    setupFiles,
    globalSetup,
  },
});

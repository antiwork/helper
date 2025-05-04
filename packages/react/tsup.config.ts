import { mkdir } from "fs/promises";
import { defineConfig, type Options } from "tsup";
import { name, version } from "./package.json";

export default defineConfig((overrideOptions) => {
  const isProd = overrideOptions.env?.NODE_ENV === "production";

  const common: Options = {
    entry: ["./src/**/*.{ts,tsx}", "!./src/**/*.test.{ts,tsx}"],
    bundle: false,
    treeshake: true,
    splitting: false,
    clean: true,
    minify: false,
    external: ["react"],
    sourcemap: true,
    dts: true,
    define: {
      PACKAGE_NAME: `"${name}"`,
      PACKAGE_VERSION: `"${version}"`,
      __DEV__: `${!isProd}`,
    },
  };

  const esm: Options = {
    ...common,
    format: "esm",
    outDir: "./dist/esm",
  };

  const cjs: Options = {
    ...common,
    format: "cjs",
    outDir: "./dist/cjs",
  };

  const copyPackageJson = async (format: "esm" | "cjs") => {
    const outDir = `./dist/${format}`;
    await mkdir(outDir, { recursive: true });
    const { execSync } = await import("child_process");
    execSync(`cp ./package.${format}.json ${outDir}/package.json`);
  };

  return [
    {
      ...esm,
      onSuccess: async () => {
        await copyPackageJson("esm");
      },
    },
    {
      ...cjs,
      onSuccess: async () => {
        await copyPackageJson("cjs");
      },
    },
  ];
});

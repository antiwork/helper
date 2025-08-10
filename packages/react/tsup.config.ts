import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fixImportsPlugin } from "esbuild-fix-imports-plugin";
import { glob } from "glob-promise";
import { defineConfig, type Options } from "tsup";
import { name, version } from "./package.json";

const addDirectives = async (format: "esm" | "cjs") => {
  const srcFiles = await glob.glob("src/**/*.{ts,tsx}");
  const directiveFiles = new Map();

  for (const file of srcFiles) {
    const contents = await readFile(file, "utf8");
    if (/^\s*["']use client["']/.test(contents)) {
      directiveFiles.set(file, "use client");
    } else if (/^\s*["']use server["']/.test(contents)) {
      directiveFiles.set(file, "use server");
    }
  }

  const formatExtensions = {
    cjs: {
      js: ".js",
      dts: ".d.ts",
    },
    esm: {
      js: ".mjs",
      dts: ".d.mts",
    },
  };

  for (const [srcFile, directive] of directiveFiles) {
    const relativePath = path.relative("src", srcFile);
    const baseOutPath = path.join("dist", format, relativePath).replace(/\.(ts|tsx)$/, "");

    const extensions = formatExtensions[format];
    for (const [type, ext] of Object.entries(extensions)) {
      const outFile = baseOutPath + ext;

      try {
        let contents = await readFile(outFile, "utf8");
        if (!contents.startsWith(`'${directive}';`)) {
          contents = `'${directive}';\n` + contents;
          await writeFile(outFile, contents);
          console.log(`Added "${directive}" to ${outFile}`);
        }
      } catch (error: any) {
        if (error.code === "ENOENT") {
          if (type === "js") {
            console.warn(`Could not process ${outFile}: File does not exist`);
          }
        } else {
          console.warn(`Error processing ${outFile}: ${error.message}`);
        }
      }
    }
  }
};

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
    esbuildPlugins: [fixImportsPlugin() as any], // Clashing esbuild dependency versions :(
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

  const onBuildComplete = async (format: "esm" | "cjs") => {
    await copyPackageJson(format);
    await addDirectives(format);
  };

  return [
    {
      ...esm,
      onSuccess: async () => {
        await onBuildComplete("esm");
      },
    },
    {
      ...cjs,
      onSuccess: async () => {
        await onBuildComplete("cjs");
      },
    },
  ];
});

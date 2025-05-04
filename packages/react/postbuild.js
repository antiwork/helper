const fs = require("fs/promises");
const path = require("path");
const { glob } = require("glob-promise");

(async () => {
  const srcFiles = await glob.glob("src/**/*.{ts,tsx}");
  const directiveFiles = new Map(); // Map to store files and their directives

  // Find source files with "use client" or "use server"
  for (const file of srcFiles) {
    const contents = await fs.readFile(file, "utf8");
    if (/^\s*["']use client["']/.test(contents)) {
      directiveFiles.set(file, "use client");
    } else if (/^\s*["']use server["']/.test(contents)) {
      directiveFiles.set(file, "use server");
    }
  }

  // File extension mappings for different formats
  const formatExtensions = {
    cjs: {
      js: ".js",
      dts: ".d.ts",
    },
    esm: {
      js: ".js",
      dts: ".d.mts", // .d.mts for ESM declaration files
    },
  };

  // Modify corresponding output files in both cjs and esm directories
  const formats = ["cjs", "esm"];
  for (const format of formats) {
    for (const [srcFile, directive] of directiveFiles) {
      const relativePath = path.relative("src", srcFile);
      const baseOutPath = path.join("dist", format, relativePath).replace(/\.(ts|tsx)$/, "");

      // Process both JavaScript and declaration files
      const extensions = formatExtensions[format];
      for (const [type, ext] of Object.entries(extensions)) {
        const outFile = baseOutPath + ext;

        try {
          let contents = await fs.readFile(outFile, "utf8");
          if (!contents.startsWith(`'${directive}';`)) {
            contents = `'${directive}';\n` + contents;
            await fs.writeFile(outFile, contents);
            console.log(`Added "${directive}" to ${outFile}`);
          }
        } catch (error) {
          if (error.code === "ENOENT") {
            // Only warn about missing .js files, as some components might not have declaration files
            if (type === "js") {
              console.warn(`Could not process ${outFile}: File does not exist`);
            }
          } else {
            console.warn(`Error processing ${outFile}: ${error.message}`);
          }
        }
      }
    }
  }
})();

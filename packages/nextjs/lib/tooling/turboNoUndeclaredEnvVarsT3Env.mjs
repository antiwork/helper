// @ts-nocheck

// This is a custom ESLint rule to mimic the behavior of turbo/no-undeclared-env-vars,
// which is a rule that ensures that people do not forget to update turbo.json when adding
// new environment variables. The original rule unfortunately doesn't work with the typesafe
// env config we use in t3-env. It's important for environment variables that impact the project
// build to be declared in turbo.json so that changes to those values invalidate the Turborepo build cache as needed.

import fs from "fs";
import path from "path";

const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Ensure environment variables are declared in root turbo.json globalEnv",
      category: "Possible Errors",
      recommended: true,
    },
    fixable: null,
    schema: [],
  },

  create(context) {
    let globalEnv = [];

    // Function to find the root turbo.json
    const findRootTurboJson = (dir) => {
      const turboPath = path.join(dir, "turbo.json");
      // The goal is to be certain we're in the root directory. This
      // can use any file as long as it's unique to the root directory.
      // The reason to not only look for turbo.json is becasue there can
      // be many turbo.json files in a monorepo, and we need to find the
      // one in the root directory.
      const isRootDir = fs.existsSync(path.join(dir, ".node-version"));

      if (fs.existsSync(turboPath) && isRootDir) {
        return turboPath;
      }
      const parentDir = path.dirname(dir);
      if (parentDir === dir) {
        return null; // We've reached the root without finding turbo.json
      }
      return findRootTurboJson(parentDir);
    };

    // Start from the current working directory and search upwards
    const rootTurboJsonPath = findRootTurboJson(context.getCwd());

    if (rootTurboJsonPath) {
      try {
        const turboConfig = JSON.parse(fs.readFileSync(rootTurboJsonPath, "utf8"));
        globalEnv = [...(turboConfig.globalEnv ?? []), ...(turboConfig.globalPassThroughEnv ?? [])];
      } catch (error) {
        console.error("Error reading or parsing root turbo.json:", error);
      }
    } else {
      console.error("Root turbo.json not found in the project");
    }

    return {
      MemberExpression(node) {
        if (node.object.type === "Identifier" && node.object.name === "env" && node.property.type === "Identifier") {
          const envVar = node.property.name;
          // Ignore NEXT_PUBLIC_ variables
          if (!envVar.startsWith("NEXT_PUBLIC_") && !envVar.startsWith("VERCEL_") && !globalEnv.includes(envVar)) {
            context.report({
              node,
              message: `Environment variable '${envVar}' is not declared in root turbo.json globalEnv array.`,
            });
          }
        }
      },
    };
  },
};

export default rule;

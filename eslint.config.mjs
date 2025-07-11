import path from "path";
import { includeIgnoreFile } from "@eslint/compat";
import nextPlugin from "@next/eslint-plugin-next";
import prettierConfig from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const restrictEnvAccess = tseslint.config(
  { ignores: ["**/env.ts", "tests/e2e/**"] },
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Use `import { env } from '@/lib/env'` instead to ensure validated types.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          name: "process",
          importNames: ["env"],
          message: "Use `import { env } from '@/lib/env'` instead to ensure validated types.",
        },
      ],
    },
  },
);

const baseConfig = tseslint.config(
  // Ignore files not tracked by VCS and any config files
  includeIgnoreFile(path.join(import.meta.dirname, ".gitignore")),
  { ignores: ["**/*.config.*", "packages/**"] },
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    plugins: {
      import: importPlugin,
    },
    extends: [
      // eslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      "arrow-body-style": "error",
      "logical-assignment-operators": "error",
      "no-else-return": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-lone-blocks": "error",
      "no-lonely-if": "error",
      "no-var": "error",
      "no-unneeded-ternary": "error",
      "no-useless-call": "error",
      "no-useless-computed-key": "error",
      "no-useless-concat": "error",
      "no-useless-rename": "error",
      "no-useless-return": "error",
      "object-shorthand": "error",
      "operator-assignment": "error",
      "prefer-arrow-callback": "error",
      "prefer-const": "error",
      "prefer-exponentiation-operator": "error",
      "prefer-numeric-literals": "error",
      "prefer-object-spread": "error",
      "prefer-regex-literals": "error",
      "prefer-spread": "error",
      "prefer-template": "error",
      yoda: "error",
      "import/no-duplicates": "error",
      "require-await": "error",

      // TODO (shan): Continue chipping away at this until can mark all as "error"
      "require-unicode-regexp": "off",
      eqeqeq: "off",
      // eqeqeq: ["error", "smart"],
      "no-alert": "off",
      radix: "off",
      "no-console": "error",
      "prefer-promise-reject-errors": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/consistent-type-imports": [
        "off",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "import/consistent-type-specifier-style": ["off", "prefer-top-level"],
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/unbonud-method": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
          reportUsedIgnorePattern: true,
        },
      ],
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/require-array-sort-compare": ["error", { ignoreStringArrays: true }],
      "@typescript-eslint/switch-exhaustiveness-check": "error",

      // TODO Continue chipping away at these until we can re-enable them.
      "@typescript-eslint/consistent-type-assertions": ["off", { assertionStyle: "never" }],
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      // "@typescript-eslint/no-unnecessary-condition": [
      //   "error",
      //   {
      //     allowConstantLoopConditions: true,
      //   },
      // ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      "@typescript-eslint/restrict-plus-operands": "off",
      "@typescript-eslint/no-misused-promises": "off",
      // "@typescript-eslint/no-misused-promises": [
      //   2,
      //   { checksVoidReturn: { attributes: false } },
      // ],
      "@typescript-eslint/no-deprecated": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "no-async-promise-executor": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-dynamic-delete": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      // "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "import/order": "off",
      // "import/order": [
      //   "error",
      //   {
      //     "newlines-between": "always",
      //     alphabetize: { order: "asc", caseInsensitive: true },
      //     groups: [["builtin", "external"], "internal", "parent", ["sibling", "index"]],
      //     pathGroups: [
      //       { pattern: "@/components/**", group: "internal", position: "after" },
      //       { pattern: "@/**", group: "internal" },
      //     ],
      //   },
      // ],
    },
  },
  {
    linterOptions: { reportUnusedDisableDirectives: true },
    languageOptions: { parserOptions: { projectService: true } },
  },
);

const reactConfig = tseslint.config({
  files: ["**/*.ts", "**/*.tsx"],
  plugins: {
    react: reactPlugin,
    "react-hooks": hooksPlugin,
  },
  rules: {
    ...reactPlugin.configs["jsx-runtime"].rules,
    ...hooksPlugin.configs.recommended.rules,
  },
  languageOptions: {
    globals: {
      React: "writable",
    },
  },
});

const nextjsConfig = tseslint.config(
  {
    ignores: ["public/**"],
  },
  prettierRecommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
      // TypeError: context.getAncestors is not a function
      "@next/next/no-duplicate-head": "off",
    },
  },
  prettierConfig,
);

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**", ".source/**", "tests/e2e/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];

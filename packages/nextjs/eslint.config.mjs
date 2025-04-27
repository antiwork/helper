import baseConfig, { restrictEnvAccess } from "@helperai/eslint-config/base";
import nextjsConfig from "@helperai/eslint-config/nextjs";
import reactConfig from "@helperai/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];

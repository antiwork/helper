import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            color: "var(--foreground)",
            a: {
              color: "var(--foreground)",
              "&:hover": {
                color: "color-mix(in srgb, var(--foreground) 80%, transparent)",
              },
            },
            strong: {
              color: "var(--foreground)",
            },
            code: {
              color: "var(--foreground)",
              backgroundColor: "var(--muted)",
            },
            th: {
              color: "var(--foreground)",
            },
            blockquote: {
              color: "var(--foreground)",
            },
          },
        },
      },
    },
  },
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            color: "var(--foreground)",
            maxWidth: 'none',
            a: {
              color: "var(--primary)",
              textDecoration: 'underline',
              textDecorationColor: "var(--primary)",
              fontWeight: '500',
              "&:hover": {
                color: "var(--primary)",
                opacity: '0.8',
              },
            },
            strong: {
              color: "var(--foreground)",
              fontWeight: '600',
            },
            em: {
              color: "var(--foreground)",
            },
            code: {
              color: "var(--foreground)",
              backgroundColor: "var(--muted)",
              padding: '0.125rem 0.25rem',
              borderRadius: '0.25rem',
              fontSize: '0.875em',
              fontWeight: '500',
              border: '1px solid var(--border)',
              "&::before": {
                content: '""',
              },
              "&::after": {
                content: '""',
              },
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: "var(--muted)",
              color: "var(--foreground)",
              border: '1px solid var(--border)',
              code: {
                backgroundColor: 'transparent',
                border: 'none',
                padding: '0',
                borderRadius: '0',
                fontSize: 'inherit',
              },
            },
            h1: {
              color: "var(--foreground)",
              fontWeight: '700',
            },
            h2: {
              color: "var(--foreground)",
              fontWeight: '600',
            },
            h3: {
              color: "var(--foreground)",
              fontWeight: '600',
            },
            h4: {
              color: "var(--foreground)",
              fontWeight: '600',
            },
            h5: {
              color: "var(--foreground)",
              fontWeight: '600',
            },
            h6: {
              color: "var(--foreground)",
              fontWeight: '600',
            },
            th: {
              color: "var(--foreground)",
              backgroundColor: "var(--muted)",
              borderColor: "var(--border)",
              fontWeight: '600',
            },
            td: {
              borderColor: "var(--border)",
            },
            blockquote: {
              color: "var(--muted-foreground)",
              borderLeftColor: "var(--border)",
              backgroundColor: "var(--muted)",
              padding: '1rem',
              borderRadius: '0.5rem',
              fontStyle: 'normal',
            },
            hr: {
              borderColor: "var(--border)",
            },
            ol: {
              li: {
                "&::marker": {
                  color: "var(--muted-foreground)",
                },
              },
            },
            ul: {
              li: {
                "&::marker": {
                  color: "var(--muted-foreground)",
                },
              },
            },
            'blockquote p:first-of-type::before': {
              content: '""',
            },
            'blockquote p:last-of-type::after': {
              content: '""',
            },
          },
        },
        sm: {
          css: {
            fontSize: '0.875rem',
            lineHeight: '1.5',
          },
        },
        lg: {
          css: {
            fontSize: '1.125rem',
            lineHeight: '1.6',
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "slide-out": "slide-out 0.3s ease-out",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
  ],
};

export default config;
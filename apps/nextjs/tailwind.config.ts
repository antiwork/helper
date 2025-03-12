import type { Config } from "tailwindcss";
import type { PluginCreator } from "tailwindcss/types/config";

const customUtilitiesPlugin: PluginCreator = ({ addUtilities, addComponents }) => {
  addUtilities({
    ".responsive-break-words": {
      "overflow-wrap": "break-word",
      "word-break": "break-word",
    },
    ".scrollbar-hidden": {
      "-ms-overflow-style": "none",
      "scrollbar-width": "none",
    },
    ".scrollbar-hidden::-webkit-scrollbar": {
      display: "none",
    },
  });

  addComponents({
    ".btn-group": {
      display: "flex",
    },
    ".btn-group .btn-group-item:first-child:not(:only-child), .btn-group :first-child:not(:only-child) .btn-group-item":
      {
        marginRight: "-1px",
        borderTopRightRadius: "0",
        borderBottomRightRadius: "0",
      },
    ".btn-group .btn-group-item:last-child:not(:only-child), .btn-group :last-child:not(:only-child) .btn-group-item": {
      borderTopLeftRadius: "0",
      borderBottomLeftRadius: "0",
    },
    ".btn-group .btn-group-item:not(:first-child):not(:last-child), .btn-group :not(:first-child):not(:last-child) .btn-group-item":
      {
        marginRight: "-1px",
        borderRadius: "0",
      },
    "pre.code": {
      counterReset: "step",
      counterIncrement: "step 0",
    },
    "pre.code .token-line::before": {
      content: "counter(step)",
      counterIncrement: "step",
      width: "1rem",
      marginRight: "1.5rem",
      display: "inline-block",
      textAlign: "right",
      color: "rgba(115, 138, 148, 0.4)",
    },
  });
};

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/emails/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        bright: {
          DEFAULT: "hsl(var(--bright))",
          foreground: "hsl(var(--bright-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        "gumroad-pink": {
          DEFAULT: "#FF90E8",
        },
        "gumroad-bg": {
          DEFAULT: "#f4f4f0",
        },
        // Old colors, do not use
        orange: {
          "50": "#FEB81D",
          DEFAULT: "#EC643C",
        },
        green: {
          "900": "#2A340E",
          DEFAULT: "#C2D44B",
        },
        mahogany: {
          "900": "#290B0B",
          DEFAULT: "#480F0E",
        },
        amber: {
          "50": "#FFF8E8",
          DEFAULT: "#FEB81D",
        },
      },
      fontSize: {
        xxs: ["0.625rem", { lineHeight: ".75rem" }],
      },
      fontFamily: {
        "sundry-regular": ["var(--font-sundry-regular)", "sans-serif"],
        "sundry-medium": ["var(--font-sundry-medium)", "sans-serif"],
        "sundry-bold": ["var(--font-sundry-bold)", "sans-serif"],
        "sundry-narrow-medium": ["var(--font-sundry-narrow-medium)", "sans-serif"],
        "sundry-narrow-bold": ["var(--font-sundry-narrow-bold)", "sans-serif"],
        // Removed Mabry font in favor of system fonts
        mabry: ["-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "'Roboto'", "'Oxygen'", "'Ubuntu'", "'Cantarell'", "'Fira Sans'", "'Droid Sans'", "'Helvetica Neue'", "sans-serif"],
        regular: ["var(--font-sundry-regular)", "sans-serif"],
        medium: ["var(--font-sundry-medium)", "sans-serif"],
        bold: ["var(--font-sundry-bold)", "sans-serif"],
        narrow: ["var(--font-sundry-narrow-medium)", "sans-serif"],
        "narrow-medium": ["var(--font-sundry-narrow-medium)", "sans-serif"],
        "narrow-bold": ["var(--font-sundry-narrow-bold)", "sans-serif"],
        "system-ui": [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "'Roboto'",
          "'Oxygen'",
          "'Ubuntu'",
          "'Cantarell'",
          "'Fira Sans'",
          "'Droid Sans'",
          "'Helvetica Neue'",
          "sans-serif",
        ],
      },
      keyframes: {
        "default-pulse": {
          "0%, 100%": {
            opacity: "1",
          },
          "50%": {
            opacity: ".5",
          },
        },
        pulsing: {
          "0%": {
            boxShadow: "0 0 0 0 rgba(254, 184, 29, 1)",
          },
          "100%": {
            boxShadow: "0 0 0 32px rgba(254, 184, 29, 0)",
          },
        },
        bounce: {
          "0%, 100%": {
            transform: "translateY(-5px)",
          },
          "50%": {
            transform: "translateY(0)",
          },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "default-pulse": "default-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        pulse: "pulsing 1s ease-in-out infinite",
        bounce: "bounce .75s ease-in infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      typography: {
        DEFAULT: {
          css: {
            color: "hsl(var(--foreground))",
            a: {
              color: "hsl(var(--foreground))",
              "&:hover": {
                color: "hsl(var(--foreground) / 0.8)",
              },
            },
            strong: {
              color: "hsl(var(--foreground))",
            },
          },
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/aspect-ratio"),
    customUtilitiesPlugin,
  ],
};

export default config;

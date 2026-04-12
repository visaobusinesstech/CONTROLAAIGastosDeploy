import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["'Helvetica Neue'", "-apple-system", "BlinkMacSystemFont", "'Inter'", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
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
        cgreen: {
          50: "#E8F5E9",
          100: "#C8E6C9",
          200: "#A5D6A7",
          400: "#66BB6A",
          500: "#4CAF50",
          700: "#388E3C",
          900: "#1B5E20",
        },
        cgray: {
          50: "#F5F5F7",
          100: "#F0F0F2",
          200: "#E5E5EA",
          400: "#AEAEB2",
          600: "#636366",
          800: "#3A3A3C",
          900: "#1C1C1E",
        },
        surface: {
          page: "#F5F5F7",
          card: "#FFFFFF",
          inset: "#F5F5F7",
          dark: "#1C1C1E",
        },
        cred: {
          light: "#FFEBEE",
          main: "#EF5350",
          dark: "#C62828",
        },
        camber: {
          light: "#FFF8E1",
          main: "#FFB300",
          dark: "#E65100",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "20px",
        "2xl": "24px",
      },
      fontSize: {
        xs: ["11px", { lineHeight: "1.4", letterSpacing: "0.3px" }],
        sm: ["13px", { lineHeight: "1.5" }],
        base: ["15px", { lineHeight: "1.6" }],
        lg: ["17px", { lineHeight: "1.5", letterSpacing: "-0.2px" }],
        xl: ["22px", { lineHeight: "1.3", letterSpacing: "-0.5px" }],
        "2xl": ["28px", { lineHeight: "1.2", letterSpacing: "-0.8px" }],
        "3xl": ["34px", { lineHeight: "1.1", letterSpacing: "-1px" }],
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        budget: {
          background: "var(--budget-background)",
          card: "var(--budget-card)",
          primary: "var(--budget-primary)",
          text: "var(--budget-text)",
          cat: "var(--budget-cat)",
          success: "var(--budget-success)",
          warning: "var(--budget-warning)",
          urgent: "var(--budget-urgent)",
          border: "var(--budget-border)",
        },
      },
      boxShadow: {
        soft: "var(--budget-shadow)",
        button: "0 10px 24px color-mix(in srgb, var(--budget-primary) 28%, transparent)",
      },
      fontFamily: {
        sans: ["DM Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;

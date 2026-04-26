import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        budget: {
          background: "#FFF8EF",
          card: "#FFFFFF",
          primary: "#7FA77B",
          text: "#2E2A24",
          cat: "#E6A44E",
          success: "#4F8F5B",
          warning: "#F2B84B",
          urgent: "#D96B5F",
          border: "#E8DED0",
        },
      },
      boxShadow: {
        soft: "0 18px 45px rgba(46, 42, 36, 0.08)",
        button: "0 10px 24px rgba(127, 167, 123, 0.28)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;

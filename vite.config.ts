import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      includeAssets: [
        "assets/icons/budgetcat-icon-32.png",
        "assets/icons/budgetcat-icon-180.png",
        "assets/icons/budgetcat-icon-192.png",
        "assets/icons/budgetcat-icon-512.png",
      ],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,ico,png,webmanifest}"],
        navigateFallback: "/index.html",
        runtimeCaching: [],
      },
    }),
  ],
});

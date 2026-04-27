import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      manifest: false,
      includeAssets: [
        "assets/icons/budgetcat-icon-32.png",
        "assets/icons/budgetcat-icon-180.png",
        "assets/icons/budgetcat-icon-192.png",
        "assets/icons/budgetcat-icon-512.png",
        "assets/mascots/bill-reminder.png",
        "assets/mascots/bonnie-clyde.png",
        "assets/mascots/bonnie.png",
        "assets/mascots/budget-alert.png",
        "assets/mascots/clyde.png",
        "assets/mascots/dashboard-mascot.png",
        "assets/mascots/goal-achieved.png",
        "assets/mascots/savings-goal.png",
        "assets/mascots/travel-goal.png",
        "assets/sounds/garage-cat-meow-7-fx-306186.mp3",
      ],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2,mp3,webmanifest}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              (url.pathname.startsWith("/assets/") ||
                url.pathname === "/manifest.webmanifest"),
            handler: "CacheFirst",
            options: {
              cacheName: "budgetcat-static-assets",
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
});

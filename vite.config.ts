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
        globPatterns: ["**/*.{js,css,html,svg,ico,png,webmanifest}"],
        navigateFallback: "/index.html",
        runtimeCaching: [],
      },
    }),
  ],
});

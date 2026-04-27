import React from "react";
import ReactDOM from "react-dom/client";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PwaDebugPanel } from "./components/debug/PwaDebugPanel";
import { PublicOnlyRoute } from "./components/auth/PublicOnlyRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { ToastProvider } from "./components/ui/ToastProvider";
import { AuthProvider } from "./contexts/AuthContext";
import { Dashboard } from "./pages/Dashboard";
import { DueDates } from "./pages/DueDates";
import { Goals } from "./pages/Goals";
import { Login } from "./pages/Login";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Transactions } from "./pages/Transactions";
import { initPwaInstallListener } from "./lib/pwaInstall";
import { applyTheme, getPreferredTheme } from "./lib/theme";
import "./styles/globals.css";

registerSW({
  immediate: true,
});

initPwaInstallListener();
applyTheme(getPreferredTheme());

console.info("[BOOT_TRACE] app mounted", { elapsedMs: 0 });
console.info("[BOOT_TRACE] navigator.onLine =", navigator.onLine, { elapsedMs: 0 });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<Login />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/due-dates" element={<DueDates />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <PwaDebugPanel />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>,
);

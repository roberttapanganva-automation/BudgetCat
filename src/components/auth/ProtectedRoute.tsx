import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { StartupRecoveryScreen } from "./StartupRecoveryScreen";

export function ProtectedRoute() {
  const { isLoading, isPasswordRecovery, retryStartup, startupError, user } = useAuth();
  const location = useLocation();

  if (isPasswordRecovery) return <Navigate replace to="/reset-password" />;

  if (startupError) {
    return <StartupRecoveryScreen error={startupError} onTryAgain={retryStartup} />;
  }

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-budget-background text-budget-text">
        <div className="rounded-lg border border-budget-border bg-budget-card p-5 text-sm font-bold">
          Loading BudgetCat...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Outlet />;
}

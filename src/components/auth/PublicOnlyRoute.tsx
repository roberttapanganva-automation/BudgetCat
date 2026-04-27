import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { StartupRecoveryScreen } from "./StartupRecoveryScreen";

export function PublicOnlyRoute() {
  const { isLoading, retryStartup, startupError, user } = useAuth();

  if (startupError) {
    return <StartupRecoveryScreen error={startupError} onTryAgain={retryStartup} />;
  }

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-budget-background text-budget-text">
        <div className="rounded-lg border border-budget-border bg-budget-card p-5 text-sm font-bold shadow-soft">
          Loading BudgetCat...
        </div>
      </div>
    );
  }

  if (user) return <Navigate replace to="/" />;

  return <Outlet />;
}

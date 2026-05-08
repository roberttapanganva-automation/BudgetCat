import { AlertTriangle, RefreshCcw, RotateCcw, Trash2 } from "../../lib/icons";
import { reloadBudgetCat, emergencyResetBudgetCat, type StartupErrorState } from "../../lib/startupDebug";
import { Button } from "../ui/Button";

type StartupRecoveryScreenProps = {
  error: StartupErrorState;
  onTryAgain: () => void;
};

export function StartupRecoveryScreen({ error, onTryAgain }: StartupRecoveryScreenProps) {
  function handleEmergencyReset() {
    const confirmed = window.confirm(
      "This clears local BudgetCat data on this browser, including unsynced offline changes. Continue?",
    );

    if (confirmed) {
      emergencyResetBudgetCat();
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-budget-background px-4 py-8 text-budget-text">
      <section className="w-full max-w-lg rounded-xl border border-budget-border bg-budget-card p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-budget-warning/15 text-budget-warning">
            <AlertTriangle size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-budget-primary">
              {error.code}
            </p>
            <h1 className="mt-2 text-2xl font-black">{error.title}</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-budget-text/65">
              {error.message}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-budget-text/55">
              Try again or reload first. Emergency reset is destructive and should only be used if BudgetCat stays stuck.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Button onClick={onTryAgain}>
            <RefreshCcw size={18} />
            Try again
          </Button>
          <Button onClick={reloadBudgetCat} variant="secondary">
            <RotateCcw size={18} />
            Reload app
          </Button>
          <Button onClick={handleEmergencyReset} variant="urgent">
            <Trash2 size={18} />
            Emergency reset
          </Button>
        </div>
      </section>
    </div>
  );
}

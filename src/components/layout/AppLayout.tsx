import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/localDb";
import { sendLocalNotification } from "../../lib/notifications";
import { getDueDateReminders } from "../../lib/reminders";
import { syncPendingRecords } from "../../lib/syncEngine";
import { AddTransactionDialog } from "../transactions/AddTransactionDialog";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { ThemeToggle } from "./ThemeToggle";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/transactions": "Transactions",
  "/due-dates": "Due Dates",
  "/goals": "Goals",
  "/reports": "Reports",
  "/settings": "Settings",
};

export function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const householdId = user?.householdId ?? "";
  const routeTitle = routeTitles[location.pathname] ?? "BudgetCat";
  const dueDates =
    useLiveQuery(
      () =>
        db.due_dates
          .where("household_id")
          .equals(householdId)
          .filter((dueDate) => !dueDate.deleted_at)
          .toArray(),
      [householdId],
      [],
    ) ?? [];

  useEffect(() => {
    if (!user) return;

    syncPendingRecords(user);

    const handleOnline = () => {
      syncPendingRecords(user);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user]);

  useEffect(() => {
    if (!user || dueDates.length === 0) return;

    const notificationKey = `budgetcat-reminders-${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(notificationKey)) return;

    const urgentReminder = getDueDateReminders(dueDates).find(
      (reminder) => reminder.status === "due_today" || reminder.status === "overdue",
    );

    if (urgentReminder) {
      const result = sendLocalNotification(urgentReminder.title, urgentReminder.body);
      if (result.ok) {
        sessionStorage.setItem(notificationKey, "sent");
      }
    }
  }, [dueDates, user]);

  return (
    <div className="min-h-screen bg-budget-background text-budget-text">
      <Sidebar />
      <main className="min-h-screen px-4 pb-32 pt-4 md:ml-[var(--budget-sidebar-width)] md:px-8 md:pb-8 md:pt-6">
        <div className="sticky top-0 z-30 -mx-4 mb-5 border-b border-budget-border bg-budget-background/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-budget-text/45">
                BudgetCat
              </p>
              <h1 className="truncate font-display text-2xl font-black text-budget-text">
                {routeTitle}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden sm:block">
                <SyncStatusIndicator />
              </div>
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
              <div className="hidden md:block">
                <AddTransactionDialog />
              </div>
              <Link
                aria-label="Settings"
                className="grid h-11 w-11 place-items-center rounded-[12px] border border-budget-border bg-budget-card text-budget-text shadow-soft transition hover:-translate-y-0.5 hover:text-budget-primary md:hidden"
                to="/settings"
              >
                <Settings size={19} />
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-7xl">
          <Outlet />
        </div>
      </main>
      <MobileNav />
      <div className="fixed bottom-24 right-4 z-40 md:hidden">
        <AddTransactionDialog className="min-h-12 rounded-full px-5 shadow-button" label="Add" />
      </div>
    </div>
  );
}

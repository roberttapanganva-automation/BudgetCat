import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/localDb";
import { sendLocalNotification } from "../../lib/notifications";
import { getDueDateReminders } from "../../lib/reminders";
import { syncPendingRecords } from "../../lib/syncEngine";
import { BudgetCatMascot } from "../mascot/BudgetCatMascot";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";

const mobileTitles: Record<string, string> = {
  "/": "Home",
  "/transactions": "Ledger",
  "/due-dates": "Bills",
  "/goals": "Goals",
  "/reports": "Reports",
  "/settings": "Settings",
};

export function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const householdId = user?.householdId ?? "";
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

    if (navigator.onLine) {
      syncPendingRecords(user);
    }

    const handleOnline = () => {
      syncPendingRecords(user);
    };
    const handleFocus = () => {
      if (navigator.onLine) {
        syncPendingRecords(user);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !navigator.onLine) return;
    syncPendingRecords(user);
  }, [location.pathname, user]);

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

  const mobileTitle = mobileTitles[location.pathname] ?? "Home";

  return (
    <div className="min-h-screen bg-budget-background text-budget-text">
      <Sidebar />
      <main className="min-h-screen px-4 pb-36 pt-0 md:ml-[var(--budget-sidebar-width)] md:px-8 md:pb-8 md:pt-8">
        <div className="sticky top-0 z-30 -mx-4 border-b border-budget-border bg-budget-background/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link className="flex min-w-0 items-center gap-3" to="/">
              <BudgetCatMascot imageClassName="h-10 w-10 rounded-lg" variant="icon" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black leading-tight">BudgetCat</p>
                <p className="truncate text-xs font-semibold text-budget-text/55">{mobileTitle}</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle className="h-9 w-9" />
              <Link
                aria-label="Settings"
                className="grid h-9 w-9 place-items-center rounded-full border border-budget-border bg-budget-card text-budget-text"
                to="/settings"
              >
                <Settings size={17} />
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-7xl">
          <Outlet />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

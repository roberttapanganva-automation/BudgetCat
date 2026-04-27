import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, Outlet } from "react-router-dom";
import { Settings } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/localDb";
import { sendLocalNotification } from "../../lib/notifications";
import { getDueDateReminders } from "../../lib/reminders";
import { syncPendingRecords } from "../../lib/syncEngine";
import { AddTransactionDialog } from "../transactions/AddTransactionDialog";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const { user } = useAuth();
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
      <main className="min-h-screen px-4 pb-32 pt-5 md:ml-[var(--budget-sidebar-width)] md:px-8 md:pb-8 md:pt-8">
        <Link
          aria-label="Settings"
          className="fixed right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full border border-budget-border bg-budget-card text-budget-text shadow-soft md:hidden"
          to="/settings"
        >
          <Settings size={18} />
        </Link>
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

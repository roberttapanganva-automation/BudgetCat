import { useEffect } from "react";
import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/localDb";
import { sendLocalNotification } from "../../lib/notifications";
import { getDueDateReminders } from "../../lib/reminders";
import { syncPendingRecords } from "../../lib/syncEngine";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";

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

    const notificationKey = `budgetcat-reminders-${format(new Date(), "yyyy-MM-dd")}`;

    if (sessionStorage.getItem(notificationKey)) return;

    const urgentReminder = getDueDateReminders(dueDates).find(
      (reminder) =>
        reminder.status === "due_today" || reminder.status === "overdue",
    );

    if (urgentReminder) {
      const result = sendLocalNotification(
        urgentReminder.title,
        urgentReminder.body,
      );

      if (result.ok) {
        sessionStorage.setItem(notificationKey, "sent");
      }
    }
  }, [dueDates, user]);

  return (
    <div className="bc-app-shell">
      <Sidebar />

      <main className="min-h-screen md:pl-[var(--budget-sidebar-width)]">
        <div className="mx-auto min-h-screen w-full max-w-[1180px] md:px-6 md:py-6">
          <Outlet />
        </div>
      </main>

      <MobileNav />
    </div>
  );
}

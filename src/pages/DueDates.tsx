import { format, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { CoachCard } from "../components/dashboard/CoachCard";
import { PageHeader } from "../components/dashboard/PageHeader";
import { AddDueDateDialog } from "../components/due-dates/AddDueDateDialog";
import { BillStatusBadge } from "../components/due-dates/BillStatusBadge";
import { ReminderList } from "../components/reminders/ReminderCard";
import { Card } from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { getBudgetCatCoachMessages } from "../lib/budgetCatCoach";
import { getDueDateStatus } from "../lib/calculations";
import { db } from "../lib/localDb";
import { getDueDateReminders } from "../lib/reminders";
import { formatCurrency } from "../lib/utils";

export function DueDates() {
  const { user } = useAuth();
  const householdId = user?.householdId ?? "";
  const dueDates =
    useLiveQuery(
      () =>
        db.due_dates
          .where("household_id")
          .equals(householdId)
          .filter((bill) => !bill.deleted_at)
          .sortBy("due_date"),
      [householdId],
      [],
    ) ?? [];
  const reminders = getDueDateReminders(dueDates);
  const coachMessages = getBudgetCatCoachMessages({
    transactions: [],
    dueDates,
    goals: [],
  });

  return (
    <>
      <PageHeader
        action={<AddDueDateDialog />}
        subtitle="Upcoming bills and in-app due date reminders."
        title="Due Dates"
      />
      <section className="mb-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <CoachCard message={coachMessages[0]} />
        <div className="rounded-lg border border-budget-border bg-budget-card p-4 shadow-soft">
          <h2 className="mb-3 text-lg font-black">Bill reminders</h2>
          <ReminderList
            emptyText="No bills are due soon."
            limit={4}
            reminders={reminders}
          />
        </div>
      </section>
      <section className="grid gap-4">
        {dueDates.map((bill) => (
          <Card className="p-5" key={bill.id}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-black">{bill.title}</h2>
                  <BillStatusBadge status={bill.status} />
                  <BillStatusBadge status={getDueDateStatus(bill)} />
                </div>
                <p className="mt-2 text-sm font-semibold text-budget-text/55">
                  {format(parseISO(bill.due_date), "MMM d, yyyy")} - repeats {bill.repeat_type}
                </p>
                {bill.note && (
                  <p className="mt-2 text-sm font-semibold text-budget-text/55">
                    {bill.note}
                  </p>
                )}
              </div>
              <p className="text-2xl font-black text-budget-text">
                {formatCurrency(bill.amount)}
              </p>
            </div>
          </Card>
        ))}
        {dueDates.length === 0 && (
          <Card className="p-8 text-sm font-semibold text-budget-text/55">
            No bills have been added yet.
          </Card>
        )}
      </section>
    </>
  );
}

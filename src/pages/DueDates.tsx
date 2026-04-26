import { format, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { type FormEvent, useEffect, useState } from "react";
import { CoachCard } from "../components/dashboard/CoachCard";
import { PageHeader } from "../components/dashboard/PageHeader";
import { AddDueDateDialog } from "../components/due-dates/AddDueDateDialog";
import { BillStatusBadge } from "../components/due-dates/BillStatusBadge";
import { ReminderList } from "../components/reminders/ReminderCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { useAuth } from "../contexts/AuthContext";
import { getBudgetCatCoachMessages } from "../lib/budgetCatCoach";
import { getDueDateStatus } from "../lib/calculations";
import { db, softDeleteLocalDueDate, updateLocalDueDate } from "../lib/localDb";
import { getDueDateReminders } from "../lib/reminders";
import { syncPendingRecords } from "../lib/syncEngine";
import { formatCurrency } from "../lib/utils";
import type { DueDateStatus, LocalDueDate, RepeatType } from "../types/finance";

export function DueDates() {
  const { user } = useAuth();
  const householdId = user?.householdId ?? "";
  const [editingBill, setEditingBill] = useState<LocalDueDate | null>(null);
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

  async function updateBillStatus(bill: LocalDueDate, status: DueDateStatus) {
    await updateLocalDueDate(bill.id, { status });
    if (user && navigator.onLine) {
      await syncPendingRecords(user);
    }
  }

  async function deleteBill(bill: LocalDueDate) {
    const confirmed = window.confirm(`Delete ${bill.title}?`);
    if (!confirmed) return;
    await softDeleteLocalDueDate(bill.id);
    if (user && navigator.onLine) {
      await syncPendingRecords(user);
    }
  }

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
              <div className="flex flex-col gap-3 sm:items-end">
                <p className="font-display text-2xl font-black text-budget-text">
                  {formatCurrency(bill.amount)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setEditingBill(bill)} variant="secondary">
                    Edit
                  </Button>
                  <Button
                    onClick={() =>
                      updateBillStatus(bill, bill.status === "paid" ? "upcoming" : "paid")
                    }
                    variant="secondary"
                  >
                    {bill.status === "paid" ? "Mark Unpaid" : "Mark Paid"}
                  </Button>
                  <Button onClick={() => deleteBill(bill)} variant="ghost">
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {dueDates.length === 0 && (
          <Card className="p-8 text-sm font-semibold text-budget-text/55">
            No bills have been added yet.
          </Card>
        )}
      </section>
      <EditDueDateModal
        bill={editingBill}
        onClose={() => setEditingBill(null)}
        user={user}
      />
    </>
  );
}

function EditDueDateModal({
  bill,
  onClose,
  user,
}: {
  bill: LocalDueDate | null;
  onClose: () => void;
  user: ReturnType<typeof useAuth>["user"];
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [repeatType, setRepeatType] = useState<RepeatType>("monthly");
  const [reminderDays, setReminderDays] = useState("3");
  const [status, setStatus] = useState<DueDateStatus>("upcoming");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!bill) return;
    setTitle(bill.title);
    setAmount(String(bill.amount));
    setDueDate(bill.due_date);
    setRepeatType(bill.repeat_type);
    setReminderDays(String(bill.reminder_days));
    setStatus(bill.status);
    setNote(bill.note ?? "");
  }, [bill]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bill) return;

    await updateLocalDueDate(bill.id, {
      title: title || "Untitled bill",
      amount: Number(amount || 0),
      due_date: dueDate,
      repeat_type: repeatType,
      reminder_days: Number(reminderDays || 0),
      status,
      note,
    });

    if (user && navigator.onLine) {
      await syncPendingRecords(user);
    }
    onClose();
  }

  return (
    <Modal isOpen={Boolean(bill)} onClose={onClose} title="Edit bill">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSave}>
        <label className="grid gap-2 text-sm font-bold">
          Title
          <input
            className="budget-input"
            onChange={(event) => setTitle(event.target.value)}
            required
            value={title}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Amount
          <input
            className="budget-input"
            min="0"
            onChange={(event) => setAmount(event.target.value)}
            required
            type="number"
            value={amount}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Due Date
          <input
            className="budget-input"
            onChange={(event) => setDueDate(event.target.value)}
            required
            type="date"
            value={dueDate}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Repeat
          <select
            className="budget-input"
            onChange={(event) => setRepeatType(event.target.value as RepeatType)}
            value={repeatType}
          >
            <option value="none">None</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Reminder Days
          <input
            className="budget-input"
            min="0"
            onChange={(event) => setReminderDays(event.target.value)}
            type="number"
            value={reminderDays}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Status
          <select
            className="budget-input"
            onChange={(event) => setStatus(event.target.value as DueDateStatus)}
            value={status}
          >
            <option value="upcoming">Upcoming</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">
          Note
          <textarea
            className="budget-input min-h-24 resize-none"
            onChange={(event) => setNote(event.target.value)}
            value={note}
          />
        </label>
        <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button type="submit">Save Bill</Button>
        </div>
      </form>
    </Modal>
  );
}

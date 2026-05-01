import { format, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { type FormEvent, useEffect, useState } from "react";
import { PageHeader } from "../components/dashboard/PageHeader";
import { AddDueDateDialog } from "../components/due-dates/AddDueDateDialog";
import { BillStatusBadge } from "../components/due-dates/BillStatusBadge";
import { BudgetCatMascot } from "../components/mascot/BudgetCatMascot";
import { ReminderList } from "../components/reminders/ReminderCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import { getDueDateStatus } from "../lib/calculations";
import { getDueDateIcon } from "../lib/iconMap";
import { db, softDeleteLocalDueDate, updateLocalDueDate } from "../lib/localDb";
import { getMascotMood } from "../lib/mascotMood";
import { getDueDateReminders } from "../lib/reminders";
import { requestBackgroundSync } from "../lib/requestBackgroundSync";
import { formatCurrency } from "../lib/utils";
import type { DueDateStatus, LocalDueDate, RepeatType } from "../types/finance";

export function DueDates() {
  const { user } = useAuth();
  const showToast = useToast();
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
  const criticalBillReminders = reminders.filter(
    (reminder) => reminder.status === "due_today" || reminder.status === "overdue",
  );
  const mascotMood = getMascotMood({
    dueDates,
    goals: [],
    monthlyExpenses: 0,
    monthlyIncome: 0,
    pendingSyncCount: 0,
    remainingMoney: 0,
    savings: 0,
    transactions: [],
  });
  const mobileMascotVariant = mascotMood.variant === "both" ? "bill" : mascotMood.variant;

  async function updateBillStatus(bill: LocalDueDate, status: DueDateStatus) {
    await updateLocalDueDate(bill.id, { status });
    if (status === "paid") {
      showToast({
        title: "Bill marked paid \u{2705}",
        message: "Nice - that bill is cleared.",
        tone: "success",
      });
    }
    requestBackgroundSync(user, "due_date_status_updated");
  }

  async function deleteBill(bill: LocalDueDate) {
    const confirmed = window.confirm(`Delete ${bill.title}?`);
    if (!confirmed) return;
    await softDeleteLocalDueDate(bill.id);
    requestBackgroundSync(user, "due_date_deleted");
  }

  return (
    <>
      <div className="md:hidden space-y-4">
        <section className="flex items-start gap-3">
          <BudgetCatMascot
            className="shrink-0"
            imageClassName="w-16 object-contain object-center"
            variant={mobileMascotVariant}
          />
          <div className="min-w-0 pt-1">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-budget-primary">
              BudgetCat
            </p>
            <h1 className="mt-1 text-2xl font-black text-budget-text">Due Dates</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-budget-text/65">
              {mascotMood.message}
            </p>
          </div>
        </section>

        <div>
          <AddDueDateDialog />
        </div>

        {criticalBillReminders.length > 0 && (
          <section className="grid gap-3">
            {criticalBillReminders.slice(0, 2).map((reminder) => {
              const bill = dueDates.find((item) => item.id === reminder.sourceId);
              if (!bill) return null;

              return (
                <div className="flex items-start gap-3" key={reminder.id}>
                  <BudgetCatMascot
                    className="budget-alert-nudge shrink-0"
                    imageClassName="w-14 object-contain object-center"
                    variant="bill"
                  />
                  <Card className="budget-alert-nudge min-w-0 flex-1 border-budget-urgent/40 bg-budget-urgent/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-budget-urgent">
                      Critical reminder
                    </p>
                    <h2 className="mt-1 text-base font-black text-budget-text">{bill.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-budget-text/65">
                      {reminder.status.replace("_", " ")} - {format(parseISO(bill.due_date), "MMM d, yyyy")}
                    </p>
                    <p className="mt-2 font-display text-xl font-black text-budget-urgent">
                      {formatCurrency(bill.amount)}
                    </p>
                    <Button
                      className="mt-3 w-full"
                      onClick={() => updateBillStatus(bill, "paid")}
                      variant="urgent"
                    >
                      Pay Now
                    </Button>
                  </Card>
                </div>
              );
            })}
          </section>
        )}

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black">Bill reminders</h2>
              <p className="text-sm font-semibold text-budget-text/55">
                Bonnie and Clyde will nudge the urgent ones.
              </p>
            </div>
          </div>
          <ReminderList emptyText="No bills are due soon." limit={4} reminders={reminders} />
        </Card>

        <section className="grid gap-3">
          {dueDates.map((bill) => {
            const dueStatus = getDueDateStatus(bill);

            return (
              <Card className="p-4" key={bill.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-start gap-2 font-black">
                      <span aria-hidden="true" className="mt-0.5 shrink-0 text-xl">
                        {getDueDateIcon(bill)}
                      </span>
                      <span className="truncate">{bill.title}</span>
                    </p>
                    <p className="mt-1 text-xs font-semibold text-budget-text/55">
                      {format(parseISO(bill.due_date), "MMM d, yyyy")} - repeats {bill.repeat_type}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <BillStatusBadge status={bill.status} />
                    <BillStatusBadge status={dueStatus} />
                    <p className="text-sm font-black text-budget-urgent">{formatCurrency(bill.amount)}</p>
                  </div>
                </div>

                {bill.note && (
                  <p className="mt-3 text-sm font-semibold leading-6 text-budget-text/65">
                    {bill.note}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
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
                  <Button
                    className="text-budget-urgent"
                    onClick={() => deleteBill(bill)}
                    variant="ghost"
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}

          {dueDates.length === 0 && (
            <Card className="p-5 text-sm font-semibold text-budget-text/55">
              No bills have been added yet.
            </Card>
          )}
        </section>
      </div>

      <div className="hidden md:block">
        <PageHeader
          action={<AddDueDateDialog />}
          subtitle="Upcoming bills and in-app due date reminders."
          title="Due Dates"
        />
        <section className="mb-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-budget-primary">
                  {mascotMood.iconLabel}
                </p>
                <h2 className="mt-2 text-xl font-black">{mascotMood.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-budget-text/65">
                  {mascotMood.message}
                </p>
              </div>
              <BudgetCatMascot
                className="mx-auto shrink-0 sm:mx-0"
                imageClassName="w-40 object-contain object-center sm:w-48"
                variant={mascotMood.variant === "both" ? "bill" : mascotMood.variant}
              />
            </div>
          </Card>
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">Bill reminders</h2>
                <p className="text-sm font-semibold text-budget-text/55">
                  Bonnie and Clyde will nudge the urgent ones.
                </p>
              </div>
            </div>
            <ReminderList
              emptyText="No bills are due soon."
              limit={4}
              reminders={reminders}
            />
          </Card>
        </section>
        <section className="grid gap-4">
          {dueDates.map((bill) => (
            <Card className="p-5" key={bill.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="flex items-center gap-2 text-xl font-black">
                      <span aria-hidden="true" className="text-2xl">
                        {getDueDateIcon(bill)}
                      </span>
                      {bill.title}
                    </h2>
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
                    <Button
                      className="text-budget-urgent"
                      onClick={() => deleteBill(bill)}
                      variant="ghost"
                    >
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
      </div>
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

    onClose();
    requestBackgroundSync(user, "due_date_updated");
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

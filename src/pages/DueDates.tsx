import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
} from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Loader2,
  Pencil,
  ReceiptText,
  Trash2,
} from "../lib/icons";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { AddDueDateDialog } from "../components/due-dates/AddDueDateDialog";
import { AnimatedIcon } from "../components/ui/AnimatedIcon";
import { AnimatedStatusIcon } from "../components/ui/AnimatedStatusIcon";
import { Modal } from "../components/ui/Modal";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import { getDueDateStatus } from "../lib/calculations";
import { getDueDateIcon } from "../lib/iconMap";
import {
  addLocalTransaction,
  db,
  softDeleteLocalTransaction,
  softDeleteLocalDueDate,
  updateLocalDueDate,
} from "../lib/localDb";
import { getDueDateReminders } from "../lib/reminders";
import { requestBackgroundSync } from "../lib/requestBackgroundSync";
import { cn, formatCurrency } from "../lib/utils";
import type {
  BudgetCatUser,
  DueDateStatus,
  LocalDueDate,
  RepeatType,
} from "../types/finance";

type BillTab = "upcoming" | "paid" | "overdue";

const tabLabels: Record<BillTab, string> = {
  upcoming: "Upcoming",
  paid: "Paid",
  overdue: "Overdue",
};

const tabIcons: Record<BillTab, typeof Clock3> = {
  upcoming: Clock3,
  paid: CheckCircle2,
  overdue: AlertTriangle,
};

const tabActiveStyles: Record<BillTab, string> = {
  upcoming: "bg-[var(--bc-amber-glow)] text-[var(--bc-amber)]",
  paid: "bg-[var(--bc-green-glow)] text-[var(--bc-green)]",
  overdue: "bg-[var(--bc-red-glow)] text-[var(--bc-red)]",
};

const statusStyles: Record<
  BillTab,
  {
    badge: string;
    icon: string;
    amount: string;
  }
> = {
  upcoming: {
    badge:
      "border-[var(--bc-amber)]/20 bg-[var(--bc-amber-glow)] text-[var(--bc-amber)]",
    icon: "bc-icon-circle-amber",
    amount: "text-[var(--bc-red)]",
  },
  paid: {
    badge:
      "border-[var(--bc-green)]/20 bg-[var(--bc-green-glow)] text-[var(--bc-green)]",
    icon: "bc-icon-circle-green",
    amount: "text-[var(--bc-green)]",
  },
  overdue: {
    badge:
      "border-[var(--bc-red)]/20 bg-[var(--bc-red-glow)] text-[var(--bc-red)]",
    icon: "bc-icon-circle-red",
    amount: "text-[var(--bc-red)]",
  },
};

function safeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function safeDate(dateString?: string | null) {
  if (!dateString) return null;

  const parsedDate = parseISO(dateString);

  if (!isValid(parsedDate)) return null;

  return parsedDate;
}

function formatBillDate(dateString?: string | null, dateFormat = "MMM d, yyyy") {
  const parsedDate = safeDate(dateString);

  if (!parsedDate) return "No date";

  return format(parsedDate, dateFormat);
}

function getBillStatusBucket(bill: LocalDueDate): BillTab {
  if (bill.status === "paid") return "paid";

  const dueDate = safeDate(bill.due_date);

  if (!dueDate) return bill.status === "overdue" ? "overdue" : "upcoming";

  const daysLeft = differenceInCalendarDays(dueDate, new Date());

  if (daysLeft < 0 || bill.status === "overdue") return "overdue";

  return "upcoming";
}

function getBillDaysLeftLabel(bill: LocalDueDate) {
  if (bill.status === "paid") return "Paid";

  const dueDate = safeDate(bill.due_date);

  if (!dueDate) return "No due date";

  const daysLeft = differenceInCalendarDays(dueDate, new Date());

  if (daysLeft < 0) {
    const absoluteDays = Math.abs(daysLeft);
    return `${absoluteDays} day${absoluteDays === 1 ? "" : "s"} overdue`;
  }

  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "1 day left";

  return `${daysLeft} days left`;
}

function getRepeatLabel(repeatType: RepeatType) {
  if (repeatType === "none") return "One-time";
  return `Repeats ${repeatType}`;
}

function getBillSearchText(bill: LocalDueDate) {
  return [bill.title, bill.note, bill.repeat_type, bill.status]
    .map((value) => safeText(value))
    .join(" ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function getFallbackBillIcon(bill: LocalDueDate) {
  const text = getBillSearchText(bill);

  if (text.includes("electric") || text.includes("power")) return "⚡";
  if (text.includes("water")) return "💧";
  if (
    text.includes("internet") ||
    text.includes("wifi") ||
    text.includes("fiber") ||
    text.includes("pldt") ||
    text.includes("globe") ||
    text.includes("converge")
  ) {
    return "🌐";
  }
  if (text.includes("phone") || text.includes("mobile")) return "📱";
  if (text.includes("gas") || text.includes("lpg")) return "🔥";
  if (
    text.includes("mortgage") ||
    text.includes("rent") ||
    text.includes("house") ||
    text.includes("home")
  ) {
    return "🏠";
  }
  if (
    text.includes("motorcycle") ||
    text.includes("motorbike") ||
    text.includes("scooter")
  ) {
    return "🏍️";
  }
  if (text.includes("car") || text.includes("vehicle")) return "🚗";
  if (text.includes("loan") || text.includes("debt")) return "💳";
  if (text.includes("insurance")) return "🛡️";
  if (text.includes("tax")) return "🏛️";
  if (text.includes("subscription") || text.includes("netflix")) return "🔁";
  if (text.includes("school") || text.includes("tuition")) return "📚";
  if (text.includes("medical") || text.includes("health")) return "🏥";

  return "🧾";
}

function getBillIcon(bill: LocalDueDate) {
  return getDueDateIcon(bill) || getFallbackBillIcon(bill);
}

function getBillCategoryLabel(bill: LocalDueDate) {
  const text = getBillSearchText(bill);

  if (
    text.includes("mortgage") ||
    text.includes("rent") ||
    text.includes("house") ||
    text.includes("home")
  ) {
    return "Housing";
  }

  if (
    text.includes("electric") ||
    text.includes("water") ||
    text.includes("internet") ||
    text.includes("wifi") ||
    text.includes("phone") ||
    text.includes("utility")
  ) {
    return "Utilities";
  }

  if (
    text.includes("motorcycle") ||
    text.includes("car") ||
    text.includes("vehicle") ||
    text.includes("fuel")
  ) {
    return "Transport";
  }

  if (
    text.includes("loan") ||
    text.includes("debt") ||
    text.includes("credit")
  ) {
    return "Debt";
  }

  if (text.includes("subscription") || text.includes("netflix")) {
    return "Subscription";
  }

  if (text.includes("insurance")) return "Insurance";
  if (text.includes("school") || text.includes("tuition")) return "Education";
  if (text.includes("medical") || text.includes("health")) return "Health";

  return "Bill";
}

function getBillPaymentMarker(billId: string) {
  return `[bill:${billId}]`;
}

function getBillPaymentNote(_billId: string, billTitle: string) {
  return billTitle;
}

function BillRow({
  bill,
  onEdit,
  onMarkPaid,
}: {
  bill: LocalDueDate;
  onEdit: (bill: LocalDueDate) => void;
  onMarkPaid: (bill: LocalDueDate) => void;
}) {
  const statusBucket = getBillStatusBucket(bill);
  const style = statusStyles[statusBucket];

  return (
    <article className="rounded-[22px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-4">
      <button
        className="flex w-full items-center gap-3 text-left"
        onClick={() => onEdit(bill)}
        type="button"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] text-2xl">
          {getBillIcon(bill)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-black text-[var(--bc-text)]">
              {bill.title}
            </h3>

            <span
              className={cn(
                "hidden rounded-full border px-2 py-1 text-[10px] font-black sm:inline-flex",
                style.badge,
              )}
            >
              {tabLabels[statusBucket]}
            </span>
          </div>

          <p className="mt-1 truncate text-[11px] font-semibold text-[var(--bc-text-muted)]">
            {formatBillDate(bill.due_date)} • {getRepeatLabel(bill.repeat_type)}
          </p>

          {bill.note ? (
            <p className="mt-1 line-clamp-1 text-[11px] font-medium text-[var(--bc-text-muted)]">
              {bill.note}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[11px] font-bold text-[var(--bc-text-muted)]">
            {getBillDaysLeftLabel(bill)}
          </p>
          <p className={cn("mt-1 text-sm font-black", style.amount)}>
            {formatCurrency(bill.amount)}
          </p>
        </div>

        <ChevronRight className="hidden h-4 w-4 shrink-0 text-[var(--bc-text-muted)] sm:block" />
      </button>

      <div className="mt-4 flex gap-2">
        <button
          className="bc-button bc-button-secondary min-h-10 flex-1 rounded-2xl py-2 text-xs"
          onClick={() => onEdit(bill)}
          type="button"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>

        <button
          className={cn(
            "bc-button min-h-10 flex-1 rounded-2xl py-2 text-xs",
            bill.status === "paid"
              ? "bc-button-secondary"
              : "bc-button-primary",
          )}
          onClick={() => onMarkPaid(bill)}
          type="button"
        >
          <AnimatedIcon variant="success">
            <CheckCircle2 className="h-4 w-4" />
          </AnimatedIcon>
          {bill.status === "paid" ? "Mark Unpaid" : "Mark Paid"}
        </button>
      </div>
    </article>
  );
}

export function DueDates() {
  const { user } = useAuth();
  const showToast = useToast();
  const householdId = user?.householdId ?? "";

  const [activeTab, setActiveTab] = useState<BillTab>("upcoming");
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
    (reminder) =>
      reminder.status === "due_today" || reminder.status === "overdue",
  );

  const billBuckets = useMemo(() => {
    const grouped = dueDates.reduce<Record<BillTab, LocalDueDate[]>>(
      (groups, bill) => {
        const statusBucket = getBillStatusBucket(bill);
        groups[statusBucket].push(bill);
        return groups;
      },
      {
        upcoming: [],
        paid: [],
        overdue: [],
      },
    );

    const upcomingBills = (grouped.upcoming ?? []) as LocalDueDate[];
    const overdueBills = (grouped.overdue ?? []) as LocalDueDate[];
    const paidBills = (grouped.paid ?? []) as LocalDueDate[];

    const byDueAsc = (a: LocalDueDate, b: LocalDueDate) => {
      const aTime = safeDate(a.due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = safeDate(b.due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    };

    const byPaidDesc = (a: LocalDueDate, b: LocalDueDate) => {
      const aTime = safeDate(a.updated_at)?.getTime() ?? 0;
      const bTime = safeDate(b.updated_at)?.getTime() ?? 0;
      return bTime - aTime;
    };

    return {
      upcoming: [...upcomingBills].sort(byDueAsc),
      overdue: [...overdueBills].sort(byDueAsc),
      paid: [...paidBills].sort(byPaidDesc),
    };
  }, [dueDates]);

  const visibleBills = billBuckets[activeTab];

  const totalUpcoming = billBuckets.upcoming.reduce(
    (sum, bill) => sum + bill.amount,
    0,
  );

  const totalOverdue = billBuckets.overdue.reduce(
    (sum, bill) => sum + bill.amount,
    0,
  );
  async function findLinkedBillPaymentTransactionId(bill: LocalDueDate) {
    if (bill.paid_transaction_id) {
      const linked = await db.transactions.get(bill.paid_transaction_id);
      if (linked && !linked.deleted_at) {
        return linked.id;
      }
    }

    const marker = getBillPaymentMarker(bill.id);
    const matched = await db.transactions
      .where("household_id")
      .equals(householdId)
      .filter(
        (transaction) =>
          !transaction.deleted_at &&
          transaction.type === "expense" &&
          (transaction.note ?? "").includes(marker),
      )
      .first();

    return matched?.id ?? null;
  }

  async function markBillPaidWithExpense(bill: LocalDueDate) {
    const existingTransactionId = await findLinkedBillPaymentTransactionId(bill);

    if (existingTransactionId) {
      if (bill.paid_transaction_id !== existingTransactionId || bill.status !== "paid") {
        await updateLocalDueDate(bill.id, {
          status: "paid",
          paid_transaction_id: existingTransactionId,
        });
      }

      showToast({
        title: "This bill was already recorded.",
        message: "Existing bill expense is already linked.",
        tone: "warning",
      });

      if (user) {
        requestBackgroundSync(user, "due_date_status_updated");
      }
      return;
    }

    if (!user) {
      showToast({
        title: "Could not mark bill paid.",
        message: "No signed-in user found for this action.",
        tone: "error",
      });
      return;
    }

    try {
      const createdExpense = await addLocalTransaction(
        {
          type: "expense",
          amount: Number(bill.amount || 0),
          category: "fees-charges",
          date: format(new Date(), "yyyy-MM-dd"),
          payment_method: "Cash",
          note: getBillPaymentNote(bill.id, bill.title || "Untitled bill"),
        },
        user.id,
        user.householdId,
      );

      await updateLocalDueDate(bill.id, {
        status: "paid",
        paid_transaction_id: createdExpense.id,
      });

      showToast({
        title: "Bill paid and expense recorded.",
        message: `Paid bill: ${bill.title || "Untitled bill"}`,
        tone: "success",
      });

      requestBackgroundSync(user, "due_date_status_updated");
    } catch {
      showToast({
        title: "Could not record bill payment.",
        message: "Bill was not marked paid. Please try again.",
        tone: "error",
      });
    }
  }

  async function toggleBillPaid(bill: LocalDueDate) {
    if (bill.status === "paid") {
      const linkedTransactionId = await findLinkedBillPaymentTransactionId(bill);

      if (linkedTransactionId) {
        await softDeleteLocalTransaction(linkedTransactionId);
      }

      await updateLocalDueDate(bill.id, {
        status: "upcoming",
        paid_transaction_id: undefined,
      });

      if (user) {
        if (linkedTransactionId) {
          requestBackgroundSync(user, "transaction_deleted");
        }
        requestBackgroundSync(user, "due_date_status_updated");
      }
      return;
    }

    await markBillPaidWithExpense(bill);
  }

  async function deleteBill(bill: LocalDueDate) {
    const confirmed = window.confirm(`Delete ${bill.title}?`);

    if (!confirmed) return;

    await softDeleteLocalDueDate(bill.id);

    if (user) {
      requestBackgroundSync(user, "due_date_deleted");
    }

    setEditingBill(null);
  }

  return (
    <>
      <div className="mx-auto flex h-[100dvh] min-h-0 w-full max-w-[430px] flex-col overflow-hidden px-5 pt-6 md:h-auto md:min-h-dvh md:max-w-none md:overflow-visible md:px-0 md:pt-0">
        <div className="shrink-0 space-y-4">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--bc-text-muted)]">
              Payments
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-[var(--bc-text)] md:text-3xl">
              Bills
            </h1>
            <p className="mt-1 text-sm font-semibold text-[var(--bc-text-muted)]">
              Stay on top of your payments
            </p>
          </div>

          <AddDueDateDialog
            className="bc-button bc-button-primary h-11 min-h-11 rounded-2xl px-4"
            compact
            label="Add Bill"
          />
        </header>

        <section className="bc-card-elevated mb-4 overflow-hidden p-4">
          <div className="flex items-start gap-3">
            <div className="bc-icon-circle-amber flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
              <ReceiptText className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[var(--bc-text)]">
                Bill watch
              </p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                Bonnie and Clyde will nudge the urgent ones before they become
                stressful.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[20px] border border-[var(--bc-amber)]/15 bg-[var(--bc-amber-glow)] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--bc-text-muted)]">
                Upcoming
              </p>
              <p className="mt-2 text-xl font-black tracking-[-0.04em] text-[var(--bc-amber)]">
                {formatCurrency(totalUpcoming)}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[var(--bc-text-muted)]">
                {billBuckets.upcoming.length} bill
                {billBuckets.upcoming.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="rounded-[20px] border border-[var(--bc-red)]/15 bg-[var(--bc-red-glow)] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--bc-text-muted)]">
                Overdue
              </p>
              <p className="mt-2 text-xl font-black tracking-[-0.04em] text-[var(--bc-red)]">
                {formatCurrency(totalOverdue)}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[var(--bc-text-muted)]">
                {billBuckets.overdue.length} needs attention
              </p>
            </div>
          </div>
        </section>

        {criticalBillReminders.length > 0 && (
          <section className="mb-4 space-y-2">
            {criticalBillReminders.slice(0, 2).map((reminder) => {
              const bill = dueDates.find((item) => item.id === reminder.sourceId);

              if (!bill) return null;

              return (
                <article
                  className="rounded-[22px] border border-[var(--bc-red)]/20 bg-[var(--bc-red-glow)] p-4"
                  key={reminder.id}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--bc-red)]/20 bg-[var(--bc-card)] text-xl">
                      {getBillIcon(bill)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--bc-red)]">
                        Critical reminder
                      </p>
                      <h2 className="mt-1 text-sm font-black text-[var(--bc-text)]">
                        {bill.title}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
                        {getDueDateStatus(bill)} •{" "}
                        {formatBillDate(bill.due_date)}
                      </p>
                    </div>

                    <p className="shrink-0 text-right text-sm font-black text-[var(--bc-red)]">
                      {formatCurrency(bill.amount)}
                    </p>
                  </div>

                  <button
                    className="bc-button bc-button-primary mt-4 w-full"
                    onClick={() => markBillPaidWithExpense(bill)}
                    type="button"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    Mark as Paid
                  </button>
                </article>
              );
            })}
          </section>
        )}

        <section className="bc-card mb-2 p-2">
          <div className="grid grid-cols-3 gap-1">
            {(["upcoming", "paid", "overdue"] as BillTab[]).map((tab) => (
              <button
                className={cn(
                  "flex min-h-10 items-center justify-center gap-1.5 rounded-2xl text-xs font-black transition",
                  activeTab === tab
                    ? tabActiveStyles[tab]
                    : "text-[var(--bc-text-muted)] hover:bg-[var(--bc-surface-soft)] hover:text-[var(--bc-text)]",
                )}
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {(() => {
                  const Icon = tabIcons[tab];
                  return (
                    <AnimatedIcon variant={tab === "overdue" ? "warning" : "tap"}>
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                    </AnimatedIcon>
                  );
                })()}
                {tabLabels[tab]}
                <span className="ml-1 text-[10px] opacity-70">
                  {billBuckets[tab].length}
                </span>
              </button>
            ))}
          </div>
        </section>
        </div>

        <section className="scrollbar-hidden mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:overflow-visible md:pb-0">
          {visibleBills.map((bill) => (
            <BillRow
              bill={bill}
              key={bill.id}
              onEdit={setEditingBill}
              onMarkPaid={toggleBillPaid}
            />
          ))}

          {visibleBills.length === 0 && (
            <div className="bc-card p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-amber-glow)] text-[var(--bc-amber)]">
                <CreditCard className="h-6 w-6" />
              </div>

              <h2 className="mt-4 text-lg font-black text-[var(--bc-text)]">
                No {tabLabels[activeTab].toLowerCase()} bills
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                Your {tabLabels[activeTab].toLowerCase()} list is clear for
                now.
              </p>

              {activeTab === "upcoming" && (
                <div className="mt-5 flex justify-center">
                  <AddDueDateDialog
                    className="bc-button bc-button-primary"
                    label="Add Bill"
                  />
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <EditDueDateModal
        bill={editingBill}
        onClose={() => setEditingBill(null)}
        onDelete={deleteBill}
        user={user}
      />
    </>
  );
}

function EditDueDateModal({
  bill,
  onClose,
  onDelete,
  user,
}: {
  bill: LocalDueDate | null;
  onClose: () => void;
  onDelete: (bill: LocalDueDate) => Promise<void>;
  user: BudgetCatUser | null;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [repeatType, setRepeatType] = useState<RepeatType>("monthly");
  const [reminderDays, setReminderDays] = useState("3");
  const [status, setStatus] = useState<DueDateStatus>("upcoming");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    if (!bill || isSaving) return;

    setIsSaving(true);

    try {
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

      if (user) {
        requestBackgroundSync(user, "due_date_updated");
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (!bill) return null;

  const statusBucket = getBillStatusBucket(bill);
  const style = statusStyles[statusBucket];

  return (
    <Modal isOpen={Boolean(bill)} onClose={onClose} title="Bill Details">
      <form className="space-y-5" onSubmit={handleSave}>
        <section className="rounded-[26px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/70 p-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] text-4xl">
            {getBillIcon(bill)}
          </div>

          <p className="mt-3 text-lg font-black text-[var(--bc-text)]">
            {bill.title}
          </p>
          <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
            {getRepeatLabel(bill.repeat_type)}
          </p>

          <p
            className={cn(
              "mt-3 text-3xl font-black tracking-[-0.06em]",
              style.amount,
            )}
          >
            {formatCurrency(bill.amount)}
          </p>

          <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
            Due on {formatBillDate(bill.due_date)} • {getBillDaysLeftLabel(bill)}
          </p>
        </section>

        <section className="grid gap-3 rounded-[22px] border border-[var(--bc-border)] bg-[var(--bc-card)] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black text-[var(--bc-text-muted)]">
              Status
            </span>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-black",
                style.badge,
              )}
            >
              {tabLabels[statusBucket]}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black text-[var(--bc-text-muted)]">
              Category
            </span>
            <span className="text-xs font-black text-[var(--bc-text-soft)]">
              {getBillCategoryLabel(bill)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black text-[var(--bc-text-muted)]">
              Reminder
            </span>
            <span className="text-xs font-black text-[var(--bc-text-soft)]">
              {bill.reminder_days} day{bill.reminder_days === 1 ? "" : "s"}{" "}
              before
            </span>
          </div>

          {bill.note ? (
            <div className="border-t border-[var(--bc-border)] pt-3">
              <p className="text-xs font-black text-[var(--bc-text-muted)]">
                Note
              </p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--bc-text-soft)]">
                {bill.note}
              </p>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Title
              </span>
              <input
                className="bc-input"
                onChange={(event) => setTitle(event.target.value)}
                required
                value={title}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Amount
              </span>
              <input
                className="bc-input"
                onChange={(event) => setAmount(event.target.value)}
                required
                type="number"
                value={amount}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Due Date
              </span>
              <input
                className="bc-input"
                onChange={(event) => setDueDate(event.target.value)}
                required
                type="date"
                value={dueDate}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Repeat
              </span>
              <select
                className="bc-input"
                onChange={(event) =>
                  setRepeatType(event.target.value as RepeatType)
                }
                value={repeatType}
              >
                <option value="none">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Reminder Days
              </span>
              <input
                className="bc-input"
                min="0"
                onChange={(event) => setReminderDays(event.target.value)}
                type="number"
                value={reminderDays}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Status
              </span>
              <select
                className="bc-input"
                onChange={(event) =>
                  setStatus(event.target.value as DueDateStatus)
                }
                value={status}
              >
                <option value="upcoming">Upcoming</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-black text-[var(--bc-text-soft)]">
              Note
            </span>
            <textarea
              className="bc-input min-h-24 resize-none"
              onChange={(event) => setNote(event.target.value)}
              value={note}
            />
          </label>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            className="bc-button bc-button-danger"
            disabled={isSaving}
            onClick={() => onDelete(bill)}
            type="button"
          >
            <Trash2 className="h-4.5 w-4.5" />
            Delete
          </button>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              className="bc-button bc-button-secondary"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>

            <button
              className="bc-button bc-button-primary"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? (
                <AnimatedStatusIcon
                  animation="spin"
                  className="text-current"
                  icon={Loader2}
                  label="Saving bill"
                />
              ) : (
                <Clock3 className="h-4.5 w-4.5" />
              )}
              {isSaving ? "Saving..." : "Save Bill"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

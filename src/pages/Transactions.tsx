import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth, subMonths } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, Search, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/dashboard/PageHeader";
import { AddTransactionDialog } from "../components/transactions/AddTransactionDialog";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { useAuth } from "../contexts/AuthContext";
import { db, softDeleteLocalTransaction, updateLocalTransaction } from "../lib/localDb";
import { syncPendingRecords } from "../lib/syncEngine";
import { formatCurrency } from "../lib/utils";
import type { LocalTransaction, TransactionType } from "../types/finance";

const typeLabels: Record<TransactionType, string> = {
  expense: "Expense",
  income: "Income",
  salary: "Salary",
  savings: "Savings",
  goal_contribution: "Goal Contribution",
};

export function Transactions() {
  const { user } = useAuth();
  const householdId = user?.householdId ?? "";
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [monthFilter, setMonthFilter] = useState<"this_month" | "last_month" | "all_time">(
    "this_month",
  );
  const [editingTransaction, setEditingTransaction] = useState<LocalTransaction | null>(null);
  const transactions =
    useLiveQuery(
      () =>
        db.transactions
          .where("household_id")
          .equals(householdId)
          .filter((transaction) => !transaction.deleted_at)
          .toArray(),
      [householdId],
      [],
    ) ?? [];

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const monthInterval =
      monthFilter === "this_month"
        ? { start: startOfMonth(now), end: endOfMonth(now) }
        : monthFilter === "last_month"
          ? { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }
          : null;

    return transactions
      .filter((transaction) => typeFilter === "all" || transaction.type === typeFilter)
      .filter((transaction) => {
        if (!monthInterval) return true;
        return isWithinInterval(parseISO(transaction.date), monthInterval);
      })
      .filter((transaction) => {
        const haystack = [
          transaction.category,
          transaction.payment_method,
          transaction.note,
          transaction.type,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthFilter, search, transactions, typeFilter]);

  return (
    <>
      <PageHeader
        action={<AddTransactionDialog />}
        subtitle="Manual entries are saved locally first and synced when available."
        title="Transactions"
      />
      <Card className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <label className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-budget-text/40"
              size={18}
            />
            <input
              className="budget-input pl-11"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search transactions"
              value={search}
            />
          </label>
          <select
            className="budget-input"
            onChange={(event) => setTypeFilter(event.target.value as "all" | TransactionType)}
            value={typeFilter}
          >
            <option value="all">All types</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="budget-input"
            onChange={(event) =>
              setMonthFilter(event.target.value as "this_month" | "last_month" | "all_time")
            }
            value={monthFilter}
          >
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="all_time">All time</option>
          </select>
        </div>
      </Card>
      <Card className="p-0">
        <div className="hidden grid-cols-[1fr_160px_140px_140px] border-b border-budget-border px-5 py-4 text-xs font-black uppercase text-budget-text/45 md:grid">
          <span>Transaction</span>
          <span>Category</span>
          <span>Date</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="divide-y divide-budget-border">
          {filteredTransactions.map((transaction) => {
            const isPositive = transaction.type === "income" || transaction.type === "salary";
            return (
              <div
                className="grid cursor-pointer gap-3 px-5 py-4 transition hover:bg-budget-background md:grid-cols-[1fr_160px_140px_140px] md:items-center"
                key={transaction.id}
                onClick={() => setEditingTransaction(transaction)}
              >
                <div>
                  <p className="flex items-center gap-2 font-black">
                    {typeLabels[transaction.type]}
                    <Pencil className="text-budget-text/35" size={14} />
                  </p>
                  <p className="text-sm font-semibold text-budget-text/55">
                    {transaction.payment_method || "Payment method not set"}
                  </p>
                </div>
                <Badge tone={isPositive ? "success" : "neutral"}>
                  {transaction.category}
                </Badge>
                <p className="text-sm font-bold text-budget-text/60">
                  {format(parseISO(transaction.date), "MMM d, yyyy")}
                </p>
                <p
                  className={
                    isPositive
                      ? "font-black text-budget-success md:text-right"
                      : "font-black text-budget-text md:text-right"
                  }
                >
                  {isPositive ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </p>
              </div>
            );
          })}
          {filteredTransactions.length === 0 && (
            <p className="px-5 py-8 text-sm font-semibold text-budget-text/55">
              No transactions match this view.
            </p>
          )}
        </div>
      </Card>
      <EditTransactionModal
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
        user={user}
      />
    </>
  );
}

function EditTransactionModal({
  onClose,
  transaction,
  user,
}: {
  onClose: () => void;
  transaction: LocalTransaction | null;
  user: ReturnType<typeof useAuth>["user"];
}) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!transaction) return;
    setType(transaction.type);
    setAmount(String(transaction.amount));
    setCategory(transaction.category);
    setDate(transaction.date);
    setPaymentMethod(transaction.payment_method);
    setNote(transaction.note ?? "");
  }, [transaction]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!transaction) return;

    await updateLocalTransaction(transaction.id, {
      type,
      amount: Number(amount || 0),
      category: category || "Uncategorized",
      date,
      payment_method: paymentMethod || "Cash",
      note,
    });

    if (user && navigator.onLine) {
      await syncPendingRecords(user);
    }

    onClose();
  }

  async function handleDelete() {
    if (!transaction) return;
    const confirmed = window.confirm("Delete this transaction from BudgetCat?");
    if (!confirmed) return;

    await softDeleteLocalTransaction(transaction.id);
    if (user && navigator.onLine) {
      await syncPendingRecords(user);
    }
    onClose();
  }

  return (
    <Modal isOpen={Boolean(transaction)} onClose={onClose} title="Edit transaction">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSave}>
        <label className="grid gap-2 text-sm font-bold">
          Type
          <select
            className="budget-input"
            onChange={(event) => setType(event.target.value as TransactionType)}
            value={type}
          >
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
          Category
          <input
            className="budget-input"
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Date
          <input
            className="budget-input"
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Payment Method
          <input
            className="budget-input"
            onChange={(event) => setPaymentMethod(event.target.value)}
            value={paymentMethod}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">
          Notes
          <textarea
            className="budget-input min-h-24 resize-none"
            onChange={(event) => setNote(event.target.value)}
            value={note}
          />
        </label>
        <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-between">
          <Button onClick={handleDelete} type="button" variant="urgent">
            <Trash2 size={18} />
            Delete
          </Button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button onClick={onClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

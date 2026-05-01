import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth, subMonths } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/dashboard/PageHeader";
import { AnimatedStatusIcon } from "../components/ui/AnimatedStatusIcon";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import {
  getCategoriesByType,
  getCategoryLabel,
  normalizeCategory,
} from "../lib/categoryConfig";
import { getTransactionIcon } from "../lib/iconMap";
import { db, softDeleteLocalTransaction, updateLocalTransaction } from "../lib/localDb";
import {
  PAYMENT_METHOD_OPTIONS,
  getPaymentMethodLabel,
  normalizePaymentMethod,
} from "../lib/paymentMethods";
import { requestBackgroundSync } from "../lib/requestBackgroundSync";
import { getTransactionErrorToast, getTransactionToast } from "../lib/transactionToast";
import { formatCurrency } from "../lib/utils";
import type { LocalTransaction, TransactionType } from "../types/finance";

const typeLabels: Record<TransactionType, string> = {
  expense: "Expense",
  income: "Income",
  salary: "Salary",
  savings: "Savings",
  goal_contribution: "Goal Contribution",
};

function getCategoryTypeForTransaction(type: TransactionType) {
  if (type === "salary") return "income";
  if (type === "income") return "income";
  if (type === "savings") return "savings";
  if (type === "goal_contribution") return "savings";

  return "expense";
}

function getMonthInterval(monthFilter: "this_month" | "last_month" | "all_time", referenceDate = new Date()) {
  if (monthFilter === "this_month") {
    return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
  }

  if (monthFilter === "last_month") {
    const lastMonth = subMonths(referenceDate, 1);
    return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
  }

  return null;
}

export function Transactions() {
  const { user } = useAuth();
  const householdId = user?.householdId ?? "";
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [monthFilter, setMonthFilter] = useState<"this_month" | "last_month" | "all_time">(
    "this_month",
  );
  const [mobileMonthFallbackApplied, setMobileMonthFallbackApplied] = useState(false);
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
    const monthInterval = getMonthInterval(monthFilter, now);

    return transactions
      .filter((transaction) => typeFilter === "all" || transaction.type === typeFilter)
      .filter((transaction) => {
        if (!monthInterval) return true;
        return isWithinInterval(parseISO(transaction.date), monthInterval);
      })
      .filter((transaction) => {
        const haystack = [
          transaction.category,
          getCategoryLabel(transaction.category),
          getPaymentMethodLabel(transaction.payment_method),
          transaction.note,
          transaction.type,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(search.toLowerCase());
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthFilter, search, transactions, typeFilter]);

  useEffect(() => {
    if (mobileMonthFallbackApplied) return;
    if (window.innerWidth >= 768) return;
    if (monthFilter !== "this_month") return;
    if (transactions.length === 0) return;

    const currentMonthInterval = getMonthInterval("this_month");
    const lastMonthInterval = getMonthInterval("last_month");
    const hasCurrentMonthTransactions = transactions.some((transaction) =>
      currentMonthInterval ? isWithinInterval(parseISO(transaction.date), currentMonthInterval) : false,
    );

    if (hasCurrentMonthTransactions) return;

    const hasLastMonthTransactions = transactions.some((transaction) =>
      lastMonthInterval ? isWithinInterval(parseISO(transaction.date), lastMonthInterval) : false,
    );

    setMonthFilter(hasLastMonthTransactions ? "last_month" : "all_time");
    setMobileMonthFallbackApplied(true);
  }, [mobileMonthFallbackApplied, monthFilter, transactions]);

  return (
    <>
      <PageHeader
        subtitle="Manual entries are saved locally first and synced when available."
        title="Transactions"
      />

      <div className="md:hidden">
        <Card className="mb-4 p-4">
          <div className="grid gap-3">
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

            <div className="grid grid-cols-2 gap-3">
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
          </div>
        </Card>

        <div className="grid gap-3">
          {filteredTransactions.map((transaction) => {
            const isPositive = transaction.type === "income" || transaction.type === "salary";

            return (
              <Card
                className="cursor-pointer p-4 transition hover:bg-budget-background"
                key={transaction.id}
                onClick={() => setEditingTransaction(transaction)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-budget-background text-lg">
                        {getTransactionIcon(transaction)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-black">
                          {getCategoryLabel(transaction.category)}
                        </p>
                        <p className="text-xs font-semibold text-budget-text/55">
                          {typeLabels[transaction.type]} • {getPaymentMethodLabel(transaction.payment_method)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge tone={isPositive ? "success" : "urgent"}>
                        {transaction.type === "goal_contribution"
                          ? "Goal Contribution"
                          : transaction.type === "savings"
                            ? "Savings"
                            : transaction.type === "salary"
                              ? "Salary"
                              : transaction.type === "income"
                                ? "Income"
                                : "Expense"}
                      </Badge>
                      <span className="text-xs font-semibold text-budget-text/55">
                        {format(parseISO(transaction.date), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                    <p
                      className={
                        isPositive
                          ? "text-base font-black text-budget-success"
                          : "text-base font-black text-budget-urgent"
                      }
                    >
                      {isPositive ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <Pencil className="text-budget-text/35" size={14} />
                  </div>
                </div>
              </Card>
            );
          })}

          {filteredTransactions.length === 0 && (
            <Card className="p-5 text-sm font-semibold text-budget-text/55">
              No transactions match this view.
            </Card>
          )}
        </div>
      </div>

      <div className="hidden md:block">
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
                      <span aria-hidden="true" className="text-xl">
                        {getTransactionIcon(transaction)}
                      </span>
                      {typeLabels[transaction.type]}
                      <Pencil className="text-budget-text/35" size={14} />
                    </p>

                    <p className="text-sm font-semibold text-budget-text/55">
                      {getPaymentMethodLabel(transaction.payment_method)}
                    </p>
                  </div>

                  <Badge tone={isPositive ? "success" : "urgent"}>
                    {getCategoryLabel(transaction.category)}
                  </Badge>

                  <p className="text-sm font-bold text-budget-text/60">
                    {format(parseISO(transaction.date), "MMM d, yyyy")}
                  </p>

                  <p
                    className={
                      isPositive
                        ? "font-black text-budget-success md:text-right"
                        : "font-black text-budget-urgent md:text-right"
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
      </div>

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
  const [isSaving, setIsSaving] = useState(false);
  const showToast = useToast();

  const categoryType = getCategoryTypeForTransaction(type);

  const categoryOptions = useMemo(
    () => getCategoriesByType(categoryType),
    [categoryType],
  );

  useEffect(() => {
    if (!transaction) return;

    const normalizedCategory = normalizeCategory(transaction.category);

    setType(transaction.type);
    setAmount(String(transaction.amount));
    setCategory(normalizedCategory?.id || transaction.category || "");
    setDate(transaction.date);
    setPaymentMethod(normalizePaymentMethod(transaction.payment_method));
    setNote(transaction.note ?? "");
  }, [transaction]);

  useEffect(() => {
    if (!category) return;

    const normalizedCategory = normalizeCategory(category);
    const normalizedCategoryId = normalizedCategory?.id;

    const isStillValid = categoryOptions.some(
      (categoryOption) =>
        categoryOption.id === category || categoryOption.id === normalizedCategoryId,
    );

    if (isStillValid && normalizedCategoryId && category !== normalizedCategoryId) {
      setCategory(normalizedCategoryId);
      return;
    }

    if (!isStillValid) {
      setCategory("");
    }
  }, [category, categoryOptions]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!transaction || isSaving) return;

    setIsSaving(true);

    try {
      const normalizedCategory = normalizeCategory(category);
      const savedCategory = normalizedCategory?.id || category || "Uncategorized";

      const updatedTransaction = {
        ...transaction,
        type,
        amount: Number(amount || 0),
        category: savedCategory,
        date,
        payment_method: normalizePaymentMethod(paymentMethod),
        note,
      };

      await updateLocalTransaction(transaction.id, {
        type,
        amount: updatedTransaction.amount,
        category: updatedTransaction.category,
        date,
        payment_method: updatedTransaction.payment_method,
        note,
      });

      onClose();
      showToast(getTransactionToast(updatedTransaction));
      requestBackgroundSync(user, "transaction_updated");
    } catch {
      showToast(getTransactionErrorToast());
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!transaction) return;

    const confirmed = window.confirm("Delete this transaction from BudgetCat?");
    if (!confirmed) return;

    await softDeleteLocalTransaction(transaction.id);
    requestBackgroundSync(user, "transaction_deleted");
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
          <select
            className="budget-input"
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            <option value="">Select category</option>
            {categoryOptions.map((categoryOption) => (
              <option key={categoryOption.id} value={categoryOption.id}>
                {categoryOption.label}
              </option>
            ))}
          </select>
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
          <select
            className="budget-input"
            onChange={(event) => setPaymentMethod(event.target.value)}
            value={paymentMethod}
          >
            {!PAYMENT_METHOD_OPTIONS.some((method) => method.id === paymentMethod) && (
              <option value={paymentMethod}>{getPaymentMethodLabel(paymentMethod)}</option>
            )}
            {PAYMENT_METHOD_OPTIONS.map((method) => (
              <option key={method.id} value={method.id}>
                {method.label}
              </option>
            ))}
          </select>
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
          <Button disabled={isSaving} onClick={handleDelete} type="button" variant="urgent">
            <Trash2 size={18} />
            Delete
          </Button>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button disabled={isSaving} onClick={onClose} type="button" variant="secondary">
              Cancel
            </Button>

            <Button disabled={isSaving} type="submit">
              {isSaving && (
                <AnimatedStatusIcon
                  animation="spin"
                  className="text-current"
                  icon={Loader2}
                  label="Saving transaction"
                />
              )}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

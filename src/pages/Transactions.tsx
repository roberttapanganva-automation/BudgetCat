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

function safeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getCategoryTypeForTransaction(type: TransactionType) {
  if (type === "salary") return "income";
  if (type === "income") return "income";
  if (type === "savings") return "savings";
  if (type === "goal_contribution") return "savings";

  return "expense";
}

function getMonthInterval(
  monthFilter: "this_month" | "last_month" | "all_time",
  referenceDate = new Date(),
) {
  if (monthFilter === "this_month") {
    return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
  }

  if (monthFilter === "last_month") {
    const lastMonth = subMonths(referenceDate, 1);
    return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
  }

  return null;
}

function getTransactionDisplayIcon(transaction: LocalTransaction) {
  const normalizedCategory = normalizeCategory(transaction.category);
  const categoryId = normalizedCategory?.id ?? safeText(transaction.category);
  const categoryLabel = getCategoryLabel(transaction.category);

  const searchableText = [
    transaction.type,
    categoryId,
    categoryLabel,
    safeText(transaction.note),
    getPaymentMethodLabel(transaction.payment_method),
  ]
    .join(" ")
    .toLowerCase();

  // Income categories
  if (
    searchableText.includes("salary") ||
    searchableText.includes("payroll") ||
    searchableText.includes("wage")
  ) {
    return "💵";
  }

  if (
    searchableText.includes("freelance") ||
    searchableText.includes("client") ||
    searchableText.includes("project income")
  ) {
    return "💻";
  }

  if (
    searchableText.includes("business_income") ||
    searchableText.includes("business income") ||
    searchableText.includes("business")
  ) {
    return "🏢";
  }

  if (
    searchableText.includes("bonus") ||
    searchableText.includes("gift_income") ||
    searchableText.includes("gift income") ||
    searchableText.includes("gift")
  ) {
    return "🎁";
  }

  if (
    searchableText.includes("allowance") ||
    searchableText.includes("stipend")
  ) {
    return "💵";
  }

  if (
    searchableText.includes("refund") ||
    searchableText.includes("reimbursement")
  ) {
    return "↩️";
  }

  if (
    searchableText.includes("interest") ||
    searchableText.includes("bank interest")
  ) {
    return "🏦";
  }

  if (
    searchableText.includes("other_income") ||
    searchableText.includes("other income")
  ) {
    return "💰";
  }

  // Savings and goal categories
  if (
    searchableText.includes("emergency_fund") ||
    searchableText.includes("emergency fund") ||
    searchableText.includes("emergency")
  ) {
    return "🆘";
  }

  if (
    searchableText.includes("travel_goal") ||
    searchableText.includes("travel goal") ||
    searchableText.includes("travel") ||
    searchableText.includes("flight") ||
    searchableText.includes("trip") ||
    searchableText.includes("hotel")
  ) {
    return "✈️";
  }

  if (
    searchableText.includes("home_goal") ||
    searchableText.includes("home goal") ||
    searchableText.includes("rent") ||
    searchableText.includes("mortgage") ||
    searchableText.includes("household") ||
    searchableText.includes("house") ||
    searchableText.includes("home")
  ) {
    return "🏠";
  }

  if (
    searchableText.includes("gadget_goal") ||
    searchableText.includes("gadget goal") ||
    searchableText.includes("gadget") ||
    searchableText.includes("phone") ||
    searchableText.includes("laptop") ||
    searchableText.includes("computer")
  ) {
    return "📱";
  }

  if (
    searchableText.includes("education_goal") ||
    searchableText.includes("education goal") ||
    searchableText.includes("education") ||
    searchableText.includes("school") ||
    searchableText.includes("course") ||
    searchableText.includes("learning")
  ) {
    return "📚";
  }

  if (
    searchableText.includes("investment") ||
    searchableText.includes("invest") ||
    searchableText.includes("stock") ||
    searchableText.includes("fund")
  ) {
    return "📈";
  }

  if (
    searchableText.includes("general_savings") ||
    searchableText.includes("general savings") ||
    searchableText.includes("savings")
  ) {
    return "🌱";
  }

  if (
    searchableText.includes("other_goal") ||
    searchableText.includes("other goal") ||
    searchableText.includes("goal_contribution") ||
    searchableText.includes("goal contribution")
  ) {
    return "🎯";
  }

  // Expense categories
  if (
    searchableText.includes("food_groceries") ||
    searchableText.includes("food & groceries") ||
    searchableText.includes("grocery") ||
    searchableText.includes("groceries") ||
    searchableText.includes("market")
  ) {
    return "🛒";
  }

  if (
    searchableText.includes("dining_out") ||
    searchableText.includes("dining out") ||
    searchableText.includes("restaurant") ||
    searchableText.includes("meal")
  ) {
    return "🍽️";
  }

  if (
    searchableText.includes("coffee_snacks") ||
    searchableText.includes("coffee") ||
    searchableText.includes("snack")
  ) {
    return "☕";
  }

  if (
    searchableText.includes("transportation") ||
    searchableText.includes("transport") ||
    searchableText.includes("commute") ||
    searchableText.includes("car") ||
    searchableText.includes("vehicle")
  ) {
    return "🚗";
  }

  if (searchableText.includes("fuel") || searchableText.includes("gas")) {
    return "⛽";
  }

  if (
    searchableText.includes("shopping") ||
    searchableText.includes("shop") ||
    searchableText.includes("store")
  ) {
    return "🛍️";
  }

  if (
    searchableText.includes("health_medicine") ||
    searchableText.includes("health") ||
    searchableText.includes("medicine") ||
    searchableText.includes("medical") ||
    searchableText.includes("pharmacy")
  ) {
    return "💊";
  }

  if (
    searchableText.includes("entertainment") ||
    searchableText.includes("movie") ||
    searchableText.includes("music") ||
    searchableText.includes("game")
  ) {
    return "🎬";
  }

  if (
    searchableText.includes("fitness") ||
    searchableText.includes("gym") ||
    searchableText.includes("workout")
  ) {
    return "🏋️";
  }

  if (
    searchableText.includes("personal_care") ||
    searchableText.includes("personal care") ||
    searchableText.includes("salon") ||
    searchableText.includes("hygiene")
  ) {
    return "🧴";
  }

  if (
    searchableText.includes("pets") ||
    searchableText.includes("pet") ||
    searchableText.includes("cat") ||
    searchableText.includes("dog")
  ) {
    return "🐾";
  }

  if (
    searchableText.includes("fees_charges") ||
    searchableText.includes("fees & charges") ||
    searchableText.includes("fee") ||
    searchableText.includes("charge")
  ) {
    return "🏦";
  }

  if (
    searchableText.includes("debt_payment") ||
    searchableText.includes("debt payment") ||
    searchableText.includes("debt") ||
    searchableText.includes("loan") ||
    searchableText.includes("credit")
  ) {
    return "💳";
  }

  if (
    searchableText.includes("electric") ||
    searchableText.includes("electricity") ||
    searchableText.includes("power")
  ) {
    return "⚡";
  }

  if (searchableText.includes("water")) return "💧";

  if (
    searchableText.includes("internet") ||
    searchableText.includes("wifi") ||
    searchableText.includes("web")
  ) {
    return "🌐";
  }

  if (
    searchableText.includes("mobile") ||
    searchableText.includes("load")
  ) {
    return "📱";
  }

  if (
    searchableText.includes("other_expense") ||
    searchableText.includes("other expense")
  ) {
    return "🧾";
  }

  // Type fallback
  if (transaction.type === "salary") return "💵";
  if (transaction.type === "income") return "💰";
  if (transaction.type === "savings") return "🌱";
  if (transaction.type === "goal_contribution") return "🎯";

  return "🧾";
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
          safeText(transaction.category),
          getCategoryLabel(transaction.category),
          getPaymentMethodLabel(transaction.payment_method),
          safeText(transaction.note),
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
        subtitle="Your entries are saved instantly — synced automatically when you're online."
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
                      <span aria-hidden="true" className="shrink-0 text-xl leading-none">
                        {getTransactionDisplayIcon(transaction)}
                      </span>

                      <div className="min-w-0">
                        <p className="truncate font-black">
                          {getCategoryLabel(transaction.category)}
                        </p>
                        <p className="text-xs font-semibold text-budget-text/55">
                          {typeLabels[transaction.type]} •{" "}
                          {getPaymentMethodLabel(transaction.payment_method)}
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
                      <span aria-hidden="true" className="shrink-0 text-xl leading-none">
                        {getTransactionDisplayIcon(transaction)}
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
    setNote(safeText(transaction.note));
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
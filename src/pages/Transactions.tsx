import {
  endOfMonth,
  format,
  isValid,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Filter,
  Loader2,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  WalletCards,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { AddTransactionDialog } from "../components/transactions/AddTransactionDialog";
import { AnimatedStatusIcon } from "../components/ui/AnimatedStatusIcon";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import {
  getCategoriesByType,
  getCategoryLabel,
  normalizeCategory,
} from "../lib/categoryConfig";
import {
  db,
  softDeleteLocalTransaction,
  updateLocalTransaction,
} from "../lib/localDb";
import {
  PAYMENT_METHOD_OPTIONS,
  getPaymentMethodLabel,
  normalizePaymentMethod,
} from "../lib/paymentMethods";
import { requestBackgroundSync } from "../lib/requestBackgroundSync";
import {
  getTransactionErrorToast,
  getTransactionToast,
} from "../lib/transactionToast";
import { cn, formatCurrency } from "../lib/utils";
import type {
  BudgetCatUser,
  LocalTransaction,
  TransactionType,
} from "../types/finance";

type TransactionFilter = "all" | TransactionType;
type MonthFilter = "this_month" | "last_month" | "all_time";

const typeLabels: Record<TransactionType, string> = {
  expense: "Expense",
  income: "Income",
  salary: "Salary",
  savings: "Savings",
  goal_contribution: "Goal Contribution",
};

const filterTypeLabels: Record<TransactionFilter, string> = {
  all: "All types",
  expense: "Expenses",
  income: "Income",
  salary: "Salary",
  savings: "Savings",
  goal_contribution: "Goal Contributions",
};

const monthLabels: Record<MonthFilter, string> = {
  this_month: "This month",
  last_month: "Last month",
  all_time: "All time",
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

function formatTransactionDate(
  dateString?: string | null,
  dateFormat = "MMM d, yyyy",
) {
  const parsedDate = safeDate(dateString);

  if (!parsedDate) return "No date";

  return format(parsedDate, dateFormat);
}

function getCategoryTypeForTransaction(type: TransactionType) {
  if (type === "salary") return "income";
  if (type === "income") return "income";
  if (type === "savings") return "savings";
  if (type === "goal_contribution") return "savings";

  return "expense";
}

function getMonthInterval(
  monthFilter: MonthFilter,
  referenceDate = new Date(),
) {
  if (monthFilter === "this_month") {
    return {
      start: startOfMonth(referenceDate),
      end: endOfMonth(referenceDate),
    };
  }

  if (monthFilter === "last_month") {
    const lastMonth = subMonths(referenceDate, 1);

    return {
      start: startOfMonth(lastMonth),
      end: endOfMonth(lastMonth),
    };
  }

  return null;
}

function getTransactionSearchText(transaction: LocalTransaction) {
  const normalizedCategory = normalizeCategory(transaction.category);

  return [
    transaction.type,
    transaction.category,
    normalizedCategory?.id,
    normalizedCategory?.label,
    transaction.note,
    getPaymentMethodLabel(transaction.payment_method),
  ]
    .map((value) => safeText(value))
    .join(" ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function getTransactionDisplayIcon(transaction: LocalTransaction) {
  const text = getTransactionSearchText(transaction);

  if (transaction.type === "salary" || text.includes("salary")) return "💵";

  if (transaction.type === "income") {
    if (text.includes("freelance") || text.includes("project")) return "💼";
    if (text.includes("business")) return "🏦";
    if (text.includes("bonus")) return "🎉";
    if (text.includes("gift")) return "🎁";
    if (text.includes("refund") || text.includes("reimbursement")) return "↩️";
    if (text.includes("interest") || text.includes("dividend")) return "📈";

    return "💰";
  }

  if (
    transaction.type === "savings" ||
    transaction.type === "goal_contribution"
  ) {
    if (text.includes("emergency")) return "🛡️";
    if (text.includes("travel") || text.includes("vacation")) return "✈️";
    if (text.includes("home") || text.includes("house")) return "🏠";
    if (text.includes("gadget") || text.includes("phone")) return "📱";
    if (text.includes("education") || text.includes("course")) return "📚";
    if (text.includes("investment") || text.includes("stock")) return "📈";

    return "🌱";
  }

  if (text.includes("grocery") || text.includes("groceries")) return "🛒";
  if (text.includes("food") || text.includes("meal")) return "🍽️";
  if (text.includes("dining") || text.includes("restaurant")) return "🍽️";
  if (text.includes("coffee") || text.includes("snack")) return "☕";
  if (text.includes("transport") || text.includes("commute")) return "🚌";
  if (text.includes("fuel") || text.includes("gasoline")) return "⛽";
  if (text.includes("shopping") || text.includes("store")) return "🛍️";
  if (text.includes("health") || text.includes("medical")) return "🏥";
  if (text.includes("education") || text.includes("school")) return "📚";
  if (text.includes("entertainment") || text.includes("movie")) return "🎬";
  if (text.includes("fitness") || text.includes("gym")) return "🏋️";
  if (text.includes("personal care") || text.includes("salon")) return "✨";
  if (text.includes("pet") || text.includes("cat") || text.includes("dog")) {
    return "🐾";
  }

  if (text.includes("fee") || text.includes("charge")) return "🧾";
  if (text.includes("debt") || text.includes("loan")) return "💳";
  if (text.includes("electric") || text.includes("power")) return "⚡";
  if (text.includes("water")) return "💧";
  if (text.includes("internet") || text.includes("wifi")) return "🌐";
  if (text.includes("phone") || text.includes("mobile")) return "📱";
  if (text.includes("rent") || text.includes("mortgage")) return "🏠";
  if (text.includes("subscription")) return "🔁";
  if (text.includes("travel") || text.includes("vacation")) return "✈️";

  return "🧾";
}

function isIncomeTransaction(transaction: LocalTransaction) {
  return transaction.type === "income" || transaction.type === "salary";
}

function isSavingsTransaction(transaction: LocalTransaction) {
  return (
    transaction.type === "savings" || transaction.type === "goal_contribution"
  );
}

function getAmountTone(transaction: LocalTransaction) {
  if (isIncomeTransaction(transaction)) {
    return {
      sign: "+",
      className: "text-[var(--bc-green)]",
      pillClassName:
        "border-[var(--bc-green)]/20 bg-[var(--bc-green-glow)] text-[var(--bc-green)]",
      icon: ArrowUpCircle,
    };
  }

  if (isSavingsTransaction(transaction)) {
    return {
      sign: "-",
      className: "text-[var(--bc-blue)]",
      pillClassName:
        "border-[var(--bc-blue)]/20 bg-[var(--bc-blue)]/10 text-[var(--bc-blue)]",
      icon: Sparkles,
    };
  }

  return {
    sign: "-",
    className: "text-[var(--bc-red)]",
    pillClassName:
      "border-[var(--bc-red)]/20 bg-[var(--bc-red-glow)] text-[var(--bc-red)]",
    icon: ArrowDownCircle,
  };
}

function getGroupedTransactions(transactions: LocalTransaction[]) {
  const groups = new Map<
    string,
    {
      key: string;
      title: string;
      subtitle: string;
      transactions: LocalTransaction[];
    }
  >();

  transactions.forEach((transaction) => {
    const parsedDate = safeDate(transaction.date);
    const key = parsedDate
      ? format(parsedDate, "yyyy-MM-dd")
      : transaction.date || "no-date";

    const title = parsedDate ? format(parsedDate, "EEEE") : "No date";
    const subtitle = parsedDate
      ? format(parsedDate, "MMM d, yyyy")
      : "No date saved";

    const existing = groups.get(key);

    if (existing) {
      existing.transactions.push(transaction);
      return;
    }

    groups.set(key, {
      key,
      title,
      subtitle,
      transactions: [transaction],
    });
  });

  return Array.from(groups.values());
}

function TransactionRow({
  transaction,
  onEdit,
}: {
  transaction: LocalTransaction;
  onEdit: (transaction: LocalTransaction) => void;
}) {
  const amountTone = getAmountTone(transaction);
  const ToneIcon = amountTone.icon;

  return (
    <button
      className="group flex w-full items-center gap-3 rounded-[20px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-3 text-left transition hover:border-[var(--bc-border-strong)] hover:bg-[var(--bc-card)]"
      onClick={() => onEdit(transaction)}
      type="button"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] text-xl shadow-sm">
        {getTransactionDisplayIcon(transaction)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-black text-[var(--bc-text)]">
            {getCategoryLabel(transaction.category)}
          </p>

          <span
            className={cn(
              "hidden shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black sm:inline-flex",
              amountTone.pillClassName,
            )}
          >
            <ToneIcon className="h-3 w-3" />
            {typeLabels[transaction.type]}
          </span>
        </div>

        <p className="mt-1 truncate text-[11px] font-semibold text-[var(--bc-text-muted)]">
          {getPaymentMethodLabel(transaction.payment_method)} •{" "}
          {formatTransactionDate(transaction.date, "MMM d, yyyy")}
        </p>

        {transaction.note ? (
          <p className="mt-1 line-clamp-1 text-[11px] font-medium text-[var(--bc-text-muted)]">
            {transaction.note}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 text-right">
        <p
          className={cn(
            "text-sm font-black tracking-[-0.02em]",
            amountTone.className,
          )}
        >
          {amountTone.sign}
          {formatCurrency(transaction.amount)}
        </p>

        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-[var(--bc-text-muted)] opacity-80 transition group-hover:text-[var(--bc-green)]">
          Edit
          <Pencil className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
}

export function Transactions() {
  const { user } = useAuth();
  const householdId = user?.householdId ?? "";

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionFilter>("all");
  const [monthFilter, setMonthFilter] = useState<MonthFilter>("this_month");
  const [mobileMonthFallbackApplied, setMobileMonthFallbackApplied] =
    useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<LocalTransaction | null>(null);

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
    const normalizedSearch = search
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    return transactions
      .filter(
        (transaction) =>
          typeFilter === "all" || transaction.type === typeFilter,
      )
      .filter((transaction) => {
        if (!monthInterval) return true;

        const parsedDate = safeDate(transaction.date);

        if (!parsedDate) return false;

        return isWithinInterval(parsedDate, monthInterval);
      })
      .filter((transaction) => {
        if (!normalizedSearch) return true;

        return getTransactionSearchText(transaction).includes(normalizedSearch);
      })
      .sort((a, b) => {
        const dateSort = b.date.localeCompare(a.date);

        if (dateSort !== 0) return dateSort;

        return b.updated_at.localeCompare(a.updated_at);
      });
  }, [monthFilter, search, transactions, typeFilter]);

  useEffect(() => {
    if (mobileMonthFallbackApplied) return;
    if (window.innerWidth >= 768) return;
    if (monthFilter !== "this_month") return;
    if (transactions.length === 0) return;

    const currentMonthInterval = getMonthInterval("this_month");
    const lastMonthInterval = getMonthInterval("last_month");

    const hasCurrentMonthTransactions = transactions.some((transaction) => {
      const parsedDate = safeDate(transaction.date);

      return currentMonthInterval && parsedDate
        ? isWithinInterval(parsedDate, currentMonthInterval)
        : false;
    });

    if (hasCurrentMonthTransactions) return;

    const hasLastMonthTransactions = transactions.some((transaction) => {
      const parsedDate = safeDate(transaction.date);

      return lastMonthInterval && parsedDate
        ? isWithinInterval(parsedDate, lastMonthInterval)
        : false;
    });

    setMonthFilter(hasLastMonthTransactions ? "last_month" : "all_time");
    setMobileMonthFallbackApplied(true);
  }, [mobileMonthFallbackApplied, monthFilter, transactions]);

  const groupedTransactions = useMemo(
    () => getGroupedTransactions(filteredTransactions),
    [filteredTransactions],
  );

  const totals = useMemo(() => {
    return filteredTransactions.reduce(
      (summary, transaction) => {
        if (isIncomeTransaction(transaction)) {
          summary.income += Number(transaction.amount || 0);
          return summary;
        }

        if (isSavingsTransaction(transaction)) {
          summary.savings += Number(transaction.amount || 0);
          return summary;
        }

        summary.expenses += Number(transaction.amount || 0);
        return summary;
      },
      {
        income: 0,
        expenses: 0,
        savings: 0,
      },
    );
  }, [filteredTransactions]);

  return (
    <>
      <div className="mx-auto min-h-screen w-full max-w-[430px] px-5 pb-28 pt-5 md:max-w-none md:px-0 md:pb-8 md:pt-0">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--bc-text-muted)]">
              Ledger
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-[var(--bc-text)] md:text-3xl">
              Transactions
            </h1>
            <p className="mt-1 text-sm font-semibold text-[var(--bc-text-muted)]">
              Your entries are saved instantly
            </p>
          </div>

          <AddTransactionDialog
            ariaLabel="Add transaction"
            className="bc-button bc-button-primary h-11 min-h-11 rounded-2xl px-4"
            compact
            label="Add"
          />
        </header>

        <section className="bc-card-elevated mb-4 overflow-hidden p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="bc-icon-circle-green mb-3 flex h-11 w-11 items-center justify-center rounded-full">
                <WalletCards className="h-5 w-5" />
              </div>

              <p className="text-sm font-black text-[var(--bc-text)]">
                Money movement
              </p>
              <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
                {filteredTransactions.length} transaction
                {filteredTransactions.length === 1 ? "" : "s"} in this view
              </p>
            </div>

            <span className="rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] px-3 py-1 text-xs font-black text-[var(--bc-green)]">
              {monthLabels[monthFilter]}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-[18px] border border-[var(--bc-green)]/15 bg-[var(--bc-green-glow)] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--bc-text-muted)]">
                Income
              </p>
              <p className="mt-2 truncate text-sm font-black text-[var(--bc-green)]">
                {formatCurrency(totals.income)}
              </p>
            </div>

            <div className="rounded-[18px] border border-[var(--bc-red)]/15 bg-[var(--bc-red-glow)] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--bc-text-muted)]">
                Expenses
              </p>
              <p className="mt-2 truncate text-sm font-black text-[var(--bc-red)]">
                {formatCurrency(totals.expenses)}
              </p>
            </div>

            <div className="rounded-[18px] border border-[var(--bc-blue)]/15 bg-[var(--bc-blue)]/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--bc-text-muted)]">
                Savings
              </p>
              <p className="mt-2 truncate text-sm font-black text-[var(--bc-blue)]">
                {formatCurrency(totals.savings)}
              </p>
            </div>
          </div>
        </section>

        <section className="bc-card mb-4 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bc-text-muted)]" />
            <input
              className="bc-input pl-10"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search transactions"
              value={search}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="relative">
              <span className="sr-only">Type filter</span>
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bc-text-muted)]" />
              <select
                className="bc-input appearance-none pl-10"
                onChange={(event) =>
                  setTypeFilter(event.target.value as TransactionFilter)
                }
                value={typeFilter}
              >
                {Object.entries(filterTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="relative">
              <span className="sr-only">Month filter</span>
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bc-text-muted)]" />
              <select
                className="bc-input appearance-none pl-10"
                onChange={(event) =>
                  setMonthFilter(event.target.value as MonthFilter)
                }
                value={monthFilter}
              >
                {Object.entries(monthLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="space-y-4">
          {groupedTransactions.map((group) => (
            <article key={group.key}>
              <div className="mb-2 flex items-end justify-between gap-3 px-1">
                <div>
                  <h2 className="text-sm font-black text-[var(--bc-text)]">
                    {group.title}
                  </h2>
                  <p className="text-[11px] font-semibold text-[var(--bc-text-muted)]">
                    {group.subtitle}
                  </p>
                </div>

                <span className="rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] px-2.5 py-1 text-[10px] font-black text-[var(--bc-text-muted)]">
                  {group.transactions.length}
                </span>
              </div>

              <div className="space-y-2">
                {group.transactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    onEdit={setEditingTransaction}
                    transaction={transaction}
                  />
                ))}
              </div>
            </article>
          ))}

          {filteredTransactions.length === 0 && (
            <div className="bc-card p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-green-glow)] text-[var(--bc-green)]">
                <Search className="h-6 w-6" />
              </div>

              <h2 className="mt-4 text-lg font-black text-[var(--bc-text)]">
                No transactions found
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                Try a different filter, search another keyword, or add your
                first transaction for this period.
              </p>

              <div className="mt-5 flex justify-center">
                <AddTransactionDialog
                  ariaLabel="Add transaction"
                  className="bc-button bc-button-primary"
                  label="Add Transaction"
                />
              </div>
            </div>
          )}
        </section>
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
  user: BudgetCatUser | null;
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
        categoryOption.id === category ||
        categoryOption.id === normalizedCategoryId,
    );

    if (isStillValid && normalizedCategoryId && category !== normalizedCategoryId) {
      setCategory(normalizedCategoryId);
      return;
    }

    if (!isStillValid) {
      setCategory("");
    }
  }, [category, categoryOptions]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    if (!transaction || !user || isSaving) return;

    setIsSaving(true);

    try {
      const normalizedCategory = normalizeCategory(category);
      const savedCategory =
        normalizedCategory?.id || category || "Uncategorized";

      const updatedTransaction: LocalTransaction = {
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

    if (user) {
      requestBackgroundSync(user, "transaction_deleted");
    }

    onClose();
  }

  if (!transaction) return null;

  const amountTone = getAmountTone(transaction);

  return (
    <Modal isOpen={Boolean(transaction)} onClose={onClose} title="Transaction Details">
      <form className="space-y-5" onSubmit={handleSave}>
        <div className="rounded-[24px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/70 p-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] text-3xl">
            {getTransactionDisplayIcon(transaction)}
          </div>

          <p className="mt-3 text-sm font-black text-[var(--bc-text-muted)]">
            {getCategoryLabel(transaction.category)}
          </p>

          <p
            className={cn(
              "mt-1 text-3xl font-black tracking-[-0.06em]",
              amountTone.className,
            )}
          >
            {amountTone.sign}
            {formatCurrency(transaction.amount)}
          </p>

          <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
            {formatTransactionDate(transaction.date)} •{" "}
            {getPaymentMethodLabel(transaction.payment_method)}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-black text-[var(--bc-text-soft)]">
              Type
            </span>
            <select
              className="bc-input"
              onChange={(event) =>
                setType(event.target.value as TransactionType)
              }
              value={type}
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
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

          <label className="space-y-2">
            <span className="text-xs font-black text-[var(--bc-text-soft)]">
              Category
            </span>
            <select
              className="bc-input"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              <option value="">Select category</option>

              {category &&
                !categoryOptions.some(
                  (categoryOption) => categoryOption.id === category,
                ) && (
                  <option value={category}>
                    {getCategoryLabel(category)}
                  </option>
                )}

              {categoryOptions.map((categoryOption) => (
                <option key={categoryOption.id} value={categoryOption.id}>
                  {categoryOption.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black text-[var(--bc-text-soft)]">
              Date
            </span>
            <input
              className="bc-input"
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="text-xs font-black text-[var(--bc-text-soft)]">
              Payment Method
            </span>
            <select
              className="bc-input"
              onChange={(event) => setPaymentMethod(event.target.value)}
              value={paymentMethod}
            >
              {!PAYMENT_METHOD_OPTIONS.some(
                (method) => method.id === paymentMethod,
              ) && (
                <option value={paymentMethod}>
                  {getPaymentMethodLabel(paymentMethod)}
                </option>
              )}

              {PAYMENT_METHOD_OPTIONS.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="text-xs font-black text-[var(--bc-text-soft)]">
              Note
            </span>
            <textarea
              className="bc-input min-h-24 resize-none"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional details for future you"
              value={note}
            />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            disabled={isSaving}
            onClick={handleDelete}
            type="button"
            variant="urgent"
          >
            <Trash2 size={18} />
            Delete
          </Button>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              disabled={isSaving}
              onClick={onClose}
              type="button"
              variant="secondary"
            >
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
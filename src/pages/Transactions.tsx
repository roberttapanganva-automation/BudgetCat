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
  Check,
  ChevronDown,
  DollarSign,
  Filter,
  ListFilter,
  Loader2,
  Pencil,
  PiggyBank,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "../lib/icons";
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
type MonthFilter = "all_time" | `month_${number}_${number}`;

type MonthFilterOption = {
  value: MonthFilter;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

type TransactionFilterOption = {
  value: TransactionFilter;
  label: string;
  icon: LucideIcon;
  className: string;
};

const typeLabels: Record<TransactionType, string> = {
  expense: "Expense",
  income: "Income",
  salary: "Salary",
  savings: "Savings",
  goal_contribution: "Goal Contribution",
};

const typeFilterOptions: TransactionFilterOption[] = [
  {
    value: "all",
    label: "All types",
    icon: ListFilter,
    className: "text-[var(--bc-text-soft)]",
  },
  {
    value: "expense",
    label: "Expenses",
    icon: TrendingDown,
    className: "text-[var(--bc-red)]",
  },
  {
    value: "income",
    label: "Income",
    icon: TrendingUp,
    className: "text-[var(--bc-green)]",
  },
  {
    value: "salary",
    label: "Salary",
    icon: DollarSign,
    className: "text-[var(--bc-green)]",
  },
  {
    value: "savings",
    label: "Savings",
    icon: PiggyBank,
    className: "text-[var(--bc-blue)]",
  },
  {
    value: "goal_contribution",
    label: "Goal Contributions",
    icon: Target,
    className: "text-[var(--bc-purple)]",
  },
];

const filterTypeLabels: Record<TransactionFilter, string> =
  typeFilterOptions.reduce(
    (labels, option) => {
      labels[option.value] = option.label;
      return labels;
    },
    {} as Record<TransactionFilter, string>,
  );

const MONTH_INDEXES = Array.from({ length: 12 }, (_, index) => index);

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

function getTransactionDisplayNote(transaction: LocalTransaction) {
  const note = safeText(transaction.note).trim();

  if (!note) return "";

  const autoBillMatch = /^Auto-created from bill payment - Paid bill:\s*(.+?)\s*\[bill:[^\]]+\]\s*$/i.exec(
    note,
  );

  if (autoBillMatch?.[1]) {
    return autoBillMatch[1].trim();
  }

  return note;
}

function getCategoryTypeForTransaction(type: TransactionType) {
  if (type === "salary") return "income";
  if (type === "income") return "income";
  if (type === "savings") return "savings";
  if (type === "goal_contribution") return "savings";

  return "expense";
}

function getMonthFilterValue(date = new Date()): MonthFilter {
  return `month_${date.getFullYear()}_${date.getMonth()}` as MonthFilter;
}

function parseMonthFilter(monthFilter: MonthFilter) {
  if (monthFilter === "all_time") return null;

  const match = /^month_(\d{4})_(\d{1,2})$/.exec(monthFilter);

  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return null;
  }

  return { year, monthIndex };
}

function getMonthFilterOptions(referenceDate = new Date()): MonthFilterOption[] {
  const year = referenceDate.getFullYear();

  return [
    ...MONTH_INDEXES.map((monthIndex) => {
      const monthDate = new Date(year, monthIndex, 1);

      return {
        value: `month_${year}_${monthIndex}` as MonthFilter,
        label: format(monthDate, "MMMM"),
        shortLabel: format(monthDate, "MMM"),
        icon: CalendarDays,
      };
    }),
    {
      value: "all_time" as MonthFilter,
      label: "All time",
      shortLabel: "All",
      icon: Sparkles,
    },
  ];
}

function getMonthFilterOptionFromValue(value: MonthFilter): MonthFilterOption {
  if (value === "all_time") {
    return {
      value,
      label: "All time",
      shortLabel: "All",
      icon: Sparkles,
    };
  }

  const parsed = parseMonthFilter(value);

  if (!parsed) {
    return getMonthFilterOptions()[new Date().getMonth()];
  }

  const monthDate = new Date(parsed.year, parsed.monthIndex, 1);

  return {
    value,
    label: format(monthDate, "MMMM"),
    shortLabel: format(monthDate, "MMM"),
    icon: CalendarDays,
  };
}

function getMonthFilterLabel(monthFilter: MonthFilter) {
  return getMonthFilterOptionFromValue(monthFilter).shortLabel;
}

function getMonthInterval(monthFilter: MonthFilter) {
  if (monthFilter === "all_time") {
    return null;
  }

  const parsed = parseMonthFilter(monthFilter);

  if (!parsed) return null;

  const selectedMonth = new Date(parsed.year, parsed.monthIndex, 1);

  return {
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth),
  };
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
    if (text.includes("business")) return "🏢";
    if (text.includes("bonus")) return "🎁";
    if (text.includes("gift")) return "🎁";
    if (text.includes("refund") || text.includes("reimbursement")) return "↩️";
    if (text.includes("interest") || text.includes("dividend")) return "🏦";

    return "💵";
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
    transaction.type === "savings" ||
    transaction.type === "goal_contribution"
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

function TypeFilterDropdown({
  value,
  onChange,
}: {
  value: TransactionFilter;
  onChange: (value: TransactionFilter) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption =
    typeFilterOptions.find((option) => option.value === value) ??
    typeFilterOptions[0];

  const SelectedIcon = selectedOption.icon;

  return (
    <div
      className="relative"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null;

        if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <span className="sr-only">Type filter</span>

      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="bc-input flex h-12 w-full items-center gap-2 !px-3 text-left"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <SelectedIcon
          className={cn("h-4 w-4 shrink-0", selectedOption.className)}
        />

        <span className="min-w-0 flex-1 truncate text-sm font-black text-[var(--bc-text)]">
          {selectedOption.label}
        </span>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--bc-text-muted)] transition-transform",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full overflow-hidden rounded-2xl border border-[var(--bc-border-strong)] bg-[var(--bc-bg-deep)] p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.42)]"
          role="listbox"
        >
          {typeFilterOptions.map((option) => {
            const isSelected = option.value === value;
            const OptionIcon = option.icon;

            return (
              <button
                aria-selected={isSelected}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-black transition",
                  isSelected
                    ? "bg-[var(--bc-green-glow)] text-[var(--bc-green)]"
                    : "text-[var(--bc-text-soft)] hover:bg-[var(--bc-surface-soft)] hover:text-[var(--bc-text)]",
                )}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                role="option"
                type="button"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--bc-border)] bg-[var(--bc-surface)]">
                  <OptionIcon className={cn("h-4 w-4", option.className)} />
                </span>

                <span className="min-w-0 flex-1 truncate">{option.label}</span>

                {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function MonthFilterDropdown({
  value,
  onChange,
}: {
  value: MonthFilter;
  onChange: (value: MonthFilter) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const options = useMemo(() => getMonthFilterOptions(), []);
  const selectedOption = getMonthFilterOptionFromValue(value);
  const SelectedIcon = selectedOption.icon;

  return (
    <div
      className="relative"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null;

        if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <span className="sr-only">Month filter</span>

      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="bc-input flex h-12 w-full items-center gap-2 !px-3 text-left"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <SelectedIcon className="h-4 w-4 shrink-0 text-[var(--bc-text-muted)]" />

        <span className="min-w-0 flex-1 truncate text-sm font-black text-[var(--bc-text)]">
          {selectedOption.shortLabel}
        </span>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--bc-text-muted)] transition-transform",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 max-h-72 w-full overflow-y-auto rounded-2xl border border-[var(--bc-border-strong)] bg-[var(--bc-bg-deep)] p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.42)]"
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            const OptionIcon = option.icon;

            return (
              <button
                aria-selected={isSelected}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-black transition",
                  isSelected
                    ? "bg-[var(--bc-green-glow)] text-[var(--bc-green)]"
                    : "text-[var(--bc-text-soft)] hover:bg-[var(--bc-surface-soft)] hover:text-[var(--bc-text)]",
                )}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                role="option"
                type="button"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--bc-border)] bg-[var(--bc-surface)]">
                  <OptionIcon className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1 truncate">{option.label}</span>

                {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
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
className="group flex w-full items-center gap-3.5 rounded-[22px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-3.5 text-left transition hover:border-[var(--bc-border-strong)] hover:bg-[var(--bc-card)]"      onClick={() => onEdit(transaction)}
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

        {getTransactionDisplayNote(transaction) ? (
          <p className="mt-1 line-clamp-1 text-[11px] font-medium text-[var(--bc-text-muted)]">
            {getTransactionDisplayNote(transaction)}
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

        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--bc-text-muted)] opacity-70 transition group-hover:opacity-100">
          <Pencil className="h-3 w-3" />
          Edit
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
  const [monthFilter, setMonthFilter] = useState<MonthFilter>(() =>
    getMonthFilterValue(),
  );
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
    const monthInterval = getMonthInterval(monthFilter);
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

    const currentMonthFilter = getMonthFilterValue();

    if (monthFilter !== currentMonthFilter) return;
    if (transactions.length === 0) return;

    const currentMonthInterval = getMonthInterval(currentMonthFilter);
    const lastMonthFilter = getMonthFilterValue(subMonths(new Date(), 1));
    const lastMonthInterval = getMonthInterval(lastMonthFilter);

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

    setMonthFilter(hasLastMonthTransactions ? lastMonthFilter : "all_time");
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
      { income: 0, expenses: 0, savings: 0 },
    );
  }, [filteredTransactions]);

  return (
    <>
      <section className="mx-auto flex h-[calc(100dvh-6rem)] min-h-0 w-full max-w-[430px] flex-col overflow-hidden px-5 pt-5 md:h-auto md:min-h-dvh md:max-w-none md:overflow-visible md:px-0 md:pt-0">
        <div className="shrink-0 space-y-4">
          <header className="flex items-start justify-between gap-4 pt-1">
            <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--bc-text-muted)]">
              Ledger
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-[var(--bc-text)]">
              Transactions
            </h1>

            <p className="mt-1 text-sm font-semibold text-[var(--bc-text-soft)]">
              Your entries are saved instantly
            </p>
          </div>

            <AddTransactionDialog
              className="bc-button bc-button-primary mt-0.5 h-12 rounded-[20px] px-5 text-sm shadow-[0_12px_26px_var(--bc-green-glow)]"
              label="Add"
            />
          </header>

          <section className="bc-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bc-text-muted)]">
                Money movement
              </p>

              <p className="mt-1 text-sm font-semibold text-[var(--bc-text-soft)]">
                {filteredTransactions.length} transaction
                {filteredTransactions.length === 1 ? "" : "s"} in this view
              </p>
            </div>

            <div className="rounded-full border border-[var(--bc-border)] bg-[var(--bc-surface)] px-3 py-1 text-[11px] font-black text-[var(--bc-green)]">
              {getMonthFilterLabel(monthFilter)}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-[var(--bc-green)]/20 bg-[var(--bc-green-glow)] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--bc-text-muted)]">
                Income
              </p>

              <p className="mt-1 truncate text-sm font-black text-[var(--bc-green)]">
                {formatCurrency(totals.income)}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--bc-red)]/20 bg-[var(--bc-red-glow)] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--bc-text-muted)]">
                Expenses
              </p>

              <p className="mt-1 truncate text-sm font-black text-[var(--bc-red)]">
                {formatCurrency(totals.expenses)}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--bc-blue)]/20 bg-[var(--bc-blue)]/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--bc-text-muted)]">
                Savings
              </p>

              <p className="mt-1 truncate text-sm font-black text-[var(--bc-blue)]">
                {formatCurrency(totals.savings)}
              </p>
            </div>
          </div>
          </section>

          <section className="bc-card relative z-20 overflow-visible rounded-[28px] p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bc-text-muted)]" />

              <input
                className="bc-input !pl-11 !pr-4 text-left"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search transactions"
                value={search}
              />
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-3">
              <TypeFilterDropdown
                value={typeFilter}
                onChange={setTypeFilter}
              />

              <MonthFilterDropdown
                value={monthFilter}
                onChange={setMonthFilter}
              />
            </div>
          </section>
        </div>

        <section
          className={cn(
            "scrollbar-hidden mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:overflow-visible md:pb-0",
            filteredTransactions.length === 0 && "flex flex-col",
          )}
        >
          {groupedTransactions.map((group) => (
            <div className="space-y-2" key={group.key}>
              <div className="px-1 pt-1">
                <h2 className="text-sm font-black text-[var(--bc-text)]">
                  {group.title}
                </h2>

                <p className="text-[11px] font-semibold text-[var(--bc-text-muted)]">
                  {group.subtitle}
                </p>
              </div>

              <div className="space-y-3">
                {group.transactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    onEdit={setEditingTransaction}
                    transaction={transaction}
                  />
                ))}
              </div>
            </div>
          ))}

          {filteredTransactions.length === 0 && (
            <div className="bc-card-elevated flex flex-col items-center justify-center px-6 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-surface-soft)] text-[var(--bc-green)]">
                <WalletCards className="h-6 w-6" />
              </div>

              <h2 className="mt-3 text-lg font-black text-[var(--bc-text)]">
                No transactions found
              </h2>

              <p className="mt-2 max-w-xs text-sm font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                Try a different filter, search another keyword, or add your
                first transaction for this period.
              </p>
            </div>
          )}
        </section>
      </section>

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

  const isPositive = type === "income" || type === "salary";
  const isSavings = type === "savings" || type === "goal_contribution";
  const amountNumber = Number(amount || transaction.amount || 0);

  const previewTransaction: LocalTransaction = {
    ...transaction,
    type,
    amount: amountNumber,
    category: category || transaction.category,
    date: date || transaction.date,
    payment_method: normalizePaymentMethod(
      paymentMethod || transaction.payment_method,
    ),
    note,
  };

  const displayIcon = getTransactionDisplayIcon(previewTransaction);
  const displayCategory = getCategoryLabel(category || transaction.category);
  const displayPayment = getPaymentMethodLabel(
    paymentMethod || transaction.payment_method,
  );

  let displayDate = date || transaction.date;

  try {
    displayDate = format(parseISO(date || transaction.date), "MMM d, yyyy");
  } catch {
    displayDate = date || transaction.date;
  }

  const fieldLabelClass =
    "space-y-1.5 text-[11px] font-black text-[var(--bc-text)]";

  const fieldClass =
    "h-10 w-full rounded-2xl border border-[var(--bc-border-strong)] bg-[var(--bc-surface)] px-3 text-sm font-semibold text-[var(--bc-text)] outline-none transition focus:border-[var(--bc-green)]";

  return (
   <Modal
  className="max-w-[355px] overflow-hidden rounded-[32px] pb-2 sm:max-w-lg"
  isOpen={Boolean(transaction)}
  onClose={onClose}
  title="Transaction Details"
>
      <form className="space-y-3 pb-2" onSubmit={handleSave}>
    <section className="bc-card-elevated flex min-h-[184px] flex-col items-center justify-center rounded-[28px] border border-[var(--bc-border-strong)] bg-[var(--bc-card-elevated)] px-5 py-5 text-center shadow-none">
  <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full border border-[var(--bc-border-strong)] bg-[var(--bc-card)] text-[28px] shadow-none">
    {displayIcon}
  </div>

  <p className="mt-4 max-w-full truncate text-base font-black text-[var(--bc-text)]">
    {displayCategory}
  </p>

  <p
    className={cn(
      "mt-2 flex max-w-full items-baseline justify-center gap-0.5 truncate text-[28px] font-black leading-none tracking-[-0.035em]",
      isPositive
        ? "text-[var(--bc-green)]"
        : isSavings
          ? "text-[var(--bc-blue)]"
          : "text-[var(--bc-red)]",
    )}
  >
    <span className="text-[22px] leading-none">
      {isPositive ? "+" : "-"}
    </span>
    <span>{formatCurrency(amountNumber)}</span>
  </p>

  <p className="mt-3 max-w-full truncate text-xs font-semibold text-[var(--bc-text-muted)]">
    {displayDate} • {displayPayment}
  </p>
</section>

        <section className="grid grid-cols-2 gap-x-2.5 gap-y-3">
          <label className={fieldLabelClass}>
            Type
            <select
              className={fieldClass}
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

          <label className={fieldLabelClass}>
            Amount
            <input
              className={fieldClass}
              onChange={(event) => setAmount(event.target.value)}
              required
              type="number"
              value={amount}
            />
          </label>

          <label className={fieldLabelClass}>
            Category
            <select
              className={fieldClass}
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              <option value="">Select category</option>

              {category &&
                !categoryOptions.some(
                  (categoryOption) => categoryOption.id === category,
                ) && (
                  <option value={category}>{getCategoryLabel(category)}</option>
                )}

              {categoryOptions.map((categoryOption) => (
                <option key={categoryOption.id} value={categoryOption.id}>
                  {categoryOption.label}
                </option>
              ))}
            </select>
          </label>

          <label className={fieldLabelClass}>
            Date
            <input
              className={fieldClass}
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </label>

          <label className={fieldLabelClass}>
            Payment
            <select
              className={fieldClass}
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

          <label className={fieldLabelClass}>
            Note
            <input
              className={fieldClass}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional"
              value={note}
            />
          </label>
        </section>

        <div className="sticky bottom-0 z-10 -mx-1 space-y-2 rounded-b-[28px] border-t border-[var(--bc-border)] bg-[var(--bc-card)] px-1 pb-2 pt-3">
          <div className="grid grid-cols-[0.95fr_1.3fr] gap-2">
            <Button
              className="h-10 min-h-10 rounded-2xl border border-[var(--bc-border-strong)] bg-transparent text-xs font-black text-[var(--bc-text)] hover:bg-[var(--bc-surface-soft)]"
              disabled={isSaving}
              onClick={onClose}
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>

            <Button
              className="h-10 min-h-10 rounded-2xl bg-[var(--bc-green)] text-xs font-black text-white shadow-[0_10px_24px_var(--bc-green-glow)] hover:bg-[var(--bc-green-soft)]"
              disabled={isSaving}
              type="submit"
            >
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

          <Button
            className="h-9 min-h-9 w-full rounded-2xl border border-[var(--bc-red)]/60 bg-[var(--bc-red-glow)] text-xs font-black text-[var(--bc-red)] hover:bg-[var(--bc-red-glow)]"
            disabled={isSaving}
            onClick={handleDelete}
            type="button"
            variant="urgent"
          >
            <Trash2 className="h-4 w-4" />
            Delete Transaction
          </Button>
        </div>
      </form>
    </Modal>
  );
}

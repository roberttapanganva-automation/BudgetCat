import { format, getMonth, isValid, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  ListChecks,
  PiggyBank,
  PieChart as PieChartIcon,
  ReceiptText,
  Sparkles,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "../contexts/AuthContext";
import { getCategoryLabel } from "../lib/categoryConfig";
import { db } from "../lib/localDb";
import { cn, formatCurrency } from "../lib/utils";
import type { LocalDueDate, LocalTransaction } from "../types/finance";

const BASE_REPORT_YEAR = 2026;

type ReportView = "yearly" | `${number}`;

type ReportSummary = {
  income: number;
  expenses: number;
  bills: number;
  savings: number;
  net: number;
  outflow: number;
};

type ReportCategory = {
  name: string;
  amount: number;
  percent: number;
};

type ReportBill = {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: string;
};

type TrendRow = {
  month: string;
  monthIndex: number;
  income: number;
  expenses: number;
  bills: number;
  savings: number;
  net: number;
};

const monthOptions = Array.from({ length: 12 }, (_, monthIndex) => ({
  value: String(monthIndex),
  label: format(new Date(BASE_REPORT_YEAR, monthIndex, 1), "MMMM"),
  shortLabel: format(new Date(BASE_REPORT_YEAR, monthIndex, 1), "MMM"),
}));

const donutColors = [
  "var(--bc-green)",
  "var(--bc-red)",
  "var(--bc-amber)",
  "var(--bc-blue)",
  "var(--bc-purple)",
  "color-mix(in srgb, var(--bc-text-muted) 70%, transparent)",
];

function safeDate(value?: string | null) {
  if (!value) return null;

  const parsed = parseISO(value);

  if (!isValid(parsed)) return null;

  return parsed;
}

function formatReportCurrency(amount: number) {
  return formatCurrency(Number(amount || 0)).replace(/^PHP\s?/, "₱");
}

function formatReportDate(value?: string | null) {
  const parsed = safeDate(value);

  if (!parsed) return "No date";

  return format(parsed, "MMM d");
}

function getSafeAmount(value: number | string | null | undefined) {
  return Number(value || 0);
}

function isIncomeType(type: string) {
  return type === "income" || type === "salary";
}

function isExpenseType(type: string) {
  return type === "expense";
}

function isSavingsType(type: string) {
  return type === "savings" || type === "goal_contribution";
}

function isSameReportPeriod(
  value: string,
  year: number,
  monthIndex?: number,
) {
  const parsed = safeDate(value);

  if (!parsed) return false;
  if (parsed.getFullYear() !== year) return false;

  if (typeof monthIndex === "number") {
    return parsed.getMonth() === monthIndex;
  }

  return true;
}

function compactCurrencyTick(value: unknown) {
  const amount = Number(value || 0);

  if (Math.abs(amount) >= 1000) {
    return `₱${Math.round(amount / 1000)}k`;
  }

  return `₱${amount}`;
}

function tooltipCurrencyFormatter(value: unknown) {
  return formatReportCurrency(Number(value || 0));
}

function buildSummaryForPeriod(
  transactions: LocalTransaction[],
  dueDates: LocalDueDate[],
  year: number,
  monthIndex?: number,
): ReportSummary {
  const periodTransactions = transactions.filter((transaction) =>
    isSameReportPeriod(transaction.date, year, monthIndex),
  );

  const periodBills = dueDates.filter((bill) =>
    isSameReportPeriod(bill.due_date, year, monthIndex),
  );

  const income = periodTransactions
    .filter((transaction) => isIncomeType(transaction.type))
    .reduce((sum, transaction) => sum + getSafeAmount(transaction.amount), 0);

  const expenses = periodTransactions
    .filter((transaction) => isExpenseType(transaction.type))
    .reduce((sum, transaction) => sum + getSafeAmount(transaction.amount), 0);

  const savings = periodTransactions
    .filter((transaction) => isSavingsType(transaction.type))
    .reduce((sum, transaction) => sum + getSafeAmount(transaction.amount), 0);

  const bills = periodBills.reduce(
    (sum, bill) => sum + getSafeAmount(bill.amount),
    0,
  );

  const outflow = expenses + bills + savings;
  const net = income - outflow;

  return {
    income,
    expenses,
    bills,
    savings,
    net,
    outflow,
  };
}

function hasSummaryData(summary: ReportSummary) {
  return (
    summary.income > 0 ||
    summary.expenses > 0 ||
    summary.bills > 0 ||
    summary.savings > 0
  );
}

function buildCategoriesForPeriod(
  transactions: LocalTransaction[],
  year: number,
  monthIndex?: number,
): ReportCategory[] {
  const categoryMap = new Map<string, number>();

  transactions
    .filter((transaction) => isExpenseType(transaction.type))
    .filter((transaction) =>
      isSameReportPeriod(transaction.date, year, monthIndex),
    )
    .forEach((transaction) => {
      const label = getCategoryLabel(transaction.category || "other");
      categoryMap.set(
        label,
        (categoryMap.get(label) ?? 0) + getSafeAmount(transaction.amount),
      );
    });

  const totalExpenses = Array.from(categoryMap.values()).reduce(
    (sum, amount) => sum + amount,
    0,
  );

  return Array.from(categoryMap.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      percent:
        totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function buildBillsForPeriod(
  dueDates: LocalDueDate[],
  year: number,
  monthIndex?: number,
): ReportBill[] {
  return dueDates
    .filter((bill) => isSameReportPeriod(bill.due_date, year, monthIndex))
    .map((bill) => ({
      id: bill.id,
      title: bill.title,
      amount: getSafeAmount(bill.amount),
      dueDate: bill.due_date,
      status: bill.status,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function buildTrendData(
  transactions: LocalTransaction[],
  dueDates: LocalDueDate[],
  year: number,
): TrendRow[] {
  return monthOptions.map((month) => {
    const monthIndex = Number(month.value);
    const summary = buildSummaryForPeriod(
      transactions,
      dueDates,
      year,
      monthIndex,
    );

    return {
      month: month.shortLabel,
      monthIndex,
      income: summary.income,
      expenses: summary.expenses,
      bills: summary.bills,
      savings: summary.savings,
      net: summary.net,
    };
  });
}

function getDataYears(
  transactions: LocalTransaction[],
  dueDates: LocalDueDate[],
) {
  const years = new Set<number>();

  transactions.forEach((transaction) => {
    const parsed = safeDate(transaction.date);

    if (parsed && parsed.getFullYear() >= BASE_REPORT_YEAR) {
      years.add(parsed.getFullYear());
    }
  });

  dueDates.forEach((bill) => {
    const parsed = safeDate(bill.due_date);

    if (parsed && parsed.getFullYear() >= BASE_REPORT_YEAR) {
      years.add(parsed.getFullYear());
    }
  });

  return Array.from(years);
}

function buildYearOptions(
  transactions: LocalTransaction[],
  dueDates: LocalDueDate[],
  selectedYear: number,
) {
  const dataYears = getDataYears(transactions, dueDates);

  const maxYear = Math.max(
    BASE_REPORT_YEAR + 5,
    new Date().getFullYear() + 5,
    selectedYear + 1,
    ...dataYears,
  );

  return Array.from(
    { length: maxYear - BASE_REPORT_YEAR + 1 },
    (_, index) => BASE_REPORT_YEAR + index,
  );
}

function getPeriodLabel(view: ReportView, year: number) {
  if (view === "yearly") return `${year} Yearly`;

  const month = monthOptions[Number(view)];

  return `${month?.label ?? "Selected Month"} ${year}`;
}

function getInsightMessages(summary: ReportSummary, periodLabel: string) {
  if (!hasSummaryData(summary)) {
    return [`No BudgetCat data found for ${periodLabel} yet.`];
  }

  const insights: string[] = [];

  if (summary.net >= 0) {
    insights.push(
      `You stayed positive by ${formatReportCurrency(summary.net)} after expenses, bills, and savings.`,
    );
  } else {
    insights.push(
      `Outflow exceeded income by ${formatReportCurrency(Math.abs(summary.net))}.`,
    );
  }

  if (summary.income > 0 && summary.outflow > 0) {
    const outflowRate = Math.round((summary.outflow / summary.income) * 100);
    insights.push(`Total outflow used ${outflowRate}% of recorded income.`);
  }

  if (summary.bills > 0 && summary.outflow > 0) {
    const billShare = Math.round((summary.bills / summary.outflow) * 100);
    insights.push(`Bills made up ${billShare}% of total outflow.`);
  }

  if (summary.savings > 0) {
    insights.push(
      `You added ${formatReportCurrency(summary.savings)} toward savings or goals.`,
    );
  }

  return insights;
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-[var(--bc-border)] bg-[var(--bc-card)]/60 px-4 py-6 text-center text-sm font-semibold text-[var(--bc-text-muted)]">
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  icon: LucideIcon;
  tone: "green" | "red" | "amber" | "blue" | "purple";
}) {
  const toneClasses = {
    green: {
      card: "border-[var(--bc-green)]/15 bg-[var(--bc-green-glow)]",
      icon: "bc-icon-circle-green",
      value: "text-[var(--bc-green)]",
    },
    red: {
      card: "border-[var(--bc-red)]/15 bg-[var(--bc-red-glow)]",
      icon: "bc-icon-circle-red",
      value: "text-[var(--bc-red)]",
    },
    amber: {
      card: "border-[var(--bc-amber)]/15 bg-[var(--bc-amber-glow)]",
      icon: "bc-icon-circle-amber",
      value: "text-[var(--bc-amber)]",
    },
    blue: {
      card: "border-[var(--bc-blue)]/15 bg-[var(--bc-blue)]/10",
      icon: "bc-icon-circle-blue",
      value: "text-[var(--bc-blue)]",
    },
    purple: {
      card: "border-[var(--bc-purple)]/15 bg-[var(--bc-purple)]/10",
      icon: "bg-[var(--bc-purple)]/15 text-[var(--bc-purple)]",
      value: "text-[var(--bc-purple)]",
    },
  }[tone];

  return (
    <article className={cn("rounded-[22px] border p-4", toneClasses.card)}>
      <div className="flex items-start justify-between gap-3">
        <div className={cn("bc-icon-circle h-10 w-10", toneClasses.icon)}>
          <Icon className="h-4.5 w-4.5" strokeWidth={2.4} />
        </div>

        <span className="rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)]/70 px-2 py-1 text-[10px] font-black text-[var(--bc-text-muted)]">
          Real data
        </span>
      </div>

      <p className="mt-4 text-xs font-black text-[var(--bc-text-soft)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-xl font-black tracking-[-0.04em]",
          toneClasses.value,
        )}
      >
        {formatReportCurrency(value)}
      </p>
      <p className="mt-2 text-[11px] font-semibold leading-snug text-[var(--bc-text-muted)]">
        {helper}
      </p>
    </article>
  );
}

function CategoryProgressList({ categories }: { categories: ReportCategory[] }) {
  if (categories.length === 0) {
    return <EmptyState>No expense category data yet.</EmptyState>;
  }

  return (
    <div className="space-y-3">
      {categories.slice(0, 6).map((category, index) => (
        <div key={category.name}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: donutColors[index % donutColors.length] }}
              />
              <p className="truncate text-xs font-black text-[var(--bc-text)]">
                {category.name}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-xs font-black text-[var(--bc-text)]">
                {category.percent}%
              </p>
              <p className="text-[10px] font-semibold text-[var(--bc-text-muted)]">
                {formatReportCurrency(category.amount)}
              </p>
            </div>
          </div>

          <div className="bc-progress-track h-2">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, category.percent))}%`,
                background: donutColors[index % donutColors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function BillList({ bills }: { bills: ReportBill[] }) {
  if (bills.length === 0) {
    return <EmptyState>No bill data found for this period.</EmptyState>;
  }

  return (
    <div className="space-y-2">
      {bills.slice(0, 6).map((bill) => (
        <div
          className="flex items-center gap-3 rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-3"
          key={bill.id}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] text-lg">
            🧾
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-[var(--bc-text)]">
              {bill.title}
            </p>
            <p className="text-[11px] font-semibold text-[var(--bc-text-muted)]">
              {formatReportDate(bill.dueDate)} • {bill.status}
            </p>
          </div>

          <p className="shrink-0 text-sm font-black text-[var(--bc-red)]">
            {formatReportCurrency(bill.amount)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function Reports() {
  const { user } = useAuth();
  const householdId = user?.householdId ?? "";

  const defaultReportYear = Math.max(BASE_REPORT_YEAR, new Date().getFullYear());

  const [selectedReportView, setSelectedReportView] = useState<ReportView>(
    String(getMonth(new Date())) as ReportView,
  );
  const [selectedYear, setSelectedYear] = useState(defaultReportYear);

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

  const dueDates =
    useLiveQuery(
      () =>
        db.due_dates
          .where("household_id")
          .equals(householdId)
          .filter((bill) => !bill.deleted_at)
          .toArray(),
      [householdId],
      [],
    ) ?? [];

  const reportYearOptions = useMemo(
    () => buildYearOptions(transactions, dueDates, selectedYear),
    [dueDates, selectedYear, transactions],
  );

  const isYearlyView = selectedReportView === "yearly";
  const selectedMonth =
    selectedReportView === "yearly" ? getMonth(new Date()) : Number(selectedReportView);

  const periodLabel = getPeriodLabel(selectedReportView, selectedYear);

  const summary = useMemo(
    () =>
      buildSummaryForPeriod(
        transactions,
        dueDates,
        selectedYear,
        isYearlyView ? undefined : selectedMonth,
      ),
    [dueDates, isYearlyView, selectedMonth, selectedYear, transactions],
  );

  const categories = useMemo(
    () =>
      buildCategoriesForPeriod(
        transactions,
        selectedYear,
        isYearlyView ? undefined : selectedMonth,
      ),
    [isYearlyView, selectedMonth, selectedYear, transactions],
  );

  const bills = useMemo(
    () =>
      buildBillsForPeriod(
        dueDates,
        selectedYear,
        isYearlyView ? undefined : selectedMonth,
      ),
    [dueDates, isYearlyView, selectedMonth, selectedYear],
  );

  const trendData = useMemo(
    () => buildTrendData(transactions, dueDates, selectedYear),
    [dueDates, selectedYear, transactions],
  );

  const focusedTrendData = isYearlyView
    ? trendData
    : trendData.filter((row) => row.monthIndex === selectedMonth);

  const insightMessages = getInsightMessages(summary, periodLabel);

  const totalCategoryExpenses = categories.reduce(
    (sum, category) => sum + category.amount,
    0,
  );

  const netTone =
    summary.net >= 0
      ? {
          tone: "green" as const,
          helper: "Income minus expenses, bills, and savings",
        }
      : {
          tone: "red" as const,
          helper: "Outflow is higher than recorded income",
        };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] px-5 pb-28 pt-5 md:max-w-none md:px-0 md:pb-8 md:pt-0">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--bc-text-muted)]">
            Insights
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-[var(--bc-text)] md:text-3xl">
            Reports
          </h1>
          <p className="mt-1 text-sm font-semibold text-[var(--bc-text-muted)]">
            Insights for better decisions
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-card)] text-[var(--bc-green)]">
          <BarChart3 className="h-5 w-5" strokeWidth={2.4} />
        </div>
      </header>

      <section className="bc-card-elevated mb-4 p-4">
        <div className="flex items-start gap-3">
          <div className="bc-icon-circle-green flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
            <CalendarDays className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-[var(--bc-text)]">
              Report period
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
              Default is this month. Switch to yearly when you want the full view.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_0.72fr] gap-3">
          <label className="block">
            <span className="sr-only">Month or yearly report</span>
            <select
              className="bc-input"
              onChange={(event) =>
                setSelectedReportView(event.target.value as ReportView)
              }
              value={selectedReportView}
            >
              <option value="yearly">Yearly</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="sr-only">Report year</span>
            <select
              className="bc-input"
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              value={selectedYear}
            >
              {reportYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {!hasSummaryData(summary) && (
        <section className="mb-4 rounded-[22px] border border-[var(--bc-amber)]/20 bg-[var(--bc-amber-glow)] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] text-[var(--bc-amber)]">
              <Sparkles className="h-4.5 w-4.5" />
            </div>

            <div>
              <p className="text-sm font-black text-[var(--bc-text)]">
                No report data yet
              </p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                Add transactions, bills, or savings for {periodLabel} to unlock
                this report.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <MetricCard
          helper="Recorded money coming in"
          icon={CircleDollarSign}
          label="Income"
          tone="green"
          value={summary.income}
        />

        <MetricCard
          helper="Expense transactions only"
          icon={ReceiptText}
          label="Expenses"
          tone="red"
          value={summary.expenses}
        />

        <MetricCard
          helper={`${bills.length} bill${bills.length === 1 ? "" : "s"} in view`}
          icon={CreditCard}
          label="Bills"
          tone="amber"
          value={summary.bills}
        />

        <MetricCard
          helper="Savings and goal contributions"
          icon={PiggyBank}
          label="Savings"
          tone="blue"
          value={summary.savings}
        />

        <MetricCard
          helper={netTone.helper}
          icon={Wallet}
          label="Net"
          tone={netTone.tone}
          value={summary.net}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="bc-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black tracking-[-0.02em] text-[var(--bc-text)]">
                Spending Overview
              </h2>
              <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
                Expense categories for {periodLabel}
              </p>
            </div>

            <div className="bc-icon-circle-blue">
              <PieChartIcon className="h-4.5 w-4.5" />
            </div>
          </div>

          {categories.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-[220px_1fr] xl:grid-cols-1 2xl:grid-cols-[220px_1fr]">
              <div className="relative h-[220px]">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie
                      cx="50%"
                      cy="50%"
                      data={categories}
                      dataKey="amount"
                      innerRadius={62}
                      nameKey="name"
                      outerRadius={92}
                      paddingAngle={3}
                      stroke="var(--bc-card)"
                      strokeWidth={4}
                    >
                      {categories.map((category, index) => (
                        <Cell
                          fill={donutColors[index % donutColors.length]}
                          key={category.name}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--bc-card)",
                        border: "1px solid var(--bc-border)",
                        borderRadius: "16px",
                        color: "var(--bc-text)",
                      }}
                      formatter={(value) => tooltipCurrencyFormatter(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-black text-[var(--bc-text-muted)]">
                    Total
                  </p>
                  <p className="text-xl font-black tracking-[-0.04em] text-[var(--bc-text)]">
                    {formatReportCurrency(totalCategoryExpenses)}
                  </p>
                </div>
              </div>

              <CategoryProgressList categories={categories} />
            </div>
          ) : (
            <EmptyState>No spending categories found for this period.</EmptyState>
          )}
        </article>

        <article className="bc-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black tracking-[-0.02em] text-[var(--bc-text)]">
                Monthly Trend
              </h2>
              <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
                Income, expenses, bills, and savings for {selectedYear}
              </p>
            </div>

            <div className="bc-icon-circle-green">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                data={focusedTrendData}
                margin={{ bottom: 0, left: -14, right: 0, top: 10 }}
              >
                <CartesianGrid
                  stroke="var(--bc-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="month"
                  tick={{ fill: "var(--bc-text-muted)", fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tick={{ fill: "var(--bc-text-muted)", fontSize: 11 }}
                  tickFormatter={compactCurrencyTick}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bc-card)",
                    border: "1px solid var(--bc-border)",
                    borderRadius: "16px",
                    color: "var(--bc-text)",
                  }}
                  formatter={(value) => tooltipCurrencyFormatter(value)}
                />
                <Bar
                  dataKey="income"
                  fill="var(--bc-green)"
                  name="Income"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  fill="var(--bc-red)"
                  name="Expenses"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="bills"
                  fill="var(--bc-amber)"
                  name="Bills"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="savings"
                  fill="var(--bc-blue)"
                  name="Savings"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              ["Income", "var(--bc-green)"],
              ["Expenses", "var(--bc-red)"],
              ["Bills", "var(--bc-amber)"],
              ["Savings", "var(--bc-blue)"],
            ].map(([label, color]) => (
              <div
                className="flex items-center justify-center gap-1 rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] px-2 py-1.5"
                key={label}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <span className="text-[10px] font-black text-[var(--bc-text-muted)]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="bc-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black tracking-[-0.02em] text-[var(--bc-text)]">
                Bills in this report
              </h2>
              <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
                Due-date records included in {periodLabel}
              </p>
            </div>

            <div className="bc-icon-circle-amber">
              <CreditCard className="h-4.5 w-4.5" />
            </div>
          </div>

          <BillList bills={bills} />
        </article>

        <article className="bc-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black tracking-[-0.02em] text-[var(--bc-text)]">
                BudgetCat Notes
              </h2>
              <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
                Simple written insights from the selected report
              </p>
            </div>

            <div className="bc-icon-circle-green">
              <ListChecks className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="space-y-3">
            {insightMessages.map((message) => {
              const isWarning =
                message.includes("exceeded") || message.includes("higher");

              return (
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-[18px] border p-3",
                    isWarning
                      ? "border-[var(--bc-red)]/20 bg-[var(--bc-red-glow)]"
                      : "border-[var(--bc-green)]/20 bg-[var(--bc-green-glow)]",
                  )}
                  key={message}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)]",
                      isWarning ? "text-[var(--bc-red)]" : "text-[var(--bc-green)]",
                    )}
                  >
                    {isWarning ? (
                      <ReceiptText className="h-4.5 w-4.5" />
                    ) : (
                      <Sparkles className="h-4.5 w-4.5" />
                    )}
                  </div>

                  <p className="text-xs font-semibold leading-relaxed text-[var(--bc-text-soft)]">
                    {message}
                  </p>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}
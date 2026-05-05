import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Home,
  Landmark,
  ListChecks,
  PiggyBank,
  RefreshCw,
  ReceiptText,
  Settings,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  differenceInCalendarDays,
  format,
  parseISO,
  subMonths,
} from "date-fns";
import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ThemeToggle } from "../components/layout/ThemeToggle";
import { BudgetCatMascot } from "../components/mascot/BudgetCatMascot";
import { AddTransactionDialog } from "../components/transactions/AddTransactionDialog";
import { useAuth } from "../contexts/AuthContext";
import {
  calculateMonthlySummary,
  getGoalMonthsLeft,
  getGoalProgress,
} from "../lib/calculations";
import { getCategoryLabel, normalizeCategory } from "../lib/categoryConfig";
import { getDashboardUpcomingBills } from "../lib/dueDateFilters";
import { getDueDateIcon, getGoalIcon } from "../lib/iconMap";
import { db } from "../lib/localDb";
import { getDashboardMascotCheckIn } from "../lib/mascotMood";
import { getDisplayNickname, nicknameEventName } from "../lib/nickname";
import { getPaymentMethodLabel } from "../lib/paymentMethods";
import { getAllReminders } from "../lib/reminders";
import { cn, formatCurrency } from "../lib/utils";
import type {
  LocalDueDate,
  LocalTransaction,
  Reminder,
  TransactionType,
} from "../types/finance";

type StatTone = "green" | "red" | "amber" | "blue" | "purple";
type DashboardPeriodOptionValue = number | "yearly";

const dashboardMonthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index,
  label: format(new Date(2026, index, 1), "MMMM"),
}));

const dashboardPeriodOptions: Array<{
  value: DashboardPeriodOptionValue;
  label: string;
}> = [
  ...dashboardMonthOptions,
  {
    value: "yearly",
    label: "Yearly",
  },
];

function getTimeGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function safeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function safeDate(dateString?: string | null) {
  if (!dateString) return null;

  const parsedDate = parseISO(dateString);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function formatDate(dateString?: string | null, dateFormat = "MMM d, yyyy") {
  const parsedDate = safeDate(dateString);

  if (!parsedDate) return "No date";
  return format(parsedDate, dateFormat);
}

function isSameMonth(dateString: string, referenceDate: Date) {
  const parsedDate = safeDate(dateString);

  if (!parsedDate) return false;

  return (
    parsedDate.getMonth() === referenceDate.getMonth() &&
    parsedDate.getFullYear() === referenceDate.getFullYear()
  );
}

function getMonthlyBills(dueDates: LocalDueDate[], referenceDate = new Date()) {
  return dueDates.filter((bill) => {
    if (bill.deleted_at) return false;
    return isSameMonth(bill.due_date, referenceDate);
  });
}

function getYearlyBills(dueDates: LocalDueDate[], referenceDate = new Date()) {
  const selectedYear = referenceDate.getFullYear();

  return dueDates.filter((bill) => {
    if (bill.deleted_at) return false;

    const dueDate = safeDate(bill.due_date);

    if (!dueDate) return false;

    return dueDate.getFullYear() === selectedYear;
  });
}

function getYearlySummary(
  transactions: LocalTransaction[],
  referenceDate = new Date(),
) {
  const selectedYear = referenceDate.getFullYear();

  return Array.from({ length: 12 }, (_, monthIndex) =>
    calculateMonthlySummary(
      transactions,
      new Date(selectedYear, monthIndex, 1),
    ),
  ).reduce(
    (total, monthSummary) => ({
      income: total.income + monthSummary.income,
      expenses: total.expenses + monthSummary.expenses,
      savings: total.savings + monthSummary.savings,
      remaining: total.remaining + monthSummary.remaining,
    }),
    {
      income: 0,
      expenses: 0,
      savings: 0,
      remaining: 0,
    },
  );
}

function getPriorityRank(priority: string) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function getBillDaysLeftLabel(bill: LocalDueDate) {
  if (bill.status === "paid") return "Paid";

  const dueDate = safeDate(bill.due_date);

  if (!dueDate) return "No due date";

  const daysLeft = differenceInCalendarDays(dueDate, new Date());

  if (daysLeft < 0) {
    return `${Math.abs(daysLeft)} day${
      Math.abs(daysLeft) === 1 ? "" : "s"
    } overdue`;
  }

  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "1 day left";

  return `${daysLeft} days left`;
}

function getTypeLabel(type: TransactionType) {
  if (type === "goal_contribution") return "Goal Contribution";
  return type
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
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

function getDashboardTransactionIcon(transaction: LocalTransaction) {
  const text = getTransactionSearchText(transaction);

  if (transaction.type === "salary" || text.includes("salary")) return "💵";
  if (transaction.type === "income") {
    if (text.includes("freelance") || text.includes("project")) return "💼";
    if (text.includes("gift") || text.includes("bonus")) return "🎁";
    if (text.includes("business")) return "🏦";
    return "💰";
  }

  if (
    transaction.type === "savings" ||
    transaction.type === "goal_contribution"
  ) {
    if (text.includes("travel") || text.includes("vacation")) return "✈️";
    if (text.includes("emergency")) return "🛡️";
    if (text.includes("home") || text.includes("house")) return "🏠";
    if (text.includes("education") || text.includes("school")) return "📚";
    return "🌱";
  }

  if (text.includes("grocery") || text.includes("food")) return "🛒";
  if (text.includes("dining") || text.includes("restaurant")) return "🍽️";
  if (text.includes("coffee") || text.includes("snack")) return "☕";
  if (text.includes("fuel") || text.includes("gasoline")) return "⛽";
  if (text.includes("transport") || text.includes("commute")) return "🚌";
  if (text.includes("shopping") || text.includes("store")) return "🛍️";
  if (text.includes("health") || text.includes("medical")) return "🏥";
  if (text.includes("education") || text.includes("course")) return "📚";
  if (text.includes("entertainment") || text.includes("movie")) return "🎬";
  if (text.includes("fitness") || text.includes("gym")) return "🏋️";
  if (text.includes("pet") || text.includes("cat") || text.includes("dog")) {
    return "🐾";
  }
  if (text.includes("electric") || text.includes("power")) return "⚡";
  if (text.includes("water")) return "💧";
  if (text.includes("internet") || text.includes("wifi")) return "🌐";
  if (text.includes("phone") || text.includes("mobile")) return "📱";
  if (text.includes("rent") || text.includes("mortgage")) return "🏠";
  if (text.includes("subscription")) return "🔁";

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

function getTrendLabel(
  currentValue: number,
  previousValue: number,
  lowerIsBetter = false,
  comparisonLabel = "last month",
) {
  if (previousValue <= 0 && currentValue <= 0) {
    return {
      label: "No activity yet",
      positive: true,
    };
  }

  if (previousValue <= 0 && currentValue > 0) {
    return {
      label: `New vs ${comparisonLabel}`,
      positive: !lowerIsBetter,
    };
  }

  const delta = currentValue - previousValue;
  const percentage = Math.round((delta / previousValue) * 100);
  const positive = lowerIsBetter ? delta <= 0 : delta >= 0;

  return {
    label: `${percentage >= 0 ? "+" : ""}${percentage}% vs ${comparisonLabel}`,
    positive,
  };
}

function getRemainingPercent(income: number, remaining: number) {
  if (income <= 0) return 0;

  return Math.max(0, Math.min(100, Math.round((remaining / income) * 100)));
}

function getSpendingPercent(income: number, expenses: number) {
  if (income <= 0) return 0;

  return Math.max(0, Math.min(100, Math.round((expenses / income) * 100)));
}

function getReminderToneClass(reminder: Reminder) {
  if (reminder.severity === "urgent") {
    return "border-[var(--bc-red)]/25 bg-[var(--bc-red-glow)] text-[var(--bc-red)]";
  }

  if (reminder.severity === "warning") {
    return "border-[var(--bc-amber)]/25 bg-[var(--bc-amber-glow)] text-[var(--bc-amber)]";
  }

  if (reminder.severity === "success") {
    return "border-[var(--bc-green)]/25 bg-[var(--bc-green-glow)] text-[var(--bc-green)]";
  }

  return "border-[var(--bc-blue)]/25 bg-[var(--bc-blue)]/10 text-[var(--bc-blue)]";
}

const statToneClasses: Record<
  StatTone,
  {
    card: string;
    icon: string;
    value: string;
    graph: string;
    graphFill: string;
  }
> = {
  green: {
    card: "bc-stat-card-green",
    icon: "bc-icon-circle-green",
    value: "text-[var(--bc-green)]",
    graph: "text-[var(--bc-green)]",
    graphFill: "bg-[var(--bc-green-glow)]",
  },
  red: {
    card: "bc-stat-card-red",
    icon: "bc-icon-circle-red",
    value: "text-[var(--bc-red)]",
    graph: "text-[var(--bc-red)]",
    graphFill: "bg-[var(--bc-red-glow)]",
  },
  amber: {
    card: "bc-stat-card-amber",
    icon: "bc-icon-circle-amber",
    value: "text-[var(--bc-amber)]",
    graph: "text-[var(--bc-amber)]",
    graphFill: "bg-[var(--bc-amber-glow)]",
  },
  blue: {
    card: "bc-stat-card-blue",
    icon: "bc-icon-circle-blue",
    value: "text-[var(--bc-blue)]",
    graph: "text-[var(--bc-blue)]",
    graphFill: "bg-[var(--bc-blue)]/10",
  },
  purple: {
    card: "bc-stat-card-blue",
    icon: "bg-[var(--bc-purple)]/15 text-[var(--bc-purple)]",
    value: "text-[var(--bc-purple)]",
    graph: "text-[var(--bc-purple)]",
    graphFill: "bg-[var(--bc-purple)]/10",
  },
};
type DashboardSparklineMetric = "income" | "expenses" | "savings";

type DashboardSparklinePoint = {
  label: string;
  value: number;
};

function isTransactionForSparklineMetric(
  transaction: LocalTransaction,
  metric: DashboardSparklineMetric,
) {
  if (transaction.deleted_at) return false;

  if (metric === "income") {
    return transaction.type === "income" || transaction.type === "salary";
  }

  if (metric === "expenses") {
    return transaction.type === "expense";
  }

  return (
    transaction.type === "savings" ||
    transaction.type === "goal_contribution"
  );
}

function getDaysInSelectedMonth(referenceDate: Date) {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0,
  ).getDate();
}

function createPeriodSparklinePoints(
  values: number[],
  labels: string[],
): DashboardSparklinePoint[] {
  return values.map((value, index) => ({
    label: labels[index] ?? `${index + 1}`,
    value: Math.max(0, value),
  }));
}

function getMonthlyTransactionSparklinePoints(
  transactions: LocalTransaction[],
  referenceDate: Date,
  metric: DashboardSparklineMetric,
) {
  const daysInMonth = getDaysInSelectedMonth(referenceDate);
  const dailyTotals = Array.from({ length: daysInMonth }, () => 0);
  const labels = Array.from({ length: daysInMonth }, (_, index) =>
    `${index + 1}`,
  );

  transactions.forEach((transaction) => {
    if (!isTransactionForSparklineMetric(transaction, metric)) return;

    const transactionDate = safeDate(transaction.date);

    if (!transactionDate) return;

    const isSelectedMonth =
      transactionDate.getMonth() === referenceDate.getMonth() &&
      transactionDate.getFullYear() === referenceDate.getFullYear();

    if (!isSelectedMonth) return;

    const dayIndex = transactionDate.getDate() - 1;
    dailyTotals[dayIndex] += transaction.amount;
  });

  return createPeriodSparklinePoints(dailyTotals, labels);
}

function getMonthlyBillSparklinePoints(
  dueDates: LocalDueDate[],
  referenceDate: Date,
) {
  const daysInMonth = getDaysInSelectedMonth(referenceDate);
  const dailyTotals = Array.from({ length: daysInMonth }, () => 0);
  const labels = Array.from({ length: daysInMonth }, (_, index) =>
    `${index + 1}`,
  );

  dueDates.forEach((bill) => {
    if (bill.deleted_at) return;

    const dueDate = safeDate(bill.due_date);

    if (!dueDate) return;

    const isSelectedMonth =
      dueDate.getMonth() === referenceDate.getMonth() &&
      dueDate.getFullYear() === referenceDate.getFullYear();

    if (!isSelectedMonth) return;

    const dayIndex = dueDate.getDate() - 1;
    dailyTotals[dayIndex] += bill.amount;
  });

  return createPeriodSparklinePoints(dailyTotals, labels);
}

function getYearlyTransactionSparklinePoints(
  transactions: LocalTransaction[],
  referenceDate: Date,
  metric: DashboardSparklineMetric,
) {
  const selectedYear = referenceDate.getFullYear();
  const monthlyTotals = Array.from({ length: 12 }, () => 0);
  const labels = Array.from({ length: 12 }, (_, index) =>
    format(new Date(selectedYear, index, 1), "MMM"),
  );

  transactions.forEach((transaction) => {
    if (!isTransactionForSparklineMetric(transaction, metric)) return;

    const transactionDate = safeDate(transaction.date);

    if (!transactionDate) return;
    if (transactionDate.getFullYear() !== selectedYear) return;

    monthlyTotals[transactionDate.getMonth()] += transaction.amount;
  });

  return createPeriodSparklinePoints(monthlyTotals, labels);
}

function getYearlyBillSparklinePoints(
  dueDates: LocalDueDate[],
  referenceDate: Date,
) {
  const selectedYear = referenceDate.getFullYear();
  const monthlyTotals = Array.from({ length: 12 }, () => 0);
  const labels = Array.from({ length: 12 }, (_, index) =>
    format(new Date(selectedYear, index, 1), "MMM"),
  );

  dueDates.forEach((bill) => {
    if (bill.deleted_at) return;

    const dueDate = safeDate(bill.due_date);

    if (!dueDate) return;
    if (dueDate.getFullYear() !== selectedYear) return;

    monthlyTotals[dueDate.getMonth()] += bill.amount;
  });

  return createPeriodSparklinePoints(monthlyTotals, labels);
}

function DashboardStatSparkline({
  points,
  tone,
  introDelayMs = 0,
}: {
  points: DashboardSparklinePoint[];
  tone: StatTone;
  introDelayMs?: number;
}) {
  const toneClass = statToneClasses[tone];

  const safePoints =
    points.length >= 2
      ? points.map((point) => ({
          ...point,
          value: Math.max(0, point.value),
        }))
      : [
          { label: "Start", value: 0 },
          { label: "End", value: 0 },
        ];

  const maxValue = Math.max(...safePoints.map((point) => point.value), 0);
  const chartWidth = 136;
  const chartHeight = 54;
  const paddingX = 3;
  const paddingY = 7;
  const baselineY = chartHeight - 4;

  const chartPoints = safePoints.map((point, index) => {
    const x =
      safePoints.length === 1
        ? chartWidth / 2
        : paddingX +
          (index / (safePoints.length - 1)) * (chartWidth - paddingX * 2);

    const y =
      maxValue <= 0
        ? chartHeight / 2
        : paddingY +
          (1 - point.value / maxValue) * (chartHeight - paddingY * 2);

    return {
      ...point,
      x,
      y,
    };
  });

  const linePoints = chartPoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const areaPoints =
    chartPoints.length > 1
      ? `${linePoints} ${
          chartPoints[chartPoints.length - 1].x
        },${baselineY} ${chartPoints[0].x},${baselineY}`
      : "";

  return (
    <div className="flex min-w-[132px] items-center justify-end">
      <div className={cn("w-[132px]", toneClass.graph)}>
        <svg
          aria-label="Selected period activity graph"
          className="h-[54px] w-full overflow-visible"
          preserveAspectRatio="none"
          style={
            {
              "--bc-sparkline-delay": `${introDelayMs}ms`,
            } as CSSProperties
          }
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          {areaPoints ? (
            <polygon
              className="bc-sparkline-fill-reveal"
              fill="currentColor"
              opacity="0.08"
              points={areaPoints}
            />
          ) : null}

          <polyline
            className="bc-sparkline-line-draw"
            fill="none"
            opacity={maxValue <= 0 ? "0.45" : "1"}
            pathLength={100}
            points={linePoints}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />

          <line
            className="bc-sparkline-axis-reveal"
            opacity="0.16"
            pathLength={100}
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1"
            x1={paddingX}
            x2={chartWidth - paddingX}
            y1={baselineY}
            y2={baselineY}
          />
        </svg>
      </div>
    </div>
  );
}
function DashboardStatCard({
  title,
  value,
  helper,
  icon: Icon,
  tone,
  trend,
  trendPoints,
  sparklineDelayMs = 0,
}: {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: StatTone;
  trend?: {
    label: string;
    positive: boolean;
  };
  trendPoints: DashboardSparklinePoint[];
  sparklineDelayMs?: number;
}) {
  const toneClass = statToneClasses[tone];

  return (
    <article className={cn("bc-stat-card p-4", toneClass.card)}>
      <div className="flex items-start justify-between gap-3">
        <div className={cn("bc-icon-circle h-9 w-9", toneClass.icon)}>
          <Icon className="h-4.5 w-4.5" strokeWidth={2.4} />
        </div>

        {trend && (
          <span
            className={cn(
              "inline-flex max-w-[160px] items-center gap-1 truncate rounded-full px-2 py-1 text-[10px] font-black",
              trend.positive
                ? "bg-[var(--bc-green-glow)] text-[var(--bc-green)]"
                : "bg-[var(--bc-red-glow)] text-[var(--bc-red)]",
            )}
          >
            {trend.positive ? (
              <TrendingUp className="h-3 w-3 shrink-0" />
            ) : (
              <TrendingDown className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate">{trend.label}</span>
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-[var(--bc-text-soft)]">
            {title}
          </p>

          <p
            className={cn(
              "mt-1 text-2xl font-black leading-none tracking-[-0.04em]",
              toneClass.value,
            )}
          >
            {value}
          </p>

          <p className="mt-2 text-[11px] font-semibold leading-snug text-[var(--bc-text-muted)]">
            {helper}
          </p>
        </div>

        <DashboardStatSparkline
          introDelayMs={sparklineDelayMs}
          points={trendPoints}
          tone={tone}
        />
      </div>
    </article>
  );
}
function SectionHeader({
  title,
  actionLabel,
  to,
}: {
  title: string;
  actionLabel?: string;
  to?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-black tracking-[-0.02em] text-[var(--bc-text)]">
        {title}
      </h2>

      {actionLabel && to ? (
        <Link
          className="inline-flex items-center gap-1 text-xs font-black text-[var(--bc-green)]"
          to={to}
        >
          {actionLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[18px] border border-dashed border-[var(--bc-border)] bg-[var(--bc-card)]/55 px-4 py-5 text-center text-sm font-semibold text-[var(--bc-text-muted)]">
      {children}
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const householdId = user?.householdId ?? "";
  const [nickname, setNickname] = useState(() => getDisplayNickname(user));
  const [showNotifications, setShowNotifications] = useState(false);

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
          .filter((dueDate) => !dueDate.deleted_at)
          .sortBy("due_date"),
      [householdId],
      [],
    ) ?? [];

  const goals =
    useLiveQuery(
      () =>
        db.goals
          .where("household_id")
          .equals(householdId)
          .filter((goal) => !goal.deleted_at)
          .toArray(),
      [householdId],
      [],
    ) ?? [];

  const pendingSyncCount =
    useLiveQuery(
      () =>
        db.sync_queue
          .where("sync_status")
          .anyOf(["pending", "failed"])
          .count(),
      [],
      0,
    ) ?? 0;

  useEffect(() => {
    const updateNickname = () => setNickname(getDisplayNickname(user));

    updateNickname();
    window.addEventListener(nicknameEventName, updateNickname);

    return () => window.removeEventListener(nicknameEventName, updateNickname);
  }, [user]);

  const today = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);
  const [isYearlyView, setIsYearlyView] = useState(false);
  const selectedYear = today.getFullYear();

  const selectedDate = useMemo(
    () => new Date(selectedYear, selectedMonth, 1),
    [selectedMonth, selectedYear],
  );

  const previousMonth = useMemo(() => subMonths(selectedDate, 1), [selectedDate]);
  const previousYearDate = useMemo(
    () => new Date(selectedYear - 1, selectedMonth, 1),
    [selectedMonth, selectedYear],
  );

  const summary = calculateMonthlySummary(transactions, selectedDate);
  const previousSummary = calculateMonthlySummary(transactions, previousMonth);

  const yearlySummary = useMemo(
    () => getYearlySummary(transactions, selectedDate),
    [transactions, selectedDate],
  );

  const previousYearSummary = useMemo(
    () => getYearlySummary(transactions, previousYearDate),
    [transactions, previousYearDate],
  );

  const currentMonthBills = getMonthlyBills(dueDates, selectedDate);
  const previousMonthBills = getMonthlyBills(dueDates, previousMonth);
  const yearlyBills = getYearlyBills(dueDates, selectedDate);
  const previousYearBills = getYearlyBills(dueDates, previousYearDate);

  const billsTotal = currentMonthBills.reduce(
    (sum, bill) => sum + bill.amount,
    0,
  );

  const previousBillsTotal = previousMonthBills.reduce(
    (sum, bill) => sum + bill.amount,
    0,
  );

  const yearlyBillsTotal = yearlyBills.reduce(
    (sum, bill) => sum + bill.amount,
    0,
  );

  const previousYearBillsTotal = previousYearBills.reduce(
    (sum, bill) => sum + bill.amount,
    0,
  );

  const statSummary = isYearlyView ? yearlySummary : summary;
  const statComparisonSummary = isYearlyView
    ? previousYearSummary
    : previousSummary;
  const statBills = isYearlyView ? yearlyBills : currentMonthBills;
  const statBillsTotal = isYearlyView ? yearlyBillsTotal : billsTotal;
  const statComparisonBillsTotal = isYearlyView
    ? previousYearBillsTotal
    : previousBillsTotal;

 const incomeSparklinePoints = isYearlyView
  ? getYearlyTransactionSparklinePoints(transactions, selectedDate, "income")
  : getMonthlyTransactionSparklinePoints(transactions, selectedDate, "income");

const expenseSparklinePoints = isYearlyView
  ? getYearlyTransactionSparklinePoints(transactions, selectedDate, "expenses")
  : getMonthlyTransactionSparklinePoints(
      transactions,
      selectedDate,
      "expenses",
    );

const savingsSparklinePoints = isYearlyView
  ? getYearlyTransactionSparklinePoints(transactions, selectedDate, "savings")
  : getMonthlyTransactionSparklinePoints(
      transactions,
      selectedDate,
      "savings",
    );

const billsSparklinePoints = isYearlyView
  ? getYearlyBillSparklinePoints(dueDates, selectedDate)
  : getMonthlyBillSparklinePoints(dueDates, selectedDate);

  const statComparisonLabel = isYearlyView ? "last year" : "last month";
  const activePeriodLabel = isYearlyView
    ? "Yearly"
    : dashboardMonthOptions.find((month) => month.value === selectedMonth)
        ?.label ?? "This Month";

  const activeGoals = [...goals]
    .filter((goal) => goal.status === "active")
    .sort((a, b) => {
      const priorityDelta =
        getPriorityRank(a.priority) - getPriorityRank(b.priority);

      if (priorityDelta !== 0) return priorityDelta;

      return b.current_amount - a.current_amount;
    });

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  const previewGoals = activeGoals.slice(0, 2);
  const featuredGoal = activeGoals[0];
  const upcomingBills = getDashboardUpcomingBills(dueDates, 3);
  const reminders = getAllReminders(dueDates, goals, transactions);

  const mascotCheckIn = getDashboardMascotCheckIn({
    dueDates,
    goals,
    monthlyExpenses: summary.expenses,
    monthlyIncome: summary.income,
    pendingSyncCount,
    remainingMoney: summary.remaining,
    savings: summary.savings,
    transactions,
  });

  const incomeTrend = getTrendLabel(
    statSummary.income,
    statComparisonSummary.income,
    false,
    statComparisonLabel,
  );

  const expenseTrend = getTrendLabel(
    statSummary.expenses,
    statComparisonSummary.expenses,
    true,
    statComparisonLabel,
  );

  const billsTrend = getTrendLabel(
    statBillsTotal,
    statComparisonBillsTotal,
    true,
    statComparisonLabel,
  );

  const savingsTrend = getTrendLabel(
    statSummary.savings,
    statComparisonSummary.savings,
    false,
    statComparisonLabel,
  );

  const remainingPercent = getRemainingPercent(
    summary.income,
    summary.remaining,
  );
  const spendingPercent = getSpendingPercent(summary.income, summary.expenses);

  const monthLabel = isYearlyView
    ? `${selectedYear} Overview`
    : format(selectedDate, "MMMM yyyy");
  const greeting = getTimeGreeting(selectedDate);

  const safeToSpend = Math.max(0, summary.remaining);
  const cleanMascotMessage = mascotCheckIn.clyde.message
    .replace(/\s*(🔄|🔁|↻)\s*$/u, "")
    .trim();

  return (
    <div className="mx-auto w-full max-w-[430px] px-5 pb-[35px] pt-5 md:max-w-none md:px-0 md:pb-8 md:pt-0">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--bc-text-muted)]">
            {monthLabel}
          </p>
          <h1 className="mt-1 truncate text-xl font-black tracking-[-0.04em] text-[var(--bc-text)] md:text-3xl">
            {greeting}, {nickname}!{" "}
            <span aria-hidden="true" className="bc-wave-emoji">
              {"\u{1F44B}"}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle className="h-10 w-10 rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-card)] text-[var(--bc-text)]" />

          <button
            aria-expanded={showNotifications}
            aria-label="Notifications"
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-card)] text-[var(--bc-text)]",
              (showNotifications || reminders.length > 0) && "bc-bell-active",
            )}
            onClick={() => setShowNotifications((current) => !current)}
            type="button"
          >
            <Bell className="h-4.5 w-4.5" strokeWidth={2.4} />
            {reminders.length > 0 && (
              <span className="bc-notification-dot-pulse absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-[var(--bc-card)] bg-[var(--bc-red)]" />
            )}
          </button>

          <Link
            aria-label="Settings"
            className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-card)] text-[var(--bc-text)] md:flex"
            to="/settings"
          >
            <Settings className="h-4.5 w-4.5" strokeWidth={2.4} />
          </Link>
        </div>
      </header>

      {showNotifications && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/40 px-3 pt-20 backdrop-blur-sm md:hidden"
            onClick={() => setShowNotifications(false)}
          >
            <section
              className="bc-card mx-auto w-full max-w-[430px] p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-[var(--bc-text)]">
                    Notifications
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
                    Bills, goals, and sync reminders from your real BudgetCat data.
                  </p>
                </div>

                <button
                  className="rounded-full border border-[var(--bc-red)]/30 bg-[var(--bc-red-glow)] px-3 py-1 text-xs font-black text-[var(--bc-red)] hover:bg-[var(--bc-red)] hover:text-white"
                  onClick={() => setShowNotifications(false)}
                  type="button"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2">
                {reminders.slice(0, 4).map((reminder) => (
                  <div
                    className="flex items-start gap-3 rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-3"
                    key={reminder.id}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] text-lg">
                      {reminder.icon || "🔔"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-[var(--bc-text)]">
                        {reminder.title}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                        {reminder.body}
                      </p>
                    </div>
                  </div>
                ))}

                {reminders.length === 0 && (
                  <div className="rounded-[18px] border border-[var(--bc-green)]/20 bg-[var(--bc-green-glow)] p-4 text-center">
                    <p className="text-sm font-black text-[var(--bc-text)]">
                      No notifications right now
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
                      Bonnie and Clyde say everything looks calm.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="bc-card mb-4 hidden p-4 md:block">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-[var(--bc-text)]">
                  Notifications
                </h2>
                <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
                  Bills, goals, and sync reminders from your real BudgetCat data.
                </p>
              </div>

              <button
                className="rounded-full border border-[var(--bc-red)]/30 bg-[var(--bc-red-glow)] px-3 py-1 text-xs font-black text-[var(--bc-red)] hover:bg-[var(--bc-red)] hover:text-white"
                onClick={() => setShowNotifications(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              {reminders.slice(0, 4).map((reminder) => (
                <div
                  className="flex items-start gap-3 rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-3"
                  key={reminder.id}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] text-lg">
                    {reminder.icon || "🔔"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-[var(--bc-text)]">
                      {reminder.title}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                      {reminder.body}
                    </p>
                  </div>
                </div>
              ))}

              {reminders.length === 0 && (
                <div className="rounded-[18px] border border-[var(--bc-green)]/20 bg-[var(--bc-green-glow)] p-4 text-center">
                  <p className="text-sm font-black text-[var(--bc-text)]">
                    No notifications right now
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
                    Bonnie and Clyde say everything looks calm.
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <article className="relative z-30 min-h-[176px] overflow-visible px-3 py-2">
            <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[52%] overflow-hidden">
              <BudgetCatMascot
                className="absolute inset-0 flex h-full w-full items-center justify-center"
                imageClassName="h-full w-full scale-[3.75] object-contain object-center"
                variant="both"
              />
            </div>

            <div className="relative z-10 flex min-h-[150px] max-w-[55%] flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)]/80 px-3 py-1 text-[11px] font-black text-[var(--bc-green)]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {pendingSyncCount > 0
                    ? `${pendingSyncCount} pending sync`
                    : "All synced"}
                </div>

                <h2 className="mt-5 text-3xl font-black tracking-[-0.06em] text-[var(--bc-text)]">
                  BudgetCat
                </h2>
                <p className="mt-1 text-sm font-semibold text-[var(--bc-text-muted)]">
                  Smart•Friendly•Focused.
                </p>
              </div>

              <div
                className="relative mt-4 w-fit"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsMonthMenuOpen(false);
                  }
                }}
              >
                <button
                  aria-expanded={isMonthMenuOpen}
                  aria-label="Dashboard period"
                  className="flex h-9 min-w-[116px] items-center justify-between gap-2 rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-card)] px-3 text-xs font-black text-[var(--bc-text-soft)]"
                  onClick={() => setIsMonthMenuOpen((current) => !current)}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-[var(--bc-green)]" />
                    {activePeriodLabel}
                  </span>

                  <span className="text-[10px] text-[var(--bc-text-muted)]">
                    ▾
                  </span>
                </button>

                {isMonthMenuOpen && (
                  <div className="absolute left-0 top-11 z-[999] w-[132px] overflow-hidden rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-card)] p-1 shadow-xl">
                    <div className="max-h-[164px] overflow-y-auto pr-1">
                      {dashboardPeriodOptions.map((option) => {
                        const isActive =
                          option.value === "yearly"
                            ? isYearlyView
                            : !isYearlyView && option.value === selectedMonth;

                        return (
                          <button
                            className={cn(
                              "flex h-8 w-full items-center rounded-xl px-3 text-left text-xs font-black transition",
                              isActive
                                ? "bg-[var(--bc-green-glow)] text-[var(--bc-green)]"
                                : "text-[var(--bc-text-soft)] hover:bg-[var(--bc-surface-soft)]",
                            )}
                            key={String(option.value)}
                            onClick={() => {
                              if (option.value === "yearly") {
                                setIsYearlyView(true);
                              } else {
                                setSelectedMonth(option.value);
                                setIsYearlyView(false);
                              }

                              setIsMonthMenuOpen(false);
                            }}
                            type="button"
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </article>

<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
  <DashboardStatCard
    helper={incomeTrend.label}
    icon={CircleDollarSign}
    sparklineDelayMs={0}
    title="Income"
    tone="green"
    trend={incomeTrend}
    trendPoints={incomeSparklinePoints}
    value={formatCurrency(statSummary.income)}
  />

  <DashboardStatCard
    helper={expenseTrend.label}
    icon={ReceiptText}
    sparklineDelayMs={120}
    title="Expenses"
    tone="red"
    trend={expenseTrend}
    trendPoints={expenseSparklinePoints}
    value={formatCurrency(statSummary.expenses)}
  />

  <DashboardStatCard
    helper={`${statBills.length} bill${
      statBills.length === 1 ? "" : "s"
    } ${isYearlyView ? "this year" : "this month"}`}
    icon={CreditCard}
    sparklineDelayMs={240}
    title="Bills"
    tone="amber"
    trend={billsTrend}
    trendPoints={billsSparklinePoints}
    value={formatCurrency(statBillsTotal)}
  />

  <DashboardStatCard
    helper={savingsTrend.label}
    icon={PiggyBank}
    sparklineDelayMs={360}
    title="Savings"
    tone="blue"
    trend={savingsTrend}
    trendPoints={savingsSparklinePoints}
    value={formatCurrency(statSummary.savings)}
  />
</section>

          <article className="bc-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-[var(--bc-text-soft)]">
                  Remaining
                </p>
                <p className="mt-1 text-3xl font-black tracking-[-0.06em] text-[var(--bc-blue)]">
                  {formatCurrency(summary.remaining)}
                </p>
              </div>

              <span className="rounded-full bg-[var(--bc-blue)]/10 px-3 py-1 text-xs font-black text-[var(--bc-blue)]">
                {remainingPercent}% left
              </span>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-[var(--bc-text-muted)]">
                <span>Income left</span>
                <span>{remainingPercent}%</span>
              </div>
              <div className="bc-progress-track">
                <div
                  className={cn(
                    "bc-progress-fill bc-progress-fill-glow",
                    remainingPercent < 20 && "bc-progress-fill-danger",
                    remainingPercent >= 20 &&
                      remainingPercent < 40 &&
                      "bc-progress-fill-warning",
                  )}
                  style={{ width: `${remainingPercent}%` }}
                />
              </div>
            </div>
          </article>
        </div>

        <div className="space-y-4">
          <article className="relative overflow-visible px-3 py-2">
            <div className="relative grid grid-cols-[128px_1fr] items-center gap-3 overflow-visible">
              <div className="relative min-h-[112px] overflow-visible">
                <BudgetCatMascot
                  className="absolute inset-0 flex h-full w-full items-center justify-center"
                  imageClassName="h-full w-full scale-[2.15] object-contain object-center"
                  variant="both"
                />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-black leading-snug text-[var(--bc-text)]">
                  Keep it up, {nickname}!
                </p>

                <p className="mt-2 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                  {cleanMascotMessage}

                  {pendingSyncCount > 0 ? (
                    <span className="ml-1.5 inline-flex align-[-2px] text-[var(--bc-blue)]">
                      <RefreshCw
                        aria-label="Sync in progress"
                        className="h-3.5 w-3.5 animate-spin"
                        strokeWidth={2.6}
                      />
                    </span>
                  ) : (
                    <span className="ml-1.5 inline-flex align-[-2px] text-[var(--bc-green)]">
                      <ShieldCheck
                        aria-label="All synced"
                        className="h-3.5 w-3.5"
                        strokeWidth={2.6}
                      />
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-[var(--bc-border)] bg-[var(--bc-card)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[var(--bc-text-muted)]">
                    This Month Summary
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.06em] text-[var(--bc-text)]">
                    {formatCurrency(summary.remaining)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
                    Remaining • {remainingPercent}% of income left
                  </p>
                </div>

                <span className="rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-green-glow)] px-3 py-2 text-xs font-black text-[var(--bc-green)]">
                  {monthLabel}
                </span>
              </div>

              <div className="mt-4 bc-progress-track">
                <div
                  className="bc-progress-fill"
                  style={{ width: `${remainingPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-[20px] border border-[var(--bc-red)]/15 bg-[var(--bc-red-glow)] p-3">
                <p className="text-xs font-black text-[var(--bc-text-muted)]">
                  You’ve spent
                </p>
                <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-[var(--bc-red)]">
                  {spendingPercent}%
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[var(--bc-text-muted)]">
                  of your income
                </p>
              </div>

              <div className="rounded-[20px] border border-[var(--bc-green)]/15 bg-[var(--bc-green-glow)] p-3">
                <p className="text-xs font-black text-[var(--bc-text-muted)]">
                  You can spend
                </p>
                <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-[var(--bc-green)]">
                  {formatCurrency(safeToSpend)}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[var(--bc-text-muted)]">
                  more this month
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-3 text-center text-sm font-black text-[var(--bc-text)] md:text-left">
                Quick Actions
              </p>

              <div className="grid grid-cols-4 gap-2">
               <AddTransactionDialog
  ariaLabel="Add transaction"
  className="group flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-card)] px-2 text-center text-[11px] font-black text-[var(--bc-text-soft)] transition hover:border-[var(--bc-green)]/35 hover:bg-[var(--bc-green-glow)] [&>svg]:h-8 [&>svg]:w-8 [&>svg]:rounded-full [&>svg]:border [&>svg]:border-[var(--bc-green)]/25 [&>svg]:bg-[var(--bc-green-glow)] [&>svg]:p-2 [&>svg]:text-[var(--bc-green)]"
  compact
  label="Add"
/>

                <Link
                  className="flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-card)] px-2 text-center text-[11px] font-black text-[var(--bc-text-soft)]"
                  to="/transactions"
                >
                  <span className="bc-icon-circle-green flex h-8 w-8 items-center justify-center rounded-full">
                    <ListChecks className="h-4 w-4" />
                  </span>
                  Ledger
                </Link>

                <Link
                  className="flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-card)] px-2 text-center text-[11px] font-black text-[var(--bc-text-soft)]"
                  to="/due-dates"
                >
                  <span className="bc-icon-circle-amber flex h-8 w-8 items-center justify-center rounded-full">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  Bills
                </Link>

                <Link
                  className="flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-card)] px-2 text-center text-[11px] font-black text-[var(--bc-text-soft)]"
                  to="/goals"
                >
                  <span className="bc-icon-circle-blue flex h-8 w-8 items-center justify-center rounded-full">
                    <Target className="h-4 w-4" />
                  </span>
                  Goals
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="bc-card p-4">
          <SectionHeader
            actionLabel="View all"
            title="Recent transactions"
            to="/transactions"
          />

          <div className="space-y-3">
            {recentTransactions.map((transaction) => {
              const isIncome = isIncomeTransaction(transaction);
              const isSavings = isSavingsTransaction(transaction);
              const amountPrefix = isIncome ? "+" : "-";

              return (
                <div
                  className="flex items-center gap-3 rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/55 p-3"
                  key={transaction.id}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--bc-card)] text-xl">
                    {getDashboardTransactionIcon(transaction)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[var(--bc-text)]">
                      {getCategoryLabel(transaction.category)}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--bc-text-muted)]">
                      {getTypeLabel(transaction.type)} •{" "}
                      {formatDate(transaction.date, "MMM d")}
                    </p>
                  </div>

                  <p
                    className={cn(
                      "shrink-0 text-sm font-black",
                      isIncome && "text-[var(--bc-green)]",
                      isSavings && "text-[var(--bc-blue)]",
                      !isIncome && !isSavings && "text-[var(--bc-red)]",
                    )}
                  >
                    {amountPrefix}
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              );
            })}

            {recentTransactions.length === 0 && (
              <EmptyState>No transactions yet.</EmptyState>
            )}
          </div>
        </article>

        <article className="bc-card p-4">
          <SectionHeader
            actionLabel="View all"
            title="Upcoming bills"
            to="/due-dates"
          />

          <div className="space-y-3">
            {upcomingBills.map((bill) => (
              <div
                className="flex items-center gap-3 rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/55 p-3"
                key={bill.id}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--bc-card)] text-xl">
                  {getDueDateIcon(bill) || "🧾"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[var(--bc-text)]">
                    {bill.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--bc-text-muted)]">
                    {formatDate(bill.due_date, "MMM d")} •{" "}
                    {bill.repeat_type === "none"
                      ? "One-time"
                      : `Repeats ${bill.repeat_type}`}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-bold text-[var(--bc-text-muted)]">
                    {getBillDaysLeftLabel(bill)}
                  </p>
                  <p className="mt-1 text-sm font-black text-[var(--bc-red)]">
                    {formatCurrency(bill.amount)}
                  </p>
                </div>
              </div>
            ))}

            {upcomingBills.length === 0 && (
              <EmptyState>No unpaid bills right now.</EmptyState>
            )}
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="bc-card p-4">
          <SectionHeader actionLabel="View all" title="Goals" to="/goals" />

          {featuredGoal ? (
            <div className="mb-3 rounded-[22px] border border-[var(--bc-border)] bg-[var(--bc-green-glow)] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--bc-card)] text-2xl">
                  {getGoalIcon(featuredGoal) || "🌱"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black text-[var(--bc-text)]">
                    {featuredGoal.title}
                  </p>
                  <p className="mt-1 text-sm font-black text-[var(--bc-green)]">
                    {formatCurrency(featuredGoal.current_amount)} /{" "}
                    {formatCurrency(featuredGoal.target_amount)}
                  </p>

                  <div className="mt-3 bc-progress-track">
                    <div
                      className="bc-progress-fill"
                      style={{ width: `${getGoalProgress(featuredGoal)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-[var(--bc-text-muted)]">
                    <span>{getGoalProgress(featuredGoal)}% complete</span>
                    <span>{getGoalMonthsLeft(featuredGoal)} months left</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            {previewGoals.map((goal) => {
              const progress = getGoalProgress(goal);

              return (
                <div
                  className="rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/55 p-3"
                  key={goal.id}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--bc-card)] text-xl">
                      {getGoalIcon(goal) || "🌱"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[var(--bc-text)]">
                            {goal.title}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--bc-text-muted)]">
                            Target:{" "}
                            {formatDate(goal.target_date, "MMM d, yyyy")}
                          </p>
                        </div>

                        <p className="shrink-0 text-xs font-black text-[var(--bc-green)]">
                          {progress}%
                        </p>
                      </div>

                      <div className="mt-3 bc-progress-track">
                        <div
                          className="bc-progress-fill"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {previewGoals.length === 0 && (
              <EmptyState>No active goals yet.</EmptyState>
            )}
          </div>
        </article>

        <article className="bc-card p-4">
          <SectionHeader title="Budget health" />

          <div className="rounded-[22px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/55 p-4">
            <div className="flex items-start gap-3">
              <div className="bc-icon-circle bc-icon-circle-green">
                <Landmark className="h-4.5 w-4.5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[var(--bc-text)]">
                  Monthly spending
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--bc-text-muted)]">
                  You have spent {spendingPercent}% of your income this month.
                </p>
              </div>
            </div>

            <div className="mt-4 bc-progress-track">
              <div
                className={cn(
                  "bc-progress-fill",
                  spendingPercent >= 80 && "bc-progress-fill-danger",
                  spendingPercent >= 60 &&
                    spendingPercent < 80 &&
                    "bc-progress-fill-warning",
                )}
                style={{ width: `${spendingPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {reminders.slice(0, 3).map((reminder) => (
              <div
                className={cn(
                  "flex items-start gap-3 rounded-[18px] border p-3",
                  getReminderToneClass(reminder),
                )}
                key={reminder.id}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bc-card)] text-lg">
                  {reminder.icon || "🔔"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[var(--bc-text)]">
                    {reminder.title}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                    {reminder.body}
                  </p>
                </div>
              </div>
            ))}

            {reminders.length === 0 && (
              <div className="flex items-center gap-3 rounded-[18px] border border-[var(--bc-green)]/20 bg-[var(--bc-green-glow)] p-3">
                <div className="bc-icon-circle-green">
                  <Home className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-black text-[var(--bc-text)]">
                    No urgent reminders
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[var(--bc-text-muted)]">
                    Bonnie and Clyde say your dashboard looks calm today.
                  </p>
                </div>
              </div>
            )}
          </div>

          <Link
            className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-card)] text-sm font-black text-[var(--bc-text-soft)]"
            to="/reports"
          >
            <Wallet className="h-4.5 w-4.5 text-[var(--bc-green)]" />
            Open Reports
          </Link>
        </article>
      </section>

      <div className="mt-3 md:hidden">
        <Link
          className="flex min-h-11 items-center justify-center gap-2 rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-card)] text-sm font-black text-[var(--bc-text-soft)]"
          to="/settings"
        >
          <Settings className="h-4.5 w-4.5 text-[var(--bc-green)]" />
          Settings
        </Link>
      </div>
    </div>
  );
}


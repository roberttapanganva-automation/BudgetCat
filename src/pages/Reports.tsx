import { format, getMonth, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDownRight,
  CalendarDays,
  ReceiptText,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "../components/dashboard/PageHeader";
import { ReportCard } from "../components/reports/ReportCard";
import { Card } from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { getCategoryLabel } from "../lib/categoryConfig";
import { db } from "../lib/localDb";
import { cn, formatCurrency } from "../lib/utils";

const currentYearColor = "var(--budget-primary)";
const comparisonYearColor = "var(--budget-cream-3)";
const BASE_REPORT_YEAR = 2026;

type ReportView = "yearly" | `${number}`;

type ReportSummary = {
  income: number;
  expenses: number;
  savings: number;
  bills: number;
  net: number;
};

type ReportTransaction = {
  id: string;
  type: string;
  amount: number;
  category: string;
  date: string;
  deleted_at?: string | null;
};

type ReportDueDate = {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  status: string;
  deleted_at?: string | null;
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

const monthOptions = Array.from({ length: 12 }, (_, monthIndex) => ({
  value: String(monthIndex),
  label: format(new Date(BASE_REPORT_YEAR, monthIndex, 1), "MMMM"),
  shortLabel: format(new Date(BASE_REPORT_YEAR, monthIndex, 1), "MMM"),
}));

function getReportChartColor(key: string) {
  if (key.toLowerCase().includes("income")) return "var(--budget-cat)";
  if (key.toLowerCase().includes("expenses") || key.toLowerCase().includes("bills")) {
    return "var(--budget-urgent)";
  }
  return currentYearColor;
}

function currencyTooltipFormatter(value: unknown) {
  return formatReportCurrency(Number(value || 0));
}

function compactCurrencyTick(value: unknown) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000) return `₱${Math.round(amount / 1000)}k`;
  return `₱${amount}`;
}

function formatReportCurrency(amount: number) {
  return formatCurrency(amount).replace(/^PHP\s?/, "₱");
}

function cleanReportText(value: string) {
  return value.replace(/PHP\s?/g, "₱");
}

function parseLocalDate(value?: string | null) {
  if (!value) return null;
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function isSameReportPeriod(value: string, year: number, monthIndex?: number) {
  const parsed = parseLocalDate(value);
  if (!parsed) return false;
  if (parsed.getFullYear() !== year) return false;
  if (typeof monthIndex === "number" && parsed.getMonth() !== monthIndex) return false;
  return true;
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

function buildSummaryForPeriod(
  transactions: ReportTransaction[],
  dueDates: ReportDueDate[],
  year: number,
  monthIndex?: number,
): ReportSummary {
  const periodTransactions = transactions.filter((transaction) =>
    isSameReportPeriod(transaction.date, year, monthIndex),
  );
  const periodBills = dueDates.filter((bill) => isSameReportPeriod(bill.due_date, year, monthIndex));

  const income = periodTransactions
    .filter((transaction) => isIncomeType(transaction.type))
    .reduce((sum, transaction) => sum + getSafeAmount(transaction.amount), 0);

  const expenses = periodTransactions
    .filter((transaction) => isExpenseType(transaction.type))
    .reduce((sum, transaction) => sum + getSafeAmount(transaction.amount), 0);

  const savings = periodTransactions
    .filter((transaction) => isSavingsType(transaction.type))
    .reduce((sum, transaction) => sum + getSafeAmount(transaction.amount), 0);

  const bills = periodBills.reduce((sum, bill) => sum + getSafeAmount(bill.amount), 0);
  const net = income - (expenses + bills + savings);

  return { income, expenses, savings, bills, net };
}

function hasSummaryData(summary: ReportSummary) {
  return summary.income > 0 || summary.expenses > 0 || summary.savings > 0 || summary.bills > 0;
}

function buildCategoriesForPeriod(
  transactions: ReportTransaction[],
  year: number,
  monthIndex?: number,
): ReportCategory[] {
  const categoryMap = new Map<string, number>();

  transactions
    .filter((transaction) => isExpenseType(transaction.type))
    .filter((transaction) => isSameReportPeriod(transaction.date, year, monthIndex))
    .forEach((transaction) => {
      const label = getCategoryLabel(transaction.category || "other");
      categoryMap.set(label, (categoryMap.get(label) ?? 0) + getSafeAmount(transaction.amount));
    });

  const totalExpenses = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0);

  return Array.from(categoryMap.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      percent: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function buildBillsForPeriod(dueDates: ReportDueDate[], year: number, monthIndex?: number): ReportBill[] {
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

function buildHighestBill(dueDates: ReportDueDate[], year: number, monthIndex?: number) {
  const [highestBill] = buildBillsForPeriod(dueDates, year, monthIndex).sort((a, b) => b.amount - a.amount);
  if (!highestBill) return null;
  return { title: highestBill.title, amount: highestBill.amount };
}

function buildTransactionsForPeriod(
  transactions: ReportTransaction[],
  year: number,
  monthIndex?: number,
): ReportTransaction[] {
  return transactions
    .filter((transaction) => isSameReportPeriod(transaction.date, year, monthIndex))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function buildSelectedMonthInsights(summary: ReportSummary, selectedMonthLabel: string) {
  if (!hasSummaryData(summary)) {
    return [`No written BudgetCat data found for ${selectedMonthLabel} yet.`];
  }

  const totalOutflow = summary.expenses + summary.bills + summary.savings;
  const insights: string[] = [];

  if (summary.net >= 0) {
    insights.push(`You stayed positive by ${formatReportCurrency(summary.net)} after expenses, bills, and savings.`);
  } else {
    insights.push(`Outflow exceeded income by ${formatReportCurrency(Math.abs(summary.net))} this month.`);
  }

  if (summary.income > 0 && totalOutflow > 0) {
    const outflowRate = Math.round((totalOutflow / summary.income) * 100);
    insights.push(`Total outflow used ${outflowRate}% of your recorded income.`);
  }

  if (summary.bills > 0 && totalOutflow > 0) {
    const billShare = Math.round((summary.bills / totalOutflow) * 100);
    insights.push(`Bills made up ${billShare}% of your total outflow.`);
  }

  if (summary.savings > 0) {
    insights.push(`You added ${formatReportCurrency(summary.savings)} toward savings or goals.`);
  }

  return insights;
}

function getDataYears(transactions: ReportTransaction[], dueDates: ReportDueDate[]) {
  const years = new Set<number>();

  transactions.forEach((transaction) => {
    const parsed = parseLocalDate(transaction.date);
    if (parsed && parsed.getFullYear() >= BASE_REPORT_YEAR) years.add(parsed.getFullYear());
  });

  dueDates.forEach((bill) => {
    const parsed = parseLocalDate(bill.due_date);
    if (parsed && parsed.getFullYear() >= BASE_REPORT_YEAR) years.add(parsed.getFullYear());
  });

  return Array.from(years);
}

function buildYearOptions(transactions: ReportTransaction[], dueDates: ReportDueDate[], selectedYear: number) {
  const dataYears = getDataYears(transactions, dueDates);
  const maxYear = Math.max(
    BASE_REPORT_YEAR + 5,
    new Date().getFullYear() + 5,
    selectedYear + 1,
    ...dataYears,
  );

  return Array.from({ length: maxYear - BASE_REPORT_YEAR + 1 }, (_, index) => BASE_REPORT_YEAR + index);
}

function buildReportsAnalytics(
  transactions: ReportTransaction[],
  dueDates: ReportDueDate[],
  selectedMonth: number,
  selectedYear: number,
) {
  const comparisonYear = selectedYear + 1;
  const selectedMonthLabel = `${monthOptions[selectedMonth]?.label ?? "Selected month"} ${selectedYear}`;

  const yearlySummary = buildSummaryForPeriod(transactions, dueDates, selectedYear);
  const comparisonYearSummary = buildSummaryForPeriod(transactions, dueDates, comparisonYear);
  const selectedMonthSummary = buildSummaryForPeriod(transactions, dueDates, selectedYear, selectedMonth);

  const yearlyData = monthOptions.map((month) => {
    const selectedYearMonthSummary = buildSummaryForPeriod(
      transactions,
      dueDates,
      selectedYear,
      Number(month.value),
    );
    const comparisonYearMonthSummary = buildSummaryForPeriod(
      transactions,
      dueDates,
      comparisonYear,
      Number(month.value),
    );

    return {
      month: month.shortLabel,
      monthIndex: Number(month.value),
      currentIncome: selectedYearMonthSummary.income,
      previousIncome: comparisonYearMonthSummary.income,
      currentExpenses: selectedYearMonthSummary.expenses,
      previousExpenses: comparisonYearMonthSummary.expenses,
      currentSavings: selectedYearMonthSummary.savings,
      previousSavings: comparisonYearMonthSummary.savings,
      currentNet: selectedYearMonthSummary.net,
      previousNet: comparisonYearMonthSummary.net,
      currentBills: selectedYearMonthSummary.bills,
      previousBills: comparisonYearMonthSummary.bills,
    };
  });

  const yearlyCategories = buildCategoriesForPeriod(transactions, selectedYear);
  const selectedMonthCategories = buildCategoriesForPeriod(transactions, selectedYear, selectedMonth);
  const yearlyBills = buildBillsForPeriod(dueDates, selectedYear);
  const selectedMonthBills = buildBillsForPeriod(dueDates, selectedYear, selectedMonth);
  const selectedMonthTransactions = buildTransactionsForPeriod(transactions, selectedYear, selectedMonth);

  return {
    currentYear: selectedYear,
    previousYear: comparisonYear,
    monthOptions,
    selectedMonthLabel,
    yearlyData,
    yearlySummary,
    selectedMonthSummary,
    yearlyCategories,
    selectedMonthCategories,
    yearlyBills,
    selectedMonthBills,
    selectedMonthTransactions,
    selectedMonthInsights: buildSelectedMonthInsights(selectedMonthSummary, selectedMonthLabel),
    highestYearBill: buildHighestBill(dueDates, selectedYear),
    highestSelectedMonthBill: buildHighestBill(dueDates, selectedYear, selectedMonth),
    hasCurrentYearData: hasSummaryData(yearlySummary),
    hasPreviousYearData: hasSummaryData(comparisonYearSummary),
    hasSelectedMonthData: hasSummaryData(selectedMonthSummary),
    hasBillData: dueDates.some((bill) => isSameReportPeriod(bill.due_date, selectedYear)),
  };
}

function EmptyReportState({ children }: { children: string }) {
  return (
    <div className="grid h-full min-h-40 place-items-center rounded-lg bg-budget-background p-4 text-center text-sm font-semibold text-budget-text/55">
      {children}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "text-budget-text",
  icon: Icon,
}: {
  label: string;
  value: number;
  tone?: string;
  icon: typeof Wallet;
}) {
  return (
    <Card className="min-w-0 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-budget-text/60">{label}</p>
          <p className={cn("mt-2 whitespace-nowrap font-display text-2xl font-black", tone)}>
            {formatReportCurrency(value)}
          </p>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-budget-background text-budget-primary">
          <Icon size={19} />
        </div>
      </div>
    </Card>
  );
}

function ProgressComparisonList({
  items,
}: {
  items: Array<{ name: string; amount: number; percent: number }>;
}) {
  return (
    <div className="mt-4 grid gap-3">
      {items.map((item) => {
        const safePercent = Math.min(100, Math.max(0, item.percent));

        return (
          <div
            className="grid gap-2 rounded-xl border border-budget-border bg-budget-background p-3"
            key={item.name}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-black text-budget-text">{item.name}</p>
              <p className="shrink-0 text-xs font-black text-budget-text/70">
                {item.percent}%
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-budget-urgent/10 ring-1 ring-budget-border">
              <div
                className="h-full rounded-full bg-budget-urgent"
                style={{ width: `${safePercent}%` }}
              />
            </div>
            <p className="text-xs font-semibold text-budget-urgent">
              {formatReportCurrency(item.amount)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function WrittenSummary({
  title,
  summary,
  categories,
  bills,
  highestCategory,
  highestBill,
}: {
  title: string;
  summary: ReportSummary;
  categories: ReportCategory[];
  bills: ReportBill[];
  highestCategory?: { name: string; amount: number; percent: number };
  highestBill?: { title: string; amount: number } | null;
}) {
  const totalOutflow = summary.expenses + summary.bills + summary.savings;
  const netAmount = summary.income - totalOutflow;
  const billTotal = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const billComparisons = bills
    .map((bill) => ({
      name: bill.title,
      amount: bill.amount,
      percent: billTotal > 0 ? Math.round((bill.amount / billTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <section className="mb-6">
      <div className="mb-3">
        <h2 className="text-xl font-black text-budget-text">{title}</h2>
        <p className="text-sm font-semibold text-budget-text/55">
          Written totals from local BudgetCat data.
        </p>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryTile icon={Wallet} label="Salary / Income" tone="text-budget-cat" value={summary.income} />
        <SummaryTile icon={ReceiptText} label="Expenses" tone="text-budget-urgent" value={summary.expenses} />
        <SummaryTile icon={CalendarDays} label="Bills" tone="text-budget-urgent" value={summary.bills} />
        <SummaryTile icon={TrendingUp} label="Savings" tone="text-budget-primary" value={summary.savings} />
        <SummaryTile icon={ArrowDownRight} label="Total Outflow" tone="text-budget-urgent" value={totalOutflow} />
        <SummaryTile
          icon={Scale}
          label="Net Amount"
          tone={netAmount >= 0 ? "text-budget-success" : "text-budget-urgent"}
          value={netAmount}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <p className="text-sm font-black text-budget-text/60">Highest Expense by Category</p>
          {highestCategory ? (
            <>
              <p className="mt-2 text-lg font-black text-budget-text">{highestCategory.name}</p>
              <p className="text-sm font-semibold text-budget-text/55">
                {formatReportCurrency(highestCategory.amount)} - {highestCategory.percent}% of expenses
              </p>
              <ProgressComparisonList items={categories} />
            </>
          ) : (
            <p className="mt-2 text-sm font-semibold text-budget-text/55">
              No expense category data yet.
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-sm font-black text-budget-text/60">Highest bill</p>
          {highestBill ? (
            <>
              <p className="mt-2 text-lg font-black text-budget-text">{highestBill.title}</p>
              <p className="text-sm font-semibold text-budget-text/55">
                {formatReportCurrency(highestBill.amount)}
              </p>
              <ProgressComparisonList items={billComparisons} />
            </>
          ) : (
            <p className="mt-2 text-sm font-semibold text-budget-text/55">
              No bill data found.
            </p>
          )}
        </Card>
      </div>
    </section>
  );
}

function YearlyComparisonChart({
  title,
  subtitle,
  currentKey,
  previousKey,
  currentYear,
  previousYear,
  data,
  emptyText,
}: {
  title: string;
  subtitle: string;
  currentKey: string;
  previousKey: string;
  currentYear: number;
  previousYear: number;
  data: Array<Record<string, string | number>>;
  emptyText: string;
}) {
  const hasData = data.some(
    (month) => Number(month[currentKey] || 0) > 0 || Number(month[previousKey] || 0) > 0,
  );

  return (
    <ReportCard subtitle={subtitle} title={title}>
      {!hasData ? (
        <EmptyReportState>{emptyText}</EmptyReportState>
      ) : (
        <ResponsiveContainer height="100%" minWidth={0} width="100%">
          <BarChart data={data} margin={{ bottom: 8, left: 0, right: 4, top: 12 }}>
            <CartesianGrid stroke="var(--budget-cream-3)" vertical={false} />
            <XAxis dataKey="month" stroke="var(--budget-text-secondary)" tickLine={false} />
            <YAxis
              stroke="var(--budget-text-secondary)"
              tickFormatter={compactCurrencyTick}
              tickLine={false}
              width={58}
            />
            <Tooltip formatter={currencyTooltipFormatter} />
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 800 }} />
            <Bar dataKey={currentKey} fill={getReportChartColor(currentKey)} name={String(currentYear)} radius={[8, 8, 0, 0]} />
            <Bar dataKey={previousKey} fill={comparisonYearColor} name={String(previousYear)} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ReportCard>
  );
}

function formatDate(value: string) {
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "MMM d");
}

export function Reports() {
  const { user } = useAuth();
  const householdId = user?.householdId ?? "";
  const defaultReportYear = Math.max(BASE_REPORT_YEAR, new Date().getFullYear());
  const [selectedReportView, setSelectedReportView] = useState<ReportView>("yearly");
  const [selectedYear, setSelectedYear] = useState(defaultReportYear);
  const selectedMonth =
    selectedReportView === "yearly" ? getMonth(new Date()) : Number(selectedReportView);
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

  const reportTransactions = transactions as ReportTransaction[];
  const reportDueDates = dueDates as ReportDueDate[];
  const reports = buildReportsAnalytics(reportTransactions, reportDueDates, selectedMonth, selectedYear);
  const reportYearOptions = buildYearOptions(reportTransactions, reportDueDates, selectedYear);
  const isYearlyView = selectedReportView === "yearly";
  const chartData = isYearlyView
    ? reports.yearlyData
    : reports.yearlyData.filter((month) => month.monthIndex === selectedMonth);
  const reportTitle = isYearlyView
    ? `${reports.currentYear} vs ${reports.previousYear}`
    : `${reports.selectedMonthLabel} Report`;
  const reportSubtitle = isYearlyView
    ? `Monthly breakdown comparing ${reports.currentYear} with ${reports.previousYear}.`
    : `${reports.selectedMonthLabel} with a forward comparison against ${reports.previousYear}.`;

  return (
    <>
      <PageHeader
        action={
          <div className="grid w-full min-w-0 grid-cols-[1fr_auto] gap-2 sm:min-w-[22rem]">
            <label className="grid min-w-0 gap-2 text-sm font-bold">
              Month
              <select
                className="budget-input"
                onChange={(event) => setSelectedReportView(event.target.value as ReportView)}
                value={selectedReportView}
              >
                <option value="yearly">Yearly</option>
                {reports.monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid w-28 shrink-0 gap-2 text-sm font-bold">
              Year
              <select
                className="budget-input"
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
        }
        subtitle="Your yearly comparison and monthly spending details, stored locally on your device."
        title="Summary Reports"
      />

      {!reports.hasCurrentYearData && !reports.hasPreviousYearData && !reports.hasBillData && (
        <Card className="mb-5 p-6 text-sm font-semibold text-budget-text/55">
          Add transactions to unlock yearly comparison.
        </Card>
      )}

      <WrittenSummary
        bills={isYearlyView ? reports.yearlyBills : reports.selectedMonthBills}
        categories={isYearlyView ? reports.yearlyCategories : reports.selectedMonthCategories}
        highestBill={isYearlyView ? reports.highestYearBill : reports.highestSelectedMonthBill}
        highestCategory={
          isYearlyView ? reports.yearlyCategories[0] : reports.selectedMonthCategories[0]
        }
        summary={isYearlyView ? reports.yearlySummary : reports.selectedMonthSummary}
        title={isYearlyView ? `${reports.currentYear} Written Summary` : `${reports.selectedMonthLabel} Written Summary`}
      />

      <div className="mb-6 md:hidden">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-budget-text">
                Spending by Category
              </h3>
              <p className="text-sm font-semibold text-budget-text/55">
                See where your money goes
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {(isYearlyView ? reports.yearlyCategories : reports.selectedMonthCategories).length > 0 ? (
              (isYearlyView ? reports.yearlyCategories : reports.selectedMonthCategories).map(
                (category) => (
                  <div
                    className="grid gap-2 rounded-xl border border-budget-border bg-budget-background p-3"
                    key={category.name}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-black text-budget-text">{category.name}</p>
                      <p className="shrink-0 text-xs font-black text-budget-text/55">
                        {category.percent}%
                      </p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-budget-urgent/10 ring-1 ring-budget-border">
                      <div
                        className="h-full rounded-full bg-budget-urgent"
                        style={{ width: `${category.percent}%` }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-budget-urgent">
                      {formatReportCurrency(category.amount)}
                    </p>
                  </div>
                ),
              )
            ) : (
              <p className="rounded-xl bg-budget-background p-4 text-sm font-semibold text-budget-text/55">
                No category data yet.
              </p>
            )}
          </div>
        </Card>
      </div>

      <section className="mb-6">
        <div className="mb-3">
          <h2 className="text-xl font-black text-budget-text">{reportTitle}</h2>
          <p className="text-sm font-semibold text-budget-text/55">
            {reportSubtitle}
          </p>
        </div>
        <div className="grid min-w-0 gap-5 xl:grid-cols-2">
          <YearlyComparisonChart
            currentKey="currentIncome"
            currentYear={reports.currentYear}
            data={chartData}
            emptyText="No income data found for these years."
            previousKey="previousIncome"
            previousYear={reports.previousYear}
            subtitle="Salary and income per month"
            title="Yearly Income Comparison"
          />
          <YearlyComparisonChart
            currentKey="currentExpenses"
            currentYear={reports.currentYear}
            data={chartData}
            emptyText="No expense data found for these years."
            previousKey="previousExpenses"
            previousYear={reports.previousYear}
            subtitle="Expenses per month"
            title="Yearly Expenses Comparison"
          />
          <YearlyComparisonChart
            currentKey="currentSavings"
            currentYear={reports.currentYear}
            data={chartData}
            emptyText="No savings data found for these years."
            previousKey="previousSavings"
            previousYear={reports.previousYear}
            subtitle="Savings and goal contributions"
            title="Yearly Savings Comparison"
          />
          <YearlyComparisonChart
            currentKey="currentNet"
            currentYear={reports.currentYear}
            data={chartData}
            emptyText="No net data found for these years."
            previousKey="previousNet"
            previousYear={reports.previousYear}
            subtitle="Income minus expenses, bills, and savings"
            title="Yearly Net Comparison"
          />
          <YearlyComparisonChart
            currentKey="currentBills"
            currentYear={reports.currentYear}
            data={chartData}
            emptyText="No bill data found for these years."
            previousKey="previousBills"
            previousYear={reports.previousYear}
            subtitle="Due date totals per month"
            title="Yearly Bills Comparison"
          />
        </div>
      </section>

      {!isYearlyView && (
      <section className="mb-6">
        <div className="mb-3">
          <h2 className="text-xl font-black text-budget-text">{reports.selectedMonthLabel}</h2>
          <p className="text-sm font-semibold text-budget-text/55">
            Selected month detail for {reports.currentYear}.
          </p>
        </div>
        {!reports.hasSelectedMonthData && (
          <Card className="mb-5 p-6 text-sm font-semibold text-budget-text/55">
            No report data for this month yet.
          </Card>
        )}

        <div className="grid min-w-0 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <ReportCard subtitle="Readable expense category labels" title="Top Expense Categories">
            {reports.selectedMonthCategories.length === 0 ? (
              <EmptyReportState>No category data for this month yet.</EmptyReportState>
            ) : (
              <ResponsiveContainer height="100%" minWidth={0} width="100%">
                <BarChart
                  data={reports.selectedMonthCategories}
                  layout="vertical"
                  margin={{ bottom: 4, left: 8, right: 16, top: 8 }}
                >
                  <CartesianGrid stroke="var(--budget-cream-3)" horizontal={false} />
                  <XAxis hide type="number" />
                  <YAxis
                    dataKey="name"
                    stroke="var(--budget-text-secondary)"
                    tickLine={false}
                    type="category"
                    width={118}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => [
                      `${currencyTooltipFormatter(value)} (${item.payload.percent}%)`,
                      "Amount",
                    ]}
                  />
                  <Bar dataKey="amount" fill="var(--budget-cat)" name="Amount" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ReportCard>

          <Card className="min-w-0 p-5">
            <h3 className="text-lg font-black text-budget-text">Bills this month</h3>
            <div className="mt-4 grid gap-3">
              {reports.selectedMonthBills.map((bill) => (
                <div className="grid gap-2 rounded-lg bg-budget-background p-3 sm:grid-cols-[1fr_auto]" key={bill.id}>
                  <div className="min-w-0">
                    <p className="truncate font-black">{bill.title}</p>
                    <p className="text-xs font-semibold text-budget-text/55">
                      {formatDate(bill.dueDate)} - {bill.status}
                    </p>
                  </div>
                  <p className="font-display text-lg font-black text-budget-urgent">{formatReportCurrency(bill.amount)}</p>
                </div>
              ))}
              {reports.selectedMonthBills.length === 0 && (
                <p className="rounded-lg bg-budget-background p-4 text-sm font-semibold text-budget-text/55">
                  No bill data found for this month.
                </p>
              )}
            </div>
          </Card>
        </div>
      </section>
      )}

      {!isYearlyView && (
      <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <Card className="min-w-0 p-5">
          <h3 className="text-lg font-black text-budget-text">Recent transactions</h3>
          <div className="mt-4 grid gap-3">
            {reports.selectedMonthTransactions.slice(0, 8).map((transaction) => {
              const isPositive = isIncomeType(transaction.type);

              return (
                <div className="grid gap-2 rounded-lg bg-budget-background p-3 sm:grid-cols-[1fr_auto]" key={transaction.id}>
                  <div className="min-w-0">
                    <p className="truncate font-black">
                      {getCategoryLabel(transaction.category)}
                    </p>
                    <p className="text-xs font-semibold text-budget-text/55">
                      {formatDate(transaction.date)}
                    </p>
                  </div>
                  <p className={cn("font-black", isPositive ? "text-budget-success" : "text-budget-text")}>
                    {isPositive ? "+" : "-"}
                    {formatReportCurrency(transaction.amount)}
                  </p>
                </div>
              );
            })}
            {reports.selectedMonthTransactions.length === 0 && (
              <p className="rounded-lg bg-budget-background p-4 text-sm font-semibold text-budget-text/55">
                No transactions recorded for this month yet.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-black text-budget-text">Month insights</h3>
          <div className="mt-4 grid gap-3">
            {reports.selectedMonthInsights.map((insight) => (
              <div className="flex items-start gap-3 rounded-lg bg-budget-background p-3" key={insight}>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-budget-primary/10 text-budget-primary">
                  {insight.includes("exceeded") ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                </div>
                <p className="min-w-0 text-sm font-bold leading-6 text-budget-text/70">
                  {cleanReportText(insight)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>
      )}
    </>
  );
}

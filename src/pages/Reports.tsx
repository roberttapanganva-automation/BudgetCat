import { format, getMonth, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { CalendarDays, ReceiptText, Scale, TrendingDown, TrendingUp, Wallet } from "lucide-react";
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
import { buildReportsAnalytics } from "../lib/reportAnalytics";
import { cn, formatCurrency } from "../lib/utils";

const currentYearColor = "var(--budget-primary)";
const previousYearColor = "var(--budget-cream-3)";
type ReportView = "yearly" | `${number}`;

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

function WrittenSummary({
  title,
  summary,
  highestCategory,
  highestBill,
}: {
  title: string;
  summary: {
    income: number;
    expenses: number;
    savings: number;
    bills: number;
    net: number;
  };
  highestCategory?: { name: string; amount: number; percent: number };
  highestBill?: { title: string; amount: number } | null;
}) {
  return (
    <section className="mb-6">
      <div className="mb-3">
        <h2 className="text-xl font-black text-budget-text">{title}</h2>
        <p className="text-sm font-semibold text-budget-text/55">
          Written totals from local BudgetCat data.
        </p>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <SummaryTile icon={Wallet} label="Salary / Income" tone="text-budget-cat" value={summary.income} />
        <SummaryTile icon={ReceiptText} label="Expenses" tone="text-budget-urgent" value={summary.expenses} />
        <SummaryTile icon={CalendarDays} label="Bills" tone="text-budget-urgent" value={summary.bills} />
        <SummaryTile icon={TrendingUp} label="Savings" tone="text-budget-primary" value={summary.savings} />
        <SummaryTile
          icon={Scale}
          label="Net Amount"
          tone={summary.net >= 0 ? "text-budget-success" : "text-budget-urgent"}
          value={summary.net}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <p className="text-sm font-black text-budget-text/60">Highest expense category</p>
          {highestCategory ? (
            <>
              <p className="mt-2 text-lg font-black text-budget-text">{highestCategory.name}</p>
              <p className="text-sm font-semibold text-budget-text/55">
                {formatReportCurrency(highestCategory.amount)} - {highestCategory.percent}% of expenses
              </p>
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
            <Bar dataKey={previousKey} fill={previousYearColor} name={String(previousYear)} radius={[8, 8, 0, 0]} />
            <Bar dataKey={currentKey} fill={getReportChartColor(currentKey)} name={String(currentYear)} radius={[8, 8, 0, 0]} />
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
  const [selectedReportView, setSelectedReportView] = useState<ReportView>("yearly");
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

  const reports = buildReportsAnalytics(transactions, dueDates, selectedMonth);
  const isYearlyView = selectedReportView === "yearly";
  const chartData = isYearlyView
    ? reports.yearlyData
    : reports.yearlyData.filter((month) => month.monthIndex === selectedMonth);
  const reportTitle = isYearlyView
    ? "Year Comparison"
    : `${reports.selectedMonthLabel} Report`;
  const reportSubtitle = isYearlyView
    ? `${reports.currentYear} compared with ${reports.previousYear}, grouped by month.`
    : `${reports.selectedMonthLabel} vs ${reports.monthOptions[selectedMonth]?.label ?? "Selected month"} ${reports.previousYear}.`;

  return (
    <>
      <PageHeader
        action={
          <label className="grid min-w-0 gap-2 text-sm font-bold sm:min-w-48">
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
        }
        subtitle="Yearly comparison and monthly details from local BudgetCat data."
        title="Reports"
      />

      {!reports.hasCurrentYearData && !reports.hasPreviousYearData && !reports.hasBillData && (
        <Card className="mb-5 p-6 text-sm font-semibold text-budget-text/55">
          Add transactions to unlock yearly comparison.
        </Card>
      )}

      <WrittenSummary
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
              <h3 className="text-base font-black text-budget-text">Category breakdown</h3>
              <p className="text-sm font-semibold text-budget-text/55">
                Compact mobile expense rows with gold bars.
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
            subtitle="Income minus expenses and savings"
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
            Selected month detail for the current year.
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
              const isPositive = transaction.type === "income" || transaction.type === "salary";

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
                  {insight.includes("below") ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
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

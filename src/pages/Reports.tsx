import { format, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Area,
  AreaChart,
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
import { PageHeader } from "../components/dashboard/PageHeader";
import { ReportCard } from "../components/reports/ReportCard";
import { Card } from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { calculateMonthlySummary, getTopSpendingCategory } from "../lib/calculations";
import { getTransactionIcon } from "../lib/iconMap";
import { db } from "../lib/localDb";
import { formatCurrency } from "../lib/utils";

const chartColors = ["#E8870A", "#2D7A52", "#4A9E6E", "#C0392B", "#1E5C3A"];

export function Reports() {
  const { user } = useAuth();
  const householdId = user?.householdId ?? "";
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

  const monthlyData = Object.values(
    transactions.reduce<Record<string, { month: string; income: number; expenses: number; savings: number }>>(
      (acc, transaction) => {
        const month = format(parseISO(transaction.date), "MMM");
        acc[month] ??= { month, income: 0, expenses: 0, savings: 0 };
        if (transaction.type === "income" || transaction.type === "salary") {
          acc[month].income += transaction.amount;
        }
        if (transaction.type === "expense") {
          acc[month].expenses += transaction.amount;
        }
        if (transaction.type === "savings" || transaction.type === "goal_contribution") {
          acc[month].savings += transaction.amount;
        }
        return acc;
      },
      {},
    ),
  );
  const topCategories = getTopSpendingCategory(transactions);
  const summary = calculateMonthlySummary(transactions);
  const recentExpenses = [...transactions]
    .filter((transaction) => transaction.type === "expense")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        subtitle="Reports now read from local BudgetCat data."
        title="Reports"
      />
      <section className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm font-bold text-budget-text/55">Income</p>
          <p className="mt-2 break-words font-display text-2xl font-black text-budget-success">
            {formatCurrency(summary.income)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-bold text-budget-text/55">Expenses</p>
          <p className="mt-2 break-words font-display text-2xl font-black text-budget-text">
            {formatCurrency(summary.expenses)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-bold text-budget-text/55">Savings</p>
          <p className="mt-2 break-words font-display text-2xl font-black text-budget-primary">
            {formatCurrency(summary.savings)}
          </p>
        </Card>
      </section>
      {transactions.length === 0 ? (
        <Card className="p-8 text-sm font-semibold text-budget-text/55">
          No report data yet. Add transactions to see charts.
        </Card>
      ) : (
        <section className="grid min-w-0 gap-5 xl:grid-cols-2">
          <ReportCard subtitle="Monthly local data comparison" title="Income vs Expenses">
            <ResponsiveContainer height="100%" minWidth={0} width="100%">
              <BarChart data={monthlyData} margin={{ bottom: 8, left: 0, right: 0, top: 8 }}>
                <CartesianGrid stroke="var(--budget-cream-3)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--budget-text-secondary)" tickLine={false} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="income" fill="var(--budget-success)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expenses" fill="var(--budget-warning)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ReportCard>
          <ReportCard subtitle="Expense categories from transactions" title="Top Spending Category">
            <ResponsiveContainer height="100%" minWidth={0} width="100%">
              <PieChart margin={{ bottom: 8, left: 0, right: 0, top: 8 }}>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={topCategories}
                  dataKey="value"
                  innerRadius={42}
                  outerRadius={78}
                  paddingAngle={4}
                >
                  {topCategories.map((entry, index) => (
                    <Cell fill={chartColors[index % chartColors.length]} key={entry.name} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ReportCard>
          <ReportCard subtitle="Savings and goal contributions" title="Monthly Savings Progress">
            <ResponsiveContainer height="100%" minWidth={0} width="100%">
              <AreaChart data={monthlyData} margin={{ bottom: 8, left: 0, right: 0, top: 8 }}>
                <CartesianGrid stroke="var(--budget-cream-3)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--budget-text-secondary)" tickLine={false} />
                <YAxis hide />
                <Tooltip />
                <Area
                  dataKey="savings"
                  fill="var(--budget-success)"
                  fillOpacity={0.18}
                  stroke="var(--budget-success)"
                  strokeWidth={3}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ReportCard>
          <Card className="p-5">
            <h2 className="text-lg font-black text-budget-text">Recent spending</h2>
            <div className="mt-4 grid gap-3">
              {recentExpenses.map((transaction) => (
                <div
                  className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-budget-background p-3"
                  key={transaction.id}
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-black">
                      <span aria-hidden="true" className="text-lg">
                        {getTransactionIcon(transaction)}
                      </span>
                      {transaction.category}
                    </p>
                    <p className="text-xs font-semibold text-budget-text/55">
                      {format(parseISO(transaction.date), "MMM d")}
                    </p>
                  </div>
                  <p className="shrink-0 font-black">{formatCurrency(transaction.amount)}</p>
                </div>
              ))}
              {recentExpenses.length === 0 && (
                <p className="rounded-lg bg-budget-background p-4 text-sm font-semibold text-budget-text/55">
                  No recent expense entries.
                </p>
              )}
            </div>
          </Card>
        </section>
      )}
    </>
  );
}

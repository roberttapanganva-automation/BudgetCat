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
import { useAuth } from "../contexts/AuthContext";
import { getTopSpendingCategory } from "../lib/calculations";
import { db } from "../lib/localDb";

const chartColors = ["#E6A44E", "#F2B84B", "#7FA77B", "#D96B5F", "#4F8F5B"];

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

  return (
    <>
      <PageHeader
        subtitle="Reports now read from local BudgetCat data."
        title="Reports"
      />
      <section className="grid gap-5 xl:grid-cols-2">
        <ReportCard subtitle="Monthly local data comparison" title="Income vs Expenses">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid stroke="#E8DED0" vertical={false} />
              <XAxis dataKey="month" stroke="#2E2A24" tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="income" fill="#4F8F5B" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expenses" fill="#F2B84B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ReportCard>
        <ReportCard subtitle="Expense categories from transactions" title="Top Spending Category">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={topCategories}
                dataKey="value"
                innerRadius={55}
                outerRadius={90}
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
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={monthlyData}>
              <CartesianGrid stroke="#E8DED0" vertical={false} />
              <XAxis dataKey="month" stroke="#2E2A24" tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Area
                dataKey="savings"
                fill="#4F8F5B"
                fillOpacity={0.18}
                stroke="#4F8F5B"
                strokeWidth={3}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ReportCard>
      </section>
    </>
  );
}

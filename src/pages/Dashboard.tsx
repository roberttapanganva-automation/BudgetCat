import {
  BarChart3,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { CoachCard } from "../components/dashboard/CoachCard";
import { MascotCard } from "../components/dashboard/MascotCard";
import { PageHeader } from "../components/dashboard/PageHeader";
import { PreviewPanel } from "../components/dashboard/PreviewPanel";
import { StatCard } from "../components/dashboard/StatCard";
import { BillStatusBadge } from "../components/due-dates/BillStatusBadge";
import { Badge } from "../components/ui/Badge";
import { Progress } from "../components/ui/Progress";
import { ReminderList } from "../components/reminders/ReminderCard";
import { SyncStatusIndicator } from "../components/layout/SyncStatusIndicator";
import { useAuth } from "../contexts/AuthContext";
import {
  calculateMonthlySummary,
  getDueDateStatus,
  getGoalProgress,
} from "../lib/calculations";
import { getBudgetCatCoachMessages } from "../lib/budgetCatCoach";
import { db } from "../lib/localDb";
import { getDueDateIcon, getGoalIcon, getTransactionIcon } from "../lib/iconMap";
import { getDashboardMascotCheckIn } from "../lib/mascotMood";
import { getMonthTrend } from "../lib/monthComparison";
import { getDisplayNickname, nicknameEventName } from "../lib/nickname";
import { getAllReminders } from "../lib/reminders";
import { formatCurrency } from "../lib/utils";

export function Dashboard() {
  const { user } = useAuth();
  const householdId = user?.householdId ?? "";
  const [nickname, setNickname] = useState(() => getDisplayNickname(user));
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
      () => db.sync_queue.where("sync_status").anyOf(["pending", "failed"]).count(),
      [],
      0,
    ) ?? 0;

  useEffect(() => {
    const updateNickname = () => setNickname(getDisplayNickname(user));
    updateNickname();
    window.addEventListener(nicknameEventName, updateNickname);
    return () => window.removeEventListener(nicknameEventName, updateNickname);
  }, [user]);

  const summary = calculateMonthlySummary(transactions);
  const incomeTrend = getMonthTrend(transactions, "income");
  const expensesTrend = getMonthTrend(transactions, "expenses");
  const savingsTrend = getMonthTrend(transactions, "savings");
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const previewGoals = [...goals].sort((a, b) => b.priority.localeCompare(a.priority)).slice(0, 2);
  const reminders = getAllReminders(dueDates, goals, transactions);
  const coachMessages = getBudgetCatCoachMessages({ transactions, dueDates, goals });
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

  return (
    <>
      <PageHeader
        subtitle="A live snapshot from your local BudgetCat data."
        title={`Good evening, ${nickname}`}
      />
      <div className="mb-4 sm:hidden">
        <SyncStatusIndicator showProgress />
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          helper="Income minus expenses and savings"
          icon="👛"
          title="Remaining Money"
          value={summary.remaining}
        />
        <StatCard
          helper="Income and salary this month"
          icon="💰"
          title="This Month Income"
          trend={incomeTrend}
          value={summary.income}
        />
        <StatCard
          helper="Expenses recorded this month"
          icon="📉"
          title="This Month Expenses"
          trend={expensesTrend}
          value={summary.expenses}
        />
        <StatCard
          helper="Savings and goal contributions"
          icon="🐾"
          title="This Month Savings"
          trend={savingsTrend}
          value={summary.savings}
        />
      </section>
      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <CoachCard message={coachMessages[0]} />
        <div className="rounded-lg border border-budget-border bg-budget-card p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Top reminders</h2>
            <Badge tone={reminders.length > 0 ? "warning" : "success"}>
              {reminders.length} active
            </Badge>
          </div>
          <ReminderList
            emptyText="No urgent reminders right now."
            limit={3}
            reminders={reminders}
          />
        </div>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <MascotCard checkIn={mascotCheckIn} />
        <div className="grid gap-6">
          <PreviewPanel title="Upcoming due dates" to="/due-dates">
            <div className="grid gap-3">
              {dueDates.slice(0, 2).map((bill) => (
              <div
                className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-budget-background p-3"
                key={bill.id}
              >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-budget-background text-xl">
                      <span aria-hidden="true">{getDueDateIcon(bill)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-black">{bill.title}</p>
                      <p className="text-xs font-semibold text-budget-text/55">
                        {formatCurrency(bill.amount)} - {getDueDateStatus(bill)}
                      </p>
                    </div>
                  </div>
                  <BillStatusBadge status={bill.status} />
                </div>
              ))}
              {dueDates.length === 0 && (
                <p className="rounded-lg bg-budget-background p-4 text-sm font-semibold text-budget-text/55">
                  No bills yet.
                </p>
              )}
            </div>
          </PreviewPanel>
          <PreviewPanel title="Goal progress" to="/goals">
            <div className="grid gap-4">
              {previewGoals.map((goal) => (
                <div key={goal.id}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true" className="text-lg">{getGoalIcon(goal)}</span>
                      <p className="text-sm font-black">{goal.title}</p>
                    </div>
                    <Badge tone="cat">{getGoalProgress(goal)}%</Badge>
                  </div>
                  <Progress value={getGoalProgress(goal)} />
                  <p className="mt-2 text-xs font-semibold text-budget-text/55">
                    {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                  </p>
                </div>
              ))}
              {previewGoals.length === 0 && (
                <p className="rounded-lg bg-budget-background p-4 text-sm font-semibold text-budget-text/55">
                  No goals yet.
                </p>
              )}
            </div>
          </PreviewPanel>
        </div>
      </section>
      <section className="mt-6">
        <PreviewPanel title="Recent transactions" to="/transactions">
          <div className="grid gap-3">
            {recentTransactions.map((transaction) => (
              <div
                className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-budget-border bg-budget-card p-3"
                key={transaction.id}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-black">
                    <span aria-hidden="true" className="text-lg">
                      {getTransactionIcon(transaction)}
                    </span>
                    {transaction.category}
                  </p>
                  <p className="text-xs font-semibold text-budget-text/55">
                    {transaction.type.replace("_", " ")} - {format(parseISO(transaction.date), "MMM d")}
                  </p>
                </div>
                <p
                  className={
                    transaction.type === "income" || transaction.type === "salary"
                      ? "font-black text-budget-success"
                      : "font-black text-budget-text"
                  }
                >
                  {transaction.type === "income" || transaction.type === "salary" ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </p>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <p className="rounded-lg bg-budget-background p-4 text-sm font-semibold text-budget-text/55">
                No transactions yet.
              </p>
            )}
          </div>
        </PreviewPanel>
      </section>
      <section className="mt-6">
        <PreviewPanel title="Reports preview" to="/reports">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-budget-background p-4">
              <div className="mb-2 flex items-center gap-2 text-budget-primary">
                <BarChart3 size={17} />
                <p className="text-xs font-black uppercase tracking-wide">Income</p>
              </div>
              <p className="font-display text-xl font-black">
                {formatCurrency(summary.income)}
              </p>
            </div>
            <div className="rounded-lg bg-budget-background p-4">
              <p className="text-xs font-black uppercase tracking-wide text-budget-text/45">
                Expenses
              </p>
              <p className="mt-2 font-display text-xl font-black">
                {formatCurrency(summary.expenses)}
              </p>
            </div>
            <div className="rounded-lg bg-budget-background p-4">
              <p className="text-xs font-black uppercase tracking-wide text-budget-text/45">
                Savings
              </p>
              <p className="mt-2 font-display text-xl font-black text-budget-success">
                {formatCurrency(summary.savings)}
              </p>
            </div>
          </div>
        </PreviewPanel>
      </section>
    </>
  );
}

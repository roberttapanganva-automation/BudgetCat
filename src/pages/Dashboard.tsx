import { BarChart3 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CoachCard } from "../components/dashboard/CoachCard";
import { MascotCard } from "../components/dashboard/MascotCard";
import { PageHeader } from "../components/dashboard/PageHeader";
import { PreviewPanel } from "../components/dashboard/PreviewPanel";
import { StatCard } from "../components/dashboard/StatCard";
import { BillStatusBadge } from "../components/due-dates/BillStatusBadge";
import { SyncStatusIndicator } from "../components/layout/SyncStatusIndicator";
import { BudgetCatMascot } from "../components/mascot/BudgetCatMascot";
import { ReminderList } from "../components/reminders/ReminderCard";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Progress } from "../components/ui/Progress";
import { useAuth } from "../contexts/AuthContext";
import { getBudgetCatCoachMessages } from "../lib/budgetCatCoach";
import {
  calculateMonthlySummary,
  getDueDateStatus,
  getGoalMonthsLeft,
  getGoalProgress,
} from "../lib/calculations";
import { getCategoryLabel, normalizeCategory } from "../lib/categoryConfig";
import { getDashboardUpcomingBills } from "../lib/dueDateFilters";
import { getDueDateIcon, getGoalIcon } from "../lib/iconMap";
import { db } from "../lib/localDb";
import { getDashboardMascotCheckIn } from "../lib/mascotMood";
import { getMonthTrend } from "../lib/monthComparison";
import { getDisplayNickname, nicknameEventName } from "../lib/nickname";
import { getPaymentMethodLabel } from "../lib/paymentMethods";
import { getAllReminders } from "../lib/reminders";
import { formatCurrency } from "../lib/utils";
import type { LocalTransaction } from "../types/finance";

function getTimeGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";

  return "Good evening";
}

function safeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getPriorityRank(priority: string) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;

  return 2;
}

function getDashboardTransactionIcon(transaction: LocalTransaction) {
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

  if (searchableText.includes("allowance") || searchableText.includes("stipend")) {
    return "🪙";
  }

  if (searchableText.includes("refund") || searchableText.includes("reimbursement")) {
    return "↩️";
  }

  if (searchableText.includes("interest") || searchableText.includes("bank interest")) {
    return "🏦";
  }

  if (searchableText.includes("other_income") || searchableText.includes("other income")) {
    return "💰";
  }

  // Savings and goal categories
  if (
    searchableText.includes("emergency_fund") ||
    searchableText.includes("emergency fund") ||
    searchableText.includes("emergency")
  ) {
    return "🛟";
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

  if (searchableText.includes("mobile") || searchableText.includes("load")) {
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

  const activeGoals = [...goals]
    .filter((goal) => goal.status === "active")
    .sort((a, b) => {
      const priorityDelta = getPriorityRank(a.priority) - getPriorityRank(b.priority);

      if (priorityDelta !== 0) return priorityDelta;

      return b.current_amount - a.current_amount;
    });

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  const previewGoals = [...activeGoals].slice(0, 2);
  const upcomingBills = getDashboardUpcomingBills(dueDates, 2);

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

  const spendingPercent =
    summary.income > 0 ? Math.min(100, Math.round((summary.expenses / summary.income) * 100)) : 0;

  const spendingTone =
    spendingPercent >= 90
      ? "bg-budget-urgent"
      : spendingPercent >= 70
        ? "bg-budget-cat"
        : "bg-budget-primary";

  const greeting = getTimeGreeting();

  return (
    <>
      <div className="sm:hidden">
        <section className="mb-4">
          <h1 className="mt-1 text-2xl font-black leading-tight text-budget-text">
            {greeting}, {nickname}
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-budget-text/65">
            A live snapshot from your local BudgetCat data.
          </p>
        </section>

        <section className="mb-4">
          <div className="flex items-start gap-3 rounded-xl border border-budget-border bg-budget-card p-3">
            <BudgetCatMascot
              className="shrink-0"
              imageClassName="w-[64px] object-contain"
              variant="both"
            />
            <div className="min-w-0 pt-1">
              <div className="mb-2">
                <SyncStatusIndicator showProgress />
              </div>
              <p className="text-sm font-semibold leading-6 text-budget-text/70">
                {mascotCheckIn.clyde.message}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <StatCard
            helper="Income minus expenses and savings"
            icon="💰"
            title="Remaining"
            value={summary.remaining}
          />
          <StatCard
            helper="Income and salary this month"
            icon="💵"
            title="Income"
            tone="cat"
            trend={incomeTrend}
            value={summary.income}
          />
          <StatCard
            helper="Expenses recorded this month"
            icon="📉"
            title="Expenses"
            tone="urgent"
            trend={expensesTrend}
            value={summary.expenses}
          />
          <StatCard
            helper="Savings and goal contributions"
            icon="🌱"
            title="Savings"
            tone="success"
            trend={savingsTrend}
            value={summary.savings}
          />
        </section>

        <Card className="mt-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-budget-text/55">
              Spending
            </p>
            <p className="text-sm font-semibold text-budget-text/60">
              {formatCurrency(summary.expenses)} of {formatCurrency(summary.income)}
            </p>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-budget-background ring-1 ring-budget-border">
            <div className={spendingTone} style={{ width: `${spendingPercent}%`, height: "100%" }} />
          </div>

          <p className="mt-2 text-xs font-semibold text-budget-text/55">
            {spendingPercent}% spent this month
          </p>
        </Card>

        <section className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-budget-text">Recent transactions</h2>
            <Link className="text-sm font-bold text-budget-primary" to="/transactions">
              View all
            </Link>
          </div>

          <Card className="p-0">
            <div className="divide-y divide-budget-border">
              {recentTransactions.slice(0, 3).map((transaction) => {
                const isPositive = transaction.type === "income" || transaction.type === "salary";
                const transactionTypeLabel = transaction.type.replace("_", " ");

                return (
                  <div
                    className="flex items-center justify-between gap-3 px-4 py-3"
                    key={transaction.id}
                  >
                    <div className="min-w-0">
                      <p className="flex min-w-0 items-center gap-2 font-black">
                        <span aria-hidden="true" className="shrink-0 text-lg">
                          {getDashboardTransactionIcon(transaction)}
                        </span>
                        <span className="truncate">{getCategoryLabel(transaction.category)}</span>
                      </p>
                      <p className="text-xs font-semibold capitalize text-budget-text/55">
                        {transactionTypeLabel} - {format(parseISO(transaction.date), "MMM d")}
                      </p>
                    </div>

                    <p
                      className={
                        isPositive
                          ? "shrink-0 font-black text-budget-success"
                          : "shrink-0 font-black text-budget-urgent"
                      }
                    >
                      {isPositive ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                );
              })}

              {recentTransactions.length === 0 && (
                <p className="px-4 py-5 text-sm font-semibold text-budget-text/55">
                  No transactions yet.
                </p>
              )}
            </div>
          </Card>
        </section>

        <section className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-budget-text">Upcoming bills</h2>
            <Link className="text-sm font-bold text-budget-primary" to="/due-dates">
              View all
            </Link>
          </div>

          <Card className="p-0">
            <div className="divide-y divide-budget-border">
              {upcomingBills.map((bill) => (
                <div
                  className="flex items-center justify-between gap-3 px-4 py-3"
                  key={bill.id}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span aria-hidden="true" className="shrink-0 text-xl leading-none">
                      {getDueDateIcon(bill)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-black">{bill.title}</p>
                      <p className="text-xs font-semibold text-budget-text/55">
                        {format(parseISO(bill.due_date), "MMM d")} - {getDueDateStatus(bill)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <BillStatusBadge status={bill.status} />
                    <p className="font-black text-budget-urgent">{formatCurrency(bill.amount)}</p>
                  </div>
                </div>
              ))}

              {upcomingBills.length === 0 && (
                <p className="px-4 py-5 text-sm font-semibold text-budget-text/55">
                  No unpaid bills right now.
                </p>
              )}
            </div>
          </Card>
        </section>

        <section className="mt-4">
          <Link
            className="flex items-center justify-between gap-3 rounded-xl border border-budget-border bg-budget-card px-4 py-3"
            to="/goals"
          >
            <div className="min-w-0">
              <p className="font-black text-budget-text">Goals</p>
              <p className="mt-1 text-xs font-semibold text-budget-text/55">
                Set your savings targets and track them right from your dashboard.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-budget-primary/10 px-3 py-1 text-xs font-black text-budget-primary">
              View all
            </span>
          </Link>
        </section>

        <section className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-budget-text">Goals preview</h2>
            <Link className="text-sm font-bold text-budget-primary" to="/goals">
              View all
            </Link>
          </div>

          <Card className="p-0">
            <div className="divide-y divide-budget-border">
              {previewGoals.slice(0, 2).map((goal) => {
                const progress = getGoalProgress(goal);
                const targetDate = goal.target_date ? format(parseISO(goal.target_date), "MMM d") : "";

                return (
                  <div
                    className="flex items-center justify-between gap-3 px-4 py-3"
                    key={goal.id}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span aria-hidden="true" className="shrink-0 text-xl leading-none">
                        {getGoalIcon(goal)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-black">{goal.title}</p>
                        <p className="text-xs font-semibold text-budget-text/55">
                          {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                          {targetDate ? ` - ${targetDate}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded-full bg-budget-primary/10 px-3 py-1 text-xs font-black text-budget-primary">
                        {progress}%
                      </span>
                      <span className="text-xs font-semibold text-budget-text/55">
                        {getGoalMonthsLeft(goal)} mo left
                      </span>
                    </div>
                  </div>
                );
              })}

              {previewGoals.length === 0 && (
                <div className="px-4 py-5 text-sm font-semibold text-budget-text/55">
                  No active goals yet.
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>

      <div className="hidden sm:block">
        <PageHeader
          subtitle="A live snapshot from your local BudgetCat data."
          title={`${greeting}, ${nickname}`}
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            helper="Income minus expenses and savings"
            icon="💰"
            title="Remaining Money"
            value={summary.remaining}
          />
          <StatCard
            helper="Income and salary this month"
            icon="💵"
            title="This Month Income"
            tone="cat"
            trend={incomeTrend}
            value={summary.income}
          />
          <StatCard
            helper="Expenses recorded this month"
            icon="📉"
            title="This Month Expenses"
            tone="urgent"
            trend={expensesTrend}
            value={summary.expenses}
          />
          <StatCard
            helper="Savings and goal contributions"
            icon="🌱"
            title="This Month Savings"
            tone="success"
            trend={savingsTrend}
            value={summary.savings}
          />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <CoachCard message={coachMessages[0]} />

          <div className="rounded-lg border border-budget-border bg-budget-card p-4">
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
                {upcomingBills.map((bill) => (
                  <div
                    className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-budget-background p-3"
                    key={bill.id}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center text-xl">
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

                {upcomingBills.length === 0 && (
                  <p className="rounded-lg bg-budget-background p-4 text-sm font-semibold text-budget-text/55">
                    No unpaid bills right now.
                  </p>
                )}
              </div>
            </PreviewPanel>

            <PreviewPanel title="Goal preview" to="/goals">
              <div className="grid gap-4">
                {previewGoals.map((goal) => {
                  const progress = getGoalProgress(goal);
                  const targetDate = goal.target_date ? format(parseISO(goal.target_date), "MMM d") : "";

                  return (
                    <div key={goal.id}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span aria-hidden="true" className="text-lg">
                            {getGoalIcon(goal)}
                          </span>
                          <p className="truncate text-sm font-black">{goal.title}</p>
                        </div>
                        <Badge tone="cat">{progress}%</Badge>
                      </div>
                      <Progress value={progress} />
                      <p className="mt-2 text-xs font-semibold text-budget-text/55">
                        {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                        {targetDate ? ` - ${targetDate}` : ""}
                      </p>
                    </div>
                  );
                })}

                {previewGoals.length === 0 && (
                  <p className="rounded-lg bg-budget-background p-4 text-sm font-semibold text-budget-text/55">
                    No active goals yet.
                  </p>
                )}
              </div>
            </PreviewPanel>
          </div>
        </section>

        <section className="mt-6">
          <PreviewPanel title="Recent transactions" to="/transactions">
            <div className="grid gap-3">
              {recentTransactions.map((transaction) => {
                const isPositive = transaction.type === "income" || transaction.type === "salary";
                const transactionTypeLabel = transaction.type.replace("_", " ");

                return (
                  <div
                    className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-budget-border bg-budget-card p-3"
                    key={transaction.id}
                  >
                    <div className="min-w-0">
                      <p className="flex min-w-0 items-center gap-2 font-black">
                        <span aria-hidden="true" className="shrink-0 text-lg">
                          {getDashboardTransactionIcon(transaction)}
                        </span>
                        <span className="truncate">{getCategoryLabel(transaction.category)}</span>
                      </p>
                      <p className="text-xs font-semibold capitalize text-budget-text/55">
                        {transactionTypeLabel} - {format(parseISO(transaction.date), "MMM d")}
                      </p>
                    </div>

                    <p
                      className={
                        isPositive
                          ? "shrink-0 font-black text-budget-success"
                          : "shrink-0 font-black text-budget-urgent"
                      }
                    >
                      {isPositive ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                );
              })}

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
                <p className="font-display text-xl font-black text-budget-cat">
                  {formatCurrency(summary.income)}
                </p>
              </div>

              <div className="rounded-lg bg-budget-background p-4">
                <p className="text-xs font-black uppercase tracking-wide text-budget-text/45">
                  Expenses
                </p>
                <p className="mt-2 font-display text-xl font-black text-budget-urgent">
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
      </div>
    </>
  );
}
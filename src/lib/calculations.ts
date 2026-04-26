import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfMonth,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfMonth,
} from "date-fns";
import type { LocalDueDate, LocalGoal, LocalTransaction } from "../types/finance";

export function getTransactionAmountForBudget(transaction: LocalTransaction) {
  if (transaction.deleted_at) return 0;
  if (transaction.type === "income" || transaction.type === "salary") {
    return transaction.amount;
  }
  if (
    transaction.type === "expense" ||
    transaction.type === "savings" ||
    transaction.type === "goal_contribution"
  ) {
    return -transaction.amount;
  }
  return 0;
}

export function calculateMonthlySummary(
  transactions: LocalTransaction[],
  referenceDate = new Date(),
) {
  const start = startOfMonth(referenceDate);
  const end = endOfMonth(referenceDate);
  const currentMonthTransactions = transactions.filter((transaction) => {
    if (transaction.deleted_at) return false;
    const date = parseISO(transaction.date);
    return !isBefore(date, start) && !isAfter(date, end);
  });

  const income = currentMonthTransactions
    .filter((transaction) => transaction.type === "income" || transaction.type === "salary")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expenses = currentMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const savings = currentMonthTransactions
    .filter(
      (transaction) =>
        transaction.type === "savings" || transaction.type === "goal_contribution",
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    income,
    expenses,
    savings,
    remaining: income - expenses - savings,
  };
}

export function getGoalProgress(goal: LocalGoal) {
  if (goal.target_amount <= 0) return 0;
  return Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
}

export function getGoalRemaining(goal: LocalGoal) {
  return Math.max(0, goal.target_amount - goal.current_amount);
}

export function getGoalMonthsLeft(goal: LocalGoal, referenceDate = new Date()) {
  if (!goal.target_date) return 0;
  return Math.max(0, differenceInCalendarMonths(parseISO(goal.target_date), referenceDate));
}

export function getSuggestedMonthlySaving(goal: LocalGoal, referenceDate = new Date()) {
  const monthsLeft = getGoalMonthsLeft(goal, referenceDate);
  const remaining = getGoalRemaining(goal);
  if (remaining === 0) return 0;
  return monthsLeft <= 0 ? remaining : Math.ceil(remaining / monthsLeft);
}

export function getDueDateStatus(dueDate: LocalDueDate, referenceDate = new Date()) {
  if (dueDate.status === "paid") return "Paid";

  const date = parseISO(dueDate.due_date);
  const dayDiff = differenceInCalendarDays(date, referenceDate);

  if (isSameDay(date, referenceDate)) return "Due today";
  if (dayDiff === 1) return "Due in 1 day";
  if (dayDiff === 3) return "Due in 3 days";
  if (dayDiff < 0 || dueDate.status === "overdue") return "Overdue";
  return "Upcoming";
}

export function getTopSpendingCategory(transactions: LocalTransaction[]) {
  const totals = transactions.reduce<Record<string, number>>((acc, transaction) => {
    if (transaction.deleted_at || transaction.type !== "expense") return acc;
    acc[transaction.category] = (acc[transaction.category] ?? 0) + transaction.amount;
    return acc;
  }, {});

  return Object.entries(totals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

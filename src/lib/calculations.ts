import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfMonth,
  isAfter,
  isBefore,
  isValid,
  isSameDay,
  parseISO,
  startOfMonth,
} from "date-fns";
import type {
  LocalDueDate,
  LocalGoal,
  LocalGoalContribution,
  LocalTransaction,
} from "../types/finance";

function getSafeAmount(value: number) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function mergeGoalContributionsForCalculations(
  transactions: LocalTransaction[],
  goalContributions: LocalGoalContribution[],
) {
  const contributionTransactions = goalContributions
    .filter(
      (contribution) =>
        !contribution.deleted_at &&
        Number.isFinite(contribution.amount) &&
        contribution.amount > 0,
    )
    .map<LocalTransaction>((contribution) => ({
      ...contribution,
      type: "goal_contribution",
      category: "Goal Contribution",
      payment_method: "Goal",
    }));

  return [...transactions, ...contributionTransactions];
}

export function getTransactionAmountForBudget(transaction: LocalTransaction) {
  if (transaction.deleted_at) return 0;
  const amount = getSafeAmount(transaction.amount);
  if (transaction.type === "income" || transaction.type === "salary") {
    return amount;
  }
  if (
    transaction.type === "expense" ||
    transaction.type === "savings" ||
    transaction.type === "goal_contribution"
  ) {
    return -amount;
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
    if (!isValid(date)) return false;
    return !isBefore(date, start) && !isAfter(date, end);
  });

  const income = currentMonthTransactions
    .filter((transaction) => transaction.type === "income" || transaction.type === "salary")
    .reduce((sum, transaction) => sum + getSafeAmount(transaction.amount), 0);

  const expenses = currentMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + getSafeAmount(transaction.amount), 0);

  const savings = currentMonthTransactions
    .filter(
      (transaction) =>
        transaction.type === "savings" || transaction.type === "goal_contribution",
    )
    .reduce((sum, transaction) => sum + getSafeAmount(transaction.amount), 0);

  return {
    income,
    expenses,
    savings,
    remaining: income - expenses - savings,
  };
}

export function getGoalProgress(goal: LocalGoal) {
  const targetAmount = getSafeAmount(goal.target_amount);
  const currentAmount = getSafeAmount(goal.current_amount);

  if (targetAmount <= 0) return 0;
  return Math.min(100, Math.round((currentAmount / targetAmount) * 100));
}

export function getGoalRemaining(goal: LocalGoal) {
  return Math.max(
    0,
    getSafeAmount(goal.target_amount) - getSafeAmount(goal.current_amount),
  );
}

export function getGoalMonthsLeft(goal: LocalGoal, referenceDate = new Date()) {
  if (!goal.target_date) return 0;
  const targetDate = parseISO(goal.target_date);
  if (!isValid(targetDate)) return 0;

  return Math.max(0, differenceInCalendarMonths(targetDate, referenceDate));
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
  if (!isValid(date)) return "No due date";
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
    acc[transaction.category] =
      (acc[transaction.category] ?? 0) + getSafeAmount(transaction.amount);
    return acc;
  }, {});

  return Object.entries(totals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

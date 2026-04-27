import { endOfMonth, isAfter, isBefore, parseISO, startOfMonth, subMonths } from "date-fns";
import type { LocalTransaction } from "../types/finance";

export type TrendMetric = "income" | "expenses" | "savings";
export type TrendTone = "positive" | "negative" | "neutral";

export type MonthTrend = {
  label: string;
  tone: TrendTone;
};

function isInRange(dateValue: string, start: Date, end: Date) {
  const date = parseISO(dateValue);
  return !isBefore(date, start) && !isAfter(date, end);
}

function totalForMetric(transactions: LocalTransaction[], metric: TrendMetric, start: Date, end: Date) {
  return transactions
    .filter((transaction) => !transaction.deleted_at && isInRange(transaction.date, start, end))
    .filter((transaction) => {
      if (metric === "income") return transaction.type === "income" || transaction.type === "salary";
      if (metric === "expenses") return transaction.type === "expense";
      return transaction.type === "savings" || transaction.type === "goal_contribution";
    })
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function getMonthTrend(
  transactions: LocalTransaction[],
  metric: TrendMetric,
  referenceDate = new Date(),
): MonthTrend {
  const currentStart = startOfMonth(referenceDate);
  const currentEnd = endOfMonth(referenceDate);
  const previousDate = subMonths(referenceDate, 1);
  const previousStart = startOfMonth(previousDate);
  const previousEnd = endOfMonth(previousDate);

  const current = totalForMetric(transactions, metric, currentStart, currentEnd);
  const previous = totalForMetric(transactions, metric, previousStart, previousEnd);

  if (previous === 0) return { label: "No last month data", tone: "neutral" };
  if (current === previous) return { label: "No change vs last month", tone: "neutral" };

  const percent = Math.round(((current - previous) / previous) * 100);
  const increased = current > previous;
  const tone =
    metric === "expenses"
      ? increased
        ? "negative"
        : "positive"
      : increased
        ? "positive"
        : "negative";
  const sign = percent > 0 ? "+" : "";

  return {
    label: `${sign}${percent}% vs last month`,
    tone,
  };
}

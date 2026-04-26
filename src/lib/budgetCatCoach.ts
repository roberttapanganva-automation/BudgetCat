import { isToday, parseISO } from "date-fns";
import {
  calculateMonthlySummary,
  getGoalProgress,
  getTopSpendingCategory,
} from "./calculations";
import { getAllReminders } from "./reminders";
import type {
  CoachMessage,
  LocalDueDate,
  LocalGoal,
  LocalTransaction,
} from "../types/finance";

export function getBudgetCatCoachMessages({
  transactions,
  dueDates,
  goals,
}: {
  transactions: LocalTransaction[];
  dueDates: LocalDueDate[];
  goals: LocalGoal[];
}) {
  const messages: CoachMessage[] = [];
  const summary = calculateMonthlySummary(transactions);
  const reminders = getAllReminders(dueDates, goals, transactions);
  const topSpending = getTopSpendingCategory(transactions)[0];
  const hasSalary = transactions.some((transaction) => transaction.type === "salary");
  const savedMoney = summary.savings > 0;
  const hasTransactionToday = transactions.some((transaction) =>
    isToday(parseISO(transaction.date)),
  );
  const bestGoal = [...goals]
    .filter((goal) => !goal.deleted_at)
    .sort((a, b) => getGoalProgress(b) - getGoalProgress(a))[0];

  if (hasSalary) {
    messages.push({
      id: "salary-received",
      type: "celebration",
      title: "Salary logged",
      body: "Bonnie & Clyde say: Nice. Give your money a job before it wanders away.",
      mascot: "Bonnie & Clyde",
      tone: "success",
    });
  }

  if (savedMoney) {
    messages.push({
      id: "saved-money",
      type: "celebration",
      title: "Savings are moving",
      body: "Bonnie says: Small savings still count. You are building the habit.",
      mascot: "Bonnie",
      tone: "success",
    });
  } else {
    messages.push({
      id: "savings-tip",
      type: "savings_tip",
      title: "Tiny savings still help",
      body: "Bonnie says: Add even a little today if the month allows it.",
      mascot: "Bonnie",
      tone: "cat",
    });
  }

  if (summary.expenses > summary.income * 0.65 && summary.income > 0) {
    messages.push({
      id: "overspending",
      type: "warning",
      title: "Spending is getting high",
      body: "Clyde says: Slow down a little so your wallet stays calm.",
      mascot: "Clyde",
      tone: "urgent",
    });
  }

  if (topSpending && topSpending.value > Math.max(5000, summary.income * 0.2)) {
    messages.push({
      id: "top-spending",
      type: "warning",
      title: `${topSpending.name} is your top category`,
      body: `Clyde says: ${topSpending.name} spending is getting high this month.`,
      mascot: "Clyde",
      tone: "warning",
    });
  }

  const billReminder = reminders.find(
    (reminder) => reminder.type === "bill" && reminder.status !== "upcoming",
  );
  if (billReminder) {
    messages.push({
      id: "bill-reminder",
      type: "due_date_alert",
      title: billReminder.title,
      body: "Clyde says: Prepare early so your wallet stays calm.",
      mascot: "Clyde",
      tone: billReminder.severity === "urgent" ? "urgent" : "warning",
    });
  }

  if (bestGoal && getGoalProgress(bestGoal) > 0) {
    messages.push({
      id: "goal-progress",
      type: "goal_progress",
      title: `${bestGoal.title} is moving`,
      body: "Bonnie & Clyde say: Nice job. You are closer than before.",
      mascot: "Bonnie & Clyde",
      tone: "success",
    });
  }

  if (!hasTransactionToday) {
    messages.push({
      id: "no-entry-today",
      type: "encouragement",
      title: "No entry today yet",
      body: "Bonnie says: A quick check-in keeps the budget honest.",
      mascot: "Bonnie",
      tone: "neutral",
    });
  }

  return messages.slice(0, 4);
}

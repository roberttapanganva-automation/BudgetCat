import {
  differenceInCalendarDays,
  endOfMonth,
  isAfter,
  parseISO,
} from "date-fns";
import {
  calculateMonthlySummary,
  getGoalMonthsLeft,
  getGoalProgress,
  getSuggestedMonthlySaving,
} from "./calculations";
import type {
  LocalDueDate,
  LocalGoal,
  LocalTransaction,
  Reminder,
} from "../types/finance";

export function getDueDateReminders(dueDates: LocalDueDate[], referenceDate = new Date()) {
  return dueDates
    .filter((dueDate) => !dueDate.deleted_at && dueDate.status !== "paid")
    .map<Reminder | null>((dueDate) => {
      const daysUntilDue = differenceInCalendarDays(
        parseISO(dueDate.due_date),
        referenceDate,
      );

      if (daysUntilDue < 0) {
        return {
          id: `bill-overdue-${dueDate.id}`,
          type: "bill",
          status: "overdue",
          title: `${dueDate.title} is overdue`,
          body: "Mark it paid when handled so BudgetCat can quiet this reminder.",
          dueDate: dueDate.due_date,
          amount: dueDate.amount,
          severity: "urgent",
          sourceId: dueDate.id,
        };
      }

      if (daysUntilDue === 0) {
        return {
          id: `bill-today-${dueDate.id}`,
          type: "bill",
          status: "due_today",
          title: `${dueDate.title} is due today`,
          body: "Prepare the payment today to keep bills calm.",
          dueDate: dueDate.due_date,
          amount: dueDate.amount,
          severity: "urgent",
          sourceId: dueDate.id,
        };
      }

      if (daysUntilDue <= 3) {
        return {
          id: `bill-soon-${dueDate.id}`,
          type: "bill",
          status: "due_soon",
          title: `${dueDate.title} is due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`,
          body: "Set aside the money early if you can.",
          dueDate: dueDate.due_date,
          amount: dueDate.amount,
          severity: "warning",
          sourceId: dueDate.id,
        };
      }

      return null;
    })
    .filter((reminder): reminder is Reminder => Boolean(reminder));
}

export function getGoalReminders(goals: LocalGoal[], referenceDate = new Date()) {
  return goals
    .filter((goal) => !goal.deleted_at && goal.status === "active")
    .flatMap<Reminder>((goal) => {
      const reminders: Reminder[] = [];
      const progress = getGoalProgress(goal);
      const monthsLeft = getGoalMonthsLeft(goal, referenceDate);
      const targetDate = parseISO(goal.target_date);
      const daysLeft = differenceInCalendarDays(targetDate, referenceDate);

      if (daysLeft >= 0 && daysLeft <= 30 && progress < 100) {
        reminders.push({
          id: `goal-deadline-${goal.id}`,
          type: "goal_deadline",
          status: daysLeft <= 7 ? "due_soon" : "upcoming",
          title: `${goal.title} deadline is near`,
          body: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left and ${progress}% funded.`,
          dueDate: goal.target_date,
          severity: daysLeft <= 7 ? "warning" : "info",
          sourceId: goal.id,
        });
      }

      if (monthsLeft > 0) {
        const expectedProgress = Math.min(95, Math.max(10, 100 - monthsLeft * 5));
        if (progress + 10 < expectedProgress) {
          reminders.push({
            id: `goal-pace-${goal.id}`,
            type: "goal_pace",
            status: "upcoming",
            title: `${goal.title} may need a little push`,
            body: `Suggested monthly saving is around ${getSuggestedMonthlySaving(goal, referenceDate).toLocaleString("en-PH")} PHP.`,
            dueDate: goal.target_date,
            severity: "warning",
            sourceId: goal.id,
          });
        }
      }

      return reminders;
    });
}

export function getSavingsReminders(
  transactions: LocalTransaction[],
  goals: LocalGoal[],
  referenceDate = new Date(),
): Reminder[] {
  const daysLeftInMonth = differenceInCalendarDays(endOfMonth(referenceDate), referenceDate);
  const summary = calculateMonthlySummary(transactions, referenceDate);
  const activeGoals = goals.filter((goal) => !goal.deleted_at && goal.status === "active");
  const suggestedMonthlyTotal = activeGoals.reduce(
    (sum, goal) => sum + getSuggestedMonthlySaving(goal, referenceDate),
    0,
  );

  if (daysLeftInMonth > 5 || suggestedMonthlyTotal === 0) return [];
  if (summary.savings >= suggestedMonthlyTotal) return [];

  return [
    {
      id: "savings-month-end",
      type: "savings",
      status: "due_soon",
      title: "Monthly savings target is still open",
      body: `You saved ${summary.savings.toLocaleString("en-PH")} PHP toward an estimated ${suggestedMonthlyTotal.toLocaleString("en-PH")} PHP target.`,
      amount: Math.max(0, suggestedMonthlyTotal - summary.savings),
      severity: "warning",
    } satisfies Reminder,
  ];
}

export function getAllReminders(
  dueDates: LocalDueDate[] = [],
  goals: LocalGoal[] = [],
  transactions: LocalTransaction[] = [],
  referenceDate = new Date(),
) {
  const reminders = [
    ...getDueDateReminders(dueDates, referenceDate),
    ...getGoalReminders(goals, referenceDate),
    ...getSavingsReminders(transactions, goals, referenceDate),
  ];

  const severityRank = { urgent: 0, warning: 1, info: 2, success: 3 };
  return reminders.sort((a, b) => {
    const severityDelta = severityRank[a.severity] - severityRank[b.severity];
    if (severityDelta !== 0) return severityDelta;
    if (a.dueDate && b.dueDate) {
      return isAfter(parseISO(a.dueDate), parseISO(b.dueDate)) ? 1 : -1;
    }
    return 0;
  });
}
